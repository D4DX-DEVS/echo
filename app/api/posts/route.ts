import { NextResponse } from "next/server";
import { getCategories, getTag, latest, withChildren } from "@/lib/data";
import { cached } from "@/lib/cache";

// Public: next page of a section, older than `before` (keyset paging, so no duplicates or offset drift).
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Number(sp.get("limit")) || 8, 20);
  const posts = await cached(`posts:${sp}`, 300, async () => {
    const catSlug = sp.get("cat");
    const cats = catSlug ? await getCategories() : [];
    const cat = cats.find((c) => c.slug === catSlug);
    const tag = sp.get("tag") ? await getTag(sp.get("tag")!) : undefined;
    return latest(limit, { cats: cat ? withChildren(cats, cat.id) : undefined, tag: tag?.id, video: sp.get("video") === "1", before: sp.get("before") ?? undefined });
  });
  return NextResponse.json(posts, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
