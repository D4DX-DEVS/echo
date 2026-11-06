"use client";
import { useEffect, useState } from "react";
import { DEV, SRC, int } from "@/lib/analytics-format";

type Live = { readers: number; reading: { title: string; cat: string; n: number }[]; cats: { k: string; n: number }[]; devs: { k: string; n: number }[]; srcs: { k: string; n: number }[]; bars: number[] };

/** Readers in the last 2 minutes; refreshes itself every 15 seconds without reloading the page. */
export default function LiveNow() {
  const [d, setD] = useState<Live | null>(null);
  useEffect(() => {
    let stop = false;
    const load = () => fetch("/api/live").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && !stop) setD(j); }).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => { stop = true; clearInterval(t); };
  }, []);
  const max = Math.max(1, ...(d?.bars ?? []));
  const line = (k: string, n: number, map?: Record<string, string>) => <div key={k} className="flex justify-between text-sm py-1"><span>{map?.[k] ?? k}</span><span className="font-semibold">{n}</span></div>;
  return (
    <section className="bg-bg border border-line rounded-2xl p-4 md:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg">Live now</h2>
          <p className="text-sm text-muted">Readers seen in the last 2 minutes. Updates every 15 seconds.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Live</span>
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-4xl font-extrabold">{d ? int(d.readers) : "–"}</p>
          <p className="text-sm text-muted mb-4">{d?.readers === 1 ? "reader" : "readers"} on the site</p>
          <p className="text-xs text-muted mb-1">Page views started, last 30 minutes</p>
          <div className="flex items-end gap-[3px] h-16" role="img" aria-label="Page views per minute, last 30 minutes">
            {(d?.bars ?? Array(30).fill(0)).map((n, i) => <span key={i} title={`${n}`} className="flex-1 rounded-sm bg-brand-text/80" style={{ height: `${n ? Math.max(8, (n / max) * 100) : 3}%`, opacity: n ? 1 : 0.25 }} />)}
          </div>
          <div className="flex justify-between text-[11px] text-muted mt-1"><span>30 min ago</span><span>now</span></div>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-1">Being read now</p>
            {d?.reading.length ? d.reading.map((r) => (
              <div key={r.title} className="flex justify-between gap-3 py-1.5 border-t border-line first:border-0 text-sm">
                <span className="min-w-0"><span className="block truncate">{r.title}</span><span className="text-xs text-muted">{r.cat}</span></span>
                <span className="font-semibold">{r.n}</span>
              </div>
            )) : <p className="text-sm text-muted">No one is reading an article right now.</p>}
          </div>
          {!!d?.cats.length && <div><p className="text-xs text-muted">Readers by category now</p>{d.cats.map((c) => line(c.k, c.n))}</div>}
          {!!d?.devs.length && <div className="grid grid-cols-2 gap-x-6">
            <div>{d.devs.map((c) => line(c.k, c.n, DEV))}</div>
            <div>{d.srcs.map((c) => line(c.k, c.n, SRC))}</div>
          </div>}
        </div>
      </div>
    </section>
  );
}
