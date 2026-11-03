import { NextResponse } from "next/server";
import { q } from "@/lib/data";

// Auth enforced by middleware. Photos already used as a featured image, found by the title of the post that uses them.
export async function GET(req: Request) {
  const term = (new URL(req.url).searchParams.get("q") ?? "").replace(/[%_]/g, "").trim();
  const rows = await q<{ image: string; title: string }>(
    "SELECT image, title FROM posts WHERE image != '' AND title LIKE ? GROUP BY image ORDER BY MAX(published_at) DESC LIMIT 24",
    [`%${term}%`],
  );
  return NextResponse.json(rows);
}
