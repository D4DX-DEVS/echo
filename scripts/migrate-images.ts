// Usage: node --env-file=.env.local scripts/migrate-images.ts
// Copies every theecho.in/wp-content/uploads image used by posts into R2 and rewrites the URLs in the DB.
// Safe to re-run: already-migrated URLs no longer match.
import { q, run } from "../lib/db.ts";
import { putFile } from "../lib/storage.ts";

const RE = /https?:\/\/(?:www\.)?theecho\.in\/wp-content\/uploads\/[^\s"'<>)\\]+/g;
const done = new Map<string, Promise<string>>();

function migrate(url: string): Promise<string> {
  if (!done.has(url))
    done.set(
      url,
      (async () => {
        try {
          const res = await fetch(url);
          if (!res.ok) return url;
          const key = "wp/" + decodeURIComponent(new URL(url).pathname.replace("/wp-content/uploads/", ""));
          return await putFile(key, Buffer.from(await res.arrayBuffer()), res.headers.get("content-type") ?? "application/octet-stream");
        } catch {
          return url; // leave as-is, retry on next run
        }
      })(),
    );
  return done.get(url)!;
}

const posts = await q<{ id: number; image: string; content: string }>("SELECT id,image,content FROM posts WHERE image LIKE '%theecho.in/wp-content%' OR content LIKE '%theecho.in/wp-content%'");
console.log(`${posts.length} posts to process`);
let n = 0;
for (let i = 0; i < posts.length; i += 5) {
  await Promise.all(
    posts.slice(i, i + 5).map(async (p) => {
      const urls = [...new Set([...(p.image.match(RE) ?? []), ...(p.content.match(RE) ?? [])])];
      const map = new Map(await Promise.all(urls.map(async (u) => [u, await migrate(u)] as const)));
      const sub = (s: string) => s.replace(RE, (u) => map.get(u) ?? u);
      await run("UPDATE posts SET image=?, content=? WHERE id=?", [sub(p.image), sub(p.content), p.id]);
    }),
  );
  n += 5;
  if (n % 100 === 0) console.log(`${n}/${posts.length}`);
}
console.log("migrate done");
