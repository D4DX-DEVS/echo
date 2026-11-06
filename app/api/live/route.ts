import { NextResponse } from "next/server";
import { live } from "@/lib/analytics";

// Auth enforced by middleware.
export async function GET() {
  return NextResponse.json(await live(), { headers: { "Cache-Control": "no-store" } });
}
