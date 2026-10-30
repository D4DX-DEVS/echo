import Link from "next/link";
import { deletePost } from "../actions";
import ConfirmButton from "@/components/ConfirmButton";
import { getCategories, postCount, q, withChildren, type PostCard } from "@/lib/data";
import { fmtDate } from "@/lib/format";

const SIZE = 30;
const COLUMNS = "id,slug,title,status,category_id,published_at";

export type ListParams = { q?: string; status?: string; cat?: string; page?: string };

// D1 bills per row read, so nothing here scans the posts table unless someone types a search.

type Filter = { q?: string; status?: string; ids?: number[]; video?: boolean; offset: number };

async function fetchRows(f: Filter) {
  const take = SIZE + 1; // one extra row tells us whether there is a next page
  if (f.q) {
    // title search has to look at every post: only runs when someone types a search
    const where = ["title LIKE ?"];
    const params: (string | number)[] = [`%${f.q}%`];
    if (f.status) { where.push("status=?"); params.push(f.status); }
    if (f.video) where.push("has_video=1");
    if (f.ids) { where.push(`category_id IN (${f.ids.map(() => "?").join(",")})`); params.push(...f.ids); }
    return q<PostCard>(`SELECT ${COLUMNS} FROM posts WHERE ${where.join(" AND ")} ORDER BY published_at DESC LIMIT ? OFFSET ?`, [...params, take, f.offset]);
  }
  if (f.ids && !f.video) {
    // newest rows of each chosen category (idx_pc_cat_pub / idx_pc_feed), merged: reads about one page per category
    const branch = `SELECT post_id, published_at FROM (SELECT post_id, published_at FROM post_categories WHERE category_id = ?${f.status ? " AND status = ?" : ""} ORDER BY published_at DESC LIMIT ?)`;
    const params = f.ids.flatMap((c) => [c, ...(f.status ? [f.status] : []), f.offset + take]);
    return q<PostCard>(
      `SELECT ${COLUMNS} FROM posts WHERE id IN (SELECT post_id FROM (SELECT post_id, MAX(published_at) newest FROM (${f.ids.map(() => branch).join(" UNION ALL ")}) GROUP BY post_id ORDER BY newest DESC LIMIT ? OFFSET ?)) ORDER BY published_at DESC`,
      [...params, take, f.offset],
    );
  }
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (f.video) where.push("has_video=1");
  if (f.status) { where.push("status=?"); params.push(f.status); }
  if (f.ids) { where.push(`category_id IN (${f.ids.map(() => "?").join(",")})`); params.push(...f.ids); }
  return q<PostCard>(`SELECT ${COLUMNS} FROM posts ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY published_at DESC LIMIT ? OFFSET ?`, [...params, take, f.offset]);
}

export default async function PostList({ sp, base, title, video }: { sp: ListParams; base: string; title: string; video?: boolean }) {
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.status === "draft" || sp.status === "published" ? sp.status : undefined;
  const cats = await getCategories();
  const cat = cats.find((c) => String(c.id) === sp.cat);
  const filtered = !!(sp.q || status || cat);

  const rows = await fetchRows({ q: sp.q?.trim() || undefined, status, ids: cat ? withChildren(cats, cat.id) : undefined, video, offset: (page - 1) * SIZE });
  const hasNext = rows.length > SIZE;
  const shown = rows.slice(0, SIZE);
  // a total is only shown for the plain list of all posts, where it is remembered instead of counted each time
  const count = !filtered && !video ? await postCount() : undefined;
  const link = (p: number) => `${base}?${new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(status && { status }), ...(cat && { cat: String(cat.id) }), page: String(p) })}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-2xl font-extrabold">{title}{count !== undefined && <span className="text-muted text-base font-normal"> ({count})</span>}</h1>
        <Link href="/admin/posts/new" className="btn ml-auto">+ New post</Link>
      </div>
      <form className="flex gap-2 mb-4 flex-wrap">
        <input name="q" aria-label="Search title" defaultValue={sp.q} placeholder="Search title…" className="field !w-64 !rounded-xl" />
        <select name="cat" aria-label="Category" defaultValue={cat ? String(cat.id) : ""} className="field !w-auto !rounded-xl">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "— " : ""}{c.name}</option>)}
        </select>
        <select name="status" aria-label="Status" defaultValue={status ?? ""} className="field !w-auto !rounded-xl">
          <option value="">All</option><option value="published">Published</option><option value="draft">Draft</option>
        </select>
        <button className="btn ghost">Filter</button>
        {filtered && <Link href={base} className="btn ghost">Clear</Link>}
      </form>
      <div className="bg-bg border border-line rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted"><tr><th className="p-3">Title</th><th className="p-3 hidden md:table-cell">Category</th><th className="p-3">Status</th><th className="p-3 hidden md:table-cell">Date</th><th className="p-3" /></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="p-3 max-w-md"><Link href={`/admin/posts/${p.id}`} className="font-medium hover:text-accent line-clamp-2">{p.title}</Link></td>
                <td className="p-3 whitespace-nowrap hidden md:table-cell">{cats.find((c) => c.id === p.category_id)?.name}</td>
                <td className="p-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted capitalize"><span className={`h-2 w-2 rounded-full ${p.status === "draft" ? "bg-muted/60" : "bg-green-600"}`} />{p.status}</span></td>
                <td className="p-3 whitespace-nowrap hidden md:table-cell">{fmtDate(p.published_at)}</td>
                <td className="p-3 whitespace-nowrap text-right">
                  {/* on phones the title already opens the editor; the span hides the buttons (a .btn's own display would beat a hidden class) */}
                  <span className="max-md:hidden">
                    <Link href={`/admin/posts/${p.id}`} className="btn ghost sm mr-2">Edit</Link>
                    <Link href={`/${encodeURIComponent(p.slug)}`} target="_blank" className="btn ghost sm mr-2">View</Link>
                  </span>
                  <form action={deletePost} className="inline"><input type="hidden" name="id" value={p.id} /><ConfirmButton message="Delete this post? This cannot be undone." className="btn danger sm">Delete</ConfirmButton></form>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">{video ? "No video posts" : "No posts"}</td></tr>}
          </tbody>
        </table>
      </div>
      {(page > 1 || hasNext) && (
        <div className="flex gap-3 items-center mt-4 text-sm">
          {page > 1 && <Link className="btn ghost" href={link(page - 1)}>← Prev</Link>}
          <span className="text-muted">Page {page}</span>
          {hasNext && <Link className="btn ghost" href={link(page + 1)}>Next →</Link>}
        </div>
      )}
    </div>
  );
}
