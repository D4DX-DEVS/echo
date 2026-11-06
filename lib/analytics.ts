import { q, run } from "./db.ts";
import { PV_SCHEMA } from "./schema.ts";

// Reading statistics for the admin Analytics page. Rows come from /api/collect (table pv); everything is summed in SQL so
// the Worker only formats small result sets. Days are IST days, like the rest of the site.
export type Sp = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export const PAGE = 5;
const DAY = 86400, IST = 19800, KEEP_DAYS = 30;
const dayStart = (d: string) => Date.parse(`${d}T00:00:00Z`) / 1000 - IST;
export const istDay = (t: number) => new Date((t + IST) * 1000).toISOString().slice(0, 10);

let ready: Promise<void> | undefined;
/** Creates the pv table on first use, so a deploy needs no separate migration. */
export const ensurePv = () => (ready ??= (async () => { for (const s of PV_SCHEMA) await run(s); })().catch((e) => { ready = undefined; throw e; }));

export const pageOf = (sp: Sp, key: string) => Math.max(1, Number(one(sp[key])) || 1);

function range(sp: Sp, now: number) {
  const todayStart = dayStart(istDay(now));
  const valid = (d?: string) => !!d && /^\d{4}-\d\d-\d\d$/.test(d) && !isNaN(dayStart(d));
  const r = one(sp.r);
  let start = todayStart - 29 * DAY, end = todayStart + DAY, key = "30";
  if (r === "today") { start = todayStart; key = "today"; }
  else if (r === "7") { start = todayStart - 6 * DAY; key = "7"; }
  else if (r === "custom" && valid(one(sp.from))) {
    key = "custom";
    start = dayStart(one(sp.from)!);
    end = Math.min(Math.max(valid(one(sp.to)) ? dayStart(one(sp.to)!) + DAY : end, start + DAY), start + 366 * DAY);
  }
  return { key, start, end };
}

type Row = Record<string, number | string | null>;
const num = (v: unknown) => Number(v) || 0;

