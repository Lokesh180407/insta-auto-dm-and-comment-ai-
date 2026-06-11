import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** Tracked-link redirect — records a click then 301-redirects the user */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const { data: link } = await supabase
    .from("tracked_links")
    .select("id, destinationUrl, automationId")
    .eq("slug", slug)
    .single();

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Record click (best-effort — don't block redirect)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = ip
    ? Buffer.from(ip).toString("base64").slice(0, 24)
    : null;

  await supabase.from("link_clicks").insert({
    trackedLinkId: link.id,
    automationId: link.automationId,
    ipHash,
    userAgent: request.headers.get("user-agent") ?? null,
    referrer: request.headers.get("referer") ?? null,
  });

  return NextResponse.redirect(link.destinationUrl, 301);
}
