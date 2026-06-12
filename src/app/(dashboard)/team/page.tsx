'use client';

import { useState } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Manager' | 'Agent' | 'Viewer';
  avatar: string;
}

const initialMembers: TeamMember[] = [
  { id: '1', name: 'Lokesh (You)', email: 'lokesh@instaauto.ai', role: 'Owner', avatar: '👤' },
  { id: '2', name: 'Sara Miller', email: 'sara@instaauto.ai', role: 'Admin', avatar: '👩' },
  { id: '3', name: 'John Doe', email: 'john@instaauto.ai', role: 'Agent', avatar: '👨' },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Manager' | 'Agent' | 'Viewer'>('Agent');

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) return;

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name,
      email,
      role,
      avatar: role === 'Admin' ? '👩' : '👨',
    };

    setMembers([...members, newMember]);
    setName('');
    setEmail('');
    setRole('Agent');
  }

  function handleRemove(id: string) {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    setMembers(members.filter(m => m.id !== id));
  }

  const rolePermissions = [
    { module: 'Inbox (Takeover & Chat)', Owner: 'Full', Admin: 'Full', Manager: 'Full', Agent: 'Full', Viewer: 'View Only' },
    { module: 'Campaigns & Comments', Owner: 'Full', Admin: 'Full', Manager: 'Full', Agent: 'None', Viewer: 'View Only' },
    { module: 'AI Settings', Owner: 'Full', Admin: 'Full', Manager: 'None', Agent: 'None', Viewer: 'None' },
    { module: 'Team Management', Owner: 'Full', Admin: 'Edit', Manager: 'None', Agent: 'None', Viewer: 'None' },
    { module: 'Database & Settings', Owner: 'Full', Admin: 'None', Agent: 'None', Agent_1: 'None', Viewer: 'None' }
  ];

  return (
    <div style={{ padding: 30, background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Team Management</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Add agents, assign chat support roles and review workspaces</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 30 }}>
        {/* Left: Active Members & Invites */}
        <div>
          {/* Active members list */}
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25, marginBottom: 30 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Active Members</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, background: '#1a1a24', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {m.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{m.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: m.role === 'Owner' || m.role === 'Admin' ? 'rgba(131,58,180,0.15)' : 'rgba(255,255,255,0.05)',
                      color: m.role === 'Owner' || m.role === 'Admin' ? '#fd1d1d' : 'rgba(255,255,255,0.6)',
                      border: m.role === 'Owner' || m.role === 'Admin' ? '1px solid rgba(131,58,180,0.2)' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {m.role}
                    </span>
                    {m.role !== 'Owner' && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invite form */}
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Invite Team Member</h3>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sara Miller"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="sara@mybrand.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Workspace Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="Admin">Admin (Full Edit permissions)</option>
                  <option value="Manager">Manager (Edit comments & inbox, no settings)</option>
                  <option value="Agent">Agent (Inbox takeover only)</option>
                  <option value="Viewer">Viewer (Read-only access)</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
                  color: '#fff',
                  cursor: 'pointer',
                  marginTop: 10
                }}
              >
                Send Invite Invitation
              </button>
            </form>
          </div>
        </div>

        {/* Right: Permission matrix */}
        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25, height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Role Permission Settings</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                  <th style={{ padding: 10 }}>Module</th>
                  <th style={{ padding: 10 }}>Admin</th>
                  <th style={{ padding: 10 }}>Manager</th>
                  <th style={{ padding: 10 }}>Agent</th>
                  <th style={{ padding: 10 }}>Viewer</th>
                </tr>
              </thead>
              <tbody>
                {rolePermissions.map((rp, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: 10, fontWeight: 500 }}>{rp.module}</td>
                    <td style={{ padding: 10, color: rp.Admin === 'Full' || rp.Admin === 'Edit' ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>{rp.Admin}</td>
                    <td style={{ padding: 10, color: rp.Manager === 'Full' || rp.Manager === 'Edit' ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>{rp.Manager}</td>
                    <td style={{ padding: 10, color: rp.Agent === 'Full' || rp.Agent === 'Edit' ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>{rp.Agent || 'None'}</td>
                    <td style={{ padding: 10, color: rp.Viewer === 'View Only' ? '#eab308' : 'rgba(255,255,255,0.4)' }}>{rp.Viewer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
