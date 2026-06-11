// src/pages/AiTools.jsx
// FundCo AI — Complete rebuild: clean layout, working streaming, task context, history
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Brain, Zap, Send, Loader2, Paperclip, Mic, MicOff, X, Copy, Check,
  Download, Trash2, Star, StarOff, History, ChevronLeft, ChevronRight,
  Plus, Search, RotateCcw, Home, Leaf, BatteryCharging, DollarSign,
  FileText, List, Clock, Mail, FileSearch, Lightbulb, BarChart,
  Users, Cpu, Calendar, Globe, Calculator, Shield, PlugZap, Sprout,
  AlertCircle, TrendingUp, BookOpen, ChevronDown, ChevronUp,
  LayoutGrid, MessageSquare, Settings2,
} from 'lucide-react';
import { format } from 'date-fns';

const API = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ── Tool catalog ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'general', label: 'General', icon: Brain, color: '#312783',
    tools: [
      { id:'general',          name:'FundCo AI',          icon:Brain,       desc:'Ask anything FundCo-related' },
      { id:'report-generator', name:'Report Generator',    icon:FileText,    desc:'Generate progress reports' },
      { id:'task-prioritizer', name:'Task Prioritizer',    icon:List,        desc:'Rank tasks by priority' },
      { id:'effort-estimator', name:'Effort Estimator',    icon:Clock,       desc:'Estimate time & resources' },
      { id:'task-breaker',     name:'Task Breakdown',      icon:Zap,         desc:'Decompose complex tasks' },
      { id:'email-writer',     name:'Email Writer',        icon:Mail,        desc:'Draft professional emails' },
      { id:'summary-generator',name:'Summariser',          icon:FileSearch,  desc:'Summarise any content' },
      { id:'brainstormer',     name:'Brainstormer',        icon:Lightbulb,   desc:'Generate creative ideas' },
      { id:'document-analyzer',name:'Document Analyser',   icon:BookOpen,    desc:'Analyse files & documents' },
    ],
  },
  {
    id: 'clean-energy', label: 'Clean Energy', icon: Zap, color: '#059669',
    tools: [
      { id:'mini-grid-planner',       name:'Mini-Grid Planner',       icon:Zap,        desc:'Plan solar mini-grids' },
      { id:'lcoe-calculator',         name:'LCOE Calculator',         icon:Calculator, desc:'Calculate energy costs' },
      { id:'ppa-drafter',             name:'PPA Drafter',             icon:FileText,   desc:'Draft power agreements' },
      { id:'carbon-credit-estimator', name:'Carbon Credits',          icon:Leaf,       desc:'Estimate CO₂ credits' },
      { id:'procurement-advisor',     name:'Procurement Advisor',     icon:Globe,      desc:'Supplier & RFQ guidance' },
      { id:'boq-generator',           name:'BoQ Generator',           icon:List,       desc:'Bill of Quantities' },
    ],
  },
  {
    id: 'housing', label: 'Housing (HSF)', icon: Home, color: '#d97706',
    tools: [
      { id:'mortgage-simulator',    name:'Mortgage Simulator',    icon:Home,       desc:'Simulate HSF mortgages' },
      { id:'property-valuator',     name:'Property Valuator',     icon:DollarSign, desc:'Value properties' },
      { id:'green-building-assessor',name:'Green Building',       icon:Shield,     desc:'Sustainability assessment' },
      { id:'contract-drafter',      name:'Contract Drafter',      icon:FileText,   desc:'Draft legal agreements' },
    ],
  },
  {
    id: 'agriculture', label: 'Agriculture', icon: Leaf, color: '#16a34a',
    tools: [
      { id:'crop-yield-predictor', name:'Crop Yield Predictor', icon:Sprout,     desc:'Predict harvest yields' },
      { id:'pue-optimizer',        name:'PuE Optimiser',        icon:Cpu,        desc:'Optimise productive energy use' },
    ],
  },
  {
    id: 'e-mobility', label: 'E-Mobility', icon: BatteryCharging, color: '#36a9e1',
    tools: [
      { id:'ev-infrastructure-planner', name:'EV Infrastructure',   icon:BatteryCharging, desc:'Plan EV stations' },
    ],
  },
  {
    id: 'finance-esg', label: 'Finance & ESG', icon: DollarSign, color: '#7c3aed',
    tools: [
      { id:'portfolio-risk-analyzer', name:'Portfolio Risk',       icon:BarChart,    desc:'Analyse investment risk' },
      { id:'esg-compliance-checker',  name:'ESG Compliance',       icon:Shield,      desc:'Check ESG compliance' },
      { id:'investment-forecaster',   name:'Investment Forecast',   icon:TrendingUp,  desc:'Forecast ROI & returns' },
      { id:'financial-structurer',    name:'Financial Structurer',  icon:DollarSign,  desc:'Structure financing' },
      { id:'sdg-impact-analyzer',     name:'SDG Impact',            icon:Globe,       desc:'SDG alignment analysis' },
    ],
  },
];

