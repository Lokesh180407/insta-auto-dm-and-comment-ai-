import { NextRequest, NextResponse } from "next/server";
import { getUserMedia } from "@/lib/instagram";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  console.log(`[API /api/instagram/posts] Incoming request. Caching: ${url.searchParams.get("cache") || "default"}`);

  // Support both token naming configurations
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN ?? process.env.INSTAGRAM_TOKEN;

  if (!accessToken) {
    console.error("[API /api/instagram/posts] Instagram Access Token is not set in environment.");
    return NextResponse.json(
      { success: false, error: "Instagram access token not configured" },
      { status: 503 }
    );
  }

  try {
    const posts = await getUserMedia(accessToken, 30);
    
    // Normalize response objects
    const normalizedPosts = posts.map(post => ({
      id: post.id,
      caption: post.caption ?? "",
      media_type: post.media_type,
      media_url: post.media_url ?? "",
      thumbnail_url: post.thumbnail_url ?? post.media_url ?? "",
      permalink: post.permalink ?? "",
      timestamp: post.timestamp
    }));

    console.log(`[API /api/instagram/posts] Successfully retrieved ${normalizedPosts.length} posts.`);
    return NextResponse.json({ success: true, data: normalizedPosts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch posts";
    console.error("[API /api/instagram/posts] Error fetching posts:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
