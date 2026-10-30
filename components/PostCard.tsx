import Link from "next/link";
import type { PostCard as P } from "@/lib/data";
import { ago } from "@/lib/format";
import { responsive } from "@/lib/images";

type Props = { post: P; label?: string; size?: "lg" | "md" | "row" | "compact" | "tile"; video?: boolean; priority?: boolean };

const Chip = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`rounded bg-chip px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${className}`}>{children}</span>
);

// how wide each card is on screen, so the browser picks the smallest sufficient copy
const SIZES = {
  lg: "(min-width: 1024px) 60vw, 100vw",
  tile: "(min-width: 1024px) 35vw, (min-width: 640px) 33vw, 100vw",
  md: "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  row: "100px",
  compact: "100px",
};

export default function PostCard({ post, label, size = "md", video, priority }: Props) {
  const href = `/${encodeURIComponent(post.slug)}`;
  const byline = <>{post.author} <span className="mx-1">·</span> {ago(post.published_at)}</>;
  const pic = responsive(post.image, post.image_set);
  const img = post.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={pic.src} srcSet={pic.srcSet} sizes={pic.srcSet ? SIZES[size] : undefined} alt="" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full grid place-items-center text-muted text-sm bg-surface">The Echo</div>
  );

  // sidebar list: small fixed thumbnail, 3-line title, one-line meta, so every item stays short
  if (size === "compact")
    return (
      <Link prefetch={false} href={href} className="card flex gap-3 py-3">
        <div className="thumb relative w-[88px] h-[60px] shrink-0 rounded-lg">{img}</div>
        <div className="min-w-0">
          <h3 className="card-title font-semibold text-sm leading-snug line-clamp-3">{post.title}</h3>
          <p className="text-[11px] text-muted mt-1">{ago(post.published_at)}</p>
        </div>
      </Link>
    );

  if (size === "row")
    return (
      <Link prefetch={false} href={href} className="card flex gap-4 py-3">
        <div className="thumb relative w-20 sm:w-24 h-[3.75rem] shrink-0 rounded-lg">{img}</div>
        <div className="min-w-0">
          <h3 className="card-title font-bold text-[0.95rem] leading-snug">{post.title}</h3>
          <p className="text-xs text-muted mt-1">{byline}</p>
        </div>
      </Link>
    );

  // photo-first cards: image fills the card, headline sits on a dark fade; the card grows if the headline is long
  if (size === "lg" || size === "tile") {
    const big = size === "lg";
    return (
      <Link prefetch={false}
        href={href}
        className={`card relative flex flex-col justify-end h-full overflow-hidden bg-nav ${big ? "rounded-2xl min-h-[20rem] sm:min-h-[24rem] lg:min-h-[26rem]" : "rounded-xl min-h-[11rem]"}`}
      >
        <div className="absolute inset-0">{post.image && img}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className={`relative text-white ${big ? "p-4 sm:p-5" : "p-3.5"}`}>
          {label && <Chip className={`inline-block ${big ? "mb-2" : "mb-1.5 !text-[10px]"}`}>{label}</Chip>}
          <h3 className={`font-bold leading-[1.3] text-balance ${big ? "text-[clamp(1.25rem,0.85rem+1.15vw,1.7rem)]" : "text-[0.95rem] sm:text-base"}`}>{post.title}</h3>
          <p className="text-xs text-white/80 mt-1.5">{byline}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link prefetch={false} href={href} className="card flex flex-col h-full rounded-xl overflow-hidden bg-bg border border-line shadow-[0_1px_2px_rgba(17,60,80,0.06)] hover:shadow-[0_8px_20px_-6px_rgba(17,60,80,0.14)] hover:-translate-y-0.5 transition">
      <div className="thumb relative aspect-[16/10]">
        {img}
        {video && <span className="absolute inset-0 grid place-items-center"><span className="w-12 h-12 rounded-full bg-black/60 text-white grid place-items-center">▶</span></span>}
        {label && <Chip className="absolute left-3 bottom-3">{label}</Chip>}
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <h3 className="card-title font-bold text-base">{post.title}</h3>
        <p className="text-xs text-muted mt-auto pt-3">{byline}</p>
      </div>
    </Link>
  );
}
