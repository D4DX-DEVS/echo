import type { Metadata } from "next";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/Pagination";
import { PAGE_SIZE, search } from "@/lib/data";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page: p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const term = q.trim();
  const rows = term ? await search(term, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE) : [];
  const posts = rows.slice(0, PAGE_SIZE);

  return (
    <div className="wrap py-8">
      <h1 className="sr-only">Search</h1>
      <form action="/search" className="max-w-xl mb-8 flex gap-2">
        <input name="q" defaultValue={term} placeholder="Search news…" className="field" autoFocus />
        <button className="btn">Search</button>
      </form>
      {term && posts.length === 0 && <p className="text-muted">No results for “{term}”.</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((x) => <PostCard key={x.id} post={x} />)}
      </div>
      {term && <Pagination base="" page={page} pages={rows.length > PAGE_SIZE ? page + 1 : page} query={term} />}
    </div>
  );
}
