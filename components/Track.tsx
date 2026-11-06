"use client";
import { useEffect } from "react";

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia)\./;
const SOCIAL = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|twitter\.com|x\.com|t\.co|youtube\.com|youtu\.be|whatsapp\.com|wa\.me|telegram\.org|t\.me|linkedin\.com|lnkd\.in|reddit\.com|pinterest\.com)$/;
let sawFirst = false; // later page views in this tab come from our own links, whatever document.referrer still says

/**
 * Anonymous reading statistics for the admin Analytics page: one beacon when a page opens, one when it is left, carrying the
 * seconds the reader was actually active and how far down they scrolled. Skipped for signed-in editors and automated browsers.
 */
export default function Track({ kind, post, cat }: { kind: string; post?: number; cat?: number }) {
  useEffect(() => {
    try {
      // localhost writes to the same database as the live site, so it only counts when asked to
      if (navigator.webdriver || /echo_editor=1/.test(document.cookie) || (location.hostname === "localhost" && !localStorage.getItem("echo_track_dev"))) return;
      const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
      const [vid = "", first = ""] = (localStorage.getItem("echo_v") ?? "").split(":");
      const visitor = vid || crypto.randomUUID().replace(/-/g, "");
      if (!vid) localStorage.setItem("echo_v", `${visitor}:${today}`);
      const sid = sessionStorage.getItem("echo_s") ?? crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      sessionStorage.setItem("echo_s", sid);

      let host = "";
      try { host = new URL(document.referrer).hostname; } catch {}
      const own = location.hostname.replace(/^www\./, "");
      const sp = new URLSearchParams(location.search);
      const src = sawFirst || host.replace(/^www\./, "") === own ? "internal"
        : sp.has("utm_source") || sp.has("utm_medium") ? "campaign"
        : !host ? "direct"
        : SEARCH.test(host) ? "search"
        : SOCIAL.test(host) ? "social"
        : "other";
      sawFirst = true;

      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const send = (data: object) => navigator.sendBeacon("/api/collect", JSON.stringify(data));
      send({ id, k: kind, p: post, c: cat, v: visitor, s: sid, d: innerWidth < 768 ? "mobile" : innerWidth < 1024 ? "tablet" : "desktop", r: src, h: src === "internal" || src === "direct" ? "" : host, n: first && first !== today ? 1 : 0 });

      let active = 0, scroll = 0, sent = "";
      let lastInput = Date.now();
      const touch = () => { lastInput = Date.now(); };
      const depth = () => {
        const el = kind === "article" ? document.querySelector(".article") : null;
        const pct = el
          ? (innerHeight - el.getBoundingClientRect().top) / el.getBoundingClientRect().height
          : (scrollY + innerHeight) / document.documentElement.scrollHeight;
        scroll = Math.max(scroll, Math.round(Math.min(Math.max(pct, 0), 1) * 100));
      };
      const tick = setInterval(() => { depth(); if (!document.hidden && Date.now() - lastInput < 30000) active++; }, 1000);
      const flush = () => {
        depth();
        const now = `${active}:${scroll}`;
        if (now !== sent) { sent = now; send({ id, a: active, sc: scroll }); }
      };
      const onHide = () => { if (document.hidden) flush(); };
      const events = ["mousemove", "scroll", "keydown", "touchstart", "click"] as const;
      events.forEach((e) => addEventListener(e, touch, { passive: true }));
      document.addEventListener("visibilitychange", onHide);
      addEventListener("pagehide", flush);
      return () => {
        clearInterval(tick);
        flush(); // leaving this page inside the site (no pagehide)
        events.forEach((e) => removeEventListener(e, touch));
        document.removeEventListener("visibilitychange", onHide);
        removeEventListener("pagehide", flush);
      };
    } catch {}
  }, [kind, post, cat]);
  return null;
}
