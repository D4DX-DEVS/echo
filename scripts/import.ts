// Usage: node --env-file=.env scripts/import.ts [maxPosts]   full import (REPLACES existing posts, resets images/edits)
//        node --env-file=.env scripts/import.ts --new          only posts newer than the newest one in the DB (safe to re-run)
// Pulls categories, pages and posts from theecho.in's public WP REST API into the active DB (local sqlite or D1).
import { initSchema, q, run } from "../lib/db.ts";
import { hasVideo } from "../lib/content.ts";

const WP = "https://theecho.in/wp-json/wp/v2";
const incremental = process.argv.includes("--new");
const max = Number(process.argv.find((a) => /^d+$/.test(a)) || Infinity);

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&hellip;/g, "…").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function get(url: string, tries = 4): Promise<Response> {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
      if (r.status === 400) return r; // past last page
      throw new Error(String(r.status));
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

await initSchema();

if (!incremental) {
// Menu order of the original site.
const order = [58, 59, 60, 61, 17, 16, 18, 22, 23, 72, 1];
const cats = await (await get(`${WP}/categories?per_page=100&_fields=id,name,slug,parent`)).json();
for (const c of cats) {
  const sort = order.indexOf(c.id) + 1 || 99;
  await run("INSERT OR REPLACE INTO categories(id,slug,name,parent_id,sort) VALUES(?,?,?,?,?)", [c.id, c.slug, decode(c.name), c.parent, sort]);
}
console.log(`categories: ${cats.length}`);

const pages = await (await get(`${WP}/pages?per_page=100&slug=contact-page,sample-page&_fields=slug,title,content,modified`)).json();
for (const p of pages) {
  await run("INSERT OR REPLACE INTO pages(slug,title,content,updated_at) VALUES(?,?,?,?)", [p.slug, decode(p.title.rendered), p.content.rendered, p.modified]);
}
console.log(`pages: ${pages.length}`);
}

// Incremental: oldest-first from the newest stored timestamp (WP `after` is exclusive).
const latest = incremental ? (await q<{ t: string }>("SELECT MAX(published_at) t FROM posts"))[0].t : "";
const catRows = await q<{ id: number; parent_id: number }>("SELECT id,parent_id FROM categories");
const parent = new Map(catRows.map((c) => [c.id, c.parent_id]));
const rank = (id: number) => (id === 1 ? 0 : parent.get(id) ? 3 : id === 58 ? 1 : 2);
const primary = (ids: number[]) => [...ids].sort((a, b) => rank(b) - rank(a))[0] ?? 1;
let done = 0;
for (let page = 1; done < max; page++) {
  const res = await get(`${WP}/posts?per_page=100&page=${page}${incremental ? `&order=asc&after=${latest}` : ""}&_embed=wp:featuredmedia,author&_fields=id,date,modified,slug,title,excerpt,content,categories,_links,_embedded`);
  if (!res.ok) break;
  const posts = await res.json();
  if (!posts.length) break;
  for (let i = 0; i < posts.length; i += 8) {
    await Promise.all(
      posts.slice(i, i + 8).map(async (p: any) => {
        await run(
          `INSERT OR ${incremental ? "IGNORE" : "REPLACE"} INTO posts(id,slug,title,excerpt,content,image,category_id,author,status,published_at,updated_at)
           VALUES(?,?,?,?,?,?,?,?,'published',?,?)`,
          [
            p.id,
            decodeURIComponent(p.slug),
            decode(p.title.rendered),
            text(p.excerpt.rendered).slice(0, 300),
            p.content.rendered,
            p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? "",
            primary(p.categories ?? []),
            p._embedded?.author?.[0]?.name ?? "web desk",
            p.date,
            p.modified,
          ],
        );
        await run("UPDATE posts SET has_video=? WHERE id=?", [hasVideo(p.content.rendered) ? 1 : 0, p.id]);
        for (const c of p.categories ?? []) await run("INSERT OR IGNORE INTO post_categories(post_id,category_id) VALUES(?,?)", [p.id, c]);
      }),
    );
  }
  done += posts.length;
  console.log(`posts: ${done}`);
}
console.log("import done");
