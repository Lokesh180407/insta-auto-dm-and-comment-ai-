import { NextResponse } from "next/server";
import { getUserMedia } from "@/lib/instagram";

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
    const posts = await getUserMedia(token, 30);
    console.log("Media Count:", posts.length);
    return NextResponse.json({ success: true, data: posts, count: posts.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch posts";
    console.error("[/api/instagram/posts]", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
