import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const automationId = request.nextUrl.searchParams.get("automationId");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "100");

  let query = supabase
    .from("dm_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (automationId) {
    query = query.eq("automationId", automationId);
  }

  const { data, error } = await query;

  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data });
}
