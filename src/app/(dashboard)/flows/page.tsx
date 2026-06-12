'use client';

import { useState } from 'react';

interface Node {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  title: string;
  desc: string;
  x: number;
  y: number;
}

const initialNodes: Node[] = [
  { id: '1', type: 'trigger', title: 'Keyword Trigger', desc: 'When user comments "PRICING"', x: 50, y: 150 },
  { id: '2', type: 'action', title: 'Send DM', desc: 'Send pricing card + link', x: 280, y: 150 },
  { id: '3', type: 'delay', title: 'Wait 10 Mins', desc: 'Delay subsequent checks', x: 510, y: 150 },
  { id: '4', type: 'condition', title: 'If Followed?', desc: 'Check customer status', x: 740, y: 150 },
];

export default function FlowsPage() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Flow node parameters
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeDesc, setNodeDesc] = useState('');

  function handleSelectNode(n: Node) {
    setActiveNodeId(n.id);
    setNodeTitle(n.title);
    setNodeDesc(n.desc);
  }

  function handleUpdateNode() {
    if (!activeNodeId) return;
    setNodes(nodes.map(n => n.id === activeNodeId ? { ...n, title: nodeTitle, desc: nodeDesc } : n));
    alert('Node updated');
  }

  function handleAddNode(type: 'trigger' | 'action' | 'condition' | 'delay') {
    const title = type === 'trigger' ? 'New Trigger' : type === 'action' ? 'New Action' : type === 'condition' ? 'New Condition' : 'New Delay';
    const desc = 'Configure node details';
    const lastNode = nodes[nodes.length - 1];
    const x = lastNode ? lastNode.x + 200 : 100;
    const y = 150;

    const newNode: Node = {
      id: Date.now().toString(),
      type,
      title,
      desc,
      x,
      y
    };

    setNodes([...nodes, newNode]);
    handleSelectNode(newNode);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0f', color: '#fff' }}>
      {/* Top Header */}
      <div style={{ padding: '20px 30px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111118' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #833ab4, #fd1d1d, #fcb045)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Visual Flow Builder</h1>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Build automated conversational flows visually</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => handleAddNode('trigger')} style={{ padding: '8px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Trigger</button>
          <button onClick={() => handleAddNode('action')} style={{ padding: '8px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Action</button>
          <button onClick={() => handleAddNode('condition')} style={{ padding: '8px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Condition</button>
          <button onClick={() => handleAddNode('delay')} style={{ padding: '8px 14px', borderRadius: 8, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Delay</button>
          <button onClick={() => alert('Flow saved successfully!')} style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #833ab4, #fd1d1d)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save Flow</button>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Canvas area */}
        <div style={{ flex: 1, position: 'relative', background: '#07070a', backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px', overflow: 'auto', padding: 50 }}>
          <div style={{ position: 'relative', minWidth: 1200, minHeight: 600 }}>
            {/* Connecting lines SVG background */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
              {nodes.map((n, i) => {
                if (i === nodes.length - 1) return null;
                const nextNode = nodes[i + 1];
                return (
                  <g key={n.id}>
                    {/* Cubic Bezier curve connector line */}
                    <path
                      d={`M ${n.x + 180} ${n.y + 40} C ${n.x + 230} ${n.y + 40}, ${nextNode.x - 50} ${nextNode.y + 40}, ${nextNode.x} ${nextNode.y + 40}`}
                      fill="none"
                      stroke="url(#line-grad)"
                      strokeWidth="2"
                    />
                    {/* Circle indicators on connectors */}
                    <circle cx={n.x + 180} cy={n.y + 40} r="4" fill="#fd1d1d" />
                    <circle cx={nextNode.x} cy={nextNode.y + 40} r="4" fill="#fcb045" />
                  </g>
                );
              })}
              <defs>
                <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#833ab4" />
                  <stop offset="50%" stopColor="#fd1d1d" />
                  <stop offset="100%" stopColor="#fcb045" />
                </linearGradient>
              </defs>
            </svg>

            {/* Nodes */}
            {nodes.map(n => {
              const isActive = activeNodeId === n.id;
              const accentColor = n.type === 'trigger' ? '#833ab4' : n.type === 'action' ? '#fd1d1d' : n.type === 'condition' ? '#fcb045' : '#3b82f6';
              return (
                <div
                  key={n.id}
                  onClick={() => handleSelectNode(n)}
                  style={{
                    position: 'absolute',
                    left: n.x,
                    top: n.y,
                    width: 180,
                    padding: 16,
                    borderRadius: 12,
                    background: '#111118',
                    border: isActive ? `2px solid ${accentColor}` : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isActive ? `0 0 15px rgba(253,29,29,0.15)` : '0 4px 20px rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: accentColor }} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', tracking: 1 } as any}>
                      {n.type}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3 }}>{n.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Editor Side Panel */}
        {activeNodeId && (
          <div style={{ width: 300, background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.08)', padding: 25, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Configure Node</h3>
              <button onClick={() => setActiveNodeId(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Node Title</label>
                <input
                  type="text"
                  value={nodeTitle}
                  onChange={e => setNodeTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Configuration / Description</label>
                <textarea
                  value={nodeDesc}
                  onChange={e => setNodeDesc(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, resize: 'vertical' }}
                />
              </div>

              <button
                onClick={handleUpdateNode}
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
                Apply Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
