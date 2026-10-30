import PostCard from "@/components/PostCard";
import LoadMore from "@/components/LoadMore";
import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { getCategories, latest, withChildren } from "@/lib/data";
import { abs, og, organization, siteName, siteUrl } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: og({ title: "The Echo — Malayalam News, Kerala Latest Updates", description: "Echoing the unheard voices. Malayalam news from Kerala, India and the world.", path: "/" }),
};

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="section-title mb-5">{children}</h2>
);

export default async function Home() {
  const cats = await getCategories();
  const ids = (slug: string) => withChildren(cats, cats.find((c) => c.slug === slug)!.id);
  const names = Object.fromEntries(cats.map((c) => [c.id, c.name]));

  // Fetched in order so a story never appears twice on the page.
  const seen: number[] = [];
  const take = async (n: number, cs?: number[]) => {
    const rows = await latest(n, { cats: cs, exclude: seen });
    seen.push(...rows.map((r) => r.id));
    return rows;
  };
  const top = await take(4);
  const news = await take(8, ids("malayalam-news-today"));
  const opinion = await take(4, ids("malayalam-editorial-columns"));
  // Videos: posts that actually contain a video, newest first (may repeat stories shown above).
  const videos = await latest(4, { video: true });

  const grid = "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4";
  const last = (a: { published_at: string }[]) => a[a.length - 1].published_at;
  const label = (p: { category_id: number }) => (p.category_id === 1 ? undefined : names[p.category_id]);

  return (
    <div className="wrap py-8 space-y-14">
      <h1 className="sr-only">The Echo: Malayalam news from Kerala, India and the world</h1>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          organization,
          { "@type": "WebSite", "@id": abs("/#website"), url: siteUrl, name: siteName, inLanguage: "ml", publisher: { "@id": organization["@id"] },
            potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: abs("/search?q={search_term_string}") }, "query-input": "required name=search_term_string" } },
        ],
      }} />
      <section>
        <Heading>Today&apos;s Stories</Heading>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {top[0] && <PostCard post={top[0]} label={label(top[0])} size="lg" priority />}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-1 lg:auto-rows-fr">
            {top.slice(1, 4).map((p, i) => <PostCard key={p.id} post={p} label={label(p)} size="tile" eager={i === 0} />)}
          </div>
        </div>
      </section>

      <section>
        <Heading>News</Heading>
        <div className={grid}>{news.map((p) => <PostCard key={p.id} post={p} label={label(p)} />)}</div>
        {news.length > 0 && <LoadMore cat="malayalam-news-today" before={last(news)} names={names} />}
      </section>

      {opinion.length > 0 && (
        <section>
          <Heading>Opinion</Heading>
          <div className={grid}>{opinion.map((p) => <PostCard key={p.id} post={p} label={label(p)} />)}</div>
          <LoadMore cat="malayalam-editorial-columns" before={last(opinion)} names={names} />
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <Heading>Videos</Heading>
          <div className={grid}>{videos.map((p) => <PostCard key={p.id} post={p} video />)}</div>
          <LoadMore before={last(videos)} video />
        </section>
      )}
    </div>
  );
}
