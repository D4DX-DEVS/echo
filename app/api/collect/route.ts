import { run } from "@/lib/data";
import { ensurePv } from "@/lib/analytics";

const KINDS = ["article", "home", "category", "tag", "search", "page", "other"];
const DEVS = ["mobile", "tablet", "desktop"];
const SRCS = ["internal", "direct", "search", "social", "campaign", "other"];
const BOT = /bot|crawl|spider|slurp|headless|facebookexternalhit|preview/i;
const int = (v: unknown, max: number) => Math.min(Math.max(Math.trunc(Number(v)) || 0, 0), max);

// Public, anonymous: every field is checked and clamped here because anyone can post to this URL.
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 1000 || BOT.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  let b: Record<string, unknown>;
  try { b = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
  const id = String(b.id ?? "");
  if (!/^[\w-]{8,32}$/.test(id)) return new Response(null, { status: 400 });
  await ensurePv();
  if (b.k === undefined) {
    await run("UPDATE pv SET active=MAX(active,?), scroll=MAX(scroll,?) WHERE id=?", [int(b.a, 7200), int(b.sc, 100), id]);
  } else {
    const word = (v: unknown, ok: string[], fallback: string) => (ok.includes(String(v)) ? String(v) : fallback);
    const vid = String(b.v ?? ""), sid = String(b.s ?? "");
    if (!/^[\w-]{8,40}$/.test(vid) || !/^[\w-]{8,40}$/.test(sid)) return new Response(null, { status: 400 });
    const kind = word(b.k, KINDS, "other");
    await run("INSERT OR IGNORE INTO pv(id,t,kind,post,cat,vid,sid,dev,src,ref,ret) VALUES(?,?,?,?,?,?,?,?,?,?,?)", [
      id, Math.floor(Date.now() / 1000), kind, kind === "article" ? int(b.p, 1e9) || null : null, int(b.c, 1e9) || null, vid, sid,
      word(b.d, DEVS, "desktop"), word(b.r, SRCS, "other"), String(b.h ?? "").slice(0, 80), b.n ? 1 : 0,
    ]);
  }
  return new Response(null, { status: 204 });
}
