import { NextResponse } from "next/server";
import { getCategories, getTag, latest, withChildren } from "@/lib/data";

// Public: next page of a section, older than `before` (keyset paging, so no duplicates or offset drift).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === sp.get("cat"));
  const before = sp.get("before") ?? undefined;
  const limit = Math.min(Number(sp.get("limit")) || 8, 20);
  const tag = sp.get("tag") ? await getTag(sp.get("tag")!) : undefined;
  const posts = await latest(limit, { cats: cat ? withChildren(cats, cat.id) : undefined, tag: tag?.id, video: sp.get("video") === "1", before });
  return NextResponse.json(posts, { headers: { "Cache-Control": "public, s-maxage=60" } });
}
