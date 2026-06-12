import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: settingsData, error } = await supabase
      .from("app_settings")
      .select("*");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map rows into a key-value object
    const settings: Record<string, any> = {};
    if (settingsData) {
      for (const row of settingsData) {
        settings[row.key] = row.value;
      }
    }

    return NextResponse.json({
      system_prompt: settings["system_prompt"] || "",
      ai_model: settings["ai_model"] || "google/gemma-3-12b-it:free",
      ai_personality: settings["ai_personality"] || "helpful and friendly",
      ai_enabled: settings["ai_enabled"] !== "false", // default true
      auto_reply_delay: Number(settings["auto_reply_delay"] || "0"),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keys = ["system_prompt", "ai_model", "ai_personality", "ai_enabled", "auto_reply_delay"];
    
    const upserts = [];
    for (const key of keys) {
      if (body[key] !== undefined) {
        upserts.push({
          key,
          value: String(body[key])
        });
      }
    }

    if (upserts.length === 0) {
      return NextResponse.json({ error: "No settings keys provided" }, { status: 400 });
    }

    const { error } = await supabase
      .from("app_settings")
      .upsert(upserts, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
