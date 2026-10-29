import { latest } from "@/lib/data";
import { cached } from "@/lib/cache";
import { abs, isoIST, siteName, siteUrl } from "@/lib/seo";

export const revalidate = 600;

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

// RSS at /feed, the address WordPress used, so existing subscribers and aggregators keep working.
export async function GET() {
  const posts = await cached("feed", 600, () => latest(30));
  const items = posts.map((p) => {
    const link = abs(`/${encodeURIComponent(p.slug)}`);
    return `<item><title>${esc(p.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${new Date(isoIST(p.published_at)).toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${siteName}</title><link>${siteUrl}</link><description>Echoing the unheard voices. Malayalam news from Kerala, India and the world.</description><language>ml</language>${items.join("")}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, s-maxage=600" } });
}
