import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Fetch all analytics events
    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('event_type, created_at, campaign_id, campaign_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const eventsData = events ?? [];

    // --- Totals ---
    const totals = {
      messages: 0,
      dm_sent: 0,
      ai_replies: 0,
      human_replies: 0,
      comment_triggers: 0,
      failed: 0,
    };

    for (const e of eventsData) {
      switch (e.event_type) {
        case 'message_received':
          totals.messages++;
          break;
        case 'dm_sent':
          totals.dm_sent++;
          break;
        case 'ai_reply':
          totals.ai_replies++;
          break;
        case 'human_reply':
          totals.human_replies++;
          break;
        case 'comment_trigger':
          totals.comment_triggers++;
          break;
        case 'failed':
          totals.failed++;
          break;
      }
    }

    // --- Daily stats for last 30 days ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEvents = eventsData.filter(
      (e) => new Date(e.created_at) >= thirtyDaysAgo
    );

    const dailyMap: Record<
      string,
      { date: string; messages: number; dm_sent: number; ai_replies: number }
    > = {};

    for (const e of recentEvents) {
      const date = new Date(e.created_at).toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { date, messages: 0, dm_sent: 0, ai_replies: 0 };
      }
      if (e.event_type === 'message_received') dailyMap[date].messages++;
      if (e.event_type === 'dm_sent') dailyMap[date].dm_sent++;
      if (e.event_type === 'ai_reply') dailyMap[date].ai_replies++;
    }

    const daily = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // --- Top Campaigns ---
    const campaignMap: Record<
      string,
      { id: string; name: string; sent: number; failed: number }
    > = {};

    for (const e of eventsData) {
      if (!e.campaign_id) continue;
      if (!campaignMap[e.campaign_id]) {
        campaignMap[e.campaign_id] = {
          id: e.campaign_id,
          name: e.campaign_name ?? e.campaign_id,
          sent: 0,
          failed: 0,
        };
      }
      if (e.event_type === 'dm_sent') campaignMap[e.campaign_id].sent++;
      if (e.event_type === 'failed') campaignMap[e.campaign_id].failed++;
    }

    const topCampaigns = Object.values(campaignMap)
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 10);

    return NextResponse.json({ totals, daily, topCampaigns });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
