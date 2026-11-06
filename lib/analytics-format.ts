// Labels and number formats shared by the Analytics page and its live panel (no database code, so client components can import it).
export const KIND: Record<string, string> = { article: "Articles", home: "Home page", category: "Category pages", tag: "Tag pages", search: "Search", page: "Pages", other: "Other" };
export const SRC: Record<string, string> = { internal: "Within the site", direct: "Direct", search: "Search engines", social: "Social media", campaign: "Campaigns", other: "Other websites" };
export const DEV: Record<string, string> = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };

/** 7m 42s style: hours and minutes from an hour up, minutes and seconds below. */
export function dur(sec: number) {
  const s = Math.round(sec);
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}
export const pct = (part: number, whole: number, digits = 1) => (whole ? `${((part / whole) * 100).toFixed(digits).replace(/\.0$/, "")}%` : "0%");
export const int = (n: number) => Math.round(n).toLocaleString("en-IN");
