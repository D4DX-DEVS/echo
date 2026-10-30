"use client";
import { useState } from "react";
import BrandIcon from "./BrandIcon";

const btn = "w-[44px] h-[44px] rounded-full grid place-items-center text-white hover:opacity-85 hover:-translate-y-0.5 transition";

export default function ShareBar({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const q = `u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`;
  return (
    <div className="flex items-center gap-2">
      <a className={`${btn} bg-[#25d366]`} href={`/share?to=whatsapp&${q}`} target="_blank" rel="noopener" aria-label="Share on WhatsApp" title="WhatsApp"><BrandIcon name="whatsapp" /></a>
      <a className={`${btn} bg-[#1877f2]`} href={`/share?to=facebook&${q}`} target="_blank" rel="noopener" aria-label="Share on Facebook" title="Facebook"><BrandIcon name="facebook" /></a>
      <button
        className={`${btn} bg-nav`}
        aria-label="Copy link"
        title={copied ? "Copied" : "Copy link"}
        onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}
      >
        {copied ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
        )}
      </button>
    </div>
  );
}