// Flat tool lookup — legacy aliases keep old history entries readable
const ALL_TOOLS   = CATEGORIES.flatMap(c => c.tools.map(t => ({ ...t, categoryId: c.id, categoryColor: c.color })));
const TOOL_MAP    = Object.fromEntries(ALL_TOOLS.map(t => [t.id, t]));
// Legacy aliases: old routes set toolId differently (e.g. 'general-ai' not 'general')
const LEGACY_NAMES = {
  'general-ai': 'FundCo AI', 'performance-analyzer': 'Performance Analyser',
  'research-assistant': 'Research Assistant', 'reminder-optimizer': 'Reminder Optimiser',
  'goal-planner': 'Goal Planner', 'team-collaborator': 'Team Collaborator',
  'automation-builder': 'Automation Builder', 'calendar-optimizer': 'Calendar Optimiser',
  'ai-orchestrator': 'AI Orchestrator', 'knowledge-base-query': 'Knowledge Base',
  'term-definer': 'Term Definer', 'sop-query': 'SOP Query',
  'unit-responsibility-query': 'Unit Responsibilities',
  'team-profile-query': 'Team Profiles',
  'learning-resource-recommender': 'Learning Recommender',
  'site-surveyor': 'Site Surveyor', 'installation-simulator': 'Installation Simulator',
  'o-m-planner': 'O&M Planner', 'green-kiosk-planner': 'Green Kiosk Planner',
  'agro-processing-simulator': 'Agro-Processing', 'bsf-farming-simulator': 'BSF Farming',
  'waste-management-optimizer': 'Waste Management', 'needs-assessment-tool': 'Needs Assessment',
  'battery-swap-optimizer': 'Battery Swap', 'ev-swap-sop-simulator': 'EV Swap SOP',
  'risk-mitigator': 'Risk Mitigator', 'impact-measurer': 'Impact Measurer',
  'grant-applier': 'Grant Applier', 'partner-matcher': 'Partner Matcher',
  'kyc-assessor': 'KYC Assessor', 'credit-evaluator': 'Credit Evaluator',
  'financial-proposal-drafter': 'Financial Proposal', 'portfolio-monitor': 'Portfolio Monitor',
  'climate-risk-assessor': 'Climate Risk', 'community-engager': 'Community Engager',
  'sustainability-reporter': 'Sustainability Reporter', 'training-simulator': 'Training Simulator',
  'oem-selector': 'OEM Selector',
};
Object.entries(LEGACY_NAMES).forEach(([id, name]) => {
  if (!TOOL_MAP[id]) TOOL_MAP[id] = { id, name };
});
// All tool IDs belonging to this section — scopes history queries.
// Also includes legacy IDs from the old route system (toolId was set
// differently before the rebuild) so existing history is not lost.
const LEGACY_TOOL_IDS = ['general-ai', 'general', 'report-generator', 'task-prioritizer',
  'effort-estimator', 'task-breaker', 'email-writer', 'summary-generator', 'brainstormer',
  'performance-analyzer', 'research-assistant', 'reminder-optimizer', 'goal-planner',
  'team-collaborator', 'document-analyzer', 'automation-builder', 'calendar-optimizer',
  'ai-orchestrator', 'knowledge-base-query', 'term-definer', 'sop-query',
  'unit-responsibility-query', 'team-profile-query', 'learning-resource-recommender',
  'mini-grid-planner', 'lcoe-calculator', 'ppa-drafter', 'carbon-credit-estimator',
  'site-surveyor', 'installation-simulator', 'o-m-planner', 'green-kiosk-planner',
  'mortgage-simulator', 'property-valuator', 'green-building-assessor', 'boq-generator',
  'crop-yield-predictor', 'pue-optimizer', 'agro-processing-simulator',
  'bsf-farming-simulator', 'waste-management-optimizer', 'needs-assessment-tool',
  'ev-infrastructure-planner', 'battery-swap-optimizer', 'ev-swap-sop-simulator',
  'portfolio-risk-analyzer', 'esg-compliance-checker', 'investment-forecaster',
  'financial-structurer', 'risk-mitigator', 'impact-measurer', 'grant-applier',
  'partner-matcher', 'kyc-assessor', 'credit-evaluator', 'financial-proposal-drafter',
  'contract-drafter', 'portfolio-monitor', 'sdg-impact-analyzer', 'climate-risk-assessor',
  'procurement-advisor', 'community-engager', 'sustainability-reporter',
  'training-simulator', 'oem-selector',
];
const AI_TOOL_IDS = [...new Set([...ALL_TOOLS.map(t => t.id), ...LEGACY_TOOL_IDS])];

