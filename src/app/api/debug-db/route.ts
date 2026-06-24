import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: logs } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(3);
  const { data: dmlogs } = await supabase.from('dm_logs').select('*').order('createdAt', { ascending: false }).limit(3);
  const { data: automations } = await supabase.from('automations').select('*').order('created_at', { ascending: false }).limit(3);
  
  return NextResponse.json({ logs, dmlogs, automations });
}
