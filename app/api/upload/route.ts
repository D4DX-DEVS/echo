import { NextResponse } from "next/server";
import { putFile } from "@/lib/storage";

export const runtime = "nodejs";
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

// Auth enforced by middleware.
export async function POST(req: Request) {
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Please choose a photo (JPG, PNG, WebP, GIF)" }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Photo is too large, max 4 MB" }, { status: 413 });
  const d = new Date();
  const key = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
  const url = await putFile(key, Buffer.from(await file.arrayBuffer()), file.type);
  return NextResponse.json({ url });
}
