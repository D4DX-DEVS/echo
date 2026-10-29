import { NextResponse } from "next/server";

// Own-domain share links: they redirect only to fixed platform hosts (no open redirect),
// and ad blockers that hide direct facebook.com/sharer or wa.me links leave them alone.
export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const u = encodeURIComponent(sp.get("u") ?? "");
  const text = encodeURIComponent(`${sp.get("t") ?? ""} ${sp.get("u") ?? ""}`.trim());
  const target: Record<string, string> = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    whatsapp: `https://wa.me/?text=${text}`,
  };
  const to = target[sp.get("to") ?? ""];
  return to ? NextResponse.redirect(to) : NextResponse.redirect(new URL("/", req.url));
}
