import Link from "next/link";
import { deletePost } from "../actions";
import ConfirmButton from "@/components/ConfirmButton";
import { getCategories, q, type PostCard } from "@/lib/data";
import { fmtDate } from "@/lib/format";

const SIZE = 30;

export default async function Posts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string; saved?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (sp.q) { where.push("title LIKE ?"); params.push(`%${sp.q}%`); }
  if (sp.status === "draft" || sp.status === "published") { where.push("status=?"); params.push(sp.status); }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows, [{ n }], cats] = await Promise.all([
    q<PostCard>(`SELECT id,slug,title,status,category_id,published_at FROM posts ${w} ORDER BY published_at DESC LIMIT ? OFFSET ?`, [...params, SIZE, (page - 1) * SIZE]),
    q<{ n: number }>(`SELECT COUNT(*) n FROM posts ${w}`, params),
    getCategories(),
  ]);
  const pages = Math.ceil(Number(n) / SIZE);
  const link = (p: number) => `/admin?${new URLSearchParams({ ...(sp.q && { q: sp.q }), ...(sp.status && { status: sp.status }), page: String(p) })}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h1 className="text-2xl font-extrabold">Posts <span className="text-muted text-base font-normal">({String(n)})</span></h1>
        <Link href="/admin/posts/new" className="btn ml-auto">+ New post</Link>
      </div>
      <form className="flex gap-2 mb-4 flex-wrap">
        <input name="q" defaultValue={sp.q} placeholder="Search title…" className="field !w-64 !rounded-xl" />
        <select name="status" defaultValue={sp.status ?? ""} className="field !w-auto !rounded-xl">
          <option value="">All</option><option value="published">Published</option><option value="draft">Draft</option>
        </select>
        <button className="btn ghost">Filter</button>
      </form>
      <div className="bg-bg border border-line rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-muted"><tr><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="p-3 max-w-md"><Link href={`/admin/posts/${p.id}`} className="font-medium hover:text-accent line-clamp-2">{p.title}</Link></td>
                <td className="p-3 whitespace-nowrap">{cats.find((c) => c.id === p.category_id)?.name}</td>
                <td className="p-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted capitalize"><span className={`h-2 w-2 rounded-full ${p.status === "draft" ? "bg-muted/60" : "bg-green-600"}`} />{p.status}</span></td>
                <td className="p-3 whitespace-nowrap">{fmtDate(p.published_at)}</td>
                <td className="p-3 whitespace-nowrap text-right">
                  <Link href={`/admin/posts/${p.id}`} className="btn ghost sm mr-2">Edit</Link>
                  <Link href={`/${encodeURIComponent(p.slug)}`} target="_blank" className="btn ghost sm mr-2">View</Link>
                  <form action={deletePost} className="inline"><input type="hidden" name="id" value={p.id} /><ConfirmButton message="Delete this post? This cannot be undone." className="btn danger sm">Delete</ConfirmButton></form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">No posts</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex gap-3 items-center mt-4 text-sm">
          {page > 1 && <Link className="btn ghost" href={link(page - 1)}>← Prev</Link>}
          <span className="text-muted">{page} / {pages}</span>
          {page < pages && <Link className="btn ghost" href={link(page + 1)}>Next →</Link>}
        </div>
      )}
    </div>
  );
}
