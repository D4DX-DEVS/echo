import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";
import { bindings } from "@/lib/cf";
import { putFile } from "@/lib/storage";

const TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const MAX = 100 * 1024 * 1024; // the largest request body a Worker takes on the free plan

// Not covered by the admin middleware on purpose: middleware buffers request bodies (10 MB), which would cut a video short.
// The login cookie is checked here instead.
export async function PUT(req: Request) {
  if (!(await verifyToken((await cookies()).get(COOKIE)?.value))) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const type = req.headers.get("content-type") ?? "";
  const ext = TYPES[type];
  if (!ext) return NextResponse.json({ error: "Please choose an MP4, WebM or MOV video" }, { status: 400 });
  const size = Number(req.headers.get("content-length"));
  if (!size || size > MAX) return NextResponse.json({ error: "This video is too large, the limit is 100 MB" }, { status: 413 });

  const d = new Date();
  const key = `videos/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
  const b = await bindings();
  if (b?.MEDIA && req.body) {
    // R2 needs the stream's length up front and Next wraps the request body without it, so pass it through a fixed-length stream:
    // the video flows straight into R2 and is never held in memory
    const { readable, writable } = new (globalThis as unknown as { FixedLengthStream: new (n: number) => TransformStream }).FixedLengthStream(size);
    await Promise.all([req.body.pipeTo(writable), b.MEDIA.put(key, readable, { httpMetadata: { contentType: type } })]);
    return NextResponse.json({ url: `${b.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}` });
  }
  return NextResponse.json({ url: await putFile(key, Buffer.from(await req.arrayBuffer()), type) }); // local development
}
