"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const items = [
  { href: "/admin", label: "Posts", d: "M4 5h16M4 10h16M4 15h10M4 20h7" },
  { href: "/admin/videos", label: "Videos", d: "M5 4l14 8-14 8z" },
  { href: "/admin/posts/new", label: "New post", d: "M12 5v14M5 12h14" },
  { href: "/admin/categories", label: "Categories", d: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { href: "/admin/pages", label: "Pages", d: "M7 3h8l4 4v14H7zM14 3v5h5" },
];

export default function AdminNav() {
  const path = usePathname();
  const active = (h: string) => (h === "/admin" ? path === "/admin" || /^\/admin\/posts\/\d+/.test(path) : path.startsWith(h));
  return (
    <>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active(i.href) ? "page" : undefined}
          className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${active(i.href) ? "border border-brand-text text-brand-text" : "border border-transparent text-muted hover:text-brand-text hover:border-line"}`}
        >
          {icon(i.d)}
          {i.label}
        </Link>
      ))}
      <Link href="/" target="_blank" className="flex shrink-0 items-center gap-2.5 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold border border-transparent text-muted hover:text-brand-text hover:border-line transition-colors">
        {icon("M14 4h6v6M20 4l-9 9M18 14v5H5V6h5")}
        View site
      </Link>
    </>
  );
}
