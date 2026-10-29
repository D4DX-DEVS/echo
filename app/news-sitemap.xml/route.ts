import { q } from "@/lib/data";
import { cached } from "@/lib/cache";
import { abs, isoIST, siteName, xmlEscape as esc } from "@/lib/seo";

export const revalidate = 600;

// Google News sitemap: only posts from the last two days, as that format requires.
export async function GET() {
  const since = new Date(Date.now() + 5.5 * 3600e3 - 48 * 3600e3).toISOString().slice(0, 19); // stored times are IST wall-clock
  const posts = await cached("news-sitemap", 600, () =>
    q<{ slug: string; title: string; published_at: string }>(
      "SELECT slug, title, published_at FROM posts WHERE status='published' AND published_at >= ? ORDER BY published_at DESC LIMIT 1000",
      [since],
    ),
  );
  const urls = posts.map((p) =>
    `<url><loc>${abs(`/${encodeURIComponent(p.slug)}`)}</loc><news:news><news:publication><news:name>${siteName}</news:name><news:language>ml</news:language></news:publication><news:publication_date>${isoIST(p.published_at)}</news:publication_date><news:title>${esc(p.title)}</news:title></news:news></url>`,
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls.join("")}</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=600" } });
}
