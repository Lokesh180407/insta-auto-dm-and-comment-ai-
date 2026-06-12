'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  totals: {
    messages: number;
    dm_sent: number;
    ai_replies: number;
    human_replies: number;
    comment_triggers: number;
    failed: number;
  };
  daily: Array<{ date: string; messages: number; dm_sent: number; ai_replies: number }>;
  topCampaigns: Array<{ id: string; name: string; sent: number; failed: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 30, background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
        <div style={{ height: 40, width: 200, background: '#1a1a24', borderRadius: 8, marginBottom: 30 }} className="animate-pulse" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} style={{ height: 120, background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: '#ef4444', textAlign: 'center' }}>
        <h2>Error loading analytics</h2>
        <p>{error}</p>
      </div>
    );
  }

  const totals = data?.totals || { messages: 0, dm_sent: 0, ai_replies: 0, human_replies: 0, comment_triggers: 0, failed: 0 };
  const daily = data?.daily || [];
  const topCampaigns = data?.topCampaigns || [];

  // Simple math for CTR & AI conversion
  const ctr = totals.dm_sent > 0 ? ((totals.dm_sent - totals.failed) / totals.dm_sent * 100).toFixed(1) : '0';
  const aiRatio = totals.messages > 0 ? (totals.ai_replies / totals.messages * 100).toFixed(1) : '0';

  return (
    <div style={{ padding: 30, background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Analytics Overview</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Real-time platform performance metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#111118', padding: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['daily', 'weekly', 'monthly'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                background: timeframe === t ? 'linear-gradient(135deg, #833ab4, #fd1d1d)' : 'transparent',
                color: timeframe === t ? '#fff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
        {[
          { label: 'Total Messages', value: totals.messages, desc: 'Received messages', icon: '📩' },
          { label: 'DMs Sent', value: totals.dm_sent, desc: 'Total replies sent', icon: '📤' },
          { label: 'AI Responses', value: totals.ai_replies, desc: `${aiRatio}% of total`, icon: '🤖' },
          { label: 'Human Responses', value: totals.human_replies, desc: 'Inbox takeover', icon: '👤' },
          { label: 'Comment Triggers', value: totals.comment_triggers, desc: 'Automations hit', icon: '💬' },
          { label: 'Success Rate (CTR)', value: `${ctr}%`, desc: 'Delivery status', icon: '🎯' },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              padding: 20,
              background: '#111118',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 12 }}>{stat.icon}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 2px', color: '#fff' }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{stat.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 25 }}>
        {/* Chart Area */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0' }}>Activity History (Last 30 Days)</h3>
          {daily.length === 0 ? (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              No data collected in this timeframe. Run some DMs to populate graphs.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Simple horizontal bar charts */}
              {daily.slice(-7).map((d, index) => {
                const maxVal = Math.max(...daily.map(x => x.messages + x.dm_sent + x.ai_replies)) || 1;
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <div style={{ width: 80, fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{d.date}</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #833ab4, #fd1d1d)', width: `${(d.messages / maxVal * 100)}%` }} />
                      <div style={{ height: 8, borderRadius: 4, background: 'linear-gradient(90deg, #fcb045, #fd1d1d)', width: `${(d.dm_sent / maxVal * 100)}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', width: 60, textAlign: 'right' }}>
                      {d.messages} in / {d.dm_sent} out
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#833ab4' }} />
                  <span>Incoming</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fcb045' }} />
                  <span>Outgoing</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Campaign stats */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 20px 0' }}>Top Campaigns</h3>
          {topCampaigns.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              No active campaigns found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {topCampaigns.map((c, i) => (
                <div key={i} style={{ paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{c.sent} sent</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#fcb045', width: `${c.sent > 0 ? (c.sent / (c.sent + c.failed) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