export async function analytics(sp: Sp) {
  await ensurePv();
  const now = Math.floor(Date.now() / 1000);
  await run("DELETE FROM pv WHERE t<?", [now - KEEP_DAYS * DAY]);
  const { key, start, end } = range(sp, now);
  const prevStart = start - (end - start);

  const conds: string[] = [], fp: (string | number)[] = [];
  const cat = Number(one(sp.cat)) || 0, post = Number(one(sp.post)) || 0;
  const dev = one(sp.dev), src = one(sp.src), vis = one(sp.vis);
  if (cat) { conds.push("pv.cat=?"); fp.push(cat); }
  if (post) { conds.push("pv.post=?"); fp.push(post); }
  if (["mobile", "tablet", "desktop"].includes(dev ?? "")) { conds.push("pv.dev=?"); fp.push(dev!); }
  if (["internal", "direct", "search", "social", "campaign", "other"].includes(src ?? "")) { conds.push("pv.src=?"); fp.push(src!); }
  if (vis === "new" || vis === "returning") conds.push(`pv.ret=${vis === "new" ? 0 : 1}`);
  const F = conds.map((c) => ` AND ${c}`).join("");
  const W = `pv.t>=? AND pv.t<?${F}`;
  const cur: (string | number)[] = [start, end, ...fp];

  const totals = async (a: number, b: number) => {
    const p = [a, b, ...fp];
    const [r] = await q<Row>(
      `SELECT COUNT(*) views, COUNT(DISTINCT vid) uniq, COALESCE(SUM(active),0) total, COUNT(DISTINCT sid) sessions,
        COUNT(DISTINCT CASE WHEN ret=1 THEN vid END) retv, COALESCE(SUM(kind='article'),0) arts,
        COALESCE(SUM(CASE WHEN kind='article' THEN active END),0) artTime, COALESCE(AVG(CASE WHEN kind='article' THEN scroll END),0) scr,
        COALESCE(SUM(kind='article' AND scroll>=90),0) fin FROM pv WHERE ${W}`, p);
    const [b1] = await q<Row>(`SELECT COUNT(*) n FROM (SELECT 1 FROM pv WHERE ${W} GROUP BY sid HAVING COUNT(*)=1)`, p);
    return Object.fromEntries([...Object.entries(r), ["bounce", num(b1.n)]].map(([k, v]) => [k, num(v)])) as Record<string, number>;
  };
  // an article row: views, visitors, reading time, scroll, share that scrolled to 90%
  const ARTICLE = `SELECT p.id, p.title, c.name cat, p.published_at, COUNT(*) views, COUNT(DISTINCT pv.vid) vis, SUM(pv.active) tot, AVG(pv.active) avg,
      AVG(pv.scroll) scr, SUM(pv.scroll>=90)*1.0/COUNT(*) fin, COUNT(*) OVER () n
    FROM pv JOIN posts p ON p.id=pv.post LEFT JOIN categories c ON c.id=p.category_id WHERE pv.kind='article' AND ${W}`;
  const at = (page: number) => [(page - 1) * PAGE];
  const rowsOf = (sql: string, p: (string | number)[]) => q<Row>(sql, p);

  const perfRows = Math.min(Math.max(Number(one(sp.rows)) || 20, 10), 100);
  const perfQ = (one(sp.pq) ?? "").trim();
  const perfPage = pageOf(sp, "pp");

  const [t, tPrev, days, artTime, catTime, kinds, srcs, refs, devs, rets, mostRead, engaging, set, perf, first] = await Promise.all([
    totals(start, end),
    totals(prevStart, start),
    rowsOf(`SELECT date(t,'unixepoch','+330 minutes') d, COUNT(*) v, COALESCE(SUM(active),0) a FROM pv WHERE ${W} GROUP BY d`, cur),
    rowsOf(`${ARTICLE} GROUP BY p.id ORDER BY tot DESC, views DESC LIMIT ${PAGE} OFFSET ?`, [...cur, ...at(pageOf(sp, "ap"))]),
    rowsOf(`SELECT c.id, c.name, SUM(pv.active) tot, COUNT(*) views, AVG(pv.active) avg, COUNT(*) OVER () n
      FROM pv JOIN categories c ON c.id=pv.cat WHERE pv.kind='article' AND ${W} GROUP BY c.id ORDER BY tot DESC LIMIT ${PAGE} OFFSET ?`, [...cur, ...at(pageOf(sp, "cp"))]),
    rowsOf(`SELECT kind k, COUNT(*) n FROM pv WHERE ${W} GROUP BY kind ORDER BY n DESC`, cur),
    rowsOf(`SELECT src k, COUNT(*) n FROM pv WHERE ${W} GROUP BY src ORDER BY n DESC`, cur),
    rowsOf(`SELECT ref k, COUNT(*) n, COUNT(*) OVER () tn FROM pv WHERE ref!='' AND ${W} GROUP BY ref ORDER BY n DESC LIMIT ${PAGE} OFFSET ?`, [...cur, ...at(pageOf(sp, "rp"))]),
    rowsOf(`SELECT dev k, COUNT(*) n FROM pv WHERE ${W} GROUP BY dev ORDER BY n DESC`, cur),
    rowsOf(`SELECT ret k, COUNT(*) n FROM pv WHERE ${W} GROUP BY ret`, cur),
    rowsOf(`${ARTICLE} GROUP BY p.id ORDER BY views DESC, tot DESC LIMIT ${PAGE} OFFSET ?`, [...cur, ...at(pageOf(sp, "mp"))]),
    rowsOf(`${ARTICLE} GROUP BY p.id HAVING views>=10 ORDER BY avg DESC LIMIT ${PAGE} OFFSET ?`, [...cur, ...at(pageOf(sp, "ep"))]),
    rowsOf(`SELECT p.id, p.title, c.name cat, SUM(pv.t>=?) cur, SUM(pv.t<?) prev, AVG(CASE WHEN pv.t>=? THEN pv.active END) avg, AVG(CASE WHEN pv.t>=? THEN pv.scroll>=90 END) fin
      FROM pv JOIN posts p ON p.id=pv.post LEFT JOIN categories c ON c.id=p.category_id
      WHERE pv.kind='article' AND pv.t>=? AND pv.t<?${F} GROUP BY p.id HAVING cur>=10`, [start, start, start, start, prevStart, end, ...fp]),
    rowsOf(`${ARTICLE}${perfQ ? " AND (p.title LIKE ? OR p.id=?)" : ""} GROUP BY p.id ORDER BY views DESC, tot DESC LIMIT ${perfRows} OFFSET ${(perfPage - 1) * perfRows}`,
      perfQ ? [...cur, `%${perfQ.replace(/[%_]/g, "")}%`, Number(perfQ) || 0] : cur),
    q<Row>("SELECT MIN(t) m FROM pv"),
  ]);

  const prevViews = new Map<number, number>();
  if (perf.length) {
    const ids = perf.map((r) => num(r.id));
    for (const r of await q<Row>(`SELECT post, COUNT(*) n FROM pv WHERE kind='article' AND t>=? AND t<?${F.replace(/pv\./g, "")} AND post IN (${ids.map(() => "?").join(",")}) GROUP BY post`, [prevStart, start, ...fp, ...ids]))
      prevViews.set(num(r.post), num(r.n));
  }

  // insights come from the articles with at least 10 views, compared with the period before
  const items = set.map((r) => ({ id: num(r.id), title: String(r.title), cat: String(r.cat ?? ""), cur: num(r.cur), prev: num(r.prev), avg: num(r.avg), fin: num(r.fin) }));
  const sorted = (f: (a: number[]) => number, g: (i: (typeof items)[number]) => number) => f(items.map(g).sort((a, b) => a - b));
  const typical = sorted((a) => a[Math.floor(a.length / 2)] ?? 0, (i) => i.avg);
  const medViews = sorted((a) => a[Math.floor(a.length / 2)] ?? 0, (i) => i.cur);
  const topQuarter = sorted((a) => a[Math.floor(a.length * 0.75)] ?? 0, (i) => i.avg);
  const hasPrev = items.some((i) => i.prev > 0);
  const gain = (i: (typeof items)[number]) => i.cur - i.prev;
  const insights = {
    count: items.length,
    trending: hasPrev ? items.filter((i) => gain(i) > 0).sort((a, b) => gain(b) - gain(a)) : [],
    losing: hasPrev ? items.filter((i) => gain(i) < 0).sort((a, b) => gain(a) - gain(b)) : [],
    skimmed: items.filter((i) => i.avg < typical * 0.5).sort((a, b) => b.cur - a.cur),
    gems: items.filter((i) => i.avg >= topQuarter && i.cur < medViews).sort((a, b) => b.avg - a.avg),
    hasPrev,
  };

  const dayMap = new Map(days.map((d) => [String(d.d), d]));
  const series = Array.from({ length: Math.round((end - start) / DAY) }, (_, i) => {
    const d = istDay(start + i * DAY), r = dayMap.get(d);
    return { d, views: num(r?.v), time: num(r?.a) };
  });

  return {
    key, start, end, from: istDay(start), to: istDay(end - 1), first: first[0]?.m ? num(first[0].m) : 0, now,
    t, tPrev, series, artTime, catTime, kinds, srcs, refs, devs, rets, mostRead, engaging, insights, perf, prevViews,
    filter: { cat, post, dev: dev ?? "", src: src ?? "", vis: vis ?? "" },
    perfRows, perfQ, perfPage, hasData: t.views > 0,
  };
}

