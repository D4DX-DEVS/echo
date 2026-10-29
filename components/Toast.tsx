"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = { saved: "Saved successfully", deleted: "Deleted" };

/** Pop-up shown after an admin action; the action redirects with ?saved=1 or ?deleted=1, which is removed again here. */
export default function Toast() {
  const sp = useSearchParams();
  const [msg, setMsg] = useState("");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const key = Object.keys(MESSAGES).find((k) => sp.has(k));
    if (!key) return;
    setMsg(MESSAGES[key]);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(""), 3500);
    const u = new URL(location.href);
    u.searchParams.delete(key);
    history.replaceState(null, "", u);
  }, [sp]);

  if (!msg) return null;
  return (
    <div role="status" aria-live="polite" className="toast fixed top-5 left-1/2 z-50 flex items-center gap-3 rounded-full bg-bg border border-line shadow-[0_12px_32px_-8px_rgba(17,60,80,0.35)] py-2.5 pl-3 pr-4 text-sm font-semibold">
      <span className="grid place-items-center w-6 h-6 rounded-full bg-green-600 text-white">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
      {msg}
      <button type="button" onClick={() => setMsg("")} aria-label="Close" className="text-muted hover:text-fg ml-1 cursor-pointer">✕</button>
    </div>
  );
}
