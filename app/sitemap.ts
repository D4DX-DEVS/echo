import type { MetadataRoute } from "next";
import { q } from "@/lib/data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://theecho.in";
  const rows = await q<{ slug: string; updated_at: string }>(
    "SELECT slug, updated_at FROM posts WHERE status='published' ORDER BY published_at DESC LIMIT 5000",
  );
  return [
    { url: site },
    ...rows.map((r) => ({ url: `${site}/${encodeURIComponent(r.slug)}`, lastModified: r.updated_at })),
  ];
}
