import { NextResponse } from "next/server";
import { getAccountInfo } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = (process.env.INSTAGRAM_ACCESS_TOKEN ?? "").trim();
  if (!token) {
    return NextResponse.json(
      { success: false, error: "INSTAGRAM_ACCESS_TOKEN not configured" },
      { status: 503 }
    );
  }
  try {
    const account = await getAccountInfo(token);
    return NextResponse.json({ success: true, data: account });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load account";
    console.error("[/api/instagram/account]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
