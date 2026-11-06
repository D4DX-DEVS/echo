import Link from "next/link";
import { deleteAnalytics } from "../../actions";
import { PAGE, analytics, type Sp } from "@/lib/analytics";
import { DEV, KIND, SRC, dur, int, pct } from "@/lib/analytics-format";
import { getCategories } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import AreaChart from "@/components/AreaChart";
import AutoForm from "@/components/AutoForm";
import ConfirmButton from "@/components/ConfirmButton";
import LiveNow from "@/components/LiveNow";

export const metadata = { title: "Analytics" };

type R = Record<string, number | string | null>;
const PAGE_KEYS = ["ap", "cp", "rp", "mp", "ep", "tp", "lp", "sp2", "gp", "pp"];
const card = "bg-bg border border-line rounded-2xl p-4 md:p-5 shadow-sm";
const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export default async function Analytics({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const [a, cats] = await Promise.all([analytics(sp), getCategories()]);
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));

  /** This page's URL with some parameters replaced; `reset` also drops list paging, for when the data set changes. */
  const href = (over: Record<string, string | undefined>, reset = false) => {
    const u = new URLSearchParams();
    for (const k of Object.keys(sp)) { const v = get(k); if (v && !(reset && PAGE_KEYS.includes(k))) u.set(k, v); }
    for (const [k, v] of Object.entries(over)) { if (v === undefined) u.delete(k); else u.set(k, v); }
    return `/admin/analytics${u.size ? `?${u}` : ""}`;
  };
  const hidden = (except: string[]) => Object.keys(sp).filter((k) => !except.includes(k) && get(k)).map((k) => <input key={k} type="hidden" name={k} value={get(k)} />);

  const { t, tPrev } = a;
  const delta = (c: number, p: number) => (p ? `${c >= p ? "+" : "−"}${Math.abs(((c - p) / p) * 100).toFixed(1).replace(/\.0$/, "")}% vs previous period` : "No earlier data to compare");
  const avgArt = (x: typeof t) => (x.arts ? x.artTime / x.arts : 0);
  const tiles: [string, string, string][] = [
    ["Page views", int(t.views), delta(t.views, tPrev.views)],
    ["Unique visitors", int(t.uniq), delta(t.uniq, tPrev.uniq)],
    ["Total reading time", dur(t.total), delta(t.total, tPrev.total)],
    ["Avg. time per article", t.arts ? dur(avgArt(t)) : "–", delta(avgArt(t), avgArt(tPrev))],
    ["Finished articles", pct(t.fin, t.arts), "Views that scrolled to 90%"],
    ["Avg. scroll depth", `${Math.round(t.scr)}%`, "How far down articles get read"],
    ["Engagement rate", t.sessions ? pct(t.sessions - t.bounce, t.sessions) : "–", t.sessions ? `Bounce rate ${pct(t.bounce, t.sessions)} · ${(t.views / t.sessions).toFixed(1)} pages per session` : "No sessions yet"],
    ["Returning visitors", int(t.retv), `${int(t.uniq - t.retv)} new visitors`],
  ];

  const Pager = ({ k, n, label }: { k: string; n: number; label: string }) => {
    const page = Math.min(Math.max(1, Number(get(k)) || 1), Math.max(1, Math.ceil(n / PAGE)));
    const pages = Math.max(1, Math.ceil(n / PAGE));
    const arrow = (to: number, ok: boolean, d: string, name: string) =>
      ok ? <Link href={href({ [k]: String(to) })} aria-label={name} className="btn ghost sm !px-2">{d}</Link> : <span aria-hidden className="btn ghost sm !px-2 opacity-40">{d}</span>;
    return (
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-line text-xs text-muted">
        <span>Page {page} of {pages} · {int(n)} {label}</span>
        <span className="flex gap-1.5">{arrow(page - 1, page > 1, "‹", "Previous page")}{arrow(page + 1, page < pages, "›", "Next page")}</span>
      </div>
    );
  };
  const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted bg-surface rounded-lg px-3 py-3">{children}</p>;
  const Title = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (<><h2 className="font-bold text-lg">{children}</h2>{sub && <p className="text-sm text-muted mt-0.5 mb-3">{sub}</p>}</>);
  const Rank = ({ i, title, sub, right, note, to }: { i: number; title: string; sub?: string; right: string; note?: string; to?: string }) => (
    <li className="flex items-center gap-3 py-2.5 border-t border-line first:border-0">
      <span className="w-6 h-6 shrink-0 grid place-items-center rounded-full bg-surface text-brand-text text-xs font-bold">{i}</span>
      <span className="min-w-0 flex-1">
        {to ? <Link href={to} className="block text-sm font-semibold leading-snug hover:text-brand-text">{title}</Link> : <span className="block text-sm font-semibold leading-snug">{title}</span>}
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </span>
      <span className="text-right shrink-0"><span className="block text-sm font-bold">{right}</span>{note && <span className="block text-xs text-muted">{note}</span>}</span>
    </li>
  );
  const artRank = (rows: R[], page: string, right: (r: R) => [string, string?]) =>
    rows.map((r, i) => <Rank key={Number(r.id)} i={(Math.max(1, Number(get(page)) || 1) - 1) * PAGE + i + 1} title={String(r.title)} sub={String(r.cat ?? "")} right={right(r)[0]} note={right(r)[1]} to={href({ post: String(r.id) }, true)} />);
  const bars = (rows: R[], total: number, map: Record<string, string> | undefined, param?: string) => (
    <ul className="space-y-3">
      {rows.map((r) => {
        const k = String(r.k), n = Number(r.n);
        const inner = <><span className="flex justify-between gap-2 text-sm"><span className="min-w-0 truncate">{map?.[k] ?? (k || "Unknown")}</span><span className="shrink-0"><b>{int(n)}</b> <span className="text-xs text-muted">{pct(n, total)}</span></span></span><span className="block h-1.5 mt-1 rounded bg-surface"><span className="block h-full rounded bg-brand-text" style={{ width: pct(n, total, 0) }} /></span></>;
        return <li key={k}>{param ? <Link href={href({ [param]: k }, true)} className="block hover:opacity-80">{inner}</Link> : inner}</li>;
      })}
    </ul>
  );
  const Insight = ({ title, sub, rows, k, right, empty }: { title: string; sub: string; rows: typeof a.insights.trending; k: string; right: (r: (typeof rows)[number]) => [string, string?]; empty: string }) => {
    const page = Math.min(Math.max(1, Number(get(k)) || 1), Math.max(1, Math.ceil(rows.length / PAGE)));
    return (
      <section className={card}>
        <Title sub={sub}>{title}</Title>
        {rows.length ? <ul>{rows.slice((page - 1) * PAGE, page * PAGE).map((r, i) => <Rank key={r.id} i={(page - 1) * PAGE + i + 1} title={r.title} sub={r.cat} right={right(r)[0]} note={right(r)[1]} to={href({ post: String(r.id) }, true)} />)}</ul> : <Empty>{empty}</Empty>}
        {rows.length > PAGE && <Pager k={k} n={rows.length} label="articles" />}
      </section>
    );
  };

  const n0 = (rows: R[], key = "n") => Number(rows[0]?.[key] ?? 0);
  const filters = [
    a.filter.post && `Article: ${a.perf[0]?.title ?? `#${a.filter.post}`}`,
    a.filter.cat && `Category: ${cats.find((c) => c.id === a.filter.cat)?.name ?? a.filter.cat}`,
    a.filter.src && `Source: ${SRC[a.filter.src]}`,
    a.filter.dev && `Device: ${DEV[a.filter.dev]}`,
  ].filter(Boolean);
  const retViews = (k: number) => Number(a.rets.find((r) => Number(r.k) === k)?.n ?? 0);
  const devTotal = a.devs.reduce((s, r) => s + Number(r.n), 0);
  const first = a.first ? new Date((a.first + 19800) * 1000) : null;
  const firstText = first?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const updated = new Date((a.now + 19800) * 1000).toISOString().slice(11, 16);
  const tab = (key: string, label: string) => (
    <Link key={key} href={href(key === "custom" ? { r: key, from: a.from, to: a.to } : { r: key === "30" ? undefined : key, from: undefined, to: undefined }, true)} aria-current={a.key === key ? "true" : undefined}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${a.key === key ? "bg-nav text-white" : "text-muted hover:text-brand-text"}`}>{label}</Link>
  );
  const select = (name: string, value: string | number, all: string, opts: [string | number, string][]) => (
    <select name={name} aria-label={all} defaultValue={value || ""} className="field !w-auto !py-1.5 text-sm">
      <option value="">{all}</option>
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-brand-text">Readers</p>
          <h1 className="text-2xl font-extrabold">Analytics</h1>
          <p className="text-sm text-muted mt-1 max-w-xl">What readers open, how long they actively read, how far down they get and where they come from. Anonymous, from this site only, kept for 30 days.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {firstText && <span>Data from {firstText} · updated {updated}</span>}
          <Link href={href({})} className="btn ghost sm">Refresh</Link>
          <form action={deleteAnalytics}><ConfirmButton message="Delete all analytics data? This cannot be undone." className="btn danger sm">Delete data</ConfirmButton></form>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1">
          {tab("today", "Today")}{tab("7", "7 days")}{tab("30", "30 days")}{tab("custom", "Custom")}
        </div>
        <AutoForm className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="r" value={a.key} />
          {hidden(["cat", "dev", "src", "vis", "from", "to", "r", ...PAGE_KEYS])}
          {a.key === "custom" && <><input type="date" name="from" aria-label="From" defaultValue={a.from} className="field !w-auto !py-1.5 text-sm" /><input type="date" name="to" aria-label="To" defaultValue={a.to} className="field !w-auto !py-1.5 text-sm" /></>}
          {select("cat", a.filter.cat, "All categories", cats.map((c) => [c.id, `${c.parent_id ? "— " : ""}${c.name}`]))}
          {select("dev", a.filter.dev, "All devices", Object.entries(DEV))}
          {select("src", a.filter.src, "All sources", Object.entries(SRC))}
          {select("vis", a.filter.vis, "New and returning", [["new", "New visitors"], ["returning", "Returning visitors"]])}
        </AutoForm>
        {filters.length > 0 && (
          <p className="text-sm text-muted">Filtered by {filters.join(" · ")} · <Link href={href({ post: undefined, cat: undefined, src: undefined, dev: undefined, vis: undefined }, true)} className="text-brand-text font-semibold">Clear</Link></p>
        )}
      </div>

      {first && a.first > a.start && (
        <p className="text-sm rounded-lg bg-surface text-brand-text px-4 py-3">Collection began on {firstText}, so days before that show no readers. That is a gap in the record, not a quiet spell.</p>
      )}
      {!a.first && <p className="text-sm rounded-lg bg-surface text-brand-text px-4 py-3">No readers recorded yet. Statistics appear here as visitors open stories on the site.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <Title sub="Total active reading time in this period. Select one to see only that article.">Articles readers spend time on</Title>
          {a.artTime.length ? <ul>{artRank(a.artTime, "ap", (r) => [dur(Number(r.tot)), `${int(Number(r.views))} views · ${dur(Number(r.avg))} avg`])}</ul> : <Empty>No article reading in this period.</Empty>}
          <Pager k="ap" n={n0(a.artTime, "n")} label="articles" />
        </section>
        <section className={card}>
          <Title sub="Active reading time on each category’s articles. Select one to filter.">Categories readers spend time on</Title>
          {a.catTime.length ? (
            <ul className="space-y-3.5">
              {a.catTime.map((c) => (
                <li key={Number(c.id)}>
                  <Link href={href({ cat: String(c.id) }, true)} className="block hover:opacity-80">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm"><b>{String(c.name)}</b><span><b>{dur(Number(c.tot))}</b> <span className="text-xs text-muted">{pct(Number(c.tot), t.artTime)} of reading time · {int(Number(c.views))} views · {dur(Number(c.avg))} avg</span></span></span>
                    <span className="block h-1.5 mt-1 rounded bg-surface"><span className="block h-full rounded bg-brand-text" style={{ width: pct(Number(c.tot), t.artTime, 0) }} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty>No category reading in this period.</Empty>}
          <Pager k="cp" n={n0(a.catTime, "n")} label="categories" />
        </section>
      </div>

      <LiveNow />

      <section className={card}>
        <Title sub="Every page in this period.">Site totals</Title>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map(([label, value, sub]) => (
            <div key={label} className="rounded-xl bg-surface px-4 py-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="text-2xl font-extrabold mt-0.5">{value}</p>
              <p className="text-xs text-muted mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <Title sub="Every page, IST days.">Page views per day</Title>
          <AreaChart label="Page views per day" data={a.series.map((d) => ({ label: dayLabel(d.d), value: d.views }))} format={int} />
        </section>
        <section className={card}>
          <Title sub="Active time only: a hidden tab or an idle reader does not count.">Reading time per day</Title>
          <AreaChart label="Reading time per day" data={a.series.map((d) => ({ label: dayLabel(d.d), value: d.time }))} format={(v) => (v >= 3600 ? `${(v / 3600).toFixed(1).replace(/\.0$/, "")}h` : v >= 60 ? `${Math.round(v / 60)}m` : `${Math.round(v)}s`)} />
        </section>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <section className={card}>
          <Title sub="Page views by kind of page.">What people open</Title>
          {a.kinds.length ? bars(a.kinds, t.views, KIND) : <Empty>No page views yet.</Empty>}
        </section>
        <section className={card}>
          <Title sub="Where each view came from. Select one to filter.">Traffic sources</Title>
          {a.srcs.length ? bars(a.srcs, t.views, SRC, "src") : <Empty>No page views yet.</Empty>}
        </section>
        <section className={card}>
          <Title sub="Search engines, social networks and other sites that sent readers.">Referring sites</Title>
          {a.refs.length ? bars(a.refs, t.views, undefined) : <Empty>No referring sites yet.</Empty>}
          <Pager k="rp" n={n0(a.refs, "tn")} label="sites" />
        </section>
        <section className={card}>
          <Title sub="Select a device to filter.">Devices and visitors</Title>
          {a.devs.length ? bars(a.devs, devTotal, DEV, "dev") : <Empty>No page views yet.</Empty>}
          {a.devs.length > 0 && (
            <div className="mt-5">
              <p className="text-[11px] font-semibold text-muted tracking-wide">PAGE VIEWS BY VISITOR</p>
              <div className="flex h-2 rounded overflow-hidden mt-2 bg-surface"><span className="bg-green-500" style={{ width: pct(retViews(0), t.views, 0) }} /><span className="bg-brand-text" style={{ width: pct(retViews(1), t.views, 0) }} /></div>
              <p className="flex justify-between text-xs mt-2"><span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />New <b>{int(retViews(0))}</b> <span className="text-muted">{pct(retViews(0), t.views)}</span></span><span><span className="inline-block w-2 h-2 rounded-full bg-brand-text mr-1" />Returning <b>{int(retViews(1))}</b> <span className="text-muted">{pct(retViews(1), t.views)}</span></span></p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <Title sub="Articles with the most views.">Most read</Title>
          {a.mostRead.length ? <ul>{artRank(a.mostRead, "mp", (r) => [int(Number(r.views)), "views"])}</ul> : <Empty>No article views yet.</Empty>}
          <Pager k="mp" n={n0(a.mostRead, "n")} label="articles" />
        </section>
        <section className={card}>
          <Title sub="Longest average reading time, among articles with 10+ views.">Most engaging</Title>
          {a.engaging.length ? <ul>{artRank(a.engaging, "ep", (r) => [dur(Number(r.avg)), "avg. read"])}</ul> : <Empty>No article has 10 views yet.</Empty>}
          <Pager k="ep" n={n0(a.engaging, "n")} label="articles" />
        </section>
      </div>

      <div>
        <Title sub={`Drawn from ${a.insights.count} articles with at least 10 views.`}>Insights</Title>
        <div className="grid gap-6 lg:grid-cols-2 mt-3">
          <Insight title="Trending" sub="Biggest rise in views against the previous period." rows={a.insights.trending} k="tp" right={(r) => [`+${int(r.cur - r.prev)}`]} empty="Needs a previous period with data to compare." />
          <Insight title="Losing readers" sub="Biggest drop in views against the previous period." rows={a.insights.losing} k="lp" right={(r) => [`−${int(r.prev - r.cur)}`]} empty="Needs a previous period with data to compare." />
          <Insight title="Opened but skimmed" sub="Many views, under half of the typical reading time: check the headline promise, the opening or the length." rows={a.insights.skimmed} k="sp2" right={(r) => [dur(r.avg), `${int(r.cur)} views`]} empty="No article stands out as skimmed, or there are not enough articles to judge yet." />
          <Insight title="Hidden gems" sub="Fewer views, top-quarter reading time: worth promoting." rows={a.insights.gems} k="gp" right={(r) => [`${int(r.cur)} views`, `${dur(r.avg)} avg · ${pct(r.fin, 1)} finished`]} empty="No hidden gems found yet." />
        </div>
      </div>

      <section className={card}>
        <Title sub="Every article read in this period. Select a row for its full breakdown.">Article performance</Title>
        <AutoForm className="flex flex-wrap items-center justify-between gap-3 mb-3">
          {hidden(["pq", "rows", "pp"])}
          <input type="search" name="pq" defaultValue={a.perfQ} placeholder="Search by title or id…" aria-label="Search articles" className="field !w-full sm:!w-72 !py-1.5 text-sm" />
          <label className="flex items-center gap-2 text-sm text-muted">Rows
            <select name="rows" defaultValue={a.perfRows} className="field !w-auto !py-1.5 text-sm">{[10, 20, 50, 100].map((n) => <option key={n}>{n}</option>)}</select>
          </label>
        </AutoForm>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-muted tracking-wide">
                <th className="py-2 pr-3">ARTICLE</th>{["VIEWS", "VISITORS", "AVG. TIME", "TOTAL TIME", "AVG. SCROLL", "FINISHED", "CHANGE", "PUBLISHED"].map((h) => <th key={h} className="py-2 px-2 text-right whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {a.perf.map((r) => {
                const prev = a.prevViews.get(Number(r.id)) ?? 0, views = Number(r.views);
                return (
                  <tr key={Number(r.id)} className="border-t border-line align-top">
                    <td className="py-2.5 pr-3 max-w-xs"><Link href={href({ post: String(r.id) }, true)} className="font-semibold leading-snug hover:text-brand-text">{String(r.title)}</Link><span className="block text-xs text-muted">{String(r.cat ?? "")}</span></td>
                    <td className="py-2.5 px-2 text-right font-semibold">{int(views)}</td>
                    <td className="py-2.5 px-2 text-right">{int(Number(r.vis))}</td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">{dur(Number(r.avg))}</td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">{dur(Number(r.tot))}</td>
                    <td className="py-2.5 px-2 text-right">{Math.round(Number(r.scr))}%</td>
                    <td className="py-2.5 px-2 text-right">{pct(Number(r.fin), 1)}</td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">{prev ? <span className={views >= prev ? "text-green-600 dark:text-green-400" : "text-accent"}>{views >= prev ? "+" : "−"}{Math.abs(((views - prev) / prev) * 100).toFixed(0)}%</span> : "New"}</td>
                    <td className="py-2.5 pl-2 text-right whitespace-nowrap text-muted">{fmtDate(String(r.published_at))}</td>
                  </tr>
                );
              })}
              {!a.perf.length && <tr><td colSpan={9} className="py-6 text-center text-muted">{a.perfQ ? "No article matches that search." : "No article reading in this period."}</td></tr>}
            </tbody>
          </table>
        </div>
        {(() => {
          const n = n0(a.perf, "n"), pages = Math.max(1, Math.ceil(n / a.perfRows)), page = Math.min(a.perfPage, pages);
          const arrow = (to: number, ok: boolean, d: string, name: string) => ok ? <Link href={href({ pp: String(to) })} aria-label={name} className="btn ghost sm !px-2">{d}</Link> : <span aria-hidden className="btn ghost sm !px-2 opacity-40">{d}</span>;
          return (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-line text-xs text-muted">
              <span>{int(n)} articles · Page {page} of {pages}</span>
              <span className="flex gap-1.5">{arrow(page - 1, page > 1, "‹", "Previous page")}{arrow(page + 1, page < pages, "›", "Next page")}</span>
            </div>
          );
        })()}
      </section>
    </div>
  );
}
