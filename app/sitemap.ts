import type { MetadataRoute } from "next";
import { categoryPath, getCategories, q } from "@/lib/data";
import { abs, isoIST } from "@/lib/seo";

export const revalidate = 21600; // the sitemap reads every post, so rebuild it at most every 6 hours (the news sitemap covers fresh posts)

// Canonical, indexable URLs only: home, categories, static pages and published posts (not tags, search or admin).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, cats, pages] = await Promise.all([
    q<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM posts WHERE status='published' ORDER BY published_at DESC LIMIT 5000"),
    getCategories(),
    q<{ slug: string; updated_at: string }>("SELECT slug, updated_at FROM pages"),
  ]);
  return [
    { url: abs("/") },
    ...cats.filter((c) => c.slug !== "uncategorized").map((c) => ({ url: abs(categoryPath(cats, c)) })),
    ...pages.map((p) => ({ url: abs(`/${encodeURIComponent(p.slug)}`), lastModified: isoIST(p.updated_at) })),
    ...posts.map((p) => ({ url: abs(`/${encodeURIComponent(p.slug)}`), lastModified: isoIST(p.updated_at) })),
  ];
}
