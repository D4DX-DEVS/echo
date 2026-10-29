// Usage: node --env-file=.env scripts/sync-categories.ts
// Fills post_categories with every WP category of every post and sets posts.category_id to the most specific one.
// Touches nothing else (safe after the image migration).
import { initSchema, q, run } from "../lib/db.ts";

await initSchema();
const cats = await q<{ id: number; parent_id: number }>("SELECT id,parent_id FROM categories");
const parent = new Map(cats.map((c) => [c.id, c.parent_id]));
// child categories beat top-level ones, "uncategorized" (1) loses to everything
const rank = (id: number) => (id === 1 ? 0 : parent.get(id) ? 3 : [58].includes(id) ? 1 : 2);

let n = 0;
for (let page = 1; ; page++) {
  const res = await fetch(`https://theecho.in/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=id,categories`);
  if (!res.ok) break;
  const posts: { id: number; categories: number[] }[] = await res.json();
  if (!posts.length) break;
  for (let i = 0; i < posts.length; i += 8)
    await Promise.all(
      posts.slice(i, i + 8).map(async (p) => {
        const ids = p.categories.filter((c) => parent.has(c));
        for (const c of ids) await run("INSERT OR IGNORE INTO post_categories(post_id,category_id) VALUES(?,?)", [p.id, c]);
        if (ids.length) await run("UPDATE posts SET category_id=? WHERE id=?", [[...ids].sort((a, b) => rank(b) - rank(a))[0], p.id]);
      }),
    );
  n += posts.length;
  console.log(`synced ${n}`);
}
console.log("sync done");
