"use client";
import { useEffect } from "react";

/** Sets <html data-nav-hidden> while the user scrolls down, clears it on scroll up (nav slides away / back). */
export default function ScrollFlag() {
  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      const dy = y - last;
      const root = document.documentElement;
      if (y < 160 || dy < -6) root.removeAttribute("data-nav-hidden");
      else if (dy > 6) root.setAttribute("data-nav-hidden", "");
      if (Math.abs(dy) > 6) last = y;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return null;
}
