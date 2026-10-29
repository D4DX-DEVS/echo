import Link from "next/link";
import { deletePage, savePage } from "../../actions";
import { q } from "@/lib/data";
import ConfirmButton from "@/components/ConfirmButton";

export default async function Pages({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const pages = await q<{ slug: string; title: string; content: string }>("SELECT slug,title,content FROM pages ORDER BY title");
  const cur = pages.find((p) => p.slug === edit);
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold mb-4">Pages</h1>
      <ul className="mb-8 divide-y divide-line bg-bg border border-line rounded-2xl shadow-sm">
        {pages.map((p) => (
          <li key={p.slug} className="flex items-center gap-3 p-3">
            <Link href={`/admin/pages?edit=${encodeURIComponent(p.slug)}`} className="font-medium hover:text-accent">{p.title}</Link>
            <span className="text-xs text-muted">/{p.slug}</span>
            <form action={deletePage} className="ml-auto"><input type="hidden" name="slug" value={p.slug} /><ConfirmButton message="Delete this page?" className="btn danger sm">Delete</ConfirmButton></form>
          </li>
        ))}
      </ul>
      <form action={savePage} key={cur?.slug ?? "new"} className="space-y-3">
        <h2 className="font-bold">{cur ? `Edit “${cur.title}”` : "New page"}</h2>
        <input name="title" defaultValue={cur?.title} placeholder="Title" className="field" required />
        <input name="slug" defaultValue={cur?.slug} placeholder="slug (URL)" className="field" />
        <textarea name="content" defaultValue={cur?.content} rows={14} placeholder="HTML content" className="field font-mono !text-sm" />
        <button className="btn">Save page</button>
      </form>
    </div>
  );
}
