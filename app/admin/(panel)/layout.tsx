import { Suspense } from "react";
import { logout } from "../actions";
import AdminNav from "@/components/AdminNav";
import Toast from "@/components/Toast";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-page md:flex">
      <aside className="md:w-60 shrink-0 bg-bg border-b md:border-b-0 md:border-r border-line p-3 md:p-4 flex flex-wrap md:flex-col gap-1 items-center md:items-stretch md:sticky md:top-0 md:h-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="The Echo" className="h-9 md:h-12 w-auto self-start mb-0 md:mb-5 mr-auto md:mr-0" />
        <nav aria-label="Admin" className="max-md:order-last max-md:w-full flex md:flex-col gap-1 max-md:overflow-x-auto"><AdminNav /></nav>
        <ThemeToggle className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-muted hover:text-brand-text transition-colors cursor-pointer md:mt-auto">
          <span className="hidden md:inline"><span className="dark-hide">Dark mode</span><span className="light-hide">Light mode</span></span>
        </ThemeToggle>
        <form action={logout}>
          <button aria-label="Log out" className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-muted hover:text-brand-text transition-colors cursor-pointer">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4H5v16h5M16 8l4 4-4 4M20 12H9" /></svg>
            <span className="hidden md:inline">Log out</span>
          </button>
        </form>
      </aside>
      <div className="flex-1 p-4 md:p-8 min-w-0">{children}</div>
      <Suspense><Toast /></Suspense>
    </div>
  );
}
