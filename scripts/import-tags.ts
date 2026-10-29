// Usage: node --env-file=.env scripts/import-tags.ts
// Imports every WP tag and each post's tag list (safe to re-run).
import { initSchema, run } from "../lib/db.ts";
import { WP, decode, get } from "./wp.ts";

await initSchema();

let n = 0;
for (let page = 1; ; page++) {
  const res = await get(`${WP}/tags?per_page=100&page=${page}&_fields=id,name,slug`);
  const tags: { id: number; name: string; slug: string }[] = res.ok ? await res.json() : [];
  if (!tags.length) break;
  for (const t of tags) await run("INSERT OR REPLACE INTO tags(id,slug,name) VALUES(?,?,?)", [t.id, decodeURIComponent(t.slug), decode(t.name)]);
  n += tags.length;
}
console.log(`tags: ${n}`);

let linked = 0;
for (let page = 1; ; page++) {
  const res = await get(`${WP}/posts?per_page=100&page=${page}&_fields=id,tags`);
  const posts: { id: number; tags: number[] }[] = res.ok ? await res.json() : [];
  if (!posts.length) break;
  for (let i = 0; i < posts.length; i += 8)
    await Promise.all(
      posts.slice(i, i + 8).flatMap((p) => p.tags.map((t) => run("INSERT OR IGNORE INTO post_tags(post_id,tag_id) VALUES(?,?)", [p.id, t]))),
    );
  linked += posts.reduce((a, p) => a + p.tags.length, 0);
  console.log(`post-tag links: ${linked}`);
}
console.log("tags done");