// ── Helper: stream SSE ────────────────────────────────────────────────────────
const streamChat = async ({ messages, toolId, chatId, taskContext, files, onDelta, onDone, onError }) => {
  const token = localStorage.getItem('token');
  let body;
  const headers = { Authorization: `Bearer ${token}` };

  if (files?.length) {
    const fd = new FormData();
    fd.append('messages',    JSON.stringify(messages));
    fd.append('toolId',      toolId);
    if (chatId)      fd.append('chatId',      chatId);
    if (taskContext) fd.append('taskContext',  JSON.stringify(taskContext));
    files.forEach(f => fd.append('files', f));
    body = fd;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ messages, toolId, chatId, taskContext });
  }

  const resp = await fetch(`${API}/api/grok/chat`, { method: 'POST', headers, body });
  if (!resp.ok) throw new Error('Network error');

  const reader  = resp.body.getReader();
  const decoder = new TextDecoder();
  let meta = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.content) onDelta(parsed.content);
        if (parsed.error)   onError(parsed.error);
        if (parsed.chatId)  meta = { chatId: parsed.chatId, title: parsed.title, summary: parsed.summary };
      } catch {}
    }
  }
  onDone(meta);
};

// ── Small components ──────────────────────────────────────────────────────────
const ToolIcon = ({ tool, size = 5, style = {} }) => {
  const Icon = tool?.icon || Brain;
  return <Icon className={`w-${size} h-${size}`} style={style} />;
};

const Spinner = () => <Loader2 className="w-4 h-4 animate-spin" />;

