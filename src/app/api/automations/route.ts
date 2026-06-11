import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  buildTrackedUrl,
  buildReportUrl,
  generateTrackedLinkSlug,
  generateReportShareSlug,
} from "@/lib/tracking";

// ─── GET  /api/automations ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { data: automations, error } = await supabase
    .from("automations")
    .select(`*, tracked_links(*)`)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  // Fetch analytics
  const ids = (automations ?? []).map((a) => a.id);

  const [{ data: statusRows }, { data: clickRows }, { data: keywordRows }] =
    await Promise.all([
      supabase
        .from("dm_logs")
        .select("automationId, status")
        .in("automationId", ids),
      supabase
        .from("link_clicks")
        .select("automationId")
        .in("automationId", ids),
      supabase
        .from("dm_logs")
        .select("automationId, matchedKeyword")
        .in("automationId", ids)
        .not("matchedKeyword", "is", null),
    ]);

  // Ensure all automations have a reportShareSlug
  for (const auto of automations ?? []) {
    if (!auto.reportShareSlug) {
      await supabase
        .from("automations")
        .update({ reportShareSlug: generateReportShareSlug() })
        .eq("id", auto.id);
    }
  }

  const { data: freshAutomations } = await supabase
    .from("automations")
    .select(`*, tracked_links(*)`)
    .order("created_at", { ascending: false });

  const enriched = (freshAutomations ?? []).map((auto) => {
    const logs = (statusRows ?? []).filter((r) => r.automationId === auto.id);
    const clicks = (clickRows ?? []).filter((r) => r.automationId === auto.id);
    const kws = (keywordRows ?? []).filter((r) => r.automationId === auto.id);

    const sent = logs.filter((l) => l.status === "SENT").length;
    const skipped = logs.filter((l) =>
      l.status.startsWith("SKIPPED_")
    ).length;
    const failed = logs.filter((l) => l.status === "FAILED").length;
    const clickCount = clicks.length;
    const ctr = sent > 0 ? Math.round((clickCount / sent) * 100) : 0;

    const kwMap: Record<string, number> = {};
    for (const r of kws) {
      if (r.matchedKeyword) kwMap[r.matchedKeyword] = (kwMap[r.matchedKeyword] ?? 0) + 1;
    }
    const topKeywords = Object.entries(kwMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([keyword, count]) => ({ keyword, count }));

    return {
      ...auto,
      trackedLinks: (auto.tracked_links ?? []).map(
        (tl: { slug: string; [k: string]: unknown }) => ({
          ...tl,
          trackedUrl: buildTrackedUrl(tl.slug),
          clickCount: (clickRows ?? []).filter(
            (c: { automationId: string }) => c.automationId === auto.id
          ).length,
        })
      ),
      reportUrl: auto.reportShareSlug
        ? buildReportUrl(auto.reportShareSlug)
        : null,
      analytics: { sent, skipped, failed, clicks: clickCount, ctr, topKeywords },
    };
  });

  return NextResponse.json({ success: true, data: enriched });
}

// ─── POST  /api/automations ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    name,
    goal,
    postId,
    postUrl,
    keywords,
    dmMessage,
    trackedDestinationUrl,
    isActive = true,
    wholeWordMatch = true,
  } = body;

  if (!name || !postId || !keywords?.length || !dmMessage) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Build tracked link inline if a destination URL is given
  const trackedLinkSlug = trackedDestinationUrl
    ? generateTrackedLinkSlug()
    : null;

  const { data: automation, error } = await supabase
    .from("automations")
    .insert({
      name,
      goal: goal ?? null,
      postId,
      postUrl: postUrl ?? null,
      keywords,
      dmMessage,
      isActive,
      wholeWordMatch,
      reportShareSlug: generateReportShareSlug(),
    })
    .select()
    .single();

  if (error || !automation)
    return NextResponse.json(
      { success: false, error: error?.message ?? "Insert failed" },
      { status: 500 }
    );

  if (trackedLinkSlug && trackedDestinationUrl) {
    await supabase.from("tracked_links").insert({
      automationId: automation.id,
      slug: trackedLinkSlug,
      label: "Primary campaign link",
      destinationUrl: trackedDestinationUrl,
    });
  }

  return NextResponse.json({ success: true, data: automation }, { status: 201 });
}

// ─── PATCH  /api/automations?id= ────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

  const body = await request.json();
  const allowed = ["name", "goal", "keywords", "dmMessage", "isActive", "wholeWordMatch", "reportShareEnabled"];
  const updates: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) updates[k] = body[k];
  }

  const { data, error } = await supabase
    .from("automations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

// ─── DELETE  /api/automations?id= ───────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
