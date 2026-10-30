// Usage: node --env-file=.env scripts/make-image-sizes.ts [--limit N] [--dry]
// For every post whose featured image lives in our R2 bucket, makes 480 / 960 / 1440 px wide WebP copies (never enlarging),
// uploads them next to the original as "<name>.w480.webp", checks they are really served, then sets posts.image_set.
// Safe to re-run: posts with image_set > 0 are skipped. D1 use: one read of the posts and a handful of batched updates.
import sharp from "sharp";
import { q, run } from "../lib/db.ts";
import { putFile } from "../lib/storage.ts";
import { WIDTHS } from "../lib/images.ts";

const limit = Number(process.argv[process.argv.indexOf("--limit") + 1]) || Infinity;
const dry = process.argv.includes("--dry");
const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
if (!base) throw new Error("R2_PUBLIC_URL is not set");

// prefix match written as a range: D1 rejects a LIKE pattern this long
const posts = (await q<{ id: number; image: string }>("SELECT id, image FROM posts WHERE image_set = 0 AND image >= ? AND image < ?", [`${base}/`, `${base}0`])).slice(0, limit);
console.log(`${posts.length} posts to process${dry ? " (dry run, nothing uploaded)" : ""}`);

const bySource = new Map<string, number[]>(); // one image can feed several posts
for (const p of posts) bySource.set(p.image, [...(bySource.get(p.image) ?? []), p.id]);

const flags: { ids: number[]; mask: number }[] = [];
let done = 0, skipped = 0, failed = 0, bytesBefore = 0, bytesAfter = 0;

async function work(url: string, ids: number[]) {
  try {
    if (/\.gif($|\?)/i.test(url)) return void skipped++; // possibly animated
    const res = await fetch(url);
    if (!res.ok) return void failed++;
    const original = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(original).metadata();
    if (!meta.width) return void failed++;
    const key = url.slice(base.length + 1).replace(/\.[a-z0-9]+$/i, "");
    let mask = 0;
    for (const [i, w] of WIDTHS.entries()) {
      if (w > meta.width) continue; // never upscale
      const out = await sharp(original).rotate().resize({ width: w }).webp({ quality: 78 }).toBuffer();
      if (!dry) {
        const copy = await putFile(`${key}.w${w}.webp`, out, "image/webp");
        const check = await fetch(copy, { method: "HEAD" });
        if (!check.ok) throw new Error(`copy not served: ${copy}`);
      }
      mask |= 1 << i;
      bytesAfter += out.length;
    }
    bytesBefore += original.length;
    if (mask) { flags.push({ ids, mask }); done++; } else skipped++; // original narrower than 480px
  } catch (e) {
    failed++;
    console.log("failed:", url, String(e).slice(0, 120));
  }
}

// flags are saved after every batch, so an interrupted run keeps its progress
async function flush() {
  if (dry) return;
  // group the posts by mask and update them in chunks (D1 allows ~100 values per statement)
  const byMask = new Map<number, number[]>();
  for (const f of flags.splice(0)) byMask.set(f.mask, [...(byMask.get(f.mask) ?? []), ...f.ids]);
  for (const [mask, ids] of byMask)
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      await run(`UPDATE posts SET image_set=? WHERE id IN (${chunk.map(() => "?").join(",")})`, [mask, ...chunk]);
    }
}

const all = [...bySource.entries()];
for (let at = 0; at < all.length; at += 200) {
  const queue = all.slice(at, at + 200);
  await Promise.all(Array.from({ length: 6 }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) await work(...next);
  }));
  await flush();
  console.log(`  ${Math.min(at + 200, all.length)} / ${all.length} images: ${done} resized, ${skipped} skipped, ${failed} failed`);
}
const mb = (n: number) => (n / 1048576).toFixed(1);
console.log(`finished: ${done} images resized, ${skipped} skipped, ${failed} failed; originals ${mb(bytesBefore)} MB -> new copies ${mb(bytesAfter)} MB`);
