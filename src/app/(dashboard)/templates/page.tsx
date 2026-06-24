'use client';

import { useState, useEffect } from 'react';

interface TemplateButton {
  label: string;
  url: string;
}

interface Template {
  id: string;
  name: string;
  message: string;
  buttons: TemplateButton[];
  created_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [buttons, setButtons] = useState<TemplateButton[]>([]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      const json = await res.json();
      if (json.success) setTemplates(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingTemplate(null);
    setName('');
    setMessage('');
    setButtons([]);
    setModalOpen(true);
  }

  function openEditModal(t: Template) {
    setEditingTemplate(t);
    setName(t.name);
    setMessage(t.message);
    setButtons(t.buttons || []);
    setModalOpen(true);
  }

  async function saveTemplate() {
    if (!name || !message) return alert("Name and message are required.");
    setSaving(true);
    try {
      const isEdit = !!editingTemplate;
      const url = isEdit ? `/api/templates?id=${editingTemplate.id}` : '/api/templates';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message, buttons })
      });
      const json = await res.json();
      if (json.success) {
        setModalOpen(false);
        fetchTemplates();
      } else {
        alert("Failed to save: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving template");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchTemplates();
      } else {
        alert("Failed to delete: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting template");
    }
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="section-header">
        <div>
          <h1 className="section-title">Message Templates</h1>
          <p className="section-subtitle">Create reusable DM templates with action buttons (like ManyChat).</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>+ New Template</button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ color: '#2dd4bf', width: 24, height: 24 }} /></div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>💬</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#e6edf3' }}>No templates yet</div>
          <div style={{ fontSize: '14px', color: 'rgba(230,237,243,0.5)', marginTop: '8px', marginBottom: '24px' }}>
            Create your first template to use in Comment → DM automations.
          </div>
          <button className="btn-primary" onClick={openCreateModal}>Create Template</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#e6edf3' }}>{t.name}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => openEditModal(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#2dd4bf', fontSize: '13px', fontWeight: 600 }}>Edit</button>
                  <button onClick={() => deleteTemplate(t.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '13px', fontWeight: 600 }}>Delete</button>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(230,237,243,0.7)', flex: 1, whiteSpace: 'pre-wrap', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                {t.message}
              </div>
              {t.buttons?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {t.buttons.map((b, i) => (
                    <div key={i} style={{ padding: '8px', background: 'var(--accent-dim)', color: '#2dd4bf', textAlign: 'center', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: '1px solid rgba(45,212,191,0.2)' }}>
                      {b.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label className="label">Template Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Free Masterclass Invite" />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="label">Message Body</label>
              <textarea className="textarea" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Hey {{name}}! Thanks for commenting. Here is the link..." />
              <div style={{ fontSize: '11px', color: 'rgba(230,237,243,0.4)', marginTop: '6px' }}>Tip: Use {'{{name}}'} to insert the user's name or username.</div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label className="label" style={{ margin: 0 }}>Action Buttons (Max 3)</label>
                {buttons.length < 3 && (
                  <button onClick={() => setButtons([...buttons, { label: 'Click Here', url: 'https://' }])} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Add Button</button>
                )}
              </div>
              
              {buttons.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '8px', color: 'rgba(230,237,243,0.4)', fontSize: '13px' }}>
                  No buttons added. The user will just receive text.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {buttons.map((b, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <input className="input" style={{ flex: 1 }} value={b.label} onChange={e => {
                        const newBtns = [...buttons];
                        newBtns[i].label = e.target.value;
                        setButtons(newBtns);
                      }} placeholder="Button Label" />
                      <input className="input" style={{ flex: 2 }} value={b.url} onChange={e => {
                        const newBtns = [...buttons];
                        newBtns[i].url = e.target.value;
                        setButtons(newBtns);
                      }} placeholder="https://..." />
                      <button onClick={() => {
                        const newBtns = [...buttons];
                        newBtns.splice(i, 1);
                        setButtons(newBtns);
                      }} className="btn-danger" style={{ padding: '10px 14px' }}>X</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveTemplate} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
