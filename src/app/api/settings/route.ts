import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "system_prompt")
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ system_prompt: data?.value ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { system_prompt } = body;

  if (typeof system_prompt !== "string") {
    return Response.json({ error: "system_prompt must be a string" }, { status: 400 });
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "system_prompt", value: system_prompt }, { onConflict: "key" });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
