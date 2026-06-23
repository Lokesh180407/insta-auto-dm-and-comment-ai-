'use client';

import { useState, useEffect, useCallback } from 'react';

interface DmLog {
  id: string;
  automationId: string;
  commenterId: string;
  commenterName: string | null;
  commentText: string;
  commentId: string;
  matchedKeyword: string | null;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED_PLAN_LIMIT';
  dmSentAt: string | null;
  errorMessage: string | null;
  created_at: string;
  attempts: number;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  SENT: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: '✅ Sent' },
  PENDING: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: '⏳ Pending' },
  FAILED: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: '❌ Failed' },
  SKIPPED_PLAN_LIMIT: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: '⛔ Skipped' },
};

function fmt(d: string) {
  return new Date(d).toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function LogsPage() {
  const [logs, setLogs] = useState<DmLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SENT' | 'FAILED' | 'PENDING'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.logs ?? []);
    } catch (e) {
      console.error('Error fetching DM logs:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const matchFilter = filter === 'ALL' || l.status === filter;
    const matchSearch = !search ||
      (l.commenterName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      l.commentText.toLowerCase().includes(search.toLowerCase()) ||
      (l.matchedKeyword ?? '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === 'SENT').length,
    failed: logs.filter(l => l.status === 'FAILED').length,
    pending: logs.filter(l => l.status === 'PENDING').length,
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>📋 DM Logs</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6, fontSize: 13 }}>
          Real-time log of all comment-triggered DMs sent by your automations.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: '#8b5cf6' },
          { label: 'Sent', value: stats.sent, color: '#10b981' },
          { label: 'Failed', value: stats.failed, color: '#ef4444' },
          { label: 'Pending', value: stats.pending, color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by username, comment, keyword..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: 1, minWidth: 220, padding: '9px 14px', borderRadius: 8, background: '#111118', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL', 'SENT', 'FAILED', 'PENDING'] as const).map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(0); }} style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: filter === f ? 'rgba(139,92,246,0.2)' : 'transparent',
              color: filter === f ? '#a78bfa' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}>{f}</button>
          ))}
        </div>
        <button onClick={fetchLogs} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading logs...</div>
        ) : paged.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            No DM logs found. When a comment triggers your automation, it will appear here.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {['User', 'Comment', 'Keyword', 'Status', 'Sent At', 'Error'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((log, i) => {
                const st = STATUS_STYLES[log.status] ?? STATUS_STYLES.PENDING;
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                        {log.commenterName ? `@${log.commenterName}` : log.commenterId}
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{fmt(log.created_at)}</div>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.commentText}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {log.matchedKeyword && (
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.12)', color: '#a78bfa', fontWeight: 600 }}>
                          {log.matchedKeyword}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                      {log.dmSentAt ? fmt(log.dmSentAt) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 160 }}>
                      {log.errorMessage && (
                        <span style={{ fontSize: 10, color: '#ef4444', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.errorMessage}>
                          {log.errorMessage}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', opacity: page === 0 ? 0.3 : 1 }}>← Prev</button>
          <span style={{ padding: '6px 14px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', opacity: page === totalPages - 1 ? 0.3 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
