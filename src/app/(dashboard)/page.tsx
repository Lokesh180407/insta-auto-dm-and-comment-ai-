'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Log {
  id: string;
  automationId: string;
  commenterName: string | null;
  commenterId: string;
  commentText: string;
  status: string;
  created_at: string;
}

interface Automation {
  id: string;
  isActive: boolean;
  name: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAutomations: 0,
    activeAutomations: 0,
    totalDmsSent: 0,
    successRate: 0,
  });
  const [recentLogs, setRecentLogs] = useState<Log[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [autoRes, logsRes] = await Promise.all([
          fetch('/api/automations'),
          fetch('/api/logs?limit=50')
        ]);
        
        const autoData = await autoRes.json();
        const logsData = await logsRes.json();

        const automations: Automation[] = autoData?.data || [];
        const logs: Log[] = Array.isArray(logsData) ? logsData : [];

        const totalAuto = automations.length;
        const activeAuto = automations.filter(a => a.isActive).length;
        const sentDms = logs.filter(l => l.status === 'SENT').length;
        const successRate = logs.length > 0 ? Math.round((sentDms / logs.length) * 100) : 0;

        setStats({
          totalAutomations: totalAuto,
          activeAutomations: activeAuto,
          totalDmsSent: sentDms,
          successRate: successRate,
        });

        setRecentLogs(logs.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{ padding: '32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#e6edf3' }}>
          Command Center
        </h1>
        <p style={{ color: 'rgba(230,237,243,0.5)', marginTop: '8px', fontSize: '15px' }}>
          Overview of your personal Instagram comment automations.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <div className="spinner" style={{ color: '#2dd4bf', width: 30, height: 30 }} />
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div className="card">
              <div style={{ fontSize: '12px', color: 'rgba(230,237,243,0.5)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Total Automations</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#e6edf3' }}>{stats.totalAutomations}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '12px', color: 'rgba(230,237,243,0.5)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Active Automations</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#2dd4bf' }}>{stats.activeAutomations}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '12px', color: 'rgba(230,237,243,0.5)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>DMs Sent</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#818cf8' }}>{stats.totalDmsSent}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: '12px', color: 'rgba(230,237,243,0.5)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Delivery Success</div>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#34d399' }}>{stats.successRate}%</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
            {/* Quick Actions */}
            <div className="card">
              <div className="section-header">
                <h2 className="section-title">Quick Actions</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link href="/comments" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '16px', background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: '12px', color: '#2dd4bf', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Create Comment Automation</span>
                    <span>→</span>
                  </div>
                </Link>
                <Link href="/templates" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '16px', background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.15)', borderRadius: '12px', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Manage Message Templates</span>
                    <span>→</span>
                  </div>
                </Link>
                <Link href="/inbox" style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', color: '#e6edf3', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>View Sent Inbox</span>
                    <span>→</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
              <div className="section-header">
                <h2 className="section-title">Recent DM Logs</h2>
              </div>
              {recentLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(230,237,243,0.3)', fontSize: '14px' }}>
                  No recent activity found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentLogs.map((log) => (
                    <div key={log.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>
                          @{log.commenterName || log.commenterId}
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(230,237,243,0.5)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          &quot;{log.commentText}&quot;
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span className={`badge ${log.status === 'SENT' ? 'badge-sent' : log.status === 'FAILED' ? 'badge-failed' : 'badge-pending'}`}>
                          {log.status === 'SENT' ? '✅ Sent' : log.status === 'FAILED' ? '❌ Failed' : '⏳ Pending'}
                        </span>
                        <div style={{ fontSize: '10px', color: 'rgba(230,237,243,0.3)', marginTop: '8px' }}>
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <Link href="/logs" style={{ color: '#2dd4bf', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
                      View All Logs →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
