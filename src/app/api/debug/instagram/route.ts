import { NextResponse } from "next/server";
import { getInstagramBusinessAccountId, getUserMedia } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = (process.env.INSTAGRAM_ACCESS_TOKEN ?? "").trim();
  const verifyToken = (process.env.INSTAGRAM_VERIFY_TOKEN ?? process.env.VERIFY_TOKEN ?? "").trim();
  
  if (!token) {
    return NextResponse.json({ token_valid: false, error: "No token configured" });
  }

  try {
    const bizId = await getInstagramBusinessAccountId(token);
    const media = await getUserMedia(token, 10);
    
    return NextResponse.json({
      token_valid: true,
      instagram_user_id: bizId,
      account_type: "BUSINESS",
      media_count: media.length,
      webhook_verified: !!verifyToken
    });
  } catch (err: any) {
    return NextResponse.json({
      token_valid: false,
      error: err.message
    });
  }
}
