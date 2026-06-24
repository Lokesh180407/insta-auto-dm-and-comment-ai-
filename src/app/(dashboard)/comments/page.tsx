'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface InstagramPost {
  id: string;
  caption: string;
  media_url: string;
  thumbnail: string | null;
  permalink: string;
  timestamp: string;
}

interface Template {
  id: string;
  name: string;
  message: string;
  buttons: { label: string, url: string }[];
}

export default function CommentAutomationsPage() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [postId, setPostId] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [dmMessage, setDmMessage] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Selection
  const [templates, setTemplates] = useState<Template[]>([]);
  const [posts, setPosts] = useState<InstagramPost[]>([]);

  useEffect(() => {
    fetchAutomations();
    fetch('/api/templates').then(r => r.json()).then(d => { if (d.success) setTemplates(d.data); });
    fetch('/api/instagram/posts').then(r => r.json()).then(d => { if (d.success) setPosts(d.data); });
  }, []);

  async function fetchAutomations() {
    setLoading(true);
    try {
      const res = await fetch('/api/automations');
      const json = await res.json();
      if (json.success) setAutomations(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/automations?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current })
      });
      if (res.ok) fetchAutomations();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Delete this automation?")) return;
    try {
      const res = await fetch(`/api/automations?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchAutomations();
    } catch (err) {
      console.error(err);
    }
  }

  async function createAutomation() {
    if (!name || !postId || !dmMessage || keywords.length === 0) {
      return alert("Please fill all required fields (Name, Post, Keywords, Message).");
    }
    setSaving(true);
    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, postId, keywords, dmMessage, isActive: true, wholeWordMatch: true
        })
      });
      const json = await res.json();
      if (json.success) {
        setView('list');
        fetchAutomations();
        setName('');
        setPostId('');
        setKeywords([]);
        setDmMessage('');
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Comment → DM Automations</h1>
          <p className="section-subtitle">Automatically send DMs to people who comment on your posts.</p>
        </div>
        {view === 'list' ? (
          <button className="btn-primary" onClick={() => setView('create')}>+ New Automation</button>
        ) : (
          <button className="btn-ghost" onClick={() => setView('list')}>← Back to List</button>
        )}
      </div>

      {view === 'list' && (
        <>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ color: '#2dd4bf', width: 24, height: 24 }} /></div>
          ) : automations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚀</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#e6edf3' }}>No automations active</div>
              <div style={{ fontSize: '14px', color: 'rgba(230,237,243,0.5)', marginTop: '8px', marginBottom: '24px' }}>
                Setup your first Comment → DM rule to engage with your audience automatically.
              </div>
              <button className="btn-primary" onClick={() => setView('create')}>Create Automation</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {automations.map(a => (
                <div key={a.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#e6edf3', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {a.name}
                        {a.isActive ? <span className="badge badge-teal">Active</span> : <span className="badge badge-skipped">Paused</span>}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'rgba(230,237,243,0.5)', marginTop: '4px' }}>
                        Post ID: {a.postId}
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleStatus(a.id, a.isActive)} 
                      className={`toggle ${a.isActive ? 'on' : ''}`}
                    />
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {a.keywords.map((k: string) => (
                      <span key={k} className="badge badge-indigo">{k}</span>
                    ))}
                  </div>

                  <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '13px', color: 'rgba(230,237,243,0.7)', whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
                    {a.dmMessage}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'rgba(230,237,243,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>Sent</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}>{a.analytics?.sent || 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'rgba(230,237,243,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>Failed</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f87171' }}>{a.analytics?.failed || 0}</div>
                      </div>
                    </div>
                    <button onClick={() => deleteAutomation(a.id)} className="btn-danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'create' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label className="label">Automation Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Free Guide Giveaway" />
            </div>

            <div>
              <label className="label">Select Post</label>
              {posts.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', fontSize: '13px', color: 'rgba(230,237,243,0.5)' }}>
                  Loading posts or no posts found.
                  <input className="input" style={{ marginTop: '12px' }} value={postId} onChange={e => setPostId(e.target.value)} placeholder="Enter Post ID manually" />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', maxHeight: '240px', overflowY: 'auto' }}>
                  {posts.map(p => {
                    const thumb = p.thumbnail || p.media_url;
                    const selected = postId === p.id;
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => setPostId(p.id)}
                        style={{ 
                          aspectRatio: '1', borderRadius: '8px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                          border: selected ? '2px solid var(--accent)' : '2px solid transparent' 
                        }}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', textAlign: 'center', padding: '4px' }}>
                            {p.caption?.slice(0, 40) || p.id}
                          </div>
                        )}
                        {selected && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(45,212,191,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontSize: '24px' }}>✓</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="label">Trigger Keywords (Comma separated)</label>
              <input 
                className="input" 
                placeholder="e.g. LINK, GUIDE, YES" 
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                    if (val && !keywords.includes(val)) {
                      setKeywords([...keywords, val]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }} 
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                {keywords.map(k => (
                  <span key={k} className="badge badge-indigo">
                    {k} <button onClick={() => setKeywords(keywords.filter(x => x !== k))} style={{ background: 'none', border: 'none', color: 'inherit', marginLeft: '4px', cursor: 'pointer' }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="label" style={{ margin: 0 }}>Direct Message</label>
                {templates.length > 0 && (
                  <select 
                    onChange={e => {
                      const t = templates.find(x => x.id === e.target.value);
                      if (t) setDmMessage(t.message);
                    }}
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: '#2dd4bf', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">Use Template...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>
              <textarea className="textarea" rows={6} value={dmMessage} onChange={e => setDmMessage(e.target.value)} placeholder="Type the message to send..." />
            </div>

            <button className="btn-primary" onClick={createAutomation} disabled={saving} style={{ alignSelf: 'flex-start', padding: '12px 24px' }}>
              {saving ? 'Creating...' : 'Create Automation'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#e6edf3' }}>Message Preview</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #2dd4bf, #818cf8)', flexShrink: 0 }} />
                <div style={{ background: 'var(--surface2)', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', fontSize: '13px', color: '#e6edf3', whiteSpace: 'pre-wrap', flex: 1 }}>
                  {dmMessage || 'Your message will appear here...'}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '24px', background: 'rgba(129,140,248,0.05)', borderColor: 'rgba(129,140,248,0.1)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#818cf8' }}>Pro Tip 💡</h3>
              <p style={{ fontSize: '13px', color: 'rgba(230,237,243,0.6)', lineHeight: 1.5 }}>
                To include action buttons in your DMs, create a <strong>Message Template</strong> first, then select it from the dropdown above. Buttons dramatically increase click-through rates.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
