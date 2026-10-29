import { social } from "./site.ts";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://theecho.in";
export const siteName = "The Echo";
export const abs = (path: string) => `${siteUrl}${path}`;

/** Stored post times are IST wall-clock (see lib/format.ts); sitemap, feed and schema.org need an explicit offset. */
export const isoIST = (s: string) => (/Z$|[+-]\d\d:\d\d$/.test(s) ? s : `${s.length === 16 ? `${s}:00` : s}+05:30`);

/** Meta description: the excerpt, else the start of the body text. */
export const describe = (excerpt: string, html: string) =>
  (excerpt.trim() || html.replace(/<[^>]+>/g, " ").replace(/&[#\w]+;/g, " ").replace(/\s+/g, " ").trim()).slice(0, 160);

/** A page-level openGraph replaces the layout's, so shared fields are repeated here. */
export const og = (o: { title: string; description: string; path: string; images?: string[] }) => ({
  siteName, locale: "ml_IN", type: "website" as const, url: abs(o.path), title: o.title, description: o.description, images: o.images,
});

export const organization = {
  "@type": "NewsMediaOrganization",
  "@id": abs("/#organization"),
  name: siteName,
  url: siteUrl,
  logo: { "@type": "ImageObject", url: abs("/logo.png") },
  sameAs: social.filter((s) => s.href.startsWith("http")).map((s) => s.href),
};

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
});

export const xmlEscape = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
