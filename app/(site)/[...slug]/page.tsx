import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard";
import LoadMore from "@/components/LoadMore";
import { PAGE_SIZE, categoryPath, getCategories, getPostTags, getTag, type Tag, getPage, getPost, latest, withChildren } from "@/lib/data";
import ShareBar from "@/components/ShareBar";
import { fmtDateTime } from "@/lib/format";
import { fixLazy } from "@/lib/content";

export const revalidate = 900;
export const generateStaticParams = () => []; // render on first hit, then ISR-cache

// URLs mirror WordPress: /post-slug, /parent-cat/child-cat, /cat/page/2, /page-slug
type Resolved =
  | { kind: "post"; post: NonNullable<Awaited<ReturnType<typeof getPost>>> }
  | { kind: "category"; cat: Awaited<ReturnType<typeof getCategories>>[number]; page: number; base: string }
  | { kind: "tag"; tag: Tag; page: number }
  | { kind: "page"; page: NonNullable<Awaited<ReturnType<typeof getPage>>> };

// cache(): generateMetadata and the page both resolve the same URL, so look it up once per request
const resolve = cache(async (path: string): Promise<Resolved | null> => {
  let segs = path.split("/").map((s) => decodeURIComponent(s));
  let page = 1;
  if (segs.length >= 3 && segs[segs.length - 2] === "page" && /^\d+$/.test(segs.at(-1)!)) {
    page = +segs.at(-1)!;
    segs = segs.slice(0, -2);
  } else if (segs.length === 2 && segs[0] === "page") return null;

  if (segs[0] === "tag" && segs.length === 2) {
    const tag = await getTag(segs[1]);
    return tag ? { kind: "tag", tag, page } : null;
  }

  const cats = await getCategories();
  const last = segs.at(-1)!;
  const cat = cats.find((c) => c.slug === last);
  if (cat && segs.length <= 2) {
    const parent = cats.find((c) => c.id === cat.parent_id);
    if ((segs.length === 1 && !parent) || (segs.length === 2 && parent?.slug === segs[0]))
      return { kind: "category", cat, page, base: categoryPath(cats, cat) };
  }
  if (segs.length === 1 && page === 1) {
    const post = await getPost(last);
    if (post) return { kind: "post", post };
    const pg = await getPage(last);
    if (pg) return { kind: "page", page: pg };
  }
  return null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const r = await resolve((await params).slug.join("/"));
  if (!r) return {};
  if (r.kind === "post")
    return {
      title: r.post.title,
      description: r.post.excerpt,
      openGraph: { title: r.post.title, description: r.post.excerpt, type: "article", images: r.post.image ? [r.post.image] : [] },
      twitter: { card: "summary_large_image" },
    };
  if (r.kind === "category") return { title: r.cat.name };
  if (r.kind === "tag") return { title: r.tag.name };
  return { title: r.page.title };
}

export default async function Slug({ params }: { params: Promise<{ slug: string[] }> }) {
  const r = await resolve((await params).slug.join("/"));
  if (!r) notFound();

  if (r.kind === "page")
    return (
      <div className="wrap max-w-3xl py-10">
        <h1 className="text-3xl font-extrabold mb-6">{r.page.title}</h1>
        <div className="article" dangerouslySetInnerHTML={{ __html: fixLazy(r.page.content) }} />
      </div>
    );

  const cats = await getCategories();

  if (r.kind === "tag") {
    const posts = await latest(PAGE_SIZE, { tag: r.tag.id, offset: (r.page - 1) * PAGE_SIZE });
    if (!posts.length && r.page > 1) notFound();
    return (
      <div className="wrap py-8">
        <h1 className="section-title mb-8">{r.tag.name}</h1>
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
        {posts.length === PAGE_SIZE && <LoadMore tag={r.tag.slug} before={posts[posts.length - 1].published_at} />}
      </div>
    );
  }

  if (r.kind === "category") {
    const ids = withChildren(cats, r.cat.id);
    // /cat/page/N still resolves (old WordPress links); the UI itself uses "Load more".
    const posts = await latest(PAGE_SIZE, { cats: ids, offset: (r.page - 1) * PAGE_SIZE });
    if (!posts.length && r.page > 1) notFound();
    const names = Object.fromEntries(cats.map((c) => [c.id, c.name]));
    return (
      <div className="wrap py-8">
        <h1 className="section-title mb-8">{r.cat.name}</h1>
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((p) => <PostCard key={p.id} post={p} label={names[p.category_id]} />)}
        </div>
        {posts.length === PAGE_SIZE && <LoadMore cat={r.cat.slug} before={posts[posts.length - 1].published_at} names={names} />}
      </div>
    );
  }

  const { post } = r;
  const cat = cats.find((c) => c.id === post.category_id);
  const showCat = cat && cat.slug !== "uncategorized" ? cat : undefined;
  const parent = showCat && cats.find((c) => c.id === showCat.parent_id);
  const tags = await getPostTags(post.id);
  const [recent, more, related] = await Promise.all([
    latest(5, { exclude: [post.id] }),
    showCat ? latest(5, { cats: withChildren(cats, showCat.id), exclude: [post.id] }) : Promise.resolve([]),
    latest(4, { cats: [post.category_id], exclude: [post.id] }),
  ]);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL || "https://theecho.in"}/${encodeURIComponent(post.slug)}`;
  const card = "rounded-2xl bg-bg border border-line shadow-[0_1px_2px_rgba(17,60,80,0.06)] p-5";

  return (
    <article className="wrap py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-muted flex flex-wrap items-center gap-1.5 mb-5">
        <Link prefetch={false} href="/" className="hover:text-accent">Home</Link>
        {parent && <><span>›</span><Link prefetch={false} href={categoryPath(cats, parent)} className="hover:text-accent">{parent.name}</Link></>}
        {showCat && <><span>›</span><Link prefetch={false} href={categoryPath(cats, showCat)} className="hover:text-accent">{showCat.name}</Link></>}
        <span>›</span><span>Article</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {showCat && <Link prefetch={false} href={categoryPath(cats, showCat)} className="inline-block rounded bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">{showCat.name}</Link>}
          <h1 className="text-2xl sm:text-[34px] font-bold leading-snug mt-3 text-balance">{post.title}</h1>
          {post.excerpt && <p className="italic text-muted text-lg mt-3 leading-relaxed">{post.excerpt}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-nav text-white grid place-items-center font-bold">{post.author.trim().charAt(0).toUpperCase()}</span>
              <div>
                <p className="font-semibold leading-tight">{post.author}</p>
                <p className="text-xs text-muted">Published on: {fmtDateTime(post.published_at)}</p>
              </div>
            </div>
            <ShareBar title={post.title} url={url} />
          </div>

          {post.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image} alt="" className="w-full rounded-2xl mt-6 aspect-[16/10] object-cover" />
          )}
          <div className="article mt-8" dangerouslySetInnerHTML={{ __html: fixLazy(post.content) }} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {recent.length > 0 && (
            <section className={card}>
              <h2 className="section-title !text-xl mb-2">Latest News</h2>
              <div className="divide-y divide-line">{recent.map((p) => <PostCard key={p.id} post={p} size="compact" />)}</div>
            </section>
          )}
          {showCat && more.length > 0 && (
            <section className={card}>
              <h2 className="section-title !text-xl mb-3">More in {showCat.name}</h2>
              <ol className="divide-y divide-line">
                {more.map((p, i) => (
                  <li key={p.id}>
                    <Link prefetch={false} href={`/${encodeURIComponent(p.slug)}`} className="card flex items-start gap-3 py-3">
                      <span className="shrink-0 w-8 h-8 rounded-full bg-surface grid place-items-center text-xs font-bold">{String(i + 1).padStart(2, "0")}</span>
                      <span className="card-title font-semibold text-[15px]">{p.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {tags.length > 0 && (
            <section className={card}>
              <h2 className="section-title !text-xl mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => <Link prefetch={false} key={t.id} href={`/tag/${encodeURIComponent(t.slug)}`} className="text-sm px-3 py-1 rounded-full bg-surface hover:text-accent">{t.name}</Link>)}
              </div>
            </section>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title mb-5">Related Stories</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}
    </article>
  );
}
