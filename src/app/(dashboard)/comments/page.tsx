'use client';
import { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Post { id: string; caption: string; media_url: string; thumbnail: string | null; permalink: string; }
interface Campaign {
  id: string; name: string; postId: string; keywords: string[]; dmMessage: string;
  isActive: boolean; status: string; campaign_config: CampaignConfig;
  remove_prev_dm_data: boolean; analytics?: { sent: number; failed: number; clicks: number; };
  created_at: string;
}
interface CampaignConfig {
  trigger_type: 'specific' | 'any' | 'next';
  public_reply: { enabled: boolean; messages: string[]; delay_seconds: number; };
  follow_gate: { enabled: boolean; reminder_msg: string; success_msg: string; };
  email_capture: { enabled: boolean; prompt_msg: string; };
  delivery: { message: string; button_label: string; button_url: string; };
  follow_up: { enabled: boolean; delay_hours: number; message: string; };
  ai_enabled: boolean;
}

// ─── Default Config ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG: CampaignConfig = {
  trigger_type: 'specific',
  public_reply: { enabled: true, messages: ['Check your DMs! 👇', 'Sent! 🚀', 'Message delivered ❤️'], delay_seconds: 0 },
  follow_gate: { enabled: false, reminder_msg: 'Please follow @username first, then click below ✅', success_msg: "You're in! Here\'s your resource 🎉" },
  email_capture: { enabled: false, prompt_msg: "What's your best email address? 📧" },
  delivery: { message: "Here's your resource! 👇", button_label: 'Download Now', button_url: '' },
  follow_up: { enabled: false, delay_hours: 24, message: 'Did you get the guide? Let me know if you need help! 😊' },
  ai_enabled: false,
};

// ─── Campaign Templates ──────────────────────────────────────────────────────
const CAMPAIGN_TEMPLATES = [
  { icon: '🎁', name: 'Free Prompt Delivery', desc: 'Send a free AI prompt to commenters', keywords: ['PROMPT', 'FREE', 'SEND'], dm: 'Hey! 👋 Here\'s your free AI prompt as promised!', delivery: 'Here\'s your free prompt! 🎯' },
  { icon: '📄', name: 'Free PDF Delivery', desc: 'Deliver a PDF to commenters', keywords: ['PDF', 'GUIDE', 'DOWNLOAD'], dm: "Hey! I'm sending over the PDF now 📄", delivery: "Here's your free PDF! Click below to download 👇" },
  { icon: '🧲', name: 'Lead Magnet', desc: 'Capture leads with a free resource', keywords: ['YES', 'SEND', 'LINK'], dm: 'Hey! Thanks for your interest 🙌 Drop your email and I\'ll send it over!', delivery: "Here's your exclusive resource! 🎯" },
  { icon: '🎓', name: 'Course Waitlist', desc: 'Add people to your course waitlist', keywords: ['WAITLIST', 'COURSE', 'JOIN'], dm: "You're on the waitlist! 🎓 I'll notify you when doors open.", delivery: "You're in! I'll be in touch when the course launches 🚀" },
  { icon: '📧', name: 'Newsletter Signup', desc: 'Grow your email newsletter', keywords: ['NEWSLETTER', 'SUBSCRIBE', 'EMAIL'], dm: "Join thousands getting my weekly tips! Drop your email below 📧", delivery: "Welcome to the newsletter! Check your inbox for a confirmation 📬" },
  { icon: '🤖', name: 'AI Tool Giveaway', desc: 'Give away an AI tool or prompt pack', keywords: ['AI', 'TOOLS', 'GIVEAWAY'], dm: 'Hey! 🤖 Here\'s your AI tool pack — it\'s free!', delivery: "Here's your AI toolkit! 🔧 Enjoy!" },
  { icon: '🎮', name: 'Discord Invite', desc: 'Send a Discord community invite', keywords: ['DISCORD', 'JOIN', 'COMMUNITY'], dm: "Welcome to the community! 🎮 Here's your exclusive Discord link:", delivery: "Join our Discord here 👇 See you inside!" },
  { icon: '💬', name: 'WhatsApp Community', desc: 'Invite to WhatsApp community', keywords: ['WHATSAPP', 'COMMUNITY', 'JOIN'], dm: "Hey! Joining the WhatsApp community? Here's your link 👇", delivery: "Join the WhatsApp community here 👇" },
  { icon: '✈️', name: 'Telegram Group', desc: 'Drive people to your Telegram', keywords: ['TELEGRAM', 'GROUP', 'JOIN'], dm: "You're in! Here's your Telegram invite link 📲", delivery: "Join the Telegram group 👇" },
  { icon: '🔓', name: 'Link Unlock', desc: 'Unlock a special link for followers', keywords: ['UNLOCK', 'LINK', 'ACCESS'], dm: 'Hey! Follow me first to unlock the link 🔓', delivery: "You unlocked it! Here's your exclusive link 🎉" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        position: 'relative', width: 44, height: 24, borderRadius: 99,
        background: on ? 'linear-gradient(135deg,#2dd4bf,#818cf8)' : 'rgba(255,255,255,0.08)',
        border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background .2s',
      }}
    >
      <span style={{
        position: 'absolute', top: 4, left: on ? 24 : 4, width: 16, height: 16,
        borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.5)',
      }} />
    </button>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    teal: { bg: 'rgba(45,212,191,0.12)', text: '#2dd4bf', border: 'rgba(45,212,191,0.25)' },
    indigo: { bg: 'rgba(129,140,248,0.12)', text: '#818cf8', border: 'rgba(129,140,248,0.25)' },
    green: { bg: 'rgba(52,211,153,0.12)', text: '#34d399', border: 'rgba(52,211,153,0.25)' },
    red: { bg: 'rgba(248,113,113,0.12)', text: '#f87171', border: 'rgba(248,113,113,0.25)' },
    yellow: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
    gray: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(230,237,243,0.5)', border: 'rgba(255,255,255,0.08)' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {children}
    </span>
  );
}

