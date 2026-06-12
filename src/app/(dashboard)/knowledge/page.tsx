'use client';

import { useState, useEffect } from 'react';

interface KnowledgeDoc {
  id: string;
  name: string;
  type: 'text' | 'pdf' | 'url' | 'faq';
  content: string | null;
  url: string | null;
  chunk_count: number;
  created_at: string;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'url'>('text');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Query test states
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [testingQuery, setTestingQuery] = useState(false);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const res = await fetch('/api/knowledge');
      if (!res.ok) throw new Error('Failed to fetch knowledge base documents');
      const json = await res.json();
      setDocuments(json.documents || []);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    if (type === 'text' && !content) return;
    if (type === 'url' && !url) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          content: type === 'text' ? content : undefined,
          url: type === 'url' ? url : undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to save document');
      
      // Reset form
      setName('');
      setContent('');
      setUrl('');
      
      // Refresh list
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to create document');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this document? All associated chunks will be deleted.')) return;

    try {
      const res = await fetch(`/api/knowledge?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete document');
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  }

  async function handleTestQuery() {
    if (!query.trim()) return;
    try {
      setTestingQuery(true);
      // Mock retrieve/search endpoint - in Phase 2 it will use vector match
      // For now, simple text match from local state
      const matchingDocs = documents.filter(d => 
        (d.content || '').toLowerCase().includes(query.toLowerCase()) || 
        (d.name || '').toLowerCase().includes(query.toLowerCase())
      );
      setQueryResults(matchingDocs.map(d => ({
        document_name: d.name,
        chunk_text: d.content ? d.content.substring(0, 180) + '...' : 'URL source'
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setTestingQuery(false);
    }
  }

  return (
    <div style={{ padding: 30, background: '#0a0a0f', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Knowledge Base</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Feed documentation, FAQs, and URLs to your AI agents to answer buyer questions</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 30 }}>
        {/* Left Side: Upload & List */}
        <div>
          {/* Upload panel */}
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25, marginBottom: 30 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Add Resource</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Source Name</label>
                <input
                  type="text"
                  placeholder="e.g. Return Policy, Pricing FAQ"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Resource Type</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setType('text')}
                    style={{ flex: 1, padding: 10, borderRadius: 6, fontSize: 12, background: type === 'text' ? 'rgba(131,58,180,0.2)' : '#1a1a24', color: type === 'text' ? '#fff' : 'rgba(255,255,255,0.6)', border: type === 'text' ? '1px solid rgba(131,58,180,0.4)' : '1px solid transparent', cursor: 'pointer' }}
                  >
                    📝 Text Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('url')}
                    style={{ flex: 1, padding: 10, borderRadius: 6, fontSize: 12, background: type === 'url' ? 'rgba(131,58,180,0.2)' : '#1a1a24', color: type === 'url' ? '#fff' : 'rgba(255,255,255,0.6)', border: type === 'url' ? '1px solid rgba(131,58,180,0.4)' : '1px solid transparent', cursor: 'pointer' }}
                  >
                    🔗 Web URL
                  </button>
                </div>
              </div>

              {type === 'text' ? (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Content</label>
                  <textarea
                    placeholder="Paste your knowledge base document or FAQ list here..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    required={type === 'text'}
                    rows={6}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13, resize: 'vertical' }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Web URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/shipping-policy"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    required={type === 'url'}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d)',
                  color: '#fff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  marginTop: 10
                }}
              >
                {submitting ? 'Saving...' : 'Add to Knowledge Base'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: List & Query Test */}
        <div>
          {/* Test query panel */}
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25, marginBottom: 30 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Semantic Query Sandbox</h3>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                type="text"
                placeholder="Ask your KB a question (e.g. Do you ship to Canada?)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 13 }}
              />
              <button
                onClick={handleTestQuery}
                disabled={testingQuery}
                style={{ padding: '10px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #fcb045, #fd1d1d)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Test Query
              </button>
            </div>
            
            {queryResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Retrieved Chunks</h4>
                {queryResults.map((qr, index) => (
                  <div key={index} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: 11, color: '#fcb045', fontWeight: 600, marginBottom: 4 }}>{qr.document_name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{qr.chunk_text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List panel */}
          <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 25 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Active Documents</h3>
            
            {loading && documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading documents...</div>
            ) : documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No active documents. Add one on the left.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {documents.map(d => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, background: '#1a1a24', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, display: 'flex', gap: 8 }}>
                        <span style={{ textTransform: 'uppercase' }}>{d.type}</span>
                        <span>·</span>
                        <span>{d.chunk_count} Chunks</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(d.id)}
                      style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
