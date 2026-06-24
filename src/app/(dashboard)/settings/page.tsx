'use client';

import { useState, useEffect } from 'react';

interface SettingsData {
  system_prompt: string;
  ai_model: string;
  ai_personality: string;
  ai_enabled: boolean;
  auto_reply_delay: number;
}

interface HealthCheck {
  ok: boolean;
  message: string;
}

interface HealthData {
  status: 'ok' | 'degraded' | 'down';
  checks: {
    supabase: HealthCheck;
    meta_token: HealthCheck;
    openrouter: HealthCheck;
  };
  timestamp: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    system_prompt: '',
    ai_model: 'google/gemma-3-12b-it:free',
    ai_personality: 'helpful and friendly',
    ai_enabled: true,
    auto_reply_delay: 0,
  });

  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Fetch settings and health data in parallel
    Promise.all([
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/health').then(res => res.json()),
    ])
      .then(([settingsData, healthData]) => {
        if (!settingsData.error) {
          setSettings({
            system_prompt: settingsData.system_prompt || '',
            ai_model: settingsData.ai_model || 'google/gemma-3-12b-it:free',
            ai_personality: settingsData.ai_personality || 'helpful and friendly',
            ai_enabled: settingsData.ai_enabled !== false,
            auto_reply_delay: Number(settingsData.auto_reply_delay || 0),
          });
        }
        setHealth(healthData);
      })
      .catch(err => console.error('Error loading settings/health:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ color: '#2dd4bf', width: 24, height: 24, margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Settings</h1>
          <p className="section-subtitle">Manage your Instagram auto-responder, AI parameters, and view connection status.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
        {/* Settings Form */}
        <form onSubmit={handleSave} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: '12px', color: '#e6edf3' }}>
            AI Assistant Configuration
          </h2>

          {/* AI Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>Enable AI Auto-Responder</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                When enabled, the AI will reply to DMs when the conversation is in AI Bot mode.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, ai_enabled: !settings.ai_enabled })}
              className={`toggle ${settings.ai_enabled ? 'on' : ''}`}
            />
          </div>

          {/* AI Model & Delay row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label className="label">OpenRouter AI Model</label>
              <input
                className="input"
                value={settings.ai_model}
                onChange={e => setSettings({ ...settings, ai_model: e.target.value })}
                placeholder="e.g. google/gemma-3-12b-it:free"
                disabled={!settings.ai_enabled}
              />
            </div>
            <div>
              <label className="label">Response Delay (Seconds)</label>
              <input
                type="number"
                min="0"
                max="300"
                className="input"
                value={settings.auto_reply_delay}
                onChange={e => setSettings({ ...settings, auto_reply_delay: Number(e.target.value) })}
                placeholder="e.g. 0 for instant"
                disabled={!settings.ai_enabled}
              />
            </div>
          </div>

          {/* Personality */}
          <div>
            <label className="label">AI Personality Description</label>
            <input
              className="input"
              value={settings.ai_personality}
              onChange={e => setSettings({ ...settings, ai_personality: e.target.value })}
              placeholder="e.g. helpful, friendly, casual and concise"
              disabled={!settings.ai_enabled}
            />
          </div>

          {/* System Prompt */}
          <div>
            <label className="label">AI System Prompt Instructions</label>
            <textarea
              className="textarea"
              rows={8}
              value={settings.system_prompt}
              onChange={e => setSettings({ ...settings, system_prompt: e.target.value })}
              placeholder="Detailed instructions for the AI on how to reply to followers..."
              disabled={!settings.ai_enabled}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '10px 24px' }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saveSuccess && (
              <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600, animation: 'fadeIn 0.2s' }}>
                ✓ Settings saved successfully!
              </span>
            )}
          </div>
        </form>

        {/* Sidebar Status Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Integration Health Card */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#e6edf3' }}>
              System Integrations
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Supabase Status */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Database (Supabase)</span>
                  {health?.checks.supabase.ok ? (
                    <span className="badge badge-teal">Connected</span>
                  ) : (
                    <span className="badge badge-failed">Offline</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                  {health?.checks.supabase.message || 'Connecting to Supabase...'}
                </div>
              </div>

              {/* Meta Status */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Instagram API (Meta)</span>
                  {health?.checks.meta_token.ok ? (
                    <span className="badge badge-teal">Connected</span>
                  ) : (
                    <span className="badge badge-failed">Missing Token</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                  {health?.checks.meta_token.message || 'Verifying Page Access Token...'}
                </div>
              </div>

              {/* OpenRouter Status */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>AI Responder (OpenRouter)</span>
                  {health?.checks.openrouter.ok ? (
                    <span className="badge badge-teal">Active</span>
                  ) : (
                    <span className="badge badge-failed">Missing Key</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                  {health?.checks.openrouter.message || 'Verifying API Credentials...'}
                </div>
              </div>
            </div>
          </div>

          {/* Tips Card */}
          <div className="card" style={{ padding: '24px', background: 'rgba(45,212,191,0.02)', borderColor: 'rgba(45,212,191,0.1)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: '#2dd4bf' }}>
              Personal account setup 🔒
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
              This dashboard is configured exclusively for your personal Instagram automation. Your page credentials, app secret, and verify token are loaded securely from <code>.env.local</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
