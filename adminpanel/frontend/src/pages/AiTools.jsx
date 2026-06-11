// src/pages/AiTools.jsx
// FundCo AI Complete rebuild: clean layout, working streaming, task context, history
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
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

const API = import.meta.env.VITE_USER_API_URL || 'http://127.0.0.1:4001';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken')}` });
const WORKSPACE_SCOPE = 'admin';

// Tool catalog
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
      { id:'carbon-credit-estimator', name:'Carbon Credits',          icon:Leaf,       desc:'Estimate CO2 credits' },
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

// Flat tool lookup legacy aliases keep old history entries readable
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
// All tool IDs belonging to this section scopes history queries.
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
const AI_TOOLS_SESSION_KEY = 'fundco-admin-ai-tools-session-v1';

const readAiToolsSession = () => {
  try {
    const raw = localStorage.getItem(AI_TOOLS_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeAiToolsSession = (value) => {
  try {
    localStorage.setItem(AI_TOOLS_SESSION_KEY, JSON.stringify(value));
  } catch {
    // ignore local persistence failures
  }
};

const buildConversationCacheKey = (workspace, userId) =>
  `fundco-ai-history-${workspace}-${userId || 'anonymous'}`;

const readConversationCache = (cacheKey) => {
  if (!cacheKey) return [];
  try {
    const raw = localStorage.getItem(cacheKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeConversationCache = (cacheKey, records) => {
  if (!cacheKey) return;
  try {
    localStorage.setItem(cacheKey, JSON.stringify(records));
  } catch {
    // ignore local persistence failures
  }
};

const LOCAL_CHAT_PREFIX = 'local-';

const createLocalConversationId = () =>
  `${LOCAL_CHAT_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isLocalConversationId = (value) =>
  typeof value === 'string' && value.startsWith(LOCAL_CHAT_PREFIX);

const getServerConversationId = (chat) => {
  const candidates = [chat?.serverId, chat?.chatId, chat?._id];
  return candidates.find((value) => value && !isLocalConversationId(value)) || null;
};

const getLocalConversationId = (chat) => {
  const candidates = [chat?.localId, chat?._id, chat?.chatId];
  return candidates.find((value) => value && isLocalConversationId(value)) || null;
};

const getConversationId = (chat) =>
  getServerConversationId(chat) || getLocalConversationId(chat) || null;

const normaliseConversationRecord = (chat) => {
  if (!chat) return null;
  const serverId = getServerConversationId(chat);
  const localId = getLocalConversationId(chat) || chat?.localId || null;
  const resolvedId = serverId || localId || chat?._id || chat?.chatId || null;
  if (!resolvedId) return null;
  return {
    ...chat,
    _id: resolvedId,
    chatId: serverId || null,
    serverId: serverId || null,
    localId: localId || (serverId ? null : resolvedId),
    localOnly: !serverId,
    updatedAt: chat.updatedAt || new Date().toISOString(),
    messageCount: Number(chat.messageCount || chat.messages?.length || 0),
    messages: Array.isArray(chat.messages) ? chat.messages : chat.messages === undefined ? undefined : [],
  };
};

const sameConversation = (left, right) => {
  const a = normaliseConversationRecord(left);
  const b = normaliseConversationRecord(right);
  if (!a || !b) return false;
  if (a.serverId && b.serverId) return a.serverId === b.serverId;
  if (a.localId && b.localId) return a.localId === b.localId;
  if (a.serverId && b._id) return a.serverId === b._id;
  if (b.serverId && a._id) return b.serverId === a._id;
  return a._id === b._id;
};

const buildConversationTitle = (input, fallback = 'FundCo AI Chat') => {
  const cleaned = String(input || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  const firstSentence = cleaned.split(/[.!?]/)[0].trim();
  const short = (firstSentence || cleaned).slice(0, 52).trim();
  return short.length < cleaned.length ? `${short}...` : short;
};

const mergeConversationLists = (serverChats = [], localChats = []) => {
  const merged = [];
  [...localChats, ...serverChats].forEach((rawChat) => {
    const chat = normaliseConversationRecord(rawChat);
    if (!chat) return;
    const existingIndex = merged.findIndex((entry) => sameConversation(entry, chat));
    if (existingIndex === -1) {
      merged.push(chat);
      return;
    }
    const previous = merged[existingIndex];
    merged[existingIndex] = normaliseConversationRecord({
      ...previous,
      ...chat,
      _id: chat.serverId || previous.serverId || previous._id || chat._id,
      serverId: chat.serverId || previous.serverId || null,
      localId: previous.localId || chat.localId || null,
      localOnly: !(chat.serverId || previous.serverId),
      updatedAt: chat.updatedAt || previous.updatedAt || new Date().toISOString(),
      messages: Array.isArray(chat.messages) ? chat.messages : previous.messages,
    });
  });
  return merged.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
};

const upsertConversationRecord = (records, incoming) => {
  const normalizedIncoming = normaliseConversationRecord(incoming);
  if (!normalizedIncoming) return records;
  return mergeConversationLists([normalizedIncoming], records);
};

const formatToolLabel = (toolId) => String(toolId || '')
  .split(/[-_]/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

const getToolWithCategory = (toolId) => {
  const matchedTool = ALL_TOOLS.find((tool) => tool.id === toolId) || TOOL_MAP[toolId] || {
    id: toolId || ALL_TOOLS[0]?.id || 'general',
    name: LEGACY_NAMES[toolId] || formatToolLabel(toolId) || ALL_TOOLS[0]?.name || 'FundCo AI',
    icon: Brain,
    desc: 'AI conversation',
    categoryColor: CATEGORIES[0]?.color || '#312783',
  };
  const matchedCategory = CATEGORIES.find((category) => category.tools.some((tool) => tool.id === matchedTool.id)) || CATEGORIES[0];
  return {
    tool: { ...matchedTool, categoryColor: matchedCategory?.color || matchedTool.categoryColor || CATEGORIES[0]?.color },
    categoryId: matchedCategory?.id || 'general',
  };
};

// Helper: stream SSE
const streamChat = async ({ messages, toolId, chatId, taskContext, files, onDelta, onDone, onError }) => {
  const token = localStorage.getItem('adminToken');
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
  if (!resp.body) throw new Error('No response stream available');

  const reader  = resp.body.getReader();
  const decoder = new TextDecoder();
  let meta = {};
  let buffer = '';

  const consumeEvent = (eventBlock) => {
    eventBlock
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        if (!line.startsWith('data:')) return;
        const raw = line.slice(5).trim();
        if (!raw || raw === '[DONE]') return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.content) onDelta(parsed.content);
          if (parsed.error) onError(parsed.error);
          if (parsed.chatId) {
            meta = {
              chatId: parsed.chatId,
              title: parsed.title,
              summary: parsed.summary,
            };
          }
        } catch {
          // ignore malformed partial events
        }
      });
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const eventBlock = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      if (eventBlock) consumeEvent(eventBlock);
      boundary = buffer.indexOf('\n\n');
    }

    if (done) break;
  }

  if (buffer.trim()) consumeEvent(buffer.trim());
  onDone(meta);
};

// Small components
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

// Task context builder
const buildTaskContext = (tasks) => (tasks || []).slice(0, 60).map(t => ({
  id:        t._id,
  title:     t.title,
  completed: t.completed,
  priority:  t.priority || 'medium',
  dueDate:   t.dueDate ? format(new Date(t.dueDate), 'dd MMM yyyy') : null,
  checklist: (t.checklist || []).map(c => ({ item: c.item, done: c.completed })),
}));

// Message bubble
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

// Chat panel
const ChatPanel = ({ tool, tasks, chatId, cachedChat, onChatCreated, onHistoryChanged, onResetChat }) => {
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
    const serverChatId = getServerConversationId(cachedChat) || (chatId && !isLocalConversationId(chatId) ? chatId : null);
    const cachedMessages = Array.isArray(cachedChat?.messages) ? cachedChat.messages : [];
    setMessages(cachedMessages);
    setCurrentChatId(serverChatId || null);
    if (serverChatId) {
      axios.get(`${API}/api/grok/history/${serverChatId}`, { headers: authHeaders() })
        .then((r) => {
          const loadedChat = r.data.chat || {};
          setMessages(loadedChat.messages || []);
          onHistoryChanged?.({
            ...cachedChat,
            ...loadedChat,
            _id: loadedChat._id || serverChatId,
            updatedAt: loadedChat.updatedAt || new Date().toISOString(),
          });
        })
        .catch(() => {});
    }
  }, [chatId, cachedChat, tool.id, onHistoryChanged]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const taskCtx = useMemo(() => buildTaskContext(tasks), [tasks]);

  const send = async () => {
    const text = input.trim();
    if (!text && !files.length) return;

    const userMsg = { role: 'user', content: text };
    const outgoing = [...messages, userMsg];
    const localConversationId =
      getLocalConversationId(cachedChat) ||
      (chatId && isLocalConversationId(chatId) ? chatId : null) ||
      createLocalConversationId();
    const serverConversationId = currentChatId || getServerConversationId(cachedChat) || null;
    const draftRecord = normaliseConversationRecord({
      _id: serverConversationId || localConversationId,
      chatId: serverConversationId || null,
      serverId: serverConversationId || null,
      localId: localConversationId,
      toolId: tool.id,
      title: cachedChat?.title || buildConversationTitle(text, tool.name),
      summary: cachedChat?.summary || text.slice(0, 160),
      updatedAt: new Date().toISOString(),
      messageCount: outgoing.length + 1,
      messages: [...outgoing, { role: 'assistant', content: '' }],
      starred: cachedChat?.starred || false,
    });
    setMessages(outgoing);
    setInput('');
    onHistoryChanged?.(draftRecord);

    const tempId = Date.now();
    setMessages(prev => [...prev, { role: 'assistant', content: '', _tempId: tempId }]);
    setStreaming(true);
    let assistantContent = '';

    try {
      await streamChat({
        messages:    outgoing,
        toolId:      tool.id,
        chatId:      serverConversationId,
        taskContext: taskCtx,
        files,
        onDelta: (delta) => {
          assistantContent += delta;
          setMessages(prev => prev.map(m =>
            m._tempId === tempId ? { ...m, content: m.content + delta } : m
          ));
        },
        onDone: (meta) => {
          const persistedChatId = meta.chatId || serverConversationId || null;
          const completedMessages = [...outgoing, { role: 'assistant', content: assistantContent }];
          const finalRecord = normaliseConversationRecord({
            ...draftRecord,
            _id: persistedChatId || localConversationId,
            chatId: persistedChatId,
            serverId: persistedChatId,
            localId: localConversationId,
            localOnly: !persistedChatId,
            toolId: tool.id,
            title: meta.title || draftRecord?.title || cachedChat?.title || tool.name,
            summary: meta.summary || draftRecord?.summary || assistantContent.slice(0, 160) || text.slice(0, 160),
            updatedAt: new Date().toISOString(),
            messageCount: completedMessages.length,
            messages: completedMessages,
            starred: cachedChat?.starred || false,
          });
          if (persistedChatId && persistedChatId !== currentChatId) {
            setCurrentChatId(persistedChatId);
            onChatCreated?.(finalRecord);
          } else if (!currentChatId && !persistedChatId) {
            onChatCreated?.(finalRecord);
          }
          setMessages(completedMessages);
          onHistoryChanged?.(finalRecord);
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
    onResetChat?.();
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
            placeholder={`Ask ${tool.name}...`}
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

// Starter prompts per tool
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
    'mortgage-simulator':  ['Simulate a 15-year HSF mortgage at 12% interest', 'What\'s the monthly payment for NGN 5M loan?', 'Model a green bond-backed mortgage'],
    'portfolio-risk-analyzer': ['Analyse FX risk in current portfolio', 'What ESG risks should I flag?', 'Run a stress test on infrastructure assets'],
    'esg-compliance-checker':  ['Check IFC compliance for this project', 'What UN principles apply to mini-grids?', 'ESG checklist for new investment'],
    'sdg-impact-analyzer':     ['Map mini-grid project to SDGs', 'Which SDGs does Agronomie PuE support?', 'Measure SDG 7 impact of our portfolio'],
  };
  return MAP[toolId] || MAP['general'];
};

// History workspace
const HistoryWorkspace = ({ activeTool, chats, loading, onRefresh, onResume, onClose, onToggleStar, onDelete }) => {
  const [search,  setSearch]  = useState('');
  const [scope,   setScope]   = useState('all');

  const decoratedChats = useMemo(() => chats.map((chat) => {
    const resolved = getToolWithCategory(chat.toolId);
    return {
      ...chat,
      resolvedTool: resolved.tool,
      resolvedCategoryId: resolved.categoryId,
      searchBlob: [chat.title, chat.summary, resolved.tool?.name, chat.toolId].filter(Boolean).join(' ').toLowerCase(),
    };
  }), [chats]);

  const counts = useMemo(() => {
    const currentToolCount = decoratedChats.filter((chat) => chat.resolvedTool?.id === activeTool?.id).length;
    return {
      all: decoratedChats.length,
      tool: currentToolCount,
      starred: decoratedChats.filter((chat) => chat.starred).length,
    };
  }, [activeTool?.id, decoratedChats]);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    return decoratedChats.filter((chat) => {
      if (scope === 'tool' && chat.resolvedTool?.id !== activeTool?.id) return false;
      if (scope === 'starred' && !chat.starred) return false;
      if (query && !chat.searchBlob.includes(query)) return false;
      return true;
    });
  }, [activeTool?.id, decoratedChats, scope, search]);

  const groupedChats = useMemo(() => {
    const groups = new Map();
    filteredChats.forEach((chat) => {
      const tool = chat.resolvedTool || {};
      const key = tool.id || chat.toolId || 'general';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: tool.name || LEGACY_NAMES[chat.toolId] || formatToolLabel(chat.toolId) || 'FundCo AI',
          color: tool.categoryColor || 'var(--brand-primary)',
          icon: tool.icon || Brain,
          chats: [],
        });
      }
      groups.get(key).chats.push(chat);
    });
    return Array.from(groups.values());
  }, [filteredChats]);

  const scopeButtons = [
    { id: 'all', label: `All conversations (${counts.all})` },
    { id: 'tool', label: `${activeTool?.name || 'This tool'} (${counts.tool})` },
    { id: 'starred', label: `Starred (${counts.starred})` },
  ];

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--bg-surface)' }}>
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-color)' }}>
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Conversation History</span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Reopen past AI conversations without losing where you left off.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onRefresh} className="p-2 rounded-xl border transition-colors"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}>
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-subtle)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}>
            <ChevronLeft className="w-4 h-4" />
            Back to chat
          </button>
        </div>
      </div>

      <div className="px-6 py-4 border-b flex-shrink-0 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {scopeButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => setScope(button.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={scope === button.id
                ? { backgroundColor: 'var(--brand-primary)', color: '#fff' }
                : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loading && <div className="flex justify-center py-8"><Spinner /></div>}
        {!loading && filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <MessageSquare className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No conversations yet</p>
            <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
              Start a chat with any AI tool and it will appear here automatically.
            </p>
          </div>
        )}
        {!loading && filteredChats.length > 0 && (
          <div className="space-y-6">
            {groupedChats.map((group) => (
              <section key={group.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: group.color }}>
                    <group.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{group.label}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{group.chats.length} conversation{group.chats.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {group.chats.map((chat) => (
                    <button
                      key={chat._id}
                      onClick={() => onResume(chat)}
                      className="w-full text-left rounded-2xl border p-4 transition-all"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = group.color; e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{chat.title || group.label}</p>
                          <p
                            className="text-xs mt-1 leading-relaxed"
                            style={{
                              color: 'var(--text-muted)',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {chat.summary || 'No summary yet'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); onToggleStar(chat); }} className="p-1 rounded-lg" title={chat.starred ? 'Remove star' : 'Star conversation'}>
                            {chat.starred
                              ? <Star className="w-3.5 h-3.5" style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                              : <Star className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(chat); }} className="p-1 rounded-lg" title="Delete conversation" style={{ color: '#dc2626' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 mt-4">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          <span>{new Date(chat.updatedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
                          <span>·</span>
                          <span>{chat.messageCount || 0} messages</span>
                          {chat.localOnly && (
                            <>
                              <span>·</span>
                              <span>Saved locally</span>
                            </>
                          )}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: group.color }}>Open</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Category nav pill
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

// Tool card
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


// MAIN PAGE

const AiTools = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const restoredSession = React.useMemo(() => readAiToolsSession(), []);
  const restoredTool = getToolWithCategory(restoredSession?.activeToolId);
  const conversationCacheKey = useMemo(() => buildConversationCacheKey(WORKSPACE_SCOPE, user?._id), [user?._id]);

  const [activeCategory, setActiveCategory] = useState(restoredTool.categoryId);
  const [activeTool,     setActiveTool]     = useState(restoredTool.tool);
  const [activeChatId,   setActiveChatId]   = useState(restoredSession?.activeChatId || null);
  const [showHistory,    setShowHistory]    = useState(Boolean(restoredSession?.showHistory));
  const [searchTool,     setSearchTool]     = useState('');
  const [sidebarOpen,    setSidebarOpen]    = useState(restoredSession?.sidebarOpen ?? true);
  const [historyChats,   setHistoryChats]   = useState(() => readConversationCache(conversationCacheKey));
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const fetchTasks = useCallback(async () => {
    if (!user?._id) {
      setTasks([]);
      return;
    }
    const response = await api.get('/tasks', { params: { ownerId: user._id } });
    setTasks(response.data?.tasks || []);
  }, [user?._id]);

  useEffect(() => {
    fetchTasks().catch(() => {
      toast.error('Failed to load your tasks');
    });
  }, [fetchTasks]);

  const historyMap = useMemo(() => {
    const next = new Map();
    historyChats.forEach((chat) => {
      const id = getConversationId(chat);
      if (id) next.set(id, chat);
    });
    return next;
  }, [historyChats]);

  const recentChats = useMemo(
    () => historyChats.slice(0, 6).map((chat) => ({ ...chat, resolvedTool: getToolWithCategory(chat.toolId).tool })),
    [historyChats]
  );

  const persistHistoryChats = useCallback((updater) => {
    setHistoryChats((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      writeConversationCache(conversationCacheKey, next);
      return next;
    });
  }, [conversationCacheKey]);

  const loadHistory = useCallback(async () => {
    const localChats = readConversationCache(conversationCacheKey);
    if (localChats.length) {
      setHistoryChats(localChats);
    }
    setHistoryLoading(true);
    try {
      const response = await axios.get(`${API}/api/grok/history`, {
        headers: authHeaders(),
        params: { limit: 200 },
      });
      const merged = mergeConversationLists(response.data.histories || [], localChats);
      persistHistoryChats(merged);
    } catch {
      if (!localChats.length) toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, [conversationCacheKey, persistHistoryChats]);

  useEffect(() => {
    setHistoryChats(readConversationCache(conversationCacheKey));
    if (conversationCacheKey) {
      loadHistory().catch(() => {});
    }
  }, [conversationCacheKey, loadHistory]);

  useEffect(() => {
    writeAiToolsSession({
      activeCategory,
      activeToolId: activeTool?.id || ALL_TOOLS[0]?.id,
      activeChatId,
      showHistory,
      sidebarOpen,
      updatedAt: Date.now(),
    });
  }, [activeCategory, activeChatId, activeTool?.id, showHistory, sidebarOpen]);

  const selectTool = (tool) => {
    const nextTool = getToolWithCategory(tool.id);
    setActiveCategory(nextTool.categoryId);
    setActiveTool(nextTool.tool);
    setActiveChatId(null);
    setShowHistory(false);
  };

  const handleChatCreated = (meta) => {
    const nextId = getConversationId(meta);
    if (nextId) setActiveChatId(nextId);
  };

  const handleHistoryChanged = (record) => {
    if (record) {
      persistHistoryChats((previous) => upsertConversationRecord(previous, record));
    }
    if (getServerConversationId(record)) {
      loadHistory().catch(() => {});
    }
  };

  const handleResetChat = () => {
    setActiveChatId(null);
  };

  const handleToggleStar = async (chat) => {
    const serverId = getServerConversationId(chat);
    if (serverId) {
      await axios.put(`${API}/api/grok/history/${serverId}`, { starred: !chat.starred }, { headers: authHeaders() });
    }
    persistHistoryChats((previous) => previous.map((entry) =>
      sameConversation(entry, chat)
        ? { ...entry, starred: !chat.starred, updatedAt: new Date().toISOString() }
        : entry
    ));
  };

  const handleDeleteChat = async (chatRef) => {
    const target = typeof chatRef === 'string'
      ? historyChats.find((entry) => sameConversation(entry, { _id: chatRef, chatId: chatRef, localId: chatRef }))
      : chatRef;
    const targetId = getConversationId(target || { _id: chatRef, chatId: chatRef, localId: chatRef });
    const serverId = getServerConversationId(target || { _id: chatRef, chatId: chatRef });
    if (!window.confirm('Delete this conversation?')) return;
    if (serverId) {
      await axios.delete(`${API}/api/grok/history/${serverId}`, { headers: authHeaders() });
    }
    persistHistoryChats((previous) => previous.filter((entry) => !sameConversation(entry, target || { _id: targetId, chatId: serverId, localId: targetId })));
    if (targetId && sameConversation({ _id: activeChatId, chatId: activeChatId, localId: activeChatId }, { _id: targetId, chatId: serverId, localId: targetId })) {
      setActiveChatId(null);
    }
  };

  const handleResumeChat = (chat) => {
    const nextTool = getToolWithCategory(chat.toolId);
    setActiveTool(nextTool.tool);
    setActiveCategory(nextTool.categoryId);
    setActiveChatId(getConversationId(chat));
    setShowHistory(false);
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      <Toaster position="top-right" />

      {/* Left sidebar */}
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
                  placeholder="Search tools..."
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

            {/* History / recents */}
            <div className="px-3 pb-4 border-t pt-3 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex gap-2">
                <button onClick={() => setShowHistory(p => !p)}
                  className="flex-1 flex items-center gap-2.5 justify-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ backgroundColor: showHistory ? 'var(--brand-light)' : 'var(--bg-subtle)', color: showHistory ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
                  <History className="w-4 h-4" />
                  {showHistory ? 'Back to Chat' : 'Chat History'}
                </button>
                <button onClick={() => { setActiveChatId(null); setShowHistory(false); }}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Recent conversations</p>
                  <button onClick={loadHistory} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                    <RotateCcw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {recentChats.length === 0 && (
                    <div className="px-3 py-3 rounded-xl border text-xs"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                      No conversations yet
                    </div>
                  )}
                  {recentChats.map((chat) => (
                    <button
                      key={chat._id}
                      onClick={() => handleResumeChat(chat)}
                      className="w-full text-left px-3 py-2.5 rounded-xl border transition-all"
                      style={{
                        borderColor: activeChatId === chat._id ? (chat.resolvedTool?.categoryColor || 'var(--brand-primary)') : 'var(--border-color)',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                    >
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{chat.title || chat.resolvedTool?.name || 'FundCo AI'}</p>
                      <p className="text-[11px] truncate mt-1" style={{ color: 'var(--text-muted)' }}>
                        {(chat.resolvedTool?.name || 'AI Tool')} · {chat.messageCount || 0} messages
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
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
          {showHistory ? (
            <HistoryWorkspace
              activeTool={activeTool}
              chats={historyChats}
              loading={historyLoading}
              onRefresh={loadHistory}
              onResume={handleResumeChat}
              onClose={() => setShowHistory(false)}
              onToggleStar={handleToggleStar}
              onDelete={handleDeleteChat}
            />
          ) : (
            <ChatPanel
              key={`${activeTool.id}-${activeChatId}`}
              tool={activeTool}
              tasks={tasks}
              chatId={activeChatId}
              cachedChat={historyMap.get(activeChatId)}
              onChatCreated={handleChatCreated}
              onHistoryChanged={handleHistoryChanged}
              onResetChat={handleResetChat}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AiTools;




