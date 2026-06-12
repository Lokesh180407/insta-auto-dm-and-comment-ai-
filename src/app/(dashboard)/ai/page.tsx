'use client';

import { useState, useEffect } from 'react';

export default function AIAgentPage() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('google/gemma-3-12b-it:free');
  const [personality, setPersonality] = useState('helpful and friendly');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [delay, setDelay] = useState(5);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Test sandbox state
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to load settings');
        const d = await res.json();
        
        setSystemPrompt(d.system_prompt || '');
        setModel(d.ai_model || 'google/gemma-3-12b-it:free');
        setPersonality(d.ai_personality || 'helpful and friendly');
        setAiEnabled(d.ai_enabled !== false);
        setDelay(d.auto_reply_delay || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setSaveMessage(null);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          ai_model: model,
          ai_personality: personality,
          ai_enabled: aiEnabled,
          auto_reply_delay: delay,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      setSaveMessage('✓ Configuration saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestAI() {
    if (!testInput.trim()) return;
    try {
      setTesting(true);
      setTestOutput('Thinking...');
      
      const res = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testInput,
          systemPrompt,
          model,
          personality
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate response');
      setTestOutput(data.reply || 'No response generated.');
    } catch (err: any) {
      setTestOutput(`Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 30, color: 'rgba(255,255,255,0.4)' }}>
        Loading AI settings...
      </div>
    );
  }

  return (
    <div style={{ padding: 30, background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI Agent Settings</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Configure personality, system instruction sets, model preferences, and sandbox tests</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
            color: '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(131,58,180,0.3)',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save Config'}
        </button>
      </div>

      {saveMessage && (
        <div style={{ padding: 12, borderRadius: 8, background: saveMessage.startsWith('✓') ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: saveMessage.startsWith('✓') ? '#22c55e' : '#ef4444', border: saveMessage.startsWith('✓') ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(239,68,68,0.2)', marginBottom: 25, fontSize: 13 }}>
          {saveMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 30 }}>
        {/* Settings Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
          {/* Global Toggle & Model */}
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Enable AI Autopilot</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Globally enable/disable AI auto-replies for connected DMs</p>
              </div>
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`toggle ${aiEnabled ? 'on' : ''}`}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }} />

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>AI LLM Provider Model</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, cursor: 'pointer' }}
              >
                <option value="google/gemma-3-12b-it:free">Gemma 3 12B IT (Free/Fast)</option>
                <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B Instruct</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
                <option value="anthropic/claude-3.5-haiku">Claude 3.5 Haiku</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>AI Tone & Personality</label>
              <select
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, cursor: 'pointer' }}
              >
                <option value="helpful and friendly">Helpful and Friendly (Default)</option>
                <option value="professional and corporate">Professional and Corporate</option>
                <option value="casual and playful">Casual and Playful (Emojis)</option>
                <option value="sales-driven and energetic">Sales-driven and Energetic</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Auto-Reply Delay Time</label>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fcb045' }}>{delay} Seconds</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={delay}
                onChange={e => setDelay(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#fd1d1d' }}
              />
            </div>
          </div>

          {/* System Prompt Instructions */}
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25 }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600 }}>System Prompt Directives</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>Write specific rules guiding the AI response. Include info about your shop, refund guidelines, discount codes, or booking URLs.</p>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={8}
              placeholder="You are an AI sales agent for Loki Invents..."
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, resize: 'vertical', fontFamily: 'monospace' }}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
              Characters: {systemPrompt.length}
            </div>
          </div>
        </div>

        {/* Sandbox Test Simulator */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>AI Sandbox Simulator</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Test how your AI replies before deploying live</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>Test User Input Message</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="e.g. How much does shipping cost?"
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
              />
              <button
                onClick={handleTestAI}
                disabled={testing || !testInput.trim()}
                style={{
                  padding: '10px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #fcb045, #fd1d1d)',
                  border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  opacity: testing || !testInput.trim() ? 0.6 : 1
                }}
              >
                Send
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>AI Response Output</label>
            <div style={{ flex: 1, padding: 14, borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: 'sans-serif', whiteSpace: 'pre-wrap', minHeight: 180 }}>
              {testOutput || 'Click send to view AI generation output.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
