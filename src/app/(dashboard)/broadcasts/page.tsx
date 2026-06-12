'use client';

import { useState, useEffect } from 'react';

interface Broadcast {
  id: string;
  name: string;
  message: string;
  status: 'draft' | 'scheduled' | 'running' | 'done' | 'failed';
  audience_filter: { tag?: string; followers_only?: boolean };
  scheduled_at: string | null;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showCompose, setShowCompose] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [tag, setTag] = useState('');
  const [followersOnly, setFollowersOnly] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchBroadcasts() {
    try {
      setLoading(true);
      const res = await fetch('/api/broadcasts');
      if (!res.ok) throw new Error('Failed to fetch broadcasts');
      const json = await res.json();
      setBroadcasts(json.broadcasts || []);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !message) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          message,
          scheduled_at: scheduledAt || undefined,
          audience_filter: {
            tag: tag || undefined,
            followers_only: followersOnly || undefined,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to create broadcast');
      
      // Reset form
      setName('');
      setMessage('');
      setTag('');
      setFollowersOnly(false);
      setScheduledAt('');
      setShowCompose(false);
      
      // Refresh list
      fetchBroadcasts();
    } catch (err: any) {
      alert(err.message || 'Failed to submit broadcast');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;

    try {
      const res = await fetch(`/api/broadcasts?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete broadcast');
      fetchBroadcasts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'done': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' };
      case 'running': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
      case 'scheduled': return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)' };
      case 'failed': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' };
      default: return { bg: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255, 255, 255, 0.1)' };
    }
  };

  return (
    <div style={{ padding: 30, background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Broadcast Campaigns</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Send mass direct messages to your audience base</p>
        </div>
        <button
          onClick={() => setShowCompose(!showCompose)}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
            color: '#fff',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(131,58,180,0.3)',
            transition: 'all 0.2s'
          }}
        >
          {showCompose ? 'Cancel' : 'New Broadcast'}
        </button>
      </div>

      {showCompose && (
        <form onSubmit={handleSubmit} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 25, marginBottom: 30 }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Compose Broadcast</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Campaign Name</label>
              <input
                type="text"
                placeholder="e.g. June Product Launch Announcement"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Schedule Delivery (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Message Content</label>
            <textarea
              placeholder="Hi {{name}}, we're launching our new service tomorrow!"
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={4}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, resize: 'vertical' }}
            />
          </div>

          <div style={{ background: '#1a1a24', padding: 16, borderRadius: 10, marginBottom: 25, border: '1px solid rgba(255,255,255,0.04)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600 }}>Audience Targeting Filter</h4>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="followers_only"
                  checked={followersOnly}
                  onChange={e => setFollowersOnly(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="followers_only" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Followers Only</label>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Tag matches:</span>
                <input
                  type="text"
                  placeholder="e.g. vip, warm-lead"
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, background: '#111118', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12 }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              background: 'linear-gradient(135deg, #fcb045, #fd1d1d)',
              color: '#fff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Creating Broadcast...' : scheduledAt ? 'Schedule Campaign' : 'Send Immediately'}
          </button>
        </form>
      )}

      {loading && broadcasts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>Loading broadcasts...</div>
      ) : broadcasts.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📢</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>No Broadcast Campaigns</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 400 }}>Create your first broadcast campaign to send messages to your entire subscriber list at once.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {broadcasts.map(b => {
            const style = getStatusStyle(b.status);
            return (
              <div
                key={b.id}
                style={{
                  background: '#111118',
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 15
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#fff' }}>{b.name}</h3>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: style.bg,
                    color: style.color,
                    border: style.border
                  }}>
                    {b.status}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 54 }}>
                  {b.message}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Sent:</span> <span style={{ fontWeight: 600, color: '#22c55e' }}>{b.sent_count}</span>
                  </div>
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Failed:</span> <span style={{ fontWeight: 600, color: '#ef4444' }}>{b.failed_count}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {b.scheduled_at ? `Scheduled: ${new Date(b.scheduled_at).toLocaleDateString()}` : `Created: ${new Date(b.created_at).toLocaleDateString()}`}
                  </span>
                  <button
                    onClick={() => handleDelete(b.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#ef4444',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
