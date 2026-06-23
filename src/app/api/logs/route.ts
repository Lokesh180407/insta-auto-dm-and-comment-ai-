import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const automationId = request.nextUrl.searchParams.get("automationId");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "200");

  let query = supabase
    .from("dm_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (automationId) {
    query = query.eq("automationId", automationId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return flat array so the frontend can use it directly
  return NextResponse.json(data ?? []);
}
