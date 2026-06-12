'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

// Reusable hook for Supabase client
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
  is_user_follow_business?: boolean | null;
  assigned_to?: string | null;
  closed?: boolean;
  can_reply_until?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  instagram_msg_id: string | null;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

// ─── Reusable Helpers ───
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
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : name
    ? name.slice(0, 2).toUpperCase()
    : igsid.slice(-2).toUpperCase();

  const baseStyle = {
    width: size,
    height: size,
    minWidth: size,
    fontSize: size * 0.34,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (src) {
    return (
      <div style={baseStyle}>
        <Image
          src={src}
          alt={name ?? username ?? igsid}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div style={{ ...baseStyle, background: avatarGradient(igsid), color: '#fff', fontWeight: 700, letterSpacing: '-0.5px' }}>
      {initials}
    </div>
  );
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: 'flex-start' }}>
      <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--surface2)', display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#9ca3af',
            display: 'inline-block',
            animation: `typing-bounce 1.2s infinite ease-in-out`,
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
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
  
  // Right contact panel
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [assignee, setAssignee] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId), [conversations, selectedId]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
      } else if (data && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      } else if (data && typeof data === 'object') {
        // Fallback for different return shapes
        const possibleArray = Object.values(data).find(v => Array.isArray(v));
        if (possibleArray) setConversations(possibleArray as Conversation[]);
      }
    } catch (e) {
      console.error('[Inbox] fetchConversations error:', e);
    }
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      } else if (data && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error('[Inbox] fetchMessages error:', e);
    }
  }, []);

  // Fetch conversations on load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      // Mark as read API call
      fetch(`/api/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unread_count: 0 }),
      }).then(() => {
        // Update local list unread count
        setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, unread_count: 0 } : c));
      }).catch(e => console.error('Error marking as read:', e));
    }
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time updates subscription
  useEffect(() => {
    if (!supabase) return;
    const chMsg = supabase
      .channel('public:instagram_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'instagram_messages' },
        (payload) => {
          const msg = payload.new as Message;
          setIsTyping(false); // hide typing on actual receive
          setMessages((prev) => {
            if (msg.conversation_id === selectedIdRef.current) {
              return prev.some((m) => m.id === msg.id) ? prev : [...prev, msg];
            }
            return prev;
          });
          fetchConversations();
        }
      )
      .subscribe();

    const chConv = supabase
      .channel('public:instagram_conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instagram_conversations' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chMsg);
      supabase.removeChannel(chConv);
    };
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedId || sending) return;
    const msgText = input.trim();
    setSending(true);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: selectedId,
      role: 'assistant',
      content: msgText,
      instagram_msg_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');

    if (selected?.mode === 'agent') {
      setIsTyping(true);
    }

    try {
      const res = await fetch(`/api/conversations/${selectedId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText }),
      });
      if (!res.ok) throw new Error('Send failed');
      fetchMessages(selectedId);
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert('Failed to send message');
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  };

  const ft = (d: string) => {
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filters & Search
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const nameMatch = (c.name || c.username || c.igsid || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!nameMatch) return false;

      if (activeTab === 'ai') return c.mode === 'agent';
      if (activeTab === 'human') return c.mode === 'human';
      if (activeTab === 'unread') return c.unread_count > 0;
      return true;
    });
  }, [conversations, searchQuery, activeTab]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0f', overflow: 'hidden' }}>
      {/* 1. Conversations Sidebar */}
      <div style={{ width: 300, borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', background: '#111118', flexShrink: 0 }}>
        {/* Search */}
        <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, outline: 'none' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '6px 12px', gap: 4 }}>
          {(['all', 'ai', 'human', 'unread'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                flex: 1, padding: '6px 0', border: 'none', background: 'transparent',
                color: activeTab === t ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                borderBottom: activeTab === t ? '2px solid #fd1d1d' : '2px solid transparent',
                textTransform: 'uppercase'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No conversations found</div>
          ) : (
            filteredConversations.map(convo => {
              const isSel = convo.id === selectedId;
              return (
                <button
                  key={convo.id}
                  onClick={() => setSelectedId(convo.id)}
                  style={{
                    width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    background: isSel ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', cursor: 'pointer',
                    borderLeft: isSel ? '3px solid #fd1d1d' : '3px solid transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'left', transition: 'all 0.15s'
                  }}
                >
                  <Avatar src={convo.profile_pic} name={convo.name} username={convo.username} igsid={convo.igsid} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {convo.name || convo.username || 'Instagram User'}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{ft(convo.updated_at)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                        {convo.last_message || `@${convo.username || 'unknown'}`}
                      </span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, background: convo.mode === 'agent' ? 'rgba(131,58,180,0.15)' : 'rgba(255,255,255,0.06)', color: convo.mode === 'agent' ? '#fd1d1d' : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
                          {convo.mode === 'agent' ? 'AI' : 'YOU'}
                        </span>
                        {convo.unread_count > 0 && (
                          <span style={{ minWidth: 16, height: 16, borderRadius: '50%', background: '#fd1d1d', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* 2. Middle Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selected ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111118' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar src={selected.profile_pic} name={selected.name} username={selected.username} igsid={selected.igsid} size={42} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selected.name || 'Instagram User'}
                    {selected.username && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>@{selected.username}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>ID: {selected.igsid}</span>
                    {selected.follower_count !== null && (
                      <>
                        <span>·</span>
                        <span>{selected.follower_count.toLocaleString()} followers</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* AI Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={toggleMode}
                  className={`toggle ${selected.mode === 'agent' ? 'on' : ''}`}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: selected.mode === 'agent' ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
                  {selected.mode === 'agent' ? 'AI Auto-Response' : 'Human Takeover'}
                </span>
                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', marginLeft: 15 }}
                >
                  ℹ️
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const prevIsSame = i > 0 && messages[i - 1].role === msg.role;
                const nextIsSame = i < messages.length - 1 && messages[i + 1].role === msg.role;
                const radius = isUser
                  ? `${prevIsSame ? '4px' : '18px'} 18px 18px ${nextIsSame ? '4px' : '18px'}`
                  : `18px ${prevIsSame ? '4px' : '18px'} ${nextIsSame ? '4px' : '18px'} 18px`;

                return (
                  <div
                    key={msg.id}
                    className="fade-in"
                    style={{
                      display: 'flex', alignItems: 'flex-end', gap: 8,
                      justifyContent: isUser ? 'flex-start' : 'flex-end',
                      marginBottom: nextIsSame ? 2 : 10
                    }}
                  >
                    {isUser && !nextIsSame && (
                      <Avatar src={selected.profile_pic} name={selected.name} username={selected.username} igsid={selected.igsid} size={28} />
                    )}
                    {isUser && nextIsSame && <div style={{ width: 28 }} />}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-start' : 'flex-end', maxWidth: '65%' }}>
                      <div style={{
                        padding: '10px 14px', borderRadius: radius, fontSize: 14, lineHeight: 1.4,
                        background: isUser ? '#1a1a24' : 'linear-gradient(135deg, #833ab4, #fd1d1d)',
                        color: '#fff', border: isUser ? '1px solid rgba(255,255,255,0.06)' : 'none'
                      }}>
                        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                      </div>
                      {!nextIsSame && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
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

            {/* Input Bar */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', background: '#111118' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11 }}>
                <span style={{ color: canReply ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                  {canReply ? `✅ Can reply (${timeLeft || 'Active'})` : '⏰ Cannot reply (24hr window expired)'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#1a1a24', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={canReply ? "Type your response..." : "Cannot reply - 24hr window expired"}
                  disabled={!canReply}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, outline: 'none', opacity: canReply ? 1 : 0.5 }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim() || !canReply}
                  style={{
                    width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
                    border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: sending || !input.trim() || !canReply ? 0.4 : 1
                  }}
                >
                  {sending ? <Spinner /> : <SendIcon />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ fontSize: 48, marginBottom: 15 }}>💬</span>
            <h3>No Conversation Selected</h3>
            <p style={{ fontSize: 13, marginTop: 4 }}>Choose a chat from the sidebar to begin messaging.</p>
          </div>
        )}
      </div>

      {/* 3. Collapsible Right Contact Panel */}
      {selected && showRightPanel && (
        <div style={{ width: 280, borderLeft: '1px solid rgba(255,255,255,0.07)', background: '#111118', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Contact Info</h3>
            <button onClick={() => setShowRightPanel(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>×</button>
          </div>

          {/* Profile Card */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
            <Avatar src={selected.profile_pic} name={selected.name} username={selected.username} igsid={selected.igsid} size={64} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.name || 'Instagram User'}</div>
              {selected.username && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>@{selected.username}</div>}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Quick Actions */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Assignee</h4>
            <select
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 6, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, cursor: 'pointer' }}
            >
              <option value="">Unassigned</option>
              <option value="lokesh">Lokesh</option>
              <option value="sara">Sara Miller</option>
              <option value="john">John Doe</option>
            </select>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Custom Labels */}
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Labels</h4>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
              {selectedLabels.map((lbl, idx) => (
                <span key={idx} style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(131,58,180,0.15)', color: '#fd1d1d', fontSize: 10, border: '1px solid rgba(131,58,180,0.2)' }}>
                  {lbl}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => {
                  const tag = prompt('Enter label name:');
                  if (tag) setSelectedLabels([...selectedLabels, tag.trim().toLowerCase()]);
                }}
                style={{ width: '100%', padding: '6px', borderRadius: 6, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 11, cursor: 'pointer' }}
              >
                + Add Label
              </button>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

          {/* Conversation Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h4 style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Notes</h4>
            
            {/* Note Input */}
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="text"
                placeholder="Add customer note..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                style={{ flex: 1, padding: 6, borderRadius: 6, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 11 }}
              />
              <button
                onClick={() => {
                  if (!newNote.trim()) return;
                  setNotes([...notes, { id: Date.now().toString(), content: newNote.trim(), created_at: new Date().toISOString() }]);
                  setNewNote('');
                }}
                style={{ padding: '6px 10px', borderRadius: 6, background: 'linear-gradient(135deg, #833ab4, #fd1d1d)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}
              >
                Add
              </button>
            </div>

            {/* Note List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
              {notes.map(n => (
                <div key={n.id} style={{ padding: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 6, fontSize: 11 }}>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)' }}>{n.content}</p>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', display: 'block', marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
