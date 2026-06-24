'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

function usePublicSupabase() {
  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);
}

interface Conversation {
  id: string;
  igsid: string;
  username: string | null;
  name: string | null;
  profile_pic: string | null;
  follower_count: number | null;
  mode: 'agent' | 'human';
  unread_count: number;
  last_message?: string;
  updated_at: string;
  can_reply_until?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

function Spinner() {
  return (
    <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function avatarGradient(igsid: string): string {
  let hash = 0;
  for (let i = 0; i < igsid.length; i++) {
    hash = igsid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1},70%,55%), hsl(${h2},80%,45%))`;
}

function Avatar({ src, name, username, igsid, size }: { src: string | null; name: string | null; username?: string | null; igsid: string; size: number }) {
  const initials = username ? username.slice(0, 2).toUpperCase() : name ? name.slice(0, 2).toUpperCase() : igsid.slice(-2).toUpperCase();
  const baseStyle = { width: size, height: size, minWidth: size, fontSize: size * 0.34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  if (src) return <div style={baseStyle}><Image src={src} alt={name ?? username ?? igsid} width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} unoptimized /></div>;
  return <div style={{ ...baseStyle, background: avatarGradient(igsid), color: '#fff', fontWeight: 700, letterSpacing: '-0.5px' }}>{initials}</div>;
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: 'flex-start' }}>
      <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--surface2)', display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#9ca3af', display: 'inline-block', animation: `typing-bounce 1.2s infinite ease-in-out`, animationDelay: `${i * 0.2}s` }} />)}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const supabase = usePublicSupabase();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'human' | 'unread'>('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId), [conversations, selectedId]);

  const canReply = useMemo(() => {
    if (!selected?.can_reply_until) return true;
    return new Date(selected.can_reply_until) > now;
  }, [selected, now]);

  const timeLeft = useMemo(() => {
    if (!selected?.can_reply_until) return null;
    const diff = new Date(selected.can_reply_until).getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  }, [selected, now]);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
      else if (data?.conversations) setConversations(data.conversations);
      else if (data && typeof data === 'object') {
        const arr = Object.values(data).find(v => Array.isArray(v));
        if (arr) setConversations(arr as Conversation[]);
      }
    } catch (e) { console.error('[Inbox]', e); }
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
      else if (data?.messages) setMessages(data.messages);
    } catch (e) { console.error('[Inbox]', e); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      fetch(`/api/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unread_count: 0 }),
      }).then(() => {
        setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, unread_count: 0 } : c));
      }).catch(e => console.error(e));
    }
  }, [selectedId, fetchMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!supabase) return;
    const chMsg = supabase.channel('public:instagram_messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'instagram_messages' }, (payload) => {
      const msg = payload.new as Message;
      setIsTyping(false);
      setMessages((prev) => {
        if (msg.conversation_id === selectedIdRef.current) return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
        return prev;
      });
      fetchConversations();
    }).subscribe();

    const chConv = supabase.channel('public:instagram_conversations').on('postgres_changes', { event: '*', schema: 'public', table: 'instagram_conversations' }, () => fetchConversations()).subscribe();
    return () => { supabase.removeChannel(chMsg); supabase.removeChannel(chConv); };
  }, [fetchConversations, supabase]);

  const toggleMode = async () => {
    if (!selected) return;
    const newMode = selected.mode === 'agent' ? 'human' : 'agent';
    try {
      const res = await fetch(`/api/conversations/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      if (!res.ok) return;
      setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, mode: newMode } : c));
    } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedId || sending) return;
    const msgText = input.trim();
    setSending(true);

    const optMsg: Message = { id: `temp-${Date.now()}`, conversation_id: selectedId, role: 'assistant', content: msgText, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optMsg]);
    setInput('');
    if (selected?.mode === 'agent') setIsTyping(true);

    try {
      const res = await fetch(`/api/conversations/${selectedId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText }),
      });
      if (!res.ok) throw new Error('Send failed');
      fetchMessages(selectedId);
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optMsg.id));
      alert('Failed to send message');
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  };

  const ft = (d: string) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const match = (c.name || c.username || c.igsid || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
      if (activeTab === 'ai') return c.mode === 'agent';
      if (activeTab === 'human') return c.mode === 'human';
      if (activeTab === 'unread') return c.unread_count > 0;
      return true;
    });
  }, [conversations, searchQuery, activeTab]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--background)', overflow: 'hidden' }}>
      {/* 1. Sidebar */}
      <div style={{ width: 340, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <input
            type="text" placeholder="Search conversations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '6px 12px', gap: 4 }}>
          {(['all', 'ai', 'human', 'unread'] as const).map(t => (
            <button
              key={t} onClick={() => setActiveTab(t)}
              style={{ flex: 1, padding: '8px 0', border: 'none', background: 'transparent', color: activeTab === t ? 'var(--text)' : 'var(--muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent', textTransform: 'uppercase' }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No conversations found</div>
          ) : (
            filteredConversations.map(convo => {
              const isSel = convo.id === selectedId;
              return (
                <button
                  key={convo.id} onClick={() => setSelectedId(convo.id)}
                  style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, background: isSel ? 'var(--surface2)' : 'transparent', border: 'none', cursor: 'pointer', borderLeft: isSel ? '3px solid var(--accent)' : '3px solid transparent', borderBottom: '1px solid var(--border)', textAlign: 'left', transition: 'all 0.15s' }}
                >
                  <Avatar src={convo.profile_pic} name={convo.name} username={convo.username} igsid={convo.igsid} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {convo.name || convo.username || 'Instagram User'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ft(convo.updated_at)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                        {convo.last_message || `@${convo.username || 'unknown'}`}
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: convo.mode === 'agent' ? 'rgba(45,212,191,0.1)' : 'var(--surface2)', color: convo.mode === 'agent' ? 'var(--accent)' : 'var(--muted)', fontWeight: 700 }}>
                          {convo.mode === 'agent' ? 'AI' : 'YOU'}
                        </span>
                        {convo.unread_count > 0 && (
                          <span style={{ minWidth: 16, height: 16, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {convo.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selected ? (
          <>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Avatar src={selected.profile_pic} name={selected.name} username={selected.username} igsid={selected.igsid} size={48} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                    {selected.name || 'Instagram User'}
                    {selected.username && <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>@{selected.username}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 8 }}>
                    <span>ID: {selected.igsid}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={toggleMode} className={`toggle ${selected.mode === 'agent' ? 'on' : ''}`} />
                <span style={{ fontSize: 13, fontWeight: 600, color: selected.mode === 'agent' ? 'var(--accent)' : 'var(--muted)' }}>
                  {selected.mode === 'agent' ? 'AI Bot Active' : 'Human Takeover'}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const prevIsSame = i > 0 && messages[i - 1].role === msg.role;
                const nextIsSame = i < messages.length - 1 && messages[i + 1].role === msg.role;
                const radius = isUser ? `${prevIsSame ? '4px' : '18px'} 18px 18px ${nextIsSame ? '4px' : '18px'}` : `18px ${prevIsSame ? '4px' : '18px'} ${nextIsSame ? '4px' : '18px'} 18px`;

                return (
                  <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: isUser ? 'flex-start' : 'flex-end', marginBottom: nextIsSame ? 2 : 12 }}>
                    {isUser && !nextIsSame && <Avatar src={selected.profile_pic} name={selected.name} username={selected.username} igsid={selected.igsid} size={28} />}
                    {isUser && nextIsSame && <div style={{ width: 28 }} />}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-start' : 'flex-end', maxWidth: '70%' }}>
                      <div style={{ padding: '12px 16px', borderRadius: radius, fontSize: 14, lineHeight: 1.5, background: isUser ? 'var(--surface2)' : 'linear-gradient(135deg, #2dd4bf, #818cf8)', color: isUser ? 'var(--text)' : '#fff' }}>
                        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                      </div>
                      {!nextIsSame && (
                        <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                          {msg.id.startsWith('temp-') ? 'Sending...' : ft(msg.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {isTyping && <TypingBubble />}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12 }}>
                <span style={{ color: canReply ? 'var(--accent)' : '#f87171', fontWeight: 600 }}>
                  {canReply ? `✅ Can reply (${timeLeft || 'Active'})` : '⏰ Cannot reply (24hr window expired)'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <input
                  type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={canReply ? "Type your response..." : "Cannot reply - 24hr window expired"}
                  disabled={!canReply}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, outline: 'none', opacity: canReply ? 1 : 0.5 }}
                />
                <button
                  onClick={handleSend} disabled={sending || !input.trim() || !canReply}
                  style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #2dd4bf, #818cf8)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending || !input.trim() || !canReply ? 0.4 : 1 }}
                >
                  {sending ? <Spinner /> : <SendIcon />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 64, marginBottom: 24, opacity: 0.5 }}>💬</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Your Sent Inbox</h3>
            <p style={{ fontSize: 14, marginTop: 8 }}>Select a conversation to view your comment-to-DM automated messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
