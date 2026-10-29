"use client";
import { useState } from "react";
import PostCard from "./PostCard";
import type { PostCard as P } from "@/lib/data";

const PAGE = 8;
const grid = "grid gap-6 sm:grid-cols-2 lg:grid-cols-4";

const Skeleton = () => (
  <div className="rounded-xl overflow-hidden bg-bg border border-line animate-pulse">
    <div className="aspect-[16/10] bg-surface" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-3.5 rounded bg-surface" />
      <div className="h-3.5 rounded bg-surface w-4/5" />
      <div className="h-3 rounded bg-surface w-1/3" />
    </div>
  </div>
);

export default function LoadMore({ cat, tag, before, video, names }: { cat?: string; tag?: string; before: string; video?: boolean; names?: Record<number, string> }) {
  const [posts, setPosts] = useState<P[]>([]);
  const [cursor, setCursor] = useState(before);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const more = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/posts?${video ? "video=1" : tag ? `tag=${encodeURIComponent(tag)}` : `cat=${cat}`}&before=${encodeURIComponent(cursor)}&limit=${PAGE}`);
      if (!res.ok) throw new Error(String(res.status));
      const rows: P[] = await res.json();
      setPosts((p) => [...p, ...rows]);
      if (rows.length) setCursor(rows[rows.length - 1].published_at);
      if (rows.length < PAGE) setDone(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div aria-live="polite">
      {(posts.length > 0 || busy) && (
        <div className={`${grid} mt-6`}>
          {posts.map((p) => (
            <div key={p.id} className="card-in">
              <PostCard post={p} video={video} label={names?.[p.category_id]} />
            </div>
          ))}
          {busy && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} />)}
        </div>
      )}

      <div className="text-center mt-10">
        {failed && <p className="text-sm text-accent mb-3">Couldn&apos;t load more stories. Please try again.</p>}
        {done ? (
          <p className="text-sm text-muted flex items-center gap-3 before:flex-1 before:h-px before:bg-line after:flex-1 after:h-px after:bg-line">You&apos;re all caught up</p>
        ) : (
          <button
            onClick={more}
            disabled={busy}
            className="btn-outline inline-flex items-center gap-2 rounded-full px-8 py-2 text-sm font-semibold active:scale-95 transition disabled:opacity-70 disabled:cursor-wait"
          >
            {busy ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 3a9 9 0 1 0 9 9" /></svg>
                Loading
              </>
            ) : (
              <>
                {failed ? "Try again" : "Load more"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
