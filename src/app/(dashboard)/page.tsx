'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  // Simulated metrics based on the StitchMCP generation
  const metrics = [
    { label: 'Total Conversations', value: '12,480', trend: '+12%', trendUp: true },
    { label: 'Unread', value: '42', trend: '-5%', trendUp: false },
    { label: "Today's Messages", value: '842', trend: '+24%', trendUp: true },
    { label: 'Automation Success', value: '98.2%', trend: '+1.2%', trendUp: true },
    { label: 'AI vs Human', value: '85% / 15%', trend: 'Steady', trendUp: true },
  ];

  const recentConversations = [
    { id: '1', user: '@johndoe', message: 'How much is the premium plan?', status: 'Automated', time: '2m ago' },
    { id: '2', user: '@sarahsmith', message: 'I need help with my order.', status: 'Human Needed', time: '15m ago' },
    { id: '3', user: '@mike_j', message: 'Thanks!', status: 'Automated', time: '1h ago' },
    { id: '4', user: '@emily_r', message: 'Do you ship to Canada?', status: 'Human Needed', time: '2h ago' },
  ];

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', color: '#dae2fd', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #d0bcff, #a078ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Command Center
          </h1>
          <p style={{ color: '#cbc3d7', marginTop: '8px', fontSize: '16px' }}>Your Instagram automation overview.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <div style={{ color: '#d0bcff', fontSize: '18px' }}>Loading Dashboard...</div>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '48px' }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ 
                background: '#131b2e', 
                border: '1px solid rgba(255,255,255,0.05)', 
                borderRadius: '16px', 
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}>
                <div style={{ fontSize: '14px', color: '#cbc3d7', marginBottom: '8px' }}>{m.label}</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#dae2fd' }}>{m.value}</div>
                <div style={{ fontSize: '12px', marginTop: '8px', color: m.trendUp ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {m.trend} from last period
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Chart Area */}
            <div style={{ 
              background: '#131b2e', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '24px', 
              padding: '32px',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 24px 0' }}>Messages Over Time</h2>
              <div style={{ 
                flex: 1, 
                background: 'linear-gradient(180deg, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0) 100%)', 
                borderRadius: '12px', 
                border: '1px dashed rgba(139,92,246,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8b5cf6'
              }}>
                [Chart Component Placeholder]
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ 
              background: '#131b2e', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '24px', 
              padding: '32px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 24px 0' }}>Recent Activity</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recentConversations.map((conv) => (
                  <div key={conv.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: '#171f33',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.02)'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#dae2fd' }}>{conv.user}</div>
                      <div style={{ fontSize: '12px', color: '#cbc3d7', marginTop: '4px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.message}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 10px', 
                        borderRadius: '999px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: conv.status === 'Automated' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: conv.status === 'Automated' ? '#10b981' : '#ef4444'
                      }}>
                        {conv.status}
                      </span>
                      <div style={{ fontSize: '11px', color: '#958ea0', marginTop: '6px' }}>{conv.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <Link href="/inbox" style={{ color: '#d0bcff', fontSize: '14px', textDecoration: 'none', fontWeight: 600 }}>
                  View All Conversations →
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
