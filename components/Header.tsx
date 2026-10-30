import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import ScrollFlag from "./ScrollFlag";
import BrandIcon from "./BrandIcon";
import { social } from "@/lib/site";
import { getCategories, categoryPath } from "@/lib/data";

const searchIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

export default async function Header() {
  const cats = (await getCategories()).filter((c) => c.slug !== "uncategorized");
  const tops = cats.filter((c) => !c.parent_id).map((c) => ({ ...c, href: categoryPath(cats, c), kids: cats.filter((k) => k.parent_id === c.id).map((k) => ({ ...k, href: categoryPath(cats, k) })) }));
  const link = "px-4 py-3 min-h-[44px] flex items-center whitespace-nowrap font-semibold hover:bg-white/15 rounded-lg";

  return (
    <>
      <ScrollFlag />
      <header className="wrap relative flex justify-center py-3 sm:py-4">
        <Link prefetch={false} href="/" aria-label="The Echo — home">
          <Image src="/logo.png" alt="The Echo" width={512} height={441} priority className="h-24 sm:h-32 w-auto" />
        </Link>
        <div className="absolute right-4 top-3 sm:top-4 flex items-center gap-2">
          {social.filter((s) => s.href).map((s) => (
            <a key={s.name} href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noopener" aria-label={s.name} title={s.name} className="hidden xl:grid w-[44px] h-[44px] place-items-center rounded-full border border-line hover:text-accent hover:bg-surface"><BrandIcon name={s.icon} /></a>
          ))}
          <ThemeToggle className="w-[44px] h-[44px] grid place-items-center rounded-full border border-line hover:bg-surface" />
        </div>
      </header>

      {/* floating rounded bar; slides away on scroll down (see ScrollFlag) */}
      <nav className="site-nav sticky top-0 z-40 pb-3 pt-1" aria-label="Sections">
        <div className="wrap">
          <div className="bg-nav text-white rounded-2xl shadow-md flex items-center gap-2 px-2">
            {/* desktop: dropdowns */}
            <ul className="hidden lg:flex flex-1 justify-start text-[16px] py-1">
              <li><Link prefetch={false} href="/" className={link}>Latest</Link></li>
              {tops.map((c) => (
                <li key={c.id} className="relative group">
                  <Link prefetch={false} href={c.href} className={link}>{c.name}{c.kids.length > 0 && <span className="ml-1 text-xs">▾</span>}</Link>
                  {c.kids.length > 0 && (
                    <ul className="absolute left-0 top-full min-w-48 bg-nav rounded-xl shadow-lg p-1 hidden group-hover:block group-focus-within:block">
                      {c.kids.map((k) => <li key={k.id}><Link prefetch={false} href={k.href} className={link}>{k.name}</Link></li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {/* mobile: flat scrolling strip */}
            {/* the strip scrolls sideways: no scrollbar, and a soft fade on the right edge shows there is more */}
            <ul className="lg:hidden flex flex-1 min-w-0 overflow-x-auto text-sm py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]">
              <li><Link prefetch={false} href="/" className={link}>Latest</Link></li>
              {tops.flatMap((c) => [c, ...c.kids]).map((c) => <li key={c.id}><Link prefetch={false} href={c.href} className={link}>{c.name}</Link></li>)}
            </ul>

            <form action="/search" className="hidden lg:flex items-center shrink-0 rounded-full bg-white/15 pl-4 pr-1">
              <input name="q" type="search" placeholder="Search news, topics…" aria-label="Search" className="bg-transparent outline-none w-48 h-[44px] text-sm placeholder:text-white/70" />
              <button className="w-[44px] h-[44px] grid place-items-center" aria-label="Search">{searchIcon}</button>
            </form>
            <Link prefetch={false} href="/search" aria-label="Search" className="lg:hidden grid place-items-center w-[44px] h-[44px] shrink-0">{searchIcon}</Link>
          </div>
        </div>
      </nav>
    </>
  );
}
