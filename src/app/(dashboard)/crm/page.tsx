'use client';

import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  igsid: string;
  username: string | null;
  name: string | null;
  profile_pic: string | null;
  follower_count: number | null;
  email: string | null;
  phone: string | null;
  lead_score: number;
  tags: string[];
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newTag, setNewTag] = useState('');

  // Editing fields in detail panel
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadScore, setLeadScore] = useState(0);

  async function fetchContacts() {
    try {
      setLoading(true);
      const res = await fetch('/api/crm');
      if (!res.ok) throw new Error('Failed to fetch CRM contacts');
      const json = await res.json();
      setContacts(json.contacts || []);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      setEmail(selectedContact.email || '');
      setPhone(selectedContact.phone || '');
      setLeadScore(selectedContact.lead_score || 0);
    }
  }, [selectedContact]);

  async function handleUpdateContact() {
    if (!selectedContact) return;

    try {
      const res = await fetch(`/api/crm?id=${selectedContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || null,
          phone: phone || null,
          lead_score: Number(leadScore),
          tags: selectedContact.tags,
        }),
      });

      if (!res.ok) throw new Error('Failed to update contact');
      const json = await res.json();
      
      // Update local state
      setContacts(contacts.map(c => c.id === selectedContact.id ? json.contact : c));
      setSelectedContact(json.contact);
      alert('Contact updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update');
    }
  }

  async function handleAddTag() {
    if (!selectedContact || !newTag.trim()) return;
    const tag = newTag.trim().toLowerCase();
    if (selectedContact.tags.includes(tag)) return;

    const updatedTags = [...selectedContact.tags, tag];
    
    try {
      const res = await fetch(`/api/crm?id=${selectedContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (!res.ok) throw new Error('Failed to add tag');
      const json = await res.json();

      setContacts(contacts.map(c => c.id === selectedContact.id ? json.contact : c));
      setSelectedContact(json.contact);
      setNewTag('');
    } catch (err: any) {
      alert(err.message || 'Failed to add tag');
    }
  }

  async function handleRemoveTag(tagToRemove: string) {
    if (!selectedContact) return;
    const updatedTags = selectedContact.tags.filter(t => t !== tagToRemove);

    try {
      const res = await fetch(`/api/crm?id=${selectedContact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (!res.ok) throw new Error('Failed to remove tag');
      const json = await res.json();

      setContacts(contacts.map(c => c.id === selectedContact.id ? json.contact : c));
      setSelectedContact(json.contact);
    } catch (err: any) {
      alert(err.message || 'Failed to remove tag');
    }
  }

  const filteredContacts = contacts.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.username || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.igsid || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
      {/* Main CRM Area */}
      <div style={{ flex: 1, padding: 30, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>CRM Contacts</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Manage and tag your Instagram scoped user database</p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search contacts by name, username or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: '#111118', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
          />
        </div>

        {loading && contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>Loading contacts...</div>
        ) : filteredContacts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>👥</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>No Contacts Found</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Try a different search query or wait for new webhook messages.</p>
          </div>
        ) : (
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  <th style={{ padding: '15px 20px' }}>Contact</th>
                  <th style={{ padding: '15px 20px' }}>IGSID</th>
                  <th style={{ padding: '15px 20px' }}>Followers</th>
                  <th style={{ padding: '15px 20px' }}>Lead Score</th>
                  <th style={{ padding: '15px 20px' }}>Tags</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      fontSize: 13,
                      background: selectedContact?.id === c.id ? 'rgba(131,58,180,0.1)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #833ab4, #fd1d1d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, overflow: 'hidden' }}>
                        {c.profile_pic ? <img src={c.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name || 'Anonymous'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>@{c.username || 'unknown'}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{c.igsid}</td>
                    <td style={{ padding: '12px 20px' }}>{c.follower_count?.toLocaleString() || '-'}</td>
                    <td style={{ padding: '12px 20px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: c.lead_score >= 80 ? 'rgba(34,197,94,0.15)' : c.lead_score >= 40 ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)',
                        color: c.lead_score >= 80 ? '#22c55e' : c.lead_score >= 40 ? '#eab308' : 'rgba(255,255,255,0.6)',
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {c.lead_score}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.tags.slice(0, 3).map((t, idx) => (
                          <span key={idx} style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(131,58,180,0.15)', color: '#fd1d1d', fontSize: 10, border: '1px solid rgba(131,58,180,0.2)' }}>{t}</span>
                        ))}
                        {c.tags.length > 3 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>+{c.tags.length - 3}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Side Panel */}
      {selectedContact && (
        <div style={{ width: 320, background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.08)', padding: 25, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Profile Details</h3>
            <button onClick={() => setSelectedContact(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #833ab4, #fd1d1d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden' }}>
              {selectedContact.profile_pic ? <img src={selectedContact.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedContact.name || 'Anonymous User'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>@{selectedContact.username || 'unknown'}</div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Tags</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {selectedContact.tags.map((t, idx) => (
                <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 11 }}>
                  {t}
                  <button onClick={() => handleRemoveTag(t)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="New tag..."
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12 }}
              />
              <button onClick={handleAddTag} style={{ padding: '6px 12px', borderRadius: 6, background: 'linear-gradient(135deg, #833ab4, #fd1d1d)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15, paddingTop: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Lead Score: {leadScore}</label>
              <input
                type="range"
                min="0"
                max="100"
                value={leadScore}
                onChange={e => setLeadScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#fd1d1d' }}
              />
            </div>
          </div>

          <button
            onClick={handleUpdateContact}
            style={{
              marginTop: 10,
              padding: '10px 16px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #fcb045, #fd1d1d)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
