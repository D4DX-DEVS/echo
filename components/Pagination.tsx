import Link from "next/link";

/** base: path without trailing slash. Pages 2+ live at `${base}/page/N`; search uses ?q=. */
export default function Pagination({ base, page, pages, query }: { base: string; page: number; pages: number; query?: string }) {
  if (pages <= 1) return null;
  const href = (n: number) => (query !== undefined ? `/search?q=${encodeURIComponent(query)}&page=${n}` : n === 1 ? base || "/" : `${base}/page/${n}`);
  return (
    <nav className="flex justify-center items-center gap-3 mt-10 text-sm">
      {page > 1 && <Link className="btn ghost" href={href(page - 1)}>← Newer</Link>}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages && <Link className="btn ghost" href={href(page + 1)}>Older →</Link>}
    </nav>
  );
}
