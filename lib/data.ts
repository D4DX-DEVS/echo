import { cache } from "react";
import { q, run } from "./db.ts";
import { cached } from "./cache.ts";

export type Category = { id: number; slug: string; name: string; parent_id: number; sort: number };
export type Post = {
  id: number; slug: string; title: string; excerpt: string; content: string; image: string;
  category_id: number; author: string; status: string; published_at: string; updated_at: string;
};
export type PostCard = Omit<Post, "content">;

const CARD = "id,slug,title,excerpt,image,category_id,author,status,published_at,updated_at";
export const PAGE_SIZE = 24;

// cache(): one query per request even though header, footer and the page all ask for these
export const getCategories = cache(() => q<Category>("SELECT * FROM categories ORDER BY sort, id"));

/** Category id plus all descendants' ids. */
export function withChildren(cats: Category[], id: number): number[] {
  const out = [id];
  for (const c of cats) if (c.parent_id === id) out.push(...withChildren(cats, c.id));
  return out;
}

export function categoryPath(cats: Category[], c: Category): string {
  const parent = cats.find((x) => x.id === c.parent_id);
  return "/" + (parent ? `${parent.slug}/` : "") + c.slug;
}

export async function latest(limit: number, opts: { cats?: number[]; offset?: number; exclude?: number[]; before?: string; tag?: number; video?: boolean } = {}) {
  if (opts.cats?.length && !opts.video && !opts.tag) return latestInCats(limit, opts as { cats: number[]; offset?: number; exclude?: number[]; before?: string });
  const where = ["status='published'"];
  const params: (string | number)[] = [];
  if (opts.video) where.push("has_video = 1");
  if (opts.tag) { where.push("id IN (SELECT post_id FROM post_tags WHERE tag_id = ?)"); params.push(opts.tag); }
  if (opts.before) { where.push("published_at < ?"); params.push(opts.before); }
  if (opts.cats?.length) { where.push(`id IN (SELECT post_id FROM post_categories WHERE category_id IN (${opts.cats.map(() => "?").join(",")}))`); params.push(...opts.cats); }
  if (opts.exclude?.length) { where.push(`id NOT IN (${opts.exclude.map(() => "?").join(",")})`); params.push(...opts.exclude); }
  return q<PostCard>(
    `SELECT ${CARD} FROM posts WHERE ${where.join(" AND ")} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, opts.offset ?? 0],
  );
}

/** Category feed straight off idx_pc_feed: reads about one page of rows however big the category is. */
async function latestInCats(limit: number, opts: { cats: number[]; offset?: number; exclude?: number[]; before?: string }) {
  const offset = opts.offset ?? 0;
  const where = ["category_id = ?", "status='published'"];
  const extra: (string | number)[] = [];
  if (opts.before) { where.push("published_at < ?"); extra.push(opts.before); }
  if (opts.exclude?.length) { where.push(`post_id NOT IN (${opts.exclude.map(() => "?").join(",")})`); extra.push(...opts.exclude); }
  // Newest `limit + offset` of each category, merged: a post in the overall top N is in the top N of its own category,
  // so no category is read beyond N rows (a parent with children used to read all of them, ~6,500 rows).
  const branch = `SELECT post_id, published_at FROM (SELECT post_id, published_at FROM post_categories WHERE ${where.join(" AND ")} ORDER BY published_at DESC LIMIT ?)`;
  const params = opts.cats.flatMap((c) => [c, ...extra, limit + offset]);
  // GROUP BY: a post filed under a parent and a child category must count once
  return q<PostCard>(
    `SELECT ${CARD} FROM posts WHERE id IN (SELECT post_id FROM (SELECT post_id, MAX(published_at) newest FROM (${opts.cats.map(() => branch).join(" UNION ALL ")}) GROUP BY post_id ORDER BY newest DESC LIMIT ? OFFSET ?)) ORDER BY published_at DESC`,
    [...params, limit, offset],
  );
}

// Count of all posts for the admin heading: remembered for 5 minutes per Worker instance (counting reads every row),
// and forgotten as soon as a post is saved or deleted.
let total: { n: number; at: number } | undefined;
export const forgetPostCount = () => { total = undefined; };
export async function postCount() {
  if (!total || Date.now() - total.at > 300_000) total = { n: Number((await q<{ n: number }>("SELECT COUNT(*) n FROM posts"))[0].n), at: Date.now() };
  return total.n;
}

export async function countPosts(cats?: number[]) {
  const w = cats?.length ? ` AND id IN (SELECT post_id FROM post_categories WHERE category_id IN (${cats.map(() => "?").join(",")}))` : "";
  const r = await q<{ n: number }>(`SELECT COUNT(*) n FROM posts WHERE status='published'${w}`, cats ?? []);
  return Number(r[0].n);
}

export type Tag = { id: number; slug: string; name: string };
export const getTag = cache(async (slug: string) => (await q<Tag>("SELECT * FROM tags WHERE slug=?", [slug]))[0]);
export const getPostTags = cache((postId: number) =>
  q<Tag>("SELECT t.* FROM tags t JOIN post_tags pt ON pt.tag_id=t.id WHERE pt.post_id=? ORDER BY t.name", [postId]));

export const getPost = cache(async (slug: string) =>
  (await q<Post>("SELECT * FROM posts WHERE slug=? AND status='published'", [slug]))[0]);
export const getPostById = async (id: number) => (await q<Post>("SELECT * FROM posts WHERE id=?", [id]))[0];
export const getPage = cache(async (slug: string) =>
  (await q<{ id: number; slug: string; title: string; content: string }>("SELECT * FROM pages WHERE slug=?", [slug]))[0]);

export async function search(term: string, limit = PAGE_SIZE, offset = 0) {
  const like = `%${term.replace(/[%_]/g, "")}%`;
  // a search scans every post, so repeat searches come from the shared cache
  return cached(`search:${like}:${limit}:${offset}`, 600, () => q<PostCard>(
    `SELECT ${CARD} FROM posts WHERE status='published' AND (title LIKE ? OR excerpt LIKE ?) ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    [like, like, limit, offset],
  ));
}

export const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, "-").replace(/^-+|-+$/g, "") || `post-${Date.now()}`;

export { q, run };
