// Stored timestamps are IST wall-clock without a zone; format them as-is (UTC-formatted) so server TZ never shifts them.
const wall = (iso: string) => new Date(iso + "Z");

export const fmtDate = (iso: string) =>
  wall(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const fmtDateTime = (iso: string) =>
  wall(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });

/** "7 hours ago" for recent posts, a date otherwise. */
export function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso + "+05:30").getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} hour${mins < 120 ? "" : "s"} ago`;
  if (mins < 10080) return `${Math.floor(mins / 1440)} day${mins < 2880 ? "" : "s"} ago`;
  return fmtDate(iso);
}
