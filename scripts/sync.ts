// Usage: node --env-file=.env scripts/sync.ts   (then scripts/migrate-images.ts, or `npm run sync` for both)
// Pulls posts created/changed on WordPress since the last sync. Posts edited in the new admin are never overwritten.
import { initSchema, q, run } from "../lib/db.ts";
import { WP, decode, get, text } from "./wp.ts";
import { hasVideo } from "../lib/content.ts";

await initSchema();
try { await run("ALTER TABLE posts ADD COLUMN admin_edited INTEGER NOT NULL DEFAULT 0"); } catch { /* column exists */ }
try { await run("ALTER TABLE posts ADD COLUMN has_video INTEGER NOT NULL DEFAULT 0"); } catch { /* column exists */ }

const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3600e3).toISOString().slice(0, 19); // IST wall-clock, like stored dates
const since = (await q<{ v: string }>("SELECT v FROM meta WHERE k='last_sync'"))[0]?.v ?? "2026-10-28T00:00:00";
const started = ist(new Date());

const catRows = await q<{ id: number; parent_id: number }>("SELECT id,parent_id FROM categories");
const parent = new Map(catRows.map((c) => [c.id, c.parent_id]));
const rank = (id: number) => (id === 1 ? 0 : parent.get(id) ? 3 : id === 58 ? 1 : 2);
const primary = (ids: number[]) => [...ids].sort((a, b) => rank(b) - rank(a))[0] ?? 1;

let added = 0, updated = 0, skippedAdmin = 0, unchanged = 0;
for (let page = 1; ; page++) {
  const url = `${WP}/posts?per_page=100&page=${page}&orderby=modified&order=asc&modified_after=${encodeURIComponent(since + "+05:30")}&_embed=wp:featuredmedia,author&_fields=id,date,modified,slug,title,excerpt,content,categories,tags,_links,_embedded`;
  const res = await get(url);
  const posts: any[] = res.ok ? await res.json() : [];
  if (!posts.length) break;

  for (const p of posts) {
    const row = (await q<{ id: number; admin_edited: number; updated_at: string }>("SELECT id,admin_edited,updated_at FROM posts WHERE id=?", [p.id]))[0];
    if (row && Number(row.admin_edited)) { skippedAdmin++; continue; }
    if (row && row.updated_at === p.modified) { unchanged++; continue; }

    const vals = [
      decodeURIComponent(p.slug), decode(p.title.rendered), text(p.excerpt.rendered).slice(0, 300), p.content.rendered,
      p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? "", primary(p.categories ?? []),
      p._embedded?.author?.[0]?.name ?? "web desk", p.date, p.modified,
    ];
    if (row) {
      await run("UPDATE posts SET slug=?,title=?,excerpt=?,content=?,image=?,category_id=?,author=?,published_at=?,updated_at=? WHERE id=?", [...vals, p.id]);
      updated++;
    } else {
      await run("INSERT INTO posts(slug,title,excerpt,content,image,category_id,author,published_at,updated_at,id,status) VALUES(?,?,?,?,?,?,?,?,?,?,'published')", [...vals, p.id]);
      added++;
    }

    await run("UPDATE posts SET has_video=? WHERE id=?", [hasVideo(p.content.rendered) ? 1 : 0, p.id]);
    await run("DELETE FROM post_categories WHERE post_id=?", [p.id]);
    for (const c of p.categories ?? []) await run("INSERT OR IGNORE INTO post_categories(post_id,category_id) VALUES(?,?)", [p.id, c]);

    await run("DELETE FROM post_tags WHERE post_id=?", [p.id]);
    for (const t of p.tags ?? []) {
      if (!(await q("SELECT 1 FROM tags WHERE id=?", [t])).length) {
        const tr = await get(`${WP}/tags/${t}?_fields=id,name,slug`);
        if (tr.ok) { const tag = await tr.json(); await run("INSERT OR REPLACE INTO tags(id,slug,name) VALUES(?,?,?)", [tag.id, decodeURIComponent(tag.slug), decode(tag.name)]); }
      }
      await run("INSERT OR IGNORE INTO post_tags(post_id,tag_id) VALUES(?,?)", [p.id, t]);
    }
  }
}

await run("INSERT OR REPLACE INTO meta(k,v) VALUES('last_sync',?)", [started]);
console.log(`sync done: ${added} new, ${updated} updated, ${unchanged} unchanged, ${skippedAdmin} skipped (edited in admin)`);