/** Readers in the last 2 minutes, ignoring every filter. */
export async function live() {
  await ensurePv();
  const now = Math.floor(Date.now() / 1000), from = now - 120;
  const [[r], reading, cats, devs, srcs, bars] = await Promise.all([
    q<Row>("SELECT COUNT(DISTINCT vid) n FROM pv WHERE t>=?", [from]),
    q<Row>("SELECT p.title, c.name cat, COUNT(*) n FROM pv JOIN posts p ON p.id=pv.post LEFT JOIN categories c ON c.id=p.category_id WHERE pv.t>=? AND pv.kind='article' GROUP BY p.id ORDER BY n DESC LIMIT 5", [from]),
    q<Row>("SELECT c.name k, COUNT(*) n FROM pv JOIN categories c ON c.id=pv.cat WHERE pv.t>=? GROUP BY c.id ORDER BY n DESC LIMIT 5", [from]),
    q<Row>("SELECT dev k, COUNT(*) n FROM pv WHERE t>=? GROUP BY dev ORDER BY n DESC", [from]),
    q<Row>("SELECT src k, COUNT(*) n FROM pv WHERE t>=? GROUP BY src ORDER BY n DESC", [from]),
    q<Row>("SELECT t/60 m, COUNT(*) n FROM pv WHERE t>=? GROUP BY m", [now - 1800]),
  ]);
  const byMin = new Map(bars.map((b) => [num(b.m), num(b.n)]));
  const nowMin = Math.floor(now / 60);
  return {
    readers: num(r?.n),
    reading: reading.map((x) => ({ title: String(x.title), cat: String(x.cat ?? ""), n: num(x.n) })),
    cats: cats.map((x) => ({ k: String(x.k), n: num(x.n) })),
    devs: devs.map((x) => ({ k: String(x.k), n: num(x.n) })),
    srcs: srcs.map((x) => ({ k: String(x.k), n: num(x.n) })),
    bars: Array.from({ length: 30 }, (_, i) => byMin.get(nowMin - 29 + i) ?? 0),
  };
}
