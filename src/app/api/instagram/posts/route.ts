import { NextRequest, NextResponse } from "next/server";
import { getUserMedia } from "@/lib/instagram";

export async function GET(request: NextRequest) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { success: false, error: "Instagram access token not configured" },
      { status: 503 }
    );
  }

  try {
    const posts = await getUserMedia(accessToken, 30);
    return NextResponse.json({ success: true, data: posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch posts";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
