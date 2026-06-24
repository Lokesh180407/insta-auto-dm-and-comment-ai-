'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Camera as Instagram, Link, Plus, Trash, 
  Settings, CheckCircle2, ChevronRight, ChevronLeft,
  Mail, Users, Clock, AlertCircle, Play, FileText, Image as ImageIcon
} from 'lucide-react';

interface InstagramPost {
  id: string;
  caption: string;
  media_url: string;
  thumbnail: string | null;
  permalink: string;
  timestamp: string;
}

export default function CommentAutomationsPage() {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Wizard State
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Base Settings
  const [name, setName] = useState('');
  const [postId, setPostId] = useState('');
  const [triggerType, setTriggerType] = useState<'specific' | 'any' | 'next'>('specific');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [removePrevDmData, setRemovePrevDmData] = useState(false);
  
  // Campaign Config
  const [publicReply, setPublicReply] = useState({ enabled: false, message: 'Check your DMs! 🚀' });
  const [followGate, setFollowGate] = useState({ enabled: false });
  const [emailCapture, setEmailCapture] = useState({ enabled: false });
  const [openingMessage, setOpeningMessage] = useState('Thanks for your comment! Before I send the link, what is your best email address?');
  const [deliveryMessage, setDeliveryMessage] = useState('Here is what I promised!');
  const [deliveryButton, setDeliveryButton] = useState({ label: 'Click Here', url: '' });
  const [followUp, setFollowUp] = useState({ enabled: false, delay_hours: 24, message: 'Did you get the link alright?' });

  // Data
  const [posts, setPosts] = useState<InstagramPost[]>([]);

  useEffect(() => {
    fetchAutomations();
    fetch('/api/instagram/posts').then(r => r.json()).then(d => { if (d.success) setPosts(d.data); });
  }, []);

  async function fetchAutomations() {
    setLoading(true);
    try {
      const res = await fetch('/api/automations');
      const json = await res.json();
      if (json.success) setAutomations(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createAutomation() {
    const finalKeywords = triggerType === 'any' ? ['ANY_COMMENT'] : keywords;
    if (!name || !postId || finalKeywords.length === 0) {
      return alert("Please fill the basic required fields.");
    }
    setSaving(true);
    try {
      // Build campaign config json
      const campaign_config = {
        public_reply: publicReply,
        follow_gate: followGate,
        email_capture: emailCapture,
        delivery: {
          message: deliveryMessage,
          button: deliveryButton.url ? deliveryButton : null
        },
        follow_up: followUp
      };

      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, 
          postId, 
          keywords: finalKeywords, 
          dmMessage: openingMessage, // opening DM is saved to core column for backwards compatibility
          isActive: true, 
          wholeWordMatch: true,
          removePrevDmData,
          campaign_config
        })
      });
      const json = await res.json();
      if (json.success) {
        setView('list');
        fetchAutomations();
        resetForm();
      } else {
        alert(json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setStep(1);
    setName('');
    setPostId('');
    setKeywords([]);
    setTriggerType('specific');
    setPublicReply({ enabled: false, message: 'Check your DMs! 🚀' });
    setFollowGate({ enabled: false });
    setEmailCapture({ enabled: false });
    setOpeningMessage('');
    setDeliveryMessage('');
    setDeliveryButton({ label: 'Click Here', url: '' });
    setFollowUp({ enabled: false, delay_hours: 24, message: '' });
  }

  async function toggleStatus(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/automations?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current })
      });
      if (res.ok) fetchAutomations();
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Delete this automation?")) return;
    try {
      const res = await fetch(`/api/automations?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchAutomations();
    } catch (err) {
      console.error(err);
    }
  }

  // Live Preview Phone Mockup Component
  const PhonePreview = () => (
    <div className="sticky top-8 w-full max-w-[320px] mx-auto bg-black rounded-[3rem] border-8 border-gray-900 shadow-2xl overflow-hidden aspect-[9/19] flex flex-col font-sans">
      {/* Phone Header */}
      <div className="bg-gray-900 text-white px-4 pt-12 pb-3 flex items-center justify-between z-10 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <ChevronLeft size={24} />
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
            <div className="w-full h-full bg-gray-900 rounded-full border border-gray-800"></div>
          </div>
          <span className="font-semibold text-sm">Your Page</span>
        </div>
        <div className="flex gap-4">
          <MessageSquare size={20} />
          <Settings size={20} />
        </div>
      </div>

      {/* Phone Body */}
      <div className="flex-1 bg-black p-4 overflow-y-auto space-y-4">
        
        {/* Comment Preview */}
        <AnimatePresence>
          {publicReply.enabled && step >= 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-800 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-gray-200">You</span>
                <p className="text-xs text-gray-400 mt-1">{publicReply.message}</p>
                <div className="flex gap-4 mt-1 text-[10px] text-gray-600 font-medium">
                  <span>1m</span>
                  <span>Reply</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center text-xs text-gray-500 font-medium py-2">Today 10:45 AM</div>
        
        {/* Step 3: Opening Message */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95, originX: 0 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-1 items-end">
              <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm whitespace-pre-wrap">
                {openingMessage || "Your message will appear here..."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 4: Delivery */}
        <AnimatePresence>
          {step >= 4 && emailCapture.enabled && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1 items-start mt-4">
              <div className="bg-gray-800 text-white p-3 rounded-2xl rounded-tl-sm max-w-[85%] text-sm border border-gray-700">
                user@example.com
              </div>
             </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.95, originX: 0 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-1 items-end mt-4">
              <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm whitespace-pre-wrap shadow-lg">
                {deliveryMessage || "Delivery message..."}
              </div>
              {deliveryButton.label && (
                <div className="w-full max-w-[85%] mt-1">
                  <div className="bg-gray-800 border border-gray-700 text-blue-400 font-semibold text-center p-2 rounded-xl text-sm mt-1">
                    {deliveryButton.label}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Step 5: Follow Up */}
        <AnimatePresence>
          {step >= 5 && followUp.enabled && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex flex-col gap-1 items-end opacity-75">
              <div className="text-[10px] text-gray-500 w-full text-center mb-2">After {followUp.delay_hours} hours</div>
              <div className="bg-blue-600/80 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] text-sm whitespace-pre-wrap">
                {followUp.message || "Follow up message..."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
      
      {/* Phone Footer */}
      <div className="bg-gray-900 p-4 border-t border-gray-800">
        <div className="bg-black rounded-full border border-gray-800 px-4 py-2 flex items-center gap-2">
          <Instagram size={16} className="text-gray-400" />
          <span className="text-sm text-gray-500">Message...</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-[1400px] mx-auto text-gray-100 min-h-screen">
      <div className="flex justify-between items-end mb-12 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            Campaign Builder
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Build powerful comment-to-DM conversion funnels.</p>
        </div>
        {view === 'list' ? (
          <button 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            onClick={() => { resetForm(); setView('create'); }}
          >
            <Plus size={20} /> New Campaign
          </button>
        ) : (
          <button className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors" onClick={() => setView('list')}>
            <ChevronLeft size={20} /> Back to Dashboard
          </button>
        )}
      </div>

      {view === 'list' && (
        <div className="space-y-6">
          {loading ? (
             <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : automations.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-16 text-center shadow-xl">
              <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus size={40} className="text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No Campaigns Yet</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Create your first automated flow to capture emails and send resources via DMs automatically.</p>
              <button 
                onClick={() => { resetForm(); setView('create'); }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-indigo-500/20"
              >
                Start Building
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {automations.map(a => (
                 <div key={a.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col transition-all hover:border-gray-700 hover:shadow-indigo-500/10 hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                          {a.name}
                          <span className={`w-2 h-2 rounded-full ${a.isActive ? 'bg-teal-400' : 'bg-gray-600'}`}></span>
                        </h3>
                        <p className="text-xs text-gray-500 font-mono">ID: {a.id.slice(0,8)}</p>
                      </div>
                      <button 
                        onClick={() => toggleStatus(a.id, a.isActive)} 
                        className={`w-12 h-6 rounded-full transition-colors relative ${a.isActive ? 'bg-teal-500' : 'bg-gray-700'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${a.isActive ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex gap-2 flex-wrap mb-6">
                      {a.keywords.includes('ANY_COMMENT') ? (
                         <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium">Any Comment</span>
                      ) : (
                         a.keywords.map((k: string) => <span key={k} className="bg-gray-800 border border-gray-700 px-3 py-1 rounded-full text-xs font-medium text-gray-300">{k}</span>)
                      )}
                    </div>

                    <div className="mt-auto pt-6 border-t border-gray-800 flex justify-between items-center">
                      <div className="flex gap-6">
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Delivered</div>
                          <div className="text-xl font-black text-white">{a.analytics?.sent || 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Failed</div>
                          <div className="text-xl font-black text-red-400">{a.analytics?.failed || 0}</div>
                        </div>
                      </div>
                      <button onClick={() => deleteAutomation(a.id)} className="text-red-400/50 hover:text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors">
                        <Trash size={18} />
                      </button>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
          
          {/* Builder Form */}
          <div>
            {/* Step Indicators */}
            <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-4">
              {[
                { s: 1, title: "Trigger", icon: Instagram },
                { s: 2, title: "Conditions", icon: Filter }, 
                { s: 3, title: "Gate", icon: Users },
                { s: 4, title: "Delivery", icon: Link },
                { s: 5, title: "Follow Up", icon: Clock },
              ].map((stepData, i, arr) => (
                <div key={stepData.s} className="flex items-center">
                  <button 
                    onClick={() => setStep(stepData.s)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      step === stepData.s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-bold' : 
                      step > stepData.s ? 'bg-gray-800 text-indigo-400' : 'bg-transparent text-gray-500'
                    }`}
                  >
                    <stepData.icon size={16} />
                    <span className="whitespace-nowrap text-sm">{stepData.s}. {stepData.title}</span>
                  </button>
                  {i < arr.length - 1 && <div className="w-4 h-[2px] bg-gray-800 mx-2" />}
                </div>
              ))}
            </div>

            {/* Step 1: Trigger & Name */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-xl">
                  <h2 className="text-2xl font-bold mb-6">Campaign Basics</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">Campaign Name</label>
                      <input 
                        className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="e.g. Summer 2026 Ebook Giveaway" 
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">Select Trigger Post</label>
                      {posts.length === 0 ? (
                        <input 
                           className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white"
                           value={postId} onChange={e => setPostId(e.target.value)} placeholder="Enter Post ID" 
                        />
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                          {posts.map(p => (
                            <div 
                              key={p.id} 
                              onClick={() => setPostId(p.id)}
                              className={`aspect-square rounded-xl cursor-pointer relative overflow-hidden transition-all ${postId === p.id ? 'ring-4 ring-indigo-500 scale-[0.98]' : 'opacity-70 hover:opacity-100 hover:ring-2 ring-gray-700'}`}
                            >
                              {p.thumbnail || p.media_url ? (
                                <img src={p.thumbnail || p.media_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center p-2 text-center text-[10px] text-gray-400">
                                  {p.caption?.slice(0, 40) || 'Post'}
                                </div>
                              )}
                              {postId === p.id && (
                                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                                  <CheckCircle2 size={32} className="text-white drop-shadow-md" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button onClick={() => setStep(2)} className="bg-white text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                    Next Step <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Conditions */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-xl">
                  <h2 className="text-2xl font-bold mb-6">Trigger Conditions</h2>
                  
                  <div className="space-y-8">
                    {/* Trigger Type Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div 
                        onClick={() => setTriggerType('specific')}
                        className={`p-6 rounded-2xl border cursor-pointer transition-all ${triggerType === 'specific' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-black border-gray-800 hover:border-gray-700'}`}
                      >
                        <MessageSquare className={`mb-3 ${triggerType === 'specific' ? 'text-indigo-400' : 'text-gray-500'}`} />
                        <h3 className="font-bold mb-1">Specific Keywords</h3>
                        <p className="text-xs text-gray-500">Only trigger when comments contain exact words.</p>
                      </div>
                      <div 
                        onClick={() => setTriggerType('any')}
                        className={`p-6 rounded-2xl border cursor-pointer transition-all ${triggerType === 'any' ? 'bg-teal-500/10 border-teal-500' : 'bg-black border-gray-800 hover:border-gray-700'}`}
                      >
                        <Play className={`mb-3 ${triggerType === 'any' ? 'text-teal-400' : 'text-gray-500'}`} />
                        <h3 className="font-bold mb-1">Any Comment</h3>
                        <p className="text-xs text-gray-500">Trigger for every single comment on the post.</p>
                      </div>
                    </div>

                    {triggerType === 'specific' && (
                      <div className="bg-black p-6 rounded-2xl border border-gray-800">
                        <label className="block text-sm font-bold text-gray-400 mb-2">Trigger Keywords</label>
                        <input 
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white mb-3 focus:border-indigo-500 outline-none"
                          placeholder="Type keyword and press Enter (e.g. LINK, GUIDE)" 
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              const val = (e.target as HTMLInputElement).value.trim().toUpperCase();
                              if (val && !keywords.includes(val)) {
                                setKeywords([...keywords, val]);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }} 
                        />
                        <div className="flex flex-wrap gap-2">
                          {keywords.map(k => (
                            <span key={k} className="bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2">
                              {k} 
                              <button onClick={() => setKeywords(keywords.filter(x => x !== k))} className="hover:text-white"><Trash size={14}/></button>
                            </span>
                          ))}
                          {keywords.length === 0 && <span className="text-sm text-gray-600">No keywords added yet.</span>}
                        </div>
                      </div>
                    )}

                    {/* Public Reply */}
                    <div className="bg-black p-6 rounded-2xl border border-gray-800">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-bold text-gray-200">Public Comment Reply</h3>
                          <p className="text-sm text-gray-500 mt-1">Automatically like and reply to the user's public comment.</p>
                        </div>
                        <button 
                          onClick={() => setPublicReply(p => ({...p, enabled: !p.enabled}))}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${publicReply.enabled ? 'bg-teal-500' : 'bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${publicReply.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {publicReply.enabled && (
                        <input 
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-teal-500 outline-none"
                          value={publicReply.message}
                          onChange={e => setPublicReply({...publicReply, message: e.target.value})}
                          placeholder="e.g. Sending you a DM right now! 🚀"
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white px-4 py-2 font-medium">Back</button>
                  <button onClick={() => setStep(3)} className="bg-white text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                    Next Step <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Gate & Data Capture */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-xl">
                  <h2 className="text-2xl font-bold mb-6">Conversation Entry & Gates</h2>
                  
                  <div className="space-y-8">
                     {/* Initial DM Message */}
                     <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Opening Message</label>
                        <p className="text-xs text-gray-500 mb-3">This is the first DM the user will receive immediately after commenting.</p>
                        <textarea 
                          rows={4}
                          className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none resize-none"
                          value={openingMessage}
                          onChange={e => setOpeningMessage(e.target.value)}
                          placeholder="Hey! Thanks for commenting. Here is your resource..."
                        />
                     </div>

                     {/* Follow Gate */}
                     <div className="bg-black p-6 rounded-2xl border border-gray-800">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                           <div className="bg-indigo-500/20 p-3 rounded-xl text-indigo-400"><Users size={20} /></div>
                           <div>
                            <h3 className="font-bold text-gray-200">Follower Verification (Gate)</h3>
                            <p className="text-sm text-gray-500 mt-1">Require users to follow you before receiving the delivery message.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setFollowGate(p => ({...p, enabled: !p.enabled}))}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${followGate.enabled ? 'bg-indigo-500' : 'bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${followGate.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Email Capture */}
                    <div className="bg-black p-6 rounded-2xl border border-gray-800">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                           <div className="bg-pink-500/20 p-3 rounded-xl text-pink-400"><Mail size={20} /></div>
                           <div>
                            <h3 className="font-bold text-gray-200">Email Capture</h3>
                            <p className="text-sm text-gray-500 mt-1">Wait for the user to reply with an email address before sending the delivery.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setEmailCapture(p => ({...p, enabled: !p.enabled}))}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${emailCapture.enabled ? 'bg-pink-500' : 'bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${emailCapture.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      {emailCapture.enabled && (
                        <div className="mt-4 p-4 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                          <p className="text-xs text-pink-300 font-medium flex items-center gap-2">
                            <AlertCircle size={14} /> Tip: Ensure your "Opening Message" asks for their email!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white px-4 py-2 font-medium">Back</button>
                  <button onClick={() => setStep(4)} className="bg-white text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                    Next Step <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Delivery */}
            {step === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-xl">
                  <h2 className="text-2xl font-bold mb-6">Delivery Message</h2>
                  <p className="text-gray-400 mb-6 text-sm">This is sent {emailCapture.enabled || followGate.enabled ? 'AFTER the user passes the gates' : 'immediately with the Opening Message'}.</p>
                  
                  <div className="space-y-6">
                     <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Message Body</label>
                        <textarea 
                          rows={4}
                          className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none resize-none"
                          value={deliveryMessage}
                          onChange={e => setDeliveryMessage(e.target.value)}
                          placeholder="Awesome! Here is the link to download the guide..."
                        />
                     </div>

                     <div className="bg-black p-6 rounded-2xl border border-gray-800">
                        <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2"><Link size={18} /> CTA Button (Optional)</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-xs text-gray-500 mb-1">Button Label</label>
                             <input 
                               className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                               value={deliveryButton.label}
                               onChange={e => setDeliveryButton({...deliveryButton, label: e.target.value})}
                               placeholder="e.g. Download Now"
                             />
                          </div>
                          <div>
                             <label className="block text-xs text-gray-500 mb-1">URL Destination</label>
                             <input 
                               className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                               value={deliveryButton.url}
                               onChange={e => setDeliveryButton({...deliveryButton, url: e.target.value})}
                               placeholder="https://..."
                             />
                          </div>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep(3)} className="text-gray-400 hover:text-white px-4 py-2 font-medium">Back</button>
                  <button onClick={() => setStep(5)} className="bg-white text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors">
                    Next Step <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Follow Up & Save */}
            {step === 5 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-xl">
                  <h2 className="text-2xl font-bold mb-6">Follow Up (Optional)</h2>
                  
                  <div className="bg-black p-6 rounded-2xl border border-gray-800 mb-8">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex items-start gap-4">
                           <div className="bg-orange-500/20 p-3 rounded-xl text-orange-400"><Clock size={20} /></div>
                           <div>
                            <h3 className="font-bold text-gray-200">Scheduled Follow Up</h3>
                            <p className="text-sm text-gray-500 mt-1">Automatically send another message after a set time.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setFollowUp(p => ({...p, enabled: !p.enabled}))}
                          className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${followUp.enabled ? 'bg-orange-500' : 'bg-gray-700'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${followUp.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {followUp.enabled && (
                        <div className="space-y-4 pt-4 border-t border-gray-800">
                           <div>
                             <label className="block text-xs text-gray-500 mb-1">Delay (Hours)</label>
                             <input 
                               type="number"
                               className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                               value={followUp.delay_hours}
                               onChange={e => setFollowUp({...followUp, delay_hours: parseInt(e.target.value) || 24})}
                               min={1} max={168}
                             />
                           </div>
                           <div>
                              <label className="block text-xs text-gray-500 mb-1">Message Body</label>
                              <textarea 
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white resize-none"
                                value={followUp.message}
                                onChange={e => setFollowUp({...followUp, message: e.target.value})}
                                placeholder="Just checking in, did you find the guide helpful?"
                              />
                           </div>
                        </div>
                      )}
                  </div>

                  {/* Clean up option */}
                  <div className="bg-black/50 p-4 rounded-xl border border-gray-800/50 flex items-center justify-between">
                     <div>
                       <div className="font-semibold text-sm text-gray-300">Clean Inbox</div>
                       <div className="text-xs text-gray-500">Remove previous DMs from this user to keep inbox tidy.</div>
                     </div>
                     <button 
                        onClick={() => setRemovePrevDmData(!removePrevDmData)}
                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${removePrevDmData ? 'bg-red-500/80' : 'bg-gray-700'}`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${removePrevDmData ? 'left-[22px]' : 'left-[3px]'}`} />
                      </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <button onClick={() => setStep(4)} className="text-gray-400 hover:text-white px-4 py-2 font-medium">Back</button>
                  <button 
                    onClick={createAutomation} 
                    disabled={saving}
                    className="bg-gradient-to-r from-teal-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 text-white px-10 py-4 rounded-xl font-black text-lg flex items-center gap-3 shadow-xl shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {saving ? 'Deploying Campaign...' : 'Launch Campaign 🚀'}
                  </button>
                </div>
              </motion.div>
            )}

          </div>

          {/* Live Preview Panel */}
          <div className="hidden lg:block relative">
            <div className="sticky top-8">
              <h3 className="text-center font-bold text-gray-500 mb-4 tracking-widest text-xs uppercase">Live Preview</h3>
              <PhonePreview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Temporary Lucide Icon substitute since lucide-react might not export Filter
const Filter = ({size=24, className=""}: {size?:number, className?:string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
);
