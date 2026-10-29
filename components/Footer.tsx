import Image from "next/image";
import Link from "next/link";
import { getCategories, categoryPath } from "@/lib/data";
import { email, social } from "@/lib/site";
import BrandIcon from "./BrandIcon";

export default async function Footer() {
  const cats = (await getCategories()).filter((c) => c.slug !== "uncategorized");
  const links = social.filter((s) => s.href);
  const quick = [...cats.filter((c) => !c.parent_id), ...cats.filter((c) => c.parent_id)];
  return (
    <footer className="mt-16 bg-nav text-white">
      <div className="wrap py-10 grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div>
          <Link prefetch={false} href="/" aria-label="The Echo — home" className="block w-fit">
            <Image src="/logo.png" alt="The Echo" width={512} height={441} className="h-24 w-auto brightness-0 invert" />
          </Link>
          <p className="mt-4 text-sm opacity-90 max-w-sm">Independent. Engaging. Insightful. Covering stories that matter from Kerala, India and around the world.</p>
          <a href={`mailto:${email}`} className="mt-3 block text-sm hover:underline">{email}</a>
          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((s) => (
                <a key={s.name} href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noopener" aria-label={s.name} title={s.name} className="w-10 h-10 grid place-items-center rounded-full border border-white/40 hover:bg-white/15"><BrandIcon name={s.icon} /></a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-bold mb-3">Quick Links</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-2 text-sm opacity-90">
            {quick.map((c) => <li key={c.id}><Link prefetch={false} href={categoryPath(cats, c)} className="hover:underline">{c.name}</Link></li>)}
            <li><Link prefetch={false} href="/contact-page" className="hover:underline">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/20">
        <div className="wrap py-4 flex flex-wrap gap-2 justify-between text-xs opacity-90">
          <span>© {new Date().getFullYear()} The Echo. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