// ─── Phone Preview ────────────────────────────────────────────────────────────
function PhonePreview({ config, keywords, openingMsg, triggerType }: {
  config: CampaignConfig; keywords: string[]; openingMsg: string; triggerType: string;
}) {
  const commentText = keywords[0] || 'LINK';
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ position: 'sticky', top: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(230,237,243,0.4)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 12 }}>Live Preview</p>

      {/* Phone frame */}
      <div style={{
        width: 280, margin: '0 auto',
        background: '#000', borderRadius: 36, padding: 12,
        border: '8px solid #1a1a2e', boxShadow: '0 40px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}>
        {/* Notch */}
        <div style={{ width: 80, height: 6, background: '#1a1a2e', borderRadius: 99, margin: '0 auto 8px' }} />

        {/* Comment section preview */}
        <div style={{ background: '#111', borderRadius: 12, padding: '10px 12px', marginBottom: 8 }}>
          <p style={{ fontSize: 9, color: '#666', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>💬 Public Comment</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>👤</div>
            <div>
              <p style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>user_123</p>
              <p style={{ fontSize: 11, color: '#ddd', marginTop: 2 }}>{triggerType === 'any' ? 'Great post! 🔥' : commentText}</p>
            </div>
          </div>

          {/* Public reply */}
          {config.public_reply.enabled && (
            <div style={{ marginTop: 8, paddingLeft: 32, borderLeft: '2px solid rgba(45,212,191,0.3)' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>⚡</div>
                <div>
                  <p style={{ fontSize: 9, color: '#2dd4bf', fontWeight: 700 }}>@youraccount</p>
                  <p style={{ fontSize: 10, color: '#ddd', marginTop: 1 }}>{config.public_reply.messages[0] || 'Check your DMs! 👇'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DM section */}
        <div style={{ background: '#111', borderRadius: 12, overflow: 'hidden' }}>
          {/* DM header */}
          <div style={{ background: '#1a1a1a', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>@youraccount</p>
              <p style={{ fontSize: 9, color: '#666' }}>Active now</p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ padding: '10px 10px', minHeight: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Time */}
            <p style={{ fontSize: 9, color: '#555', textAlign: 'center' }}>{now}</p>

            {/* Opening DM */}
            {openingMsg && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                <div style={{ background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', borderRadius: '16px 16px 4px 16px', padding: '8px 11px' }}>
                  <p style={{ fontSize: 11, color: '#000', fontWeight: 600, lineHeight: 1.4 }}>{openingMsg}</p>
                </div>
              </div>
            )}

            {/* Follow gate */}
            {config.follow_gate.enabled && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ background: '#1e293b', borderRadius: '16px 16px 4px 16px', padding: '8px 11px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: 10, color: '#e2e8f0', lineHeight: 1.4 }}>{config.follow_gate.reminder_msg}</p>
                </div>
                <div style={{ background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#2dd4bf', fontWeight: 700 }}>I&apos;m Following ✅</p>
                </div>
              </div>
            )}

            {/* Email capture */}
            {config.email_capture.enabled && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                <div style={{ background: '#1e293b', borderRadius: '16px 16px 4px 16px', padding: '8px 11px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: 10, color: '#e2e8f0', lineHeight: 1.4 }}>{config.email_capture.prompt_msg}</p>
                </div>
              </div>
            )}

            {/* Delivery */}
            {config.delivery.message && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ background: '#1e293b', borderRadius: '16px 16px 4px 16px', padding: '8px 11px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: 10, color: '#e2e8f0', lineHeight: 1.4 }}>{config.delivery.message}</p>
                </div>
                {config.delivery.button_label && (
                  <div style={{ background: 'rgba(129,140,248,0.2)', border: '1px solid rgba(129,140,248,0.4)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: '#818cf8', fontWeight: 700 }}>🔗 {config.delivery.button_label}</p>
                  </div>
                )}
              </div>
            )}

            {/* Follow up */}
            {config.follow_up.enabled && (
              <div style={{ marginTop: 4 }}>
                <p style={{ fontSize: 9, color: '#555', textAlign: 'center', marginBottom: 6 }}>+{config.follow_up.delay_hours}h later</p>
                <div style={{ alignSelf: 'flex-end', maxWidth: '85%', marginLeft: 'auto' }}>
                  <div style={{ background: '#1e293b', borderRadius: '16px 16px 4px 16px', padding: '8px 11px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ fontSize: 10, color: '#e2e8f0', lineHeight: 1.4 }}>{config.follow_up.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DM input bar */}
          <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: '6px 12px', fontSize: 10, color: '#555' }}>Message...</div>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>➤</div>
          </div>
        </div>

        {/* Home bar */}
        <div style={{ width: 80, height: 4, background: '#333', borderRadius: 99, margin: '10px auto 0' }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CommentAutomationsPage() {
  const [view, setView] = useState<'list' | 'create' | 'templates'>('list');
  const [step, setStep] = useState(1);
  const [automations, setAutomations] = useState<Campaign[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [postId, setPostId] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState('');
  const [openingMsg, setOpeningMsg] = useState("Hey! 👋 Thanks for your comment. I'm sending your resource now!");
  const [config, setConfig] = useState<CampaignConfig>({ ...DEFAULT_CONFIG });

  // Analytics state
  const [analytics, setAnalytics] = useState({ triggered: 0, sent: 0, failed: 0, emails: 0, clicks: 0 });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [autRes, postRes] = await Promise.all([
        fetch('/api/automations'),
        fetch('/api/instagram/posts'),
      ]);
      const [autJson, postJson] = await Promise.all([autRes.json(), postRes.json()]);
      if (autJson.success) {
        setAutomations(autJson.data || []);
        // Aggregate analytics
        const tot = (autJson.data || []).reduce((acc: typeof analytics, a: Campaign) => ({
          triggered: acc.triggered + (a.analytics?.sent || 0) + (a.analytics?.failed || 0),
          sent: acc.sent + (a.analytics?.sent || 0),
          failed: acc.failed + (a.analytics?.failed || 0),
          emails: acc.emails,
          clicks: acc.clicks + (a.analytics?.clicks || 0),
        }), { triggered: 0, sent: 0, failed: 0, emails: 0, clicks: 0 });
        setAnalytics(tot);
      }
      if (postJson.success) setPosts(postJson.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function applyTemplate(tpl: typeof CAMPAIGN_TEMPLATES[0]) {
    setCampaignName(tpl.name);
    setKeywords(tpl.keywords);
    setOpeningMsg(tpl.dm);
    setConfig(prev => ({
      ...prev,
      delivery: { ...prev.delivery, message: tpl.delivery }
    }));
    setView('create');
    setStep(1);
  }

  function resetForm() {
    setCampaignName(''); setPostId(''); setKeywords([]); setKwInput('');
    setOpeningMsg("Hey! 👋 Thanks for your comment. I'm sending your resource now!");
    setConfig({ ...DEFAULT_CONFIG }); setStep(1);
  }

  function addKeyword() {
    const v = kwInput.trim().toUpperCase();
    if (v && !keywords.includes(v)) { setKeywords(k => [...k, v]); setKwInput(''); }
  }

  async function saveCampaign() {
    const finalKeywords = config.trigger_type === 'any' ? ['ANY_COMMENT'] : keywords;
    if (!campaignName.trim()) return alert('Please enter a campaign name');
    if (!postId) return alert('Please select a post');
    if (config.trigger_type === 'specific' && finalKeywords.length === 0) return alert('Please add at least one keyword');

    setSaving(true);
    try {
      const payload = {
        name: campaignName,
        postId,
        keywords: finalKeywords,
        dmMessage: openingMsg,
        isActive: true,
        wholeWordMatch: false,
        campaign_config: config,
      };
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setView('list'); fetchAll(); resetForm();
      } else {
        alert('Failed to save: ' + json.error);
      }
    } catch (e) { console.error(e); alert('Save failed'); }
    finally { setSaving(false); }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/automations?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchAll();
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return;
    await fetch(`/api/automations?id=${id}`, { method: 'DELETE' });
    fetchAll();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.04)', color: '#e6edf3', fontSize: 13,
    border: '1px solid rgba(255,255,255,0.08)', outline: 'none', fontFamily: 'inherit',
    transition: 'border .15s',
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6, minHeight: 80,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(230,237,243,0.5)',
    marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  };
  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 20,
  };

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div style={{ padding: '32px 36px', maxWidth: 1300, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 6 }}>
            Campaign Builder
          </h1>
          <p style={{ color: 'rgba(230,237,243,0.5)', fontSize: 14 }}>Build comment-to-DM automation flows that convert</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setView('templates')} style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', color: '#818cf8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            📋 Templates
          </button>
          <button onClick={() => { resetForm(); setView('create'); }} style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', border: 'none', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(45,212,191,0.3)' }}>
            + New Campaign
          </button>
        </div>
      </div>

      {/* Analytics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Triggered', value: analytics.triggered, icon: '💬', color: '#818cf8' },
          { label: 'DMs Sent', value: analytics.sent, icon: '📤', color: '#2dd4bf' },
          { label: 'Failed', value: analytics.failed, icon: '❌', color: '#f87171' },
          { label: 'Link Clicks', value: analytics.clicks, icon: '🔗', color: '#fbbf24' },
          { label: 'Campaigns', value: automations.length, icon: '🚀', color: '#34d399' },
        ].map(stat => (
          <div key={stat.label} style={{ ...cardStyle, textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'rgba(230,237,243,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Campaigns list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(230,237,243,0.4)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
          <p>Loading campaigns...</p>
        </div>
      ) : automations.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '80px 40px' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🚀</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>No Campaigns Yet</h2>
          <p style={{ color: 'rgba(230,237,243,0.5)', marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
            Create your first automation to start converting comments into DMs and growing your audience.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => setView('templates')} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Browse Templates
            </button>
            <button onClick={() => { resetForm(); setView('create'); }} style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Create from Scratch
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 20 }}>
          {automations.map(a => {
            const cfg: CampaignConfig = a.campaign_config || DEFAULT_CONFIG;
            return (
              <div key={a.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16, transition: 'all .2s', cursor: 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</h3>
                      <Badge color={a.isActive ? 'green' : 'gray'}>{a.isActive ? '● Live' : '○ Paused'}</Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <Toggle
                        on={cfg.trigger_type === 'any'}
                        onChange={async (v) => {
                          const newTrigger = v ? 'any' : 'specific';
                          const newConfig = { ...cfg, trigger_type: newTrigger };
                          await fetch(`/api/automations?id=${a.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ campaign_config: newConfig })
                          });
                          fetchAll();
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'rgba(230,237,243,0.5)', marginLeft: 4 }}>Any Comment Trigger</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {a.keywords.includes('ANY_COMMENT') ? (
                          <Badge color="teal">✨ Any Comment</Badge>
                        ) : a.keywords.slice(0, 3).map(k => <Badge key={k} color="indigo">{k}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <Toggle on={a.isActive} onChange={() => toggleActive(a.id, a.isActive)} />
                </div>

                {/* Feature indicators */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {cfg.public_reply?.enabled && <Badge color="teal">💬 Public Reply</Badge>}
                  {cfg.follow_gate?.enabled && <Badge color="indigo">👥 Follow Gate</Badge>}
                  {cfg.email_capture?.enabled && <Badge color="yellow">📧 Email Capture</Badge>}
                  {cfg.follow_up?.enabled && <Badge color="gray">⏰ Follow Up</Badge>}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { label: 'Sent', value: a.analytics?.sent || 0, color: '#2dd4bf' },
                    { label: 'Failed', value: a.analytics?.failed || 0, color: '#f87171' },
                    { label: 'Clicks', value: a.analytics?.clicks || 0, color: '#818cf8' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: 'rgba(230,237,243,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => deleteCampaign(a.id)} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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

  // ── TEMPLATES VIEW ──────────────────────────────────────────────────────────
  if (view === 'templates') return (
    <div style={{ padding: '32px 36px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button onClick={() => setView('list')} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6edf3', fontSize: 13, cursor: 'pointer' }}>← Back</button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#e6edf3' }}>Campaign Templates</h1>
          <p style={{ color: 'rgba(230,237,243,0.5)', fontSize: 13 }}>Pre-built flows for common creator use cases</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
        {CAMPAIGN_TEMPLATES.map(tpl => (
          <div key={tpl.name} style={{ ...cardStyle, cursor: 'pointer', transition: 'all .2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(45,212,191,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>{tpl.icon}</div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 6 }}>{tpl.name}</h3>
            <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.5)', marginBottom: 16, lineHeight: 1.5 }}>{tpl.desc}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {tpl.keywords.map(k => <Badge key={k} color="indigo">{k}</Badge>)}
            </div>
            <button onClick={() => applyTemplate(tpl)} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', border: 'none', color: '#000', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Use Template →
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // ── CREATE VIEW ─────────────────────────────────────────────────────────────
  const steps = [
    { n: 1, label: 'Trigger' },
    { n: 2, label: 'Reply' },
    { n: 3, label: 'DM Flow' },
    { n: 4, label: 'Delivery' },
    { n: 5, label: 'Follow Up' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d1117' }}>
      {/* Builder area */}
      <div style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <button onClick={() => setView('list')} style={{ padding: '8px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6edf3', fontSize: 13, cursor: 'pointer' }}>← Back</button>
          <div style={{ flex: 1 }}>
            <input
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="Campaign name..."
              style={{ ...inputStyle, fontSize: 20, fontWeight: 700, background: 'transparent', border: 'none', padding: '4px 0', color: '#e6edf3' }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setStep(s.n)}
                style={{
                  padding: '8px 18px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: step === s.n ? 'linear-gradient(135deg,#2dd4bf,#818cf8)' : step > s.n ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.04)',
                  border: step === s.n ? 'none' : step > s.n ? '1px solid rgba(45,212,191,0.2)' : '1px solid rgba(255,255,255,0.08)',
                  color: step === s.n ? '#000' : step > s.n ? '#2dd4bf' : 'rgba(230,237,243,0.5)',
                }}
              >
                {step > s.n ? '✓ ' : `${s.n}. `}{s.label}
              </button>
              {i < steps.length - 1 && <div style={{ width: 20, height: 1, background: 'rgba(255,255,255,0.08)' }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: TRIGGER ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: '#e6edf3' }}>🎯 Select Trigger Post</h2>

              {/* Trigger type */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Trigger Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {[
                    { v: 'specific', icon: '🎯', label: 'Specific Post', desc: 'Choose one post or reel' },
                    { v: 'any', icon: '✨', label: 'Any Post', desc: 'All comments on any post' },
                    { v: 'next', icon: '⏭', label: 'Next Post', desc: 'Your upcoming post' },
                  ].map(opt => (
                    <div
                      key={opt.v}
                      onClick={() => setConfig(c => ({ ...c, trigger_type: opt.v as CampaignConfig['trigger_type'] }))}
                      style={{
                        padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                        background: config.trigger_type === opt.v ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${config.trigger_type === opt.v ? 'rgba(45,212,191,0.35)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: config.trigger_type === opt.v ? '#2dd4bf' : '#e6edf3', marginBottom: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(230,237,243,0.4)' }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Post selector */}
              {config.trigger_type === 'specific' && (
                <div>
                  <label style={labelStyle}>Select Post / Reel</label>
                  {posts.length === 0 ? (
                    <div>
                      <p style={{ fontSize: 12, color: 'rgba(230,237,243,0.4)', marginBottom: 8 }}>No posts found. Enter post ID manually:</p>
                      <input value={postId} onChange={e => setPostId(e.target.value)} placeholder="Enter Instagram Post ID" style={inputStyle} />
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
                      {posts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setPostId(p.id)}
                          style={{
                            aspectRatio: '1', borderRadius: 10, cursor: 'pointer', overflow: 'hidden', position: 'relative',
                            border: `2px solid ${postId === p.id ? '#2dd4bf' : 'transparent'}`,
                            transition: 'all .15s',
                          }}
                        >
                          {p.thumbnail || p.media_url ? (
                            <img src={p.thumbnail || p.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📷</div>
                          )}
                          {postId === p.id && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(45,212,191,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 24, color: '#fff' }}>✓</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {config.trigger_type !== 'specific' && (
                <div style={{ padding: 16, background: 'rgba(45,212,191,0.06)', borderRadius: 12, border: '1px solid rgba(45,212,191,0.15)' }}>
                  <p style={{ fontSize: 13, color: '#2dd4bf', fontWeight: 600 }}>
                    {config.trigger_type === 'any' ? '✨ This campaign will trigger on ALL comments across all your posts' : '⏭ This campaign will trigger on your next published post'}
                  </p>
                </div>
              )}

              {config.trigger_type !== 'specific' && !postId && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Fallback Post ID (optional)</label>
                  <input value={postId} onChange={e => setPostId(e.target.value)} placeholder="Optional Post ID" style={inputStyle} />
                </div>
              )}
            </div>

            {/* Keywords */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#e6edf3' }}>💬 Comment Trigger</h2>
                  <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.4)' }}>Define what triggers your automation</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                   <span style={{ fontSize: 13, color: keywords.includes('ANY_COMMENT') || config.trigger_type === 'any' ? '#2dd4bf' : 'rgba(230,237,243,0.5)', fontWeight: 600 }}>Any Comment</span>
                   <Toggle 
                     on={keywords.includes('ANY_COMMENT') || config.trigger_type === 'any'} 
                     onChange={(v) => {
                        if (v) {
                           setKeywords(['ANY_COMMENT']);
                        } else {
                           setKeywords(keywords.filter(k => k !== 'ANY_COMMENT'));
                        }
                     }} 
                   />
                </div>
              </div>

              {(!keywords.includes('ANY_COMMENT') && config.trigger_type !== 'any') ? (
                <div>
                  <label style={labelStyle}>Trigger Keywords</label>
                  <p style={{ fontSize: 12, color: 'rgba(230,237,243,0.4)', marginBottom: 10 }}>Press Enter or comma to add. Case-insensitive. Emoji supported 🎉</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                      value={kwInput}
                      onChange={e => setKwInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(); } }}
                      placeholder="LINK, GUIDE, YES, 🔥..."
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={addKeyword} style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(45,212,191,0.15)', border: '1px solid rgba(45,212,191,0.25)', color: '#2dd4bf', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {keywords.map(k => (
                      <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', color: '#818cf8', fontSize: 13, fontWeight: 600 }}>
                        {k}
                        <button onClick={() => setKeywords(kws => kws.filter(x => x !== k))} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                      </span>
                    ))}
                    {keywords.length === 0 && <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.3)', fontStyle: 'italic' }}>No keywords added yet</p>}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 16, background: 'rgba(45,212,191,0.06)', borderRadius: 12, border: '1px solid rgba(45,212,191,0.15)' }}>
                  <p style={{ fontSize: 14, color: '#2dd4bf', fontWeight: 600 }}>✨ Any Comment Mode Active</p>
                  <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.5)', marginTop: 4 }}>This automation responds to every comment — no keywords needed. Perfect for giveaways and broad engagement.</p>
                </div>
              )}
            </div>

            <button onClick={() => setStep(2)} style={{ padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end', paddingLeft: 32, paddingRight: 32 }}>
              Continue → Comment Reply
            </button>
          </div>
        )}

        {/* ── STEP 2: PUBLIC REPLY ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>💬 Public Comment Reply</h2>
                  <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.4)' }}>Reply to the user's comment publicly before sending DM</p>
                </div>
                <Toggle on={config.public_reply.enabled} onChange={v => setConfig(c => ({ ...c, public_reply: { ...c.public_reply, enabled: v } }))} />
              </div>

              {config.public_reply.enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Reply Messages (one per line — randomized)</label>
                    <textarea
                      value={config.public_reply.messages.join('\n')}
                      onChange={e => setConfig(c => ({ ...c, public_reply: { ...c.public_reply, messages: e.target.value.split('\n').filter(Boolean) } }))}
                      rows={5}
                      style={textareaStyle}
                      placeholder={'Check your DMs! 👇\nSent! 🚀\nMessage delivered ❤️\nComing your way! ✨'}
                    />
                    <p style={{ fontSize: 11, color: 'rgba(230,237,243,0.3)', marginTop: 6 }}>Add multiple messages (one per line). A random one will be used each time.</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={labelStyle}>Reply Delay (seconds)</label>
                      <input
                        type="number" min={0} max={300}
                        value={config.public_reply.delay_seconds}
                        onChange={e => setConfig(c => ({ ...c, public_reply: { ...c.public_reply, delay_seconds: parseInt(e.target.value) || 0 } }))}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <div style={{ padding: 12, background: 'rgba(45,212,191,0.06)', borderRadius: 10, border: '1px solid rgba(45,212,191,0.12)', width: '100%' }}>
                        <p style={{ fontSize: 11, color: '#2dd4bf', fontWeight: 600 }}>✅ Quick replies ({config.public_reply.delay_seconds}s delay)</p>
                        <p style={{ fontSize: 11, color: 'rgba(230,237,243,0.4)', marginTop: 2 }}>Keeps the DM conversion rate high</p>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(230,237,243,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Comment Preview</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👤</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#e6edf3' }}>user_123</p>
                        <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.7)', marginTop: 2 }}>{keywords[0] || 'LINK'}</p>
                        {/* Reply */}
                        <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid rgba(45,212,191,0.3)' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10 }}>⚡</div>
                            <div>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#2dd4bf' }}>@youraccount</p>
                              <p style={{ fontSize: 12, color: 'rgba(230,237,243,0.7)', marginTop: 2 }}>{config.public_reply.messages[0] || 'Check your DMs! 👇'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(1)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6edf3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
              <button onClick={() => setStep(3)} style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continue → DM Flow</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DM FLOW ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Opening DM */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>📱 Opening DM</h2>
              <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.4)', marginBottom: 20 }}>First message sent immediately when someone comments</p>

              <div>
                <label style={labelStyle}>Message Content</label>
                <textarea
                  rows={5}
                  value={openingMsg}
                  onChange={e => setOpeningMsg(e.target.value)}
                  style={textareaStyle}
                  placeholder={'Hey! 👋 Thanks so much for your interest.\n\nClick below and I\'ll send the resource instantly.'}
                />
                <p style={{ fontSize: 11, color: 'rgba(230,237,243,0.3)', marginTop: 6 }}>Use {'{{username}}'} for their Instagram username</p>
              </div>
            </div>

            {/* Follow Gate */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: config.follow_gate.enabled ? 20 : 0 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>👥 Follow Gate</h3>
                  <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.4)' }}>Require follow before unlocking the resource</p>
                </div>
                <Toggle on={config.follow_gate.enabled} onChange={v => setConfig(c => ({ ...c, follow_gate: { ...c.follow_gate, enabled: v } }))} />
              </div>

              {config.follow_gate.enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Follow Reminder Message</label>
                    <textarea rows={3} value={config.follow_gate.reminder_msg}
                      onChange={e => setConfig(c => ({ ...c, follow_gate: { ...c.follow_gate, reminder_msg: e.target.value } }))}
                      style={textareaStyle} placeholder="Please follow @username first, then click below ✅" />
                  </div>
                  <div>
                    <label style={labelStyle}>Success Message (after they follow)</label>
                    <textarea rows={2} value={config.follow_gate.success_msg}
                      onChange={e => setConfig(c => ({ ...c, follow_gate: { ...c.follow_gate, success_msg: e.target.value } }))}
                      style={textareaStyle} placeholder="You're in! Here's your resource 🎉" />
                  </div>
                </div>
              )}
            </div>

            {/* Email Capture */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: config.email_capture.enabled ? 20 : 0 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>📧 Email Capture</h3>
                  <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.4)' }}>Collect email before delivering the resource</p>
                </div>
                <Toggle on={config.email_capture.enabled} onChange={v => setConfig(c => ({ ...c, email_capture: { ...c.email_capture, enabled: v } }))} />
              </div>

              {config.email_capture.enabled && (
                <div>
                  <label style={labelStyle}>Email Request Message</label>
                  <textarea rows={3} value={config.email_capture.prompt_msg}
                    onChange={e => setConfig(c => ({ ...c, email_capture: { ...c.email_capture, prompt_msg: e.target.value } }))}
                    style={textareaStyle} placeholder="What's your best email address? 📧" />
                  <p style={{ fontSize: 11, color: 'rgba(230,237,243,0.3)', marginTop: 6 }}>Emails are validated and saved to the database for export</p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(2)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6edf3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
              <button onClick={() => setStep(4)} style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continue → Delivery</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: DELIVERY ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={cardStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>🎁 Resource Delivery</h2>
              <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.4)', marginBottom: 20 }}>The final message with your resource/link</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Delivery Message</label>
                  <textarea rows={4} value={config.delivery.message}
                    onChange={e => setConfig(c => ({ ...c, delivery: { ...c.delivery, message: e.target.value } }))}
                    style={textareaStyle} placeholder={"Here's your resource! 👇"} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>CTA Button Text</label>
                    <input value={config.delivery.button_label}
                      onChange={e => setConfig(c => ({ ...c, delivery: { ...c.delivery, button_label: e.target.value } }))}
                      style={inputStyle} placeholder="Download Now" />
                  </div>
                  <div>
                    <label style={labelStyle}>Button URL / Link</label>
                    <input value={config.delivery.button_url}
                      onChange={e => setConfig(c => ({ ...c, delivery: { ...c.delivery, button_url: e.target.value } }))}
                      style={inputStyle} placeholder="https://..." />
                  </div>
                </div>

                {/* Delivery type quick select */}
                <div>
                  <label style={labelStyle}>Resource Type</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { icon: '🔗', label: 'URL', example: 'https://yoursite.com/guide' },
                      { icon: '📄', label: 'PDF', example: 'Google Drive link' },
                      { icon: '📁', label: 'Google Drive', example: 'drive.google.com/...' },
                      { icon: '📝', label: 'Notion', example: 'notion.so/...' },
                      { icon: '🎮', label: 'Discord', example: 'discord.gg/...' },
                      { icon: '💬', label: 'WhatsApp', example: 'chat.whatsapp.com/...' },
                    ].map(rt => (
                      <button key={rt.label} onClick={() => setConfig(c => ({ ...c, delivery: { ...c.delivery, button_label: rt.label, button_url: rt.example } }))}
                        style={{ padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(230,237,243,0.6)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {rt.icon} {rt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(3)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6edf3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
              <button onClick={() => setStep(5)} style={{ padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(135deg,#2dd4bf,#818cf8)', border: 'none', color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Continue → Follow Up</button>
            </div>
          </div>
        )}

        {/* ── STEP 5: FOLLOW UP & PUBLISH ── */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Follow up */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: config.follow_up.enabled ? 20 : 0 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>⏰ Follow Up Message</h2>
                  <p style={{ fontSize: 13, color: 'rgba(230,237,243,0.4)' }}>Automatically follow up after a delay</p>
                </div>
                <Toggle on={config.follow_up.enabled} onChange={v => setConfig(c => ({ ...c, follow_up: { ...c.follow_up, enabled: v } }))} />
              </div>

              {config.follow_up.enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Send After</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {[
                        { label: '1 Hour', v: 1 },
                        { label: '24 Hours', v: 24 },
                        { label: '3 Days', v: 72 },
                        { label: '1 Week', v: 168 },
                      ].map(opt => (
                        <button key={opt.v} onClick={() => setConfig(c => ({ ...c, follow_up: { ...c.follow_up, delay_hours: opt.v } }))}
                          style={{
                            padding: '8px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            background: config.follow_up.delay_hours === opt.v ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${config.follow_up.delay_hours === opt.v ? 'rgba(45,212,191,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            color: config.follow_up.delay_hours === opt.v ? '#2dd4bf' : 'rgba(230,237,243,0.6)',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="number" value={config.follow_up.delay_hours} min={1} max={720}
                          onChange={e => setConfig(c => ({ ...c, follow_up: { ...c.follow_up, delay_hours: parseInt(e.target.value) || 24 } }))}
                          style={{ ...inputStyle, width: 80, textAlign: 'center' }} />
                        <span style={{ fontSize: 12, color: 'rgba(230,237,243,0.4)' }}>hours</span>
                      </div>
                    </div>
                    <label style={labelStyle}>Follow Up Message</label>
                    <textarea rows={3} value={config.follow_up.message}
                      onChange={e => setConfig(c => ({ ...c, follow_up: { ...c.follow_up, message: e.target.value } }))}
                      style={textareaStyle} placeholder="Did you get the guide? Let me know if you need any help! 😊" />
                  </div>
                </div>
              )}
            </div>

            {/* Misc settings */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 16 }}>⚙️ Additional Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Campaign name */}
                <div>
                  <label style={labelStyle}>Campaign Name</label>
                  <input value={campaignName} onChange={e => setCampaignName(e.target.value)} style={inputStyle} placeholder="My Campaign" />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{ padding: 20, background: 'rgba(45,212,191,0.05)', borderRadius: 16, border: '1px solid rgba(45,212,191,0.15)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2dd4bf', marginBottom: 12 }}>📋 Campaign Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Campaign', value: campaignName || '(unnamed)' },
                  { label: 'Trigger', value: config.trigger_type === 'any' ? 'Any Comment' : keywords.join(', ') || 'No keywords' },
                  { label: 'Public Reply', value: config.public_reply.enabled ? `✅ ${config.public_reply.messages.length} message(s)` : '❌ Disabled' },
                  { label: 'Follow Gate', value: config.follow_gate.enabled ? '✅ Enabled' : '❌ Disabled' },
                  { label: 'Email Capture', value: config.email_capture.enabled ? '✅ Enabled' : '❌ Disabled' },
                  { label: 'Delivery', value: config.delivery.message ? '✅ Configured' : '❌ Not set' },
                  { label: 'Follow Up', value: config.follow_up.enabled ? `✅ After ${config.follow_up.delay_hours}h` : '❌ Disabled' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(230,237,243,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{row.label}</span>
                    <span style={{ fontSize: 13, color: '#e6edf3', fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <button onClick={() => setStep(4)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e6edf3', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
              <button onClick={saveCampaign} disabled={saving} style={{
                padding: '14px 36px', borderRadius: 12,
                background: saving ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#2dd4bf,#818cf8)',
                border: 'none', color: saving ? 'rgba(230,237,243,0.4)' : '#000',
                fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 8px 32px rgba(45,212,191,0.4)',
              }}>
                {saving ? 'Launching...' : '🚀 Launch Campaign'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview Panel */}
      <div style={{
        width: 340, flexShrink: 0, padding: '32px 24px',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.01)',
        overflowY: 'auto',
      }}>
        <PhonePreview config={config} keywords={keywords} openingMsg={openingMsg} triggerType={config.trigger_type} />

        {/* Flow summary */}
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(230,237,243,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Campaign Flow</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { enabled: true, icon: '💬', label: 'Comment Trigger', color: '#fbbf24' },
              { enabled: config.public_reply.enabled, icon: '↩️', label: 'Public Reply', color: '#2dd4bf' },
              { enabled: true, icon: '📱', label: 'Opening DM', color: '#818cf8' },
              { enabled: config.follow_gate.enabled, icon: '👥', label: 'Follow Gate', color: '#f472b6' },
              { enabled: config.email_capture.enabled, icon: '📧', label: 'Email Capture', color: '#f59e0b' },
              { enabled: !!config.delivery.message, icon: '🎁', label: 'Delivery', color: '#34d399' },
              { enabled: config.follow_up.enabled, icon: '⏰', label: `Follow Up (+${config.follow_up.delay_hours}h)`, color: '#a78bfa' },
            ].map((step, i) => (
              <div key={step.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.enabled ? `${step.color}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${step.enabled ? `${step.color}40` : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                    {step.enabled ? step.icon : '○'}
                  </div>
                  {i < 6 && <div style={{ width: 1, height: 20, background: step.enabled ? `${step.color}30` : 'rgba(255,255,255,0.04)', margin: '2px 0' }} />}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: step.enabled ? '#e6edf3' : 'rgba(230,237,243,0.3)' }}>{step.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