const CopyBtn = ({ text }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
      {done ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// ── Task context builder ──────────────────────────────────────────────────────
const buildTaskContext = (tasks) => (tasks || []).slice(0, 60).map(t => ({
  id:        t._id,
  title:     t.title,
  completed: t.completed,
  priority:  t.priority || 'medium',
  dueDate:   t.dueDate ? format(new Date(t.dueDate), 'dd MMM yyyy') : null,
  checklist: (t.checklist || []).map(c => ({ item: c.item, done: c.completed })),
}));

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ msg, isStreaming }) => {
  const isUser = msg.role === 'user';
  const text   = typeof msg.content === 'string' ? msg.content
    : Array.isArray(msg.content) ? msg.content.filter(p => p.type === 'text').map(p => p.text).join('\n') : '';
  const images = Array.isArray(msg.content)
    ? msg.content.filter(p => p.type === 'image_url').map(p => p.image_url?.url)
    : [];

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1`}
        style={{ backgroundColor: isUser ? 'var(--brand-accent)' : 'var(--brand-primary)' }}>
        {isUser ? 'Y' : 'AI'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {images.map((src, i) => (
          <img key={i} src={src} alt="attached" className="max-w-xs rounded-xl mb-1 border"
            style={{ borderColor: 'var(--border-color)' }} />
        ))}
        {text && (
          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            style={{
              backgroundColor: isUser ? 'var(--brand-primary)' : 'var(--bg-subtle)',
              color: isUser ? '#fff' : 'var(--text-primary)',
            }}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{text}</p>
            ) : (
              <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                {isStreaming && <span className="inline-block w-2 h-4 ml-0.5 bg-current animate-pulse rounded-sm" />}
              </div>
            )}
          </div>
        )}
        {!isUser && text && !isStreaming && <CopyBtn text={text} />}
      </div>
    </div>
  );
};

// ── Chat panel ────────────────────────────────────────────────────────────────
const ChatPanel = ({ tool, tasks, chatId, onChatCreated }) => {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [files,      setFiles]      = useState([]);
  const [streaming,  setStreaming]  = useState(false);
  const [listening,  setListening]  = useState(false);
  const [currentChatId, setCurrentChatId] = useState(chatId || null);
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);
  const recogRef  = useRef(null);

  // Load existing chat
  useEffect(() => {
    setMessages([]);
    setCurrentChatId(chatId || null);
    if (chatId) {
      axios.get(`${API}/api/grok/history/${chatId}`, { headers: authHeaders() })
        .then(r => setMessages(r.data.chat?.messages || []))
        .catch(() => {});
    }
  }, [chatId, tool.id]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const taskCtx = useMemo(() => buildTaskContext(tasks), [tasks]);

  const send = async () => {
    const text = input.trim();
    if (!text && !files.length) return;

    const userMsg = { role: 'user', content: text };
    const outgoing = [...messages, userMsg];
    setMessages(outgoing);
    setInput('');

    const tempId = Date.now();
    setMessages(prev => [...prev, { role: 'assistant', content: '', _tempId: tempId }]);
    setStreaming(true);

    try {
      await streamChat({
        messages:    outgoing,
        toolId:      tool.id,
        chatId:      currentChatId,
        taskContext: taskCtx,
        files,
        onDelta: (delta) => {
          setMessages(prev => prev.map(m =>
            m._tempId === tempId ? { ...m, content: m.content + delta } : m
          ));
        },
        onDone: (meta) => {
          if (meta.chatId && !currentChatId) {
            setCurrentChatId(meta.chatId);
            onChatCreated?.(meta);
          }
          setMessages(prev => prev.map(m => m._tempId === tempId ? { ...m, _tempId: undefined } : m));
          setFiles([]);
        },
        onError: (err) => {
          toast.error(err);
          setMessages(prev => prev.filter(m => m._tempId !== tempId));
        },
      });
    } catch (e) {
      toast.error('Failed to connect to FundCo AI');
      setMessages(prev => prev.filter(m => m._tempId !== tempId));
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Voice input
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported in this browser'); return; }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.onresult = e => {
      setInput(prev => prev + (prev ? ' ' : '') + e.results[0][0].transcript);
      setListening(false);
    };
    r.onerror = () => { toast.error('Voice error'); setListening(false); };
    r.onend = () => setListening(false);
    recogRef.current = r;
    r.start();
    setListening(true);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setFiles([]);
  };

  const downloadChat = () => {
    const text = messages.map(m => `**${m.role === 'user' ? 'You' : 'FundCo AI'}:**\n${typeof m.content === 'string' ? m.content : '[file]'}`).join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = `${tool.name}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: tool.categoryColor || 'var(--brand-primary)' }}>
            <ToolIcon tool={tool} size={4} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tool.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tool.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isEmpty && <button onClick={downloadChat} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Download className="w-4 h-4" />
          </button>}
          {!isEmpty && <button onClick={clearChat} className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <RotateCcw className="w-4 h-4" />
          </button>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white"
              style={{ backgroundColor: tool.categoryColor || 'var(--brand-primary)' }}>
              <ToolIcon tool={tool} size={8} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{tool.name}</h3>
              <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--text-secondary)' }}>{tool.desc}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {getStarterPrompts(tool.id).map((p, i) => (
                <button key={i} onClick={() => { setInput(p); }}
                  className="text-left px-4 py-2.5 rounded-xl border text-sm transition-all"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
                <MessageBubble msg={msg} isStreaming={streaming && i === messages.length - 1 && msg.role === 'assistant'} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      {files.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <Paperclip className="w-3 h-3" />
              <span className="truncate max-w-32">{f.name}</span>
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{ color: '#dc2626' }}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex items-end gap-2 p-2 rounded-2xl border transition-colors"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          {/* Attach */}
          <button onClick={() => fileRef.current?.click()}
            className="p-2 rounded-xl transition-colors flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" multiple className="hidden"
            onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files)])} />

          {/* Textarea */}
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${tool.name}…`}
            rows={1}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              backgroundColor: 'transparent', color: 'var(--text-primary)',
              fontSize: 14, lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
          />

          {/* Voice */}
          <button onClick={toggleVoice}
            className="p-2 rounded-xl transition-colors flex-shrink-0"
            style={{ color: listening ? '#dc2626' : 'var(--text-muted)', backgroundColor: listening ? 'rgba(220,38,38,.1)' : 'transparent' }}
            onMouseEnter={e => { if (!listening) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!listening) e.currentTarget.style.backgroundColor = 'transparent'; }}>
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send */}
          <button onClick={send} disabled={streaming || (!input.trim() && !files.length)}
            className="p-2 rounded-xl text-white flex-shrink-0 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {streaming ? <Spinner /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Enter to send · Shift+Enter for new line · {tasks?.length || 0} tasks in context
        </p>
      </div>
    </div>
  );
};

// ── Starter prompts per tool ─────────────────────────────────────────────────
const getStarterPrompts = (toolId) => {
  const MAP = {
    'general':             ['What are FundCo\'s main investment sectors?', 'Summarise my pending tasks', 'What does LCOE mean in FundCo context?'],
    'report-generator':    ['Generate my weekly progress report', 'Write a formal daily report on my tasks', 'Summarise this week\'s completed work'],
    'task-prioritizer':    ['Prioritise all my current tasks', 'Which tasks are most urgent this week?', 'Apply Eisenhower matrix to my tasks'],
    'effort-estimator':    ['Estimate effort to complete a mini-grid site survey', 'How long will a full KYC onboarding take?', 'Break down time needed for a BoQ'],
    'task-breaker':        ['Break down: Install 50kWp solar PV system', 'Decompose: Client onboarding process', 'Sub-tasks for: Procurement and logistics SOP'],
    'email-writer':        ['Write email to client about PPA signing', 'Draft follow-up email after site visit', 'Write professional proposal email'],
    'summary-generator':   ['Summarise my tasks for today', 'Create a summary of this week\'s activities', 'Summarise this document [attach file]'],
    'brainstormer':        ['Ideas to improve mini-grid customer engagement', 'New revenue streams for Agronomie PuE', 'Creative marketing for GroSolar SaaS'],
    'document-analyzer':   ['Analyse this BoQ [attach file]', 'Review this contract for risks', 'Extract key terms from this SOP'],
    'mini-grid-planner':   ['Plan a 100kWp mini-grid for a rural community', 'What\'s required for a site survey?', 'Generate a mini-grid BoQ estimate'],
    'lcoe-calculator':     ['Calculate LCOE for a 500kWp solar project', 'Compare solar vs diesel for a mini-grid', 'What CAPEX factors affect LCOE?'],
    'ppa-drafter':         ['Draft a PPA for a 200kWh daily consumption site', 'What should a FundCo PPA include?', 'Draft PPA for GroSolar SaaS customer'],
    'mortgage-simulator':  ['Simulate a 15-year HSF mortgage at 12% interest', 'What\'s the monthly payment for ₦5M loan?', 'Model a green bond-backed mortgage'],
    'portfolio-risk-analyzer': ['Analyse FX risk in current portfolio', 'What ESG risks should I flag?', 'Run a stress test on infrastructure assets'],
    'esg-compliance-checker':  ['Check IFC compliance for this project', 'What UN principles apply to mini-grids?', 'ESG checklist for new investment'],
    'sdg-impact-analyzer':     ['Map mini-grid project to SDGs', 'Which SDGs does Agronomie PuE support?', 'Measure SDG 7 impact of our portfolio'],
  };
  return MAP[toolId] || MAP['general'];
};

// ── History panel ─────────────────────────────────────────────────────────────
const HistoryPanel = ({ toolId, onResume, onClose }) => {
  const [chats,   setChats]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      // Only return chats whose toolId belongs to the AI Tools catalog
      // Other parts of the app (Training LMS, DeckPrep, Reports) use
      // toolIds like 'pdf-extractor', 'ppt-generator', 'report-generator'
      // via their own controllers — those should not appear here
      const r = await axios.get(`${API}/api/grok/history`, {
        headers: authHeaders(),
        params: { toolIds: AI_TOOL_IDS.join(','), limit: 100 },
      });
      setChats(r.data.histories || []);
    } catch { toast.error('Failed to load history'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleStar = async (e, chat) => {
    e.stopPropagation();
    await axios.put(`${API}/api/grok/history/${chat._id}`, { starred: !chat.starred }, { headers: authHeaders() });
    setChats(prev => prev.map(c => c._id === chat._id ? { ...c, starred: !c.starred } : c));
  };

  const del = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    await axios.delete(`${API}/api/grok/history/${chatId}`, { headers: authHeaders() });
    setChats(prev => prev.filter(c => c._id !== chatId));
  };

  const filtered = chats.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.summary?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.2 }}
      className="absolute inset-0 flex flex-col z-20 border-l"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Chat History</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text-primary)' }} />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y" style={{ divideColor: 'var(--border-color)' }}>
        {loading && <div className="flex justify-center py-8"><Spinner /></div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
          </div>
        )}
        {filtered.map(chat => (
          <div key={chat._id} onClick={() => onResume(chat)}
            className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{chat.title}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {chat.summary || '—'}
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {new Date(chat.updatedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                {chat.messageCount ? ` · ${chat.messageCount} messages` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={e => toggleStar(e, chat)} className="p-1 rounded opacity-0 group-hover:opacity-100">
                {chat.starred
                  ? <Star className="w-3.5 h-3.5" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                  : <Star className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
              </button>
              <button onClick={e => del(e, chat._id)} className="p-1 rounded opacity-0 group-hover:opacity-100" style={{ color: '#dc2626' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// ── Category nav pill ────────────────────────────────────────────────────────
const CategoryPill = ({ cat, isActive, onClick }) => (
  <button onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all"
    style={isActive
      ? { backgroundColor: cat.color, color: '#fff' }
      : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
    onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
    onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}>
    <cat.icon className="w-4 h-4" />
    {cat.label}
  </button>
);

// ── Tool card ────────────────────────────────────────────────────────────────
const ToolCard = ({ tool, isActive, onClick, cat }) => (
  <motion.button whileHover={{ y: -1 }} onClick={onClick}
    className="w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all"
    style={{
      backgroundColor: isActive ? (cat?.color ? `${cat.color}15` : 'var(--brand-light)') : 'var(--bg-surface)',
      borderColor: isActive ? (cat?.color || 'var(--brand-primary)') : 'var(--border-color)',
    }}>
    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
      style={{ backgroundColor: cat?.color || 'var(--brand-primary)' }}>
      <ToolIcon tool={tool} size={4.5} />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{tool.name}</p>
      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tool.desc}</p>
    </div>
    {isActive && <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: cat?.color || 'var(--brand-primary)' }} />}
  </motion.button>
);

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const AiTools = () => {
  const { user, tasks = [] } = useOutletContext();

  const [activeCategory, setActiveCategory] = useState('general');
  const [activeTool,     setActiveTool]     = useState(ALL_TOOLS[0]);
  const [activeChatId,   setActiveChatId]   = useState(null);
  const [showHistory,    setShowHistory]    = useState(false);
  const [searchTool,     setSearchTool]     = useState('');
  const [sidebarOpen,    setSidebarOpen]    = useState(true);

  const cat      = CATEGORIES.find(c => c.id === activeCategory);
  const catTools = cat?.tools || [];

  const filteredTools = useMemo(() => {
    if (!searchTool) return catTools;
    const q = searchTool.toLowerCase();
    return catTools.filter(t => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
  }, [catTools, searchTool]);

  // Search across ALL tools
  const allFiltered = useMemo(() => {
    if (!searchTool) return [];
    const q = searchTool.toLowerCase();
    return ALL_TOOLS.filter(t => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q));
  }, [searchTool]);

  const selectTool = (tool) => {
    setActiveTool(tool);
    setActiveChatId(null);
    setShowHistory(false);
  };

  const handleChatCreated = (meta) => {
    setActiveChatId(meta.chatId);
  };

  const handleResumeChat = (chat) => {
    const tool = TOOL_MAP[chat.toolId];
    if (tool) {
      setActiveTool({ ...tool, categoryColor: CATEGORIES.find(c => c.tools.some(t => t.id === tool.id))?.color });
      setActiveCategory(CATEGORIES.find(c => c.tools.some(t => t.id === tool.id))?.id || 'general');
    }
    setActiveChatId(chat._id);
    setShowHistory(false);
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      <Toaster position="top-right" />

      {/* ── Left sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r flex flex-col overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>

            {/* Sidebar header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b"
              style={{ borderColor: 'var(--border-color)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}>
                <Brain className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>FundCo AI</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ALL_TOOLS.length} tools · {tasks.length} tasks loaded</p>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input value={searchTool} onChange={e => setSearchTool(e.target.value)}
                  placeholder="Search tools…"
                  className="flex-1 bg-transparent text-xs focus:outline-none"
                  style={{ color: 'var(--text-primary)' }} />
                {searchTool && <button onClick={() => setSearchTool('')} style={{ color: 'var(--text-muted)' }}><X className="w-3 h-3" /></button>}
              </div>
            </div>

            {/* Category tabs */}
            {!searchTool && (
              <div className="px-3 pt-3 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Categories</p>
                <div className="space-y-0.5">
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => { setActiveCategory(c.id); setSearchTool(''); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-all"
                      style={activeCategory === c.id
                        ? { backgroundColor: `${c.color}15`, color: c.color, fontWeight: 700 }
                        : { color: 'var(--text-secondary)' }}
                      onMouseEnter={e => { if (activeCategory !== c.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (activeCategory !== c.id) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <c.icon className="w-4 h-4 flex-shrink-0" style={{ color: c.color }} />
                      <span className="flex-1">{c.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                        {c.tools.length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tools list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {searchTool && allFiltered.length > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2 mt-2" style={{ color: 'var(--text-muted)' }}>Results</p>
              )}
              <div className="space-y-1">
                {(searchTool ? allFiltered : filteredTools).map(tool => {
                  const toolCat = CATEGORIES.find(c => c.tools.some(t => t.id === tool.id));
                  return (
                    <button key={tool.id} onClick={() => selectTool({ ...tool, categoryColor: toolCat?.color })}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={activeTool.id === tool.id
                        ? { backgroundColor: `${toolCat?.color || 'var(--brand-primary)'}15`, fontWeight: 700 }
                        : {}}
                      onMouseEnter={e => { if (activeTool.id !== tool.id) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (activeTool.id !== tool.id) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                        style={{ backgroundColor: toolCat?.color || 'var(--brand-primary)' }}>
                        <ToolIcon tool={tool} size={3.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: activeTool.id === tool.id ? (toolCat?.color || 'var(--brand-primary)') : 'var(--text-primary)' }}>
                          {tool.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* History button */}
            <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => setShowHistory(p => !p)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ backgroundColor: showHistory ? 'var(--brand-light)' : 'var(--bg-subtle)', color: showHistory ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
                <History className="w-4 h-4" />
                Chat History
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Toggle sidebar button */}
        <button onClick={() => setSidebarOpen(p => !p)}
          className="absolute top-3 left-3 z-10 w-7 h-7 rounded-lg flex items-center justify-center border transition-all"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}>
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Chat + history area */}
        <div className="flex-1 overflow-hidden relative">
          <ChatPanel
            key={`${activeTool.id}-${activeChatId}`}
            tool={activeTool}
            tasks={tasks}
            chatId={activeChatId}
            onChatCreated={handleChatCreated}
          />
          <AnimatePresence>
            {showHistory && (
              <HistoryPanel
                toolId={activeTool.id}
                onResume={handleResumeChat}
                onClose={() => setShowHistory(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AiTools;