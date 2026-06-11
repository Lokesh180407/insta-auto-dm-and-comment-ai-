"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import type {
  ConversationWithLastMessage,
  Message,
  AutomationWithStats,
  DmLog,
} from "@/lib/types";

// ─── Supabase public client for real-time ────────────────────────────────────
function usePublicSupabase() {
  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);
}

// ─── Tab definitions ─────────────────────────────────────────────────────────
type Tab = "inbox" | "campaigns" | "new-campaign" | "logs" | "settings";

// ─── Small reusable helpers ──────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="spinner"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ChatIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CampaignIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function LogsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function SettingsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

// ─── Avatar component ─────────────────────────────────────────────────────────
function Avatar({
  src,
  name,
  igsid,
  size,
}: {
  src: string | null;
  name: string | null;
  igsid: string;
  size: number;
}) {
  const initials = name ? name.slice(0, 2).toUpperCase() : igsid.slice(-2);
  const style = {
    width: size,
    height: size,
    minWidth: size,
    fontSize: size * 0.32,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (src) {
    return (
      <div style={style}>
        <Image
          src={src}
          alt={name ?? igsid}
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      style={{
        ...style,
        background: "var(--insta-grad)",
        color: "#fff",
        fontWeight: 700,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "SENT"
      ? "badge badge-sent"
      : status === "FAILED"
      ? "badge badge-failed"
      : status === "PENDING"
      ? "badge badge-pending"
      : "badge badge-skipped";
  return <span className={cls}>{status.replace("SKIPPED_", "")}</span>;
}

// ─── Keyword tag input ────────────────────────────────────────────────────────
function KeywordInput({
  keywords,
  onChange,
}: {
  keywords: string[];
  onChange: (kws: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim().toUpperCase();
    if (trimmed && !keywords.includes(trimmed) && keywords.length < 10) {
      onChange([...keywords, trimmed]);
      setInput("");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "8px 10px",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          minHeight: 44,
          alignItems: "center",
        }}
      >
        {keywords.map((kw) => (
          <span
            key={kw}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 10px",
              borderRadius: 99,
              background: "rgba(124,58,237,.2)",
              color: "#a78bfa",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {kw}
            <button
              type="button"
              onClick={() => onChange(keywords.filter((k) => k !== kw))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#a78bfa",
                lineHeight: 1,
                padding: "0 2px",
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={keywords.length === 0 ? "Type keyword + Enter…" : ""}
          style={{
            flex: 1,
            minWidth: 120,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: 14,
          }}
        />
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>
        Press Enter or comma to add. Max 10 keywords.
      </p>
    </div>
  );
}

// ─── Post picker ──────────────────────────────────────────────────────────────
interface InstagramPost {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
}

function PostPicker({
  selectedPostId,
  onSelect,
}: {
  selectedPostId: string | null;
  onSelect: (id: string, url?: string) => void;
}) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    fetch("/api/instagram/posts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPosts(d.data);
        else setError(d.error ?? "Failed to load posts");
      })
      .catch(() => setError("Failed to load posts"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="pulse"
            style={{
              aspectRatio: "1",
              borderRadius: 10,
              background: "var(--surface2)",
            }}
          />
        ))}
      </div>
    );

  if (error)
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>
        {error}
        <br />
        <span style={{ fontSize: 11, opacity: 0.6 }}>
          Configure INSTAGRAM_ACCESS_TOKEN to browse posts.
        </span>
      </div>
    );

  if (posts.length === 0)
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>
        No posts found. Enter the Post ID manually below.
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>Select a post for this campaign:</span>
        <button
          type="button"
          onClick={() => setViewMode(prev => prev === "grid" ? "list" : "grid")}
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--text)",
            padding: "4px 8px",
            fontSize: 11,
            cursor: "pointer"
          }}
        >
          {viewMode === "grid" ? "📝 Show Text List (Fallback)" : "🖼️ Show Grid"}
        </button>
      </div>

      {viewMode === "grid" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 8,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {posts.map((post) => {
            const thumb = post.thumbnail_url ?? post.media_url;
            const selected = selectedPostId === post.id;
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => onSelect(post.id, post.permalink)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  overflow: "hidden",
                  border: selected
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  cursor: "pointer",
                  position: "relative",
                  outline: selected ? "2px solid rgba(124,58,237,.3)" : "none",
                  outlineOffset: 2,
                  transition: "all .15s",
                }}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={post.caption?.slice(0, 40) ?? "post"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                      const parent = (e.target as HTMLElement).parentElement;
                      if (parent) {
                        const fallbackDiv = parent.querySelector(".grid-fallback-text");
                        if (fallbackDiv) (fallbackDiv as HTMLElement).style.display = "flex";
                      }
                    }}
                  />
                ) : null}
                <div
                  className="grid-fallback-text"
                  style={{
                    display: thumb ? "none" : "flex",
                    width: "100%",
                    height: "100%",
                    background: "var(--surface2)",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text)",
                    padding: 4,
                    fontSize: 9,
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: 14, marginBottom: 2 }}>📷</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {post.caption || `Post ${post.id.slice(-4)}`}
                  </span>
                </div>
                {selected && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(124,58,237,.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>
          {posts.map((post) => {
            const selected = selectedPostId === post.id;
            return (
              <div
                key={post.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: selected ? "rgba(124,58,237,.1)" : "var(--surface2)",
                  border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: 8,
                  gap: 12
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {post.caption || "(No caption)"}
                  </span>
                  <div style={{ display: "flex", gap: 12, fontSize: 10, color: "var(--muted)" }}>
                    <span>ID: {post.id}</span>
                    <span>Date: {new Date(post.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(post.id, post.permalink)}
                  style={{
                    backgroundColor: selected ? "var(--accent)" : "transparent",
                    color: selected ? "#fff" : "var(--text)",
                    border: selected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all .15s"
                  }}
                >
                  {selected ? "Selected" : "Select"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── INBOX TAB ──────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
function InboxTab() {
  const supabase = usePublicSupabase();
  const [conversations, setConversations] = useState<
    ConversationWithLastMessage[]
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId);

  const fetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    if (Array.isArray(data)) setConversations(data);
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    const data = await res.json();
    if (Array.isArray(data)) setMessages(data);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedId) fetchMessages(selectedId);
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time
  useEffect(() => {
    if (!supabase) return;
    const ch = supabase
      .channel("inbox-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "instagram_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.conversation_id === selectedId) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          }
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "instagram_conversations" },
        () => fetchConversations()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedId, fetchConversations, supabase]);

  async function toggleMode() {
    if (!selected) return;
    const newMode = selected.mode === "agent" ? "human" : "agent";
    await fetch(`/api/conversations/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: newMode }),
    });
    setConversations((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, mode: newMode } : c))
    );
  }

  async function handleSend() {
    if (!input.trim() || !selectedId || sending) return;
    setSending(true);
    await fetch(`/api/conversations/${selectedId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input.trim() }),
    });
    setInput("");
    setSending(false);
    fetchMessages(selectedId);
  }

  function ft(d: string) {
    return new Date(d).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div style={{ display: "flex", height: "100%", gap: 0 }}>
      {/* Sidebar */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
        }}
      >
        {conversations.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: 32,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "var(--surface2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--muted)",
              }}
            >
              <ChatIcon size={22} />
            </div>
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
              No conversations yet.
              <br />
              Messages will appear when your webhook receives DMs.
            </p>
          </div>
        ) : (
          conversations.map((convo) => {
            const sel = convo.id === selectedId;
            return (
              <button
                key={convo.id}
                onClick={() => setSelectedId(convo.id)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: sel ? "rgba(255,255,255,0.05)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderLeft: sel
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  transition: "all .12s",
                  textAlign: "left",
                }}
              >
                <Avatar
                  src={convo.profile_pic}
                  name={convo.name}
                  igsid={convo.igsid}
                  size={40}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 130,
                      }}
                    >
                      {convo.name ?? convo.username ?? convo.igsid}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>
                      {ft(convo.updated_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 130,
                      }}
                    >
                      {convo.username
                        ? `@${convo.username}`
                        : convo.last_message ?? ""}
                    </span>
                    <span
                      className={
                        convo.mode === "agent" ? "badge badge-ai" : "badge badge-human"
                      }
                    >
                      {convo.mode === "agent" ? "AI" : "You"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!selected ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "var(--muted)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: "var(--surface2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChatIcon size={28} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Select a conversation</p>
              <p style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>
                Choose from the list to view messages
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar
                  src={selected.profile_pic}
                  name={selected.name}
                  igsid={selected.igsid}
                  size={42}
                />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {selected.name ?? selected.username ?? selected.igsid}
                    </span>
                    {selected.username && (
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>
                        @{selected.username}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                    {selected.follower_count != null && (
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        <strong style={{ color: "var(--text)" }}>
                          {selected.follower_count.toLocaleString()}
                        </strong>{" "}
                        followers
                      </span>
                    )}
                    {selected.is_user_follow_business != null && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: 99,
                          background: selected.is_user_follow_business
                            ? "rgba(124,58,237,.15)"
                            : "rgba(255,255,255,.06)",
                          color: selected.is_user_follow_business
                            ? "#a78bfa"
                            : "var(--muted)",
                        }}
                      >
                        {selected.is_user_follow_business
                          ? "Follows you"
                          : "Doesn't follow"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={toggleMode}
                className={
                  selected.mode === "agent"
                    ? "badge badge-ai"
                    : "badge badge-human"
                }
                style={{
                  cursor: "pointer",
                  border: "none",
                  padding: "5px 12px",
                  fontSize: 11,
                }}
              >
                {selected.mode === "agent" ? "⚡ AI Mode" : "👤 Human Mode"}
              </button>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                const showTime =
                  i === messages.length - 1 ||
                  messages[i + 1]?.role !== msg.role;
                return (
                  <div
                    key={msg.id}
                    className="fade-in"
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 8,
                      justifyContent: isUser ? "flex-start" : "flex-end",
                    }}
                  >
                    {isUser && (
                      <Avatar
                        src={selected.profile_pic}
                        name={selected.name}
                        igsid={selected.igsid}
                        size={26}
                      />
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser ? "flex-start" : "flex-end",
                        maxWidth: "62%",
                      }}
                    >
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: isUser
                            ? "16px 16px 16px 4px"
                            : "16px 16px 4px 16px",
                          fontSize: 14,
                          lineHeight: 1.5,
                          background: isUser
                            ? "rgba(255,255,255,.07)"
                            : "var(--insta-grad)",
                          color: "var(--text)",
                          border: isUser
                            ? "1px solid var(--border)"
                            : "none",
                        }}
                      >
                        <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                      </div>
                      {showTime && (
                        <p
                          style={{
                            fontSize: 10,
                            color: "var(--muted)",
                            marginTop: 4,
                            paddingLeft: 4,
                          }}
                        >
                          {!isUser && (
                            <span style={{ color: "#a78bfa", marginRight: 4 }}>
                              AI ·
                            </span>
                          )}
                          {ft(msg.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,.05)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                  }
                  placeholder="Type a message…"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "var(--text)",
                    fontSize: 14,
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "var(--insta-grad)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    flexShrink: 0,
                    opacity: sending || !input.trim() ? 0.4 : 1,
                  }}
                >
                  {sending ? <Spinner /> : <SendIcon />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── CAMPAIGNS TAB ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
function CampaignsTab({
  onCreateNew,
}: {
  onCreateNew: () => void;
}) {
  const [automations, setAutomations] = useState<AutomationWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAutomations = useCallback(async () => {
    const res = await fetch("/api/automations");
    const data = await res.json();
    if (data.success) setAutomations(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/automations?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !isActive } : a))
    );
  }

  async function deleteAutomation(id: string) {
    if (
      !confirm(
        "Delete this campaign? All logs for this campaign will also be deleted. This cannot be undone."
      )
    )
      return;
    await fetch(`/api/automations?id=${id}`, { method: "DELETE" });
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading)
    return (
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="pulse glass"
            style={{ height: 140, borderRadius: 14 }}
          />
        ))}
      </div>
    );

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Comment Campaigns</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            {automations.length} campaign
            {automations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn-primary" onClick={onCreateNew}>
          <PlusIcon /> New Campaign
        </button>
      </div>

      {/* Empty */}
      {automations.length === 0 && (
        <div
          className="glass fade-in"
          style={{ padding: "48px 32px", textAlign: "center" }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(124,58,237,.12)",
              border: "1px solid rgba(124,58,237,.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#a78bfa",
            }}
          >
            <CampaignIcon size={28} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            No campaigns yet
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
            Create your first comment-to-DM campaign to auto-reply to Instagram
            comments with keyword triggers.
          </p>
          <button className="btn-primary" onClick={onCreateNew}>
            <PlusIcon /> Create Campaign
          </button>
        </div>
      )}

      {/* Campaign cards */}
      {automations.map((auto) => (
        <div key={auto.id} className="glass fade-in" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Title row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{auto.name}</h3>
                <span
                  className={auto.isActive ? "badge badge-active" : "badge badge-paused"}
                >
                  {auto.isActive ? "Active" : "Paused"}
                </span>
                {auto.goal && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#a78bfa",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: ".4px",
                    }}
                  >
                    {auto.goal}
                  </span>
                )}
              </div>

              {/* Keywords */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                {auto.keywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      padding: "2px 9px",
                      borderRadius: 99,
                      background: "rgba(124,58,237,.15)",
                      color: "#a78bfa",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>

              {/* DM preview */}
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
                &ldquo;{auto.dmMessage}&rdquo;
              </p>

              {/* Stats */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 12, color: "var(--muted)" }}>
                <span>
                  <strong style={{ color: "#34d399" }}>{auto.analytics.sent}</strong> sent
                </span>
                <span>
                  <strong style={{ color: "#fbbf24" }}>{auto.analytics.skipped}</strong> skipped
                </span>
                <span>
                  <strong style={{ color: "#f87171" }}>{auto.analytics.failed}</strong> failed
                </span>
                <span>
                  <strong style={{ color: "#60a5fa" }}>{auto.analytics.clicks}</strong> clicks
                </span>
                <span>
                  <strong style={{ color: "#c084fc" }}>{auto.analytics.ctr}%</strong> CTR
                </span>
              </div>

              {/* Tracked link */}
              {auto.trackedLinks[0] && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 }}>
                      Tracked Link
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {auto.trackedLinks[0].trackedUrl}
                    </p>
                  </div>
                  <a
                    href={auto.trackedLinks[0].trackedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                    style={{ flexShrink: 0, fontSize: 11, padding: "5px 12px" }}
                  >
                    Open ↗
                  </a>
                </div>
              )}

              {/* Top keywords */}
              {auto.analytics.topKeywords.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {auto.analytics.topKeywords.map((tk) => (
                    <span
                      key={tk.keyword}
                      style={{
                        padding: "2px 9px",
                        borderRadius: 9,
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        fontSize: 11,
                        color: "var(--muted)",
                      }}
                    >
                      {tk.keyword}: {tk.count}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <button
                className={`toggle ${auto.isActive ? "on" : ""}`}
                onClick={() => toggleActive(auto.id, auto.isActive)}
                title={auto.isActive ? "Pause campaign" : "Activate campaign"}
              />
              <button
                className="btn-danger"
                onClick={() => deleteAutomation(auto.id)}
                style={{ padding: "6px 10px" }}
                title="Delete campaign"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── NEW CAMPAIGN TAB ──────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
function NewCampaignTab({ onDone }: { onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | undefined>();
  const [manualPostId, setManualPostId] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [dmMessage, setDmMessage] = useState("");
  const [trackedUrl, setTrackedUrl] = useState("");
  const [wholeWordMatch, setWholeWordMatch] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const effectivePostId = postId ?? (manualPostId.trim() || null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !effectivePostId || keywords.length === 0 || !dmMessage) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        goal: goal || null,
        postId: effectivePostId,
        postUrl: postUrl ?? null,
        keywords,
        dmMessage,
        trackedDestinationUrl: trackedUrl || null,
        isActive,
        wholeWordMatch,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      onDone();
    } else {
      setError(data.error ?? "Failed to create campaign");
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: "0 auto", overflowY: "auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>New Campaign</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Auto-reply to comments on a post or reel when a keyword is detected.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {error && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(239,68,68,.1)",
              border: "1px solid rgba(239,68,68,.2)",
              color: "#f87171",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="label">
            Campaign Name <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Product Launch Link Drop"
            maxLength={100}
          />
        </div>

        {/* Goal */}
        <div>
          <label className="label">Campaign Goal</label>
          <select
            className="input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{ appearance: "none" }}
          >
            <option value="">Select a goal (optional)</option>
            <option value="Lead magnet delivery">Lead magnet delivery</option>
            <option value="Product link request">Product link request</option>
            <option value="Price or availability reply">Price or availability reply</option>
            <option value="Launch waitlist">Launch waitlist</option>
            <option value="Agency client campaign">Agency client campaign</option>
          </select>
        </div>

        {/* Post picker */}
        <div>
          <label className="label">
            Campaign Post / Reel{" "}
            <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            Pick from your recent posts or paste the Post ID manually below.
          </p>
          <div className="glass" style={{ padding: 12, marginBottom: 10 }}>
            <PostPicker
              selectedPostId={postId}
              onSelect={(id, url) => {
                setPostId(id);
                setPostUrl(url);
                setManualPostId("");
              }}
            />
          </div>
          <input
            className="input"
            value={postId ? `Selected: ${postId}` : manualPostId}
            onChange={(e) => {
              setManualPostId(e.target.value);
              setPostId(null);
            }}
            placeholder="Or paste Post ID manually (e.g. 17854360229135492)"
            readOnly={!!postId}
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="label">
            Trigger Keywords <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            When a commenter types any of these words, the DM is sent automatically.
          </p>
          <KeywordInput keywords={keywords} onChange={setKeywords} />
        </div>

        {/* DM message */}
        <div>
          <label className="label">
            DM Message <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <textarea
            className="textarea"
            rows={4}
            value={dmMessage}
            onChange={(e) => setDmMessage(e.target.value)}
            placeholder={`Hey {username}! Here's the link you asked for: {link}`}
            maxLength={1000}
          />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Use{" "}
            <code
              style={{
                padding: "1px 6px",
                borderRadius: 5,
                background: "var(--surface2)",
                color: "#a78bfa",
                fontSize: 11,
              }}
            >
              {"{username}"}
            </code>{" "}
            to personalise and{" "}
            <code
              style={{
                padding: "1px 6px",
                borderRadius: 5,
                background: "var(--surface2)",
                color: "#a78bfa",
                fontSize: 11,
              }}
            >
              {"{link}"}
            </code>{" "}
            to insert the tracked link.
          </p>
        </div>

        {/* Tracked destination URL */}
        <div>
          <label className="label">Tracked Destination URL (optional)</label>
          <input
            className="input"
            type="url"
            value={trackedUrl}
            onChange={(e) => setTrackedUrl(e.target.value)}
            placeholder="https://yoursite.com/offer"
          />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Clicks on the tracked link will be counted in campaign analytics.
          </p>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <button
              type="button"
              className={`toggle ${wholeWordMatch ? "on" : ""}`}
              onClick={() => setWholeWordMatch(!wholeWordMatch)}
            />
            <div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Whole word match</span>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {wholeWordMatch
                  ? '"linking" won\'t trigger "LINK"'
                  : '"linking" WILL trigger "LINK"'}
              </p>
            </div>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <button
              type="button"
              className={`toggle ${isActive ? "on" : ""}`}
              onClick={() => setIsActive(!isActive)}
            />
            <div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Launch active</span>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {isActive ? "Campaign starts immediately after creation" : "Campaign saved as paused"}
              </p>
            </div>
          </label>
        </div>

        {/* Submit */}
        <div
          style={{
            display: "flex",
            gap: 12,
            paddingTop: 16,
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ minWidth: 140 }}
          >
            {saving ? <><Spinner /> Creating…</> : "Create Campaign"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={onDone}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── LOGS TAB ──────────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
function LogsTab() {
  const [logs, setLogs] = useState<DmLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs?limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLogs(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  function ft(d: string) {
    return new Date(d).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading)
    return (
      <div style={{ padding: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="pulse"
            style={{
              height: 56,
              borderRadius: 10,
              background: "var(--surface2)",
              marginBottom: 8,
            }}
          />
        ))}
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>DM Delivery Logs</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
          {logs.length} log entries
        </p>
      </div>

      {logs.length === 0 ? (
        <div
          className="glass"
          style={{ padding: "48px 32px", textAlign: "center" }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--surface2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              color: "var(--muted)",
            }}
          >
            <LogsIcon size={24} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
            No logs yet
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Logs appear here when keyword campaigns trigger DM deliveries.
          </p>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ background: "var(--surface2)" }}>
                {["Commenter", "Comment", "Keyword", "Status", "Time"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--muted)",
                        textTransform: "uppercase",
                        letterSpacing: ".5px",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  style={{
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontWeight: 500 }}>
                      {log.commenterName ?? log.commenterId.slice(0, 10)}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", maxWidth: 200 }}>
                    <span
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--muted)",
                      }}
                    >
                      {log.commentText}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {log.matchedKeyword ? (
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: "rgba(124,58,237,.15)",
                          color: "#a78bfa",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {log.matchedKeyword}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <StatusBadge status={log.status} />
                    {log.errorMessage && (
                      <p style={{ fontSize: 10, color: "var(--error)", marginTop: 3 }}>
                        {log.errorMessage}
                      </p>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ft(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── SETTINGS TAB ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
function SettingsTab() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const configs = [
    {
      label: "Supabase URL",
      value: supabaseUrl ?? "Not configured",
      ok: !!supabaseUrl,
    },
    {
      label: "Supabase Anon Key",
      value: hasAnonKey ? "✓ Configured" : "Not configured",
      ok: hasAnonKey,
    },
  ];

  const envVars = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "INSTAGRAM_ACCESS_TOKEN",
    "FACEBOOK_APP_SECRET",
    "INSTAGRAM_VERIFY_TOKEN",
    "OPENROUTER_API_KEY",
  ];

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Settings & Configuration</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Environment status and deployment references.
        </p>
      </div>

      {/* Public config */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
          Supabase Connection
        </h3>
        {configs.map((c) => (
          <div
            key={c.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{c.label}</span>
            <span
              style={{
                fontSize: 13,
                color: c.ok ? "#34d399" : "#f87171",
                fontFamily: "monospace",
                maxWidth: 300,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.value}
            </span>
          </div>
        ))}
      </div>

      {/* Server-side env */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
          Required Server-side Variables
        </h3>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          Set these in your Vercel project environment variables or{" "}
          <code style={{ fontFamily: "monospace" }}>.env.local</code> for local
          development.
        </p>
        {envVars.map((v) => (
          <div
            key={v}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid var(--border)",
              fontFamily: "monospace",
              fontSize: 13,
              color: "#a78bfa",
            }}
          >
            {v}
          </div>
        ))}
      </div>

      {/* Webhook URL */}
      <div className="glass" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
          Webhook URL
        </h3>
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
          Configure this URL in your Meta App &rarr; Webhooks settings for the{" "}
          <strong>Instagram</strong> object:
        </p>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            background: "var(--surface2)",
            fontFamily: "monospace",
            fontSize: 13,
            color: "#60a5fa",
            wordBreak: "break-all",
          }}
        >
          {typeof window !== "undefined"
            ? `${window.location.origin}/api/webhook`
            : "https://your-domain.com/api/webhook"}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
          Subscribe to <strong>messages</strong> and <strong>comments</strong>{" "}
          fields. Set <code>INSTAGRAM_VERIFY_TOKEN</code> to match what you put
          in Meta dashboard.
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── ROOT LAYOUT ───────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("inbox");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "inbox", label: "Inbox", icon: <ChatIcon /> },
    { id: "campaigns", label: "Campaigns", icon: <CampaignIcon /> },
    { id: "logs", label: "Logs", icon: <LogsIcon /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon /> },
  ];

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          padding: "0 0 16px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 18px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "var(--insta-grad)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
                InstaAgent
              </p>
              <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                AI Automation
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 10px 0" }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id || (activeTab === "new-campaign" && tab.id === "campaigns");
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  background: active
                    ? "rgba(124,58,237,.15)"
                    : "transparent",
                  color: active ? "#c084fc" : "var(--muted)",
                  transition: "all .14s",
                  marginBottom: 2,
                  textAlign: "left",
                }}
              >
                <span
                  style={{ color: active ? "#c084fc" : "var(--muted)", flexShrink: 0 }}
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* New Campaign shortcut */}
        <div style={{ padding: "0 10px" }}>
          <button
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
            onClick={() => setActiveTab("new-campaign")}
          >
            <PlusIcon /> New Campaign
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top bar */}
        <div
          style={{
            height: 52,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ fontSize: 15, fontWeight: 600 }}>
            {activeTab === "inbox" && "DM Inbox"}
            {activeTab === "campaigns" && "Comment Campaigns"}
            {activeTab === "new-campaign" && "New Campaign"}
            {activeTab === "logs" && "Delivery Logs"}
            {activeTab === "settings" && "Settings"}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 6px #10b981",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Live</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeTab === "inbox" && (
            <div style={{ height: "100%", display: "flex" }}>
              <InboxTab />
            </div>
          )}
          {activeTab === "campaigns" && (
            <div style={{ height: "100%", overflowY: "auto" }}>
              <CampaignsTab onCreateNew={() => setActiveTab("new-campaign")} />
            </div>
          )}
          {activeTab === "new-campaign" && (
            <div style={{ height: "100%", overflowY: "auto" }}>
              <NewCampaignTab onDone={() => setActiveTab("campaigns")} />
            </div>
          )}
          {activeTab === "logs" && (
            <div style={{ height: "100%", overflowY: "auto" }}>
              <LogsTab />
            </div>
          )}
          {activeTab === "settings" && (
            <div style={{ height: "100%", overflowY: "auto" }}>
              <SettingsTab />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
