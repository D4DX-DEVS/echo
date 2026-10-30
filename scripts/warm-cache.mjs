// Usage: node scripts/warm-cache.mjs [site url] [how many articles]
// Opens the home page, the category pages and the newest articles once, so each is rendered and stored in the page cache
// before a visitor asks for it. On Cloudflare's free plan a page that has to be rendered from scratch sometimes goes over
// the 10 ms CPU limit and fails (error 1102 / HTTP 503); every request here is simply repeated until it works, and the
// finished page is then served from the cache. Run after every deploy (scripts/deploy.sh does).
const site = (process.argv[2] ?? "https://theecho.d4dx-fatwa.workers.dev").replace(/\/$/, "");
const count = Number(process.argv[3] ?? 200);

const sitemap = await (await fetch(`${site}/sitemap.xml`)).text();
const paths = [...sitemap.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
// sitemap order: home, categories, pages, then posts newest first
const list = [...new Set(["/", ...paths.slice(0, 30), ...paths.slice(30, 30 + count)])];

let warmed = 0, repeats = 0, failed = 0, i = 0;
async function warm(path) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      const r = await fetch(site + path, { signal: AbortSignal.timeout(30000) });
      await r.arrayBuffer();
      if (r.status === 200) return void warmed++;
      if (r.status === 404) return; // not a page (e.g. a draft)
    } catch { /* timeout: try again */ }
    repeats++;
    await new Promise((x) => setTimeout(x, 400 * (attempt + 1)));
  }
  failed++;
  console.log("could not warm", decodeURIComponent(path).slice(0, 80));
}
await Promise.all(Array.from({ length: 4 }, async () => { while (i < list.length) await warm(list[i++]); }));
console.log(`warmed ${warmed} of ${list.length} pages (${repeats} repeats, ${failed} failed)`);
