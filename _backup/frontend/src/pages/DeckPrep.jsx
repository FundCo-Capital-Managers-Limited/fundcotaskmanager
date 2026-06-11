// src/pages/DeckPrep.jsx
// Ultimate AI-Powered PDF → PowerPoint Builder
// Two modes: Quick Convert + AI-Guided | Full slide editor | Real PPTX export
// NEW: Delete button appears on hover for every history card (Recent + full History view)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  Upload, FileText, Zap, Edit2, Loader2, Download, AlertCircle, Plus, Trash2,
  ChevronLeft, ChevronRight, Sparkles, Layers, LayoutTemplate, RefreshCw, X,
  Check, ArrowRight, Settings2, Wand2, PresentationIcon, AlignLeft, Quote,
  Columns2, Home, HistoryIcon,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ── Themes ───────────────────────────────────────────────────────────────────
const THEMES = {
  professional: { label: 'Professional', bg: '1e293b', accent: '312783', text: 'f8fafc', subtext: '94a3b8', titleText: 'ffffff', sectionBg: '0f172a', preview: ['#1e293b', '#312783'] },
  clean: { label: 'Clean', bg: 'f8fafc', accent: '312783', text: '1e293b', subtext: '64748b', titleText: 'ffffff', sectionBg: 'e2e8f0', preview: ['#f8fafc', '#312783'] },
  ocean: { label: 'Ocean', bg: '0c1445', accent: '36a9e1', text: 'e0f2fe', subtext: '7dd3fc', titleText: '0c1445', sectionBg: '0d2060', preview: ['#0c1445', '#36a9e1'] },
  midnight: { label: 'Midnight', bg: '09090b', accent: '7c3aed', text: 'fafafa', subtext: 'a1a1aa', titleText: 'ffffff', sectionBg: '18181b', preview: ['#09090b', '#7c3aed'] },
  coral: { label: 'Coral', bg: 'fff7ed', accent: 'dc2626', text: '1c1917', subtext: '78716c', titleText: 'ffffff', sectionBg: 'fef2f2', preview: ['#fff7ed', '#dc2626'] },
};

const slideIcons = { title: Home, section: Layers, bullets: AlignLeft, 'two-column': Columns2, quote: Quote, closing: Check };

// ── SlidePreview ─────────────────────────────────────────────────────────────
const SlidePreview = ({ slide, theme, scale = 1, isActive = false, onClick }) => {
  const t = THEMES[theme] || THEMES.professional;
  const W = 640, H = 360;
  const isTitle = slide.type === 'title', isSection = slide.type === 'section';
  const isQuote = slide.type === 'quote', isTwoCol = slide.type === 'two-column';
  return (
    <div onClick={onClick} style={{
      width: W * scale, height: H * scale, backgroundColor: `#${t.bg}`,
      border: `2px solid ${isActive ? 'var(--brand-accent)' : 'transparent'}`, borderRadius: 8 * scale,
      overflow: 'hidden', cursor: 'pointer', position: 'relative', flexShrink: 0,
      boxShadow: isActive ? '0 0 0 3px rgba(54,169,225,.3)' : 'none'
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: (isTitle || isSection) ? H * scale : 4 * scale, backgroundColor: `#${t.accent}`
      }} />
      {isTitle && <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 * scale
      }}>
        <div style={{ color: `#${t.titleText}`, fontWeight: 900, fontSize: 28 * scale, lineHeight: 1.2, marginBottom: 12 * scale }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: `#${t.subtext}`, fontSize: 14 * scale }}>{slide.subtitle}</div>}
      </div>}
      {isSection && <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: 40 * scale
      }}>
        <div style={{ color: `#${t.subtext}`, fontSize: 10 * scale, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 * scale }}>Section</div>
        <div style={{ color: `#${t.text}`, fontWeight: 800, fontSize: 24 * scale, lineHeight: 1.2 }}>{slide.title}</div>
        {slide.subtitle && <div style={{ color: `#${t.subtext}`, fontSize: 12 * scale, marginTop: 8 * scale }}>{slide.subtitle}</div>}
      </div>}
      {isQuote && <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 48 * scale, textAlign: 'center'
      }}>
        <div style={{ color: `#${t.accent}`, fontSize: 40 * scale, marginBottom: 8 * scale, fontFamily: 'Georgia,serif' }}>"</div>
        <div style={{ color: `#${t.text}`, fontSize: 14 * scale, lineHeight: 1.5, fontStyle: 'italic', maxWidth: '85%' }}>{slide.quote || slide.title}</div>
        {slide.attribution && <div style={{ color: `#${t.subtext}`, fontSize: 11 * scale, marginTop: 10 * scale }}>— {slide.attribution}</div>}
      </div>}
      {isTwoCol && <div style={{ position: 'absolute', inset: 0, paddingTop: 14 * scale, padding: `${14 * scale}px ${20 * scale}px` }}>
        <div style={{ color: `#${t.text}`, fontWeight: 700, fontSize: 13 * scale, marginBottom: 8 * scale, paddingTop: 8 * scale }}>{slide.title}</div>
        <div style={{ display: 'flex', gap: 12 * scale }}>
          {[slide.leftContent, slide.rightContent].map((col, ci) => (
            <div key={ci} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.05)', borderRadius: 4 * scale, padding: 8 * scale }}>
              <div style={{ color: `#${t.accent}`, fontSize: 9 * scale, fontWeight: 700, marginBottom: 4 * scale }}>{ci === 0 ? 'Left' : 'Right'}</div>
              <div style={{ color: `#${t.subtext}`, fontSize: 10 * scale, lineHeight: 1.4 }}>{(col || '').slice(0, 100)}</div>
            </div>
          ))}
        </div>
      </div>}
      {!isTitle && !isSection && !isQuote && !isTwoCol && <div style={{
        position: 'absolute', inset: 0,
        padding: `${14 * scale}px ${32 * scale}px ${20 * scale}px`
      }}>
        <div style={{ color: `#${t.text}`, fontWeight: 700, fontSize: 15 * scale, marginBottom: 12 * scale, paddingTop: 8 * scale }}>{slide.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 * scale }}>
          {(slide.bullets || []).slice(0, 6).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 * scale }}>
              <div style={{ width: 5 * scale, height: 5 * scale, borderRadius: '50%', backgroundColor: `#${t.accent}`, marginTop: 4 * scale, flexShrink: 0 }} />
              <span style={{ color: `#${t.subtext}`, fontSize: 10.5 * scale, lineHeight: 1.4 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>}
      <div style={{ position: 'absolute', bottom: 5 * scale, right: 8 * scale, color: `#${t.subtext}`, fontSize: 8 * scale, opacity: .5 }}>{slide.id}</div>
    </div>
  );
};

// ── PPTX Export ───────────────────────────────────────────────────────────────
const exportToPPTX = async (pptJson, theme) => {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const t = THEMES[theme] || THEMES.professional;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.title = pptJson.title || 'Presentation';
  for (const slide of pptJson.slides) {
    const s = pptx.addSlide();
    s.background = { color: t.bg };
    if (slide.type === 'title') {
      s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 2.8, fill: { color: t.accent }, line: { color: t.accent } });
      s.addText(slide.title || '', { x: 0.6, y: 0.5, w: 8.8, h: 1.6, color: t.titleText, fontSize: 36, bold: true, align: 'center', valign: 'middle', margin: 0 });
      if (slide.subtitle) s.addText(slide.subtitle, { x: 1, y: 3.2, w: 8, h: 1.2, color: t.subtext, fontSize: 18, align: 'center', margin: 0 });
    } else if (slide.type === 'section') {
      s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: t.accent }, line: { color: t.accent } });
      s.addText('SECTION', { x: 0.5, y: 1.4, w: 9, h: 0.4, color: t.subtext, fontSize: 11, bold: true, charSpacing: 6, margin: 0 });
      s.addText(slide.title || '', { x: 0.5, y: 1.9, w: 9, h: 2, color: t.text, fontSize: 32, bold: true, margin: 0 });
      if (slide.subtitle) s.addText(slide.subtitle, { x: 0.5, y: 4.1, w: 9, h: 0.9, color: t.subtext, fontSize: 16, margin: 0 });
    } else if (slide.type === 'quote') {
      s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });
      s.addText('\u201C', { x: 0.5, y: 0.3, w: 1.5, h: 1.5, color: t.accent, fontSize: 80, bold: true, margin: 0 });
      s.addText(slide.quote || slide.title || '', { x: 0.8, y: 1.2, w: 8.4, h: 2.8, color: t.text, fontSize: 20, italic: true, align: 'center', valign: 'middle', margin: 0 });
      if (slide.attribution) s.addText(`— ${slide.attribution}`, { x: 0.8, y: 4.5, w: 8.4, h: 0.6, color: t.subtext, fontSize: 13, align: 'center', margin: 0 });
    } else if (slide.type === 'two-column') {
      s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });
      s.addText(slide.title || '', { x: 0.5, y: 0.2, w: 9, h: 0.8, color: t.text, fontSize: 20, bold: true, margin: 0 });
      s.addShape(pptx.shapes.RECTANGLE, { x: 0.4, y: 1.2, w: 4.2, h: 3.8, fill: { color: t.sectionBg }, line: { color: t.accent, pt: 1 } });
      s.addText(slide.leftContent || '', { x: 0.6, y: 1.35, w: 3.8, h: 3.5, color: t.subtext, fontSize: 14, valign: 'top', margin: 0 });
      s.addShape(pptx.shapes.RECTANGLE, { x: 5.4, y: 1.2, w: 4.2, h: 3.8, fill: { color: t.sectionBg }, line: { color: t.accent, pt: 1 } });
      s.addText(slide.rightContent || '', { x: 5.6, y: 1.35, w: 3.8, h: 3.5, color: t.subtext, fontSize: 14, valign: 'top', margin: 0 });
    } else if (slide.type === 'closing') {
      s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });
      s.addText('KEY TAKEAWAYS', { x: 0.5, y: 0.3, w: 9, h: 0.4, color: t.subtext, fontSize: 11, bold: true, charSpacing: 6, margin: 0 });
      s.addText(slide.title || 'Thank You', { x: 0.5, y: 0.85, w: 9, h: 1, color: t.text, fontSize: 26, bold: true, margin: 0 });
      if (slide.bullets?.length) {
        const items = slide.bullets.map((b, i) => ({ text: b, options: { bullet: { code: '25CF', color: t.accent }, color: t.subtext, fontSize: 16, breakLine: i < slide.bullets.length - 1 } }));
        s.addText(items, { x: 0.6, y: 2.0, w: 8.8, h: 3.2, valign: 'top', margin: 0 });
      }
    } else {
      // Default bullets
      s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });
      s.addText(slide.title || '', { x: 0.5, y: 0.25, w: 9, h: 0.85, color: t.text, fontSize: 22, bold: true, margin: 0 });
      s.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 1.15, w: 9, h: 0.03, fill: { color: t.accent }, line: { color: t.accent } });
      if (slide.bullets?.length) {
        const items = slide.bullets.map((b, i) => ({ text: b, options: { bullet: { code: '25CF', color: t.accent }, color: t.subtext, fontSize: 16, breakLine: i < slide.bullets.length - 1 } }));
        s.addText(items, { x: 0.6, y: 1.35, w: 8.8, h: 3.8, valign: 'top', margin: 0 });
      }
    }
    s.addText(String(slide.id || ''), { x: 9.2, y: 5.3, w: 0.6, h: 0.25, color: t.subtext, fontSize: 9, align: 'right', margin: 0, transparency: 50 });
  }
  await pptx.writeFile({ fileName: `${(pptJson.title || 'Presentation').replace(/[^a-z0-9]/gi, '_')}.pptx` });
};

// ── Slide Editor Panel ────────────────────────────────────────────────────────
const SlideEditor = ({ slide, onUpdate, onRegenerate, onDelete, onAddSlide, isRegenerating }) => {
  const [local, setLocal] = useState(slide);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [showRegen, setShowRegen] = useState(false);
  useEffect(() => { setLocal(slide); }, [slide]);
  const upd = (f, v) => { const u = { ...local, [f]: v }; setLocal(u); onUpdate(u); };
  const updBullet = (i, v) => { const b = [...(local.bullets || [])]; b[i] = v; upd('bullets', b); };
  const inp = {
    backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)', borderRadius: 10, padding: '8px 12px',
    width: '100%', fontSize: 13, outline: 'none', resize: 'vertical'
  };
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>{slide.type}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowRegen(p => !p)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold"
            style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
            <Wand2 className="w-3.5 h-3.5" /> AI Regen
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220,38,38,.1)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Trash2 className="w-4 h-4" style={{ color: '#dc2626' }} />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showRegen && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: 'var(--bg-subtle)', borderLeft: '3px solid var(--brand-accent)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>How to improve this slide:</p>
            <textarea value={regenPrompt} onChange={e => setRegenPrompt(e.target.value)} rows={2}
              placeholder="e.g. More concise, add data, change layout…" style={{ ...inp, resize: 'none' }} />
            <button onClick={() => { onRegenerate(regenPrompt); setShowRegen(false); setRegenPrompt(''); }}
              disabled={isRegenerating}
              className="w-full py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              {isRegenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Regenerating…</> : <><Wand2 className="w-4 h-4" />Regenerate</>}
            </button>
          </div>
        </motion.div>}
      </AnimatePresence>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Title</label>
        <input value={local.title || ''} onChange={e => upd('title', e.target.value)} style={inp} />
      </div>
      {(slide.type === 'title' || slide.type === 'section') && <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Subtitle</label>
        <input value={local.subtitle || ''} onChange={e => upd('subtitle', e.target.value)} style={inp} />
      </div>}
      {slide.type === 'quote' && <>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Quote</label>
          <textarea value={local.quote || ''} onChange={e => upd('quote', e.target.value)} rows={3} style={inp} /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Attribution</label>
          <input value={local.attribution || ''} onChange={e => upd('attribution', e.target.value)} style={inp} /></div>
      </>}
      {slide.type === 'two-column' && <>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Left Column</label>
          <textarea value={local.leftContent || ''} onChange={e => upd('leftContent', e.target.value)} rows={4} style={inp} /></div>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Right Column</label>
          <textarea value={local.rightContent || ''} onChange={e => upd('rightContent', e.target.value)} rows={4} style={inp} /></div>
      </>}
      {(slide.bullets?.length > 0 || (slide.type !== 'quote' && slide.type !== 'two-column' && slide.type !== 'title' && slide.type !== 'section')) && <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Bullets</label>
          <button onClick={() => upd('bullets', [...(local.bullets || []), 'New point'])}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg font-semibold"
            style={{ color: 'var(--brand-primary)', backgroundColor: 'var(--brand-light)' }}>
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {(local.bullets || []).map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent)' }} />
              <input value={b} onChange={e => updBullet(i, e.target.value)} style={{ ...inp, flex: 1 }} />
              <button onClick={() => upd('bullets', (local.bullets || []).filter((_, idx) => idx !== i))}
                className="flex-shrink-0 p-1 rounded" style={{ color: '#dc2626' }}><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Speaker Note</label>
        <textarea value={local.note || ''} onChange={e => upd('note', e.target.value)} rows={2}
          placeholder="Optional notes…" style={{ ...inp, resize: 'none' }} />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Slide Type</label>
        <select value={local.type} onChange={e => upd('type', e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
          {['title', 'section', 'bullets', 'two-column', 'quote', 'closing'].map(tp => (
            <option key={tp} value={tp}>{tp.charAt(0).toUpperCase() + tp.slice(1).replace('-', ' ')}</option>
          ))}
        </select>
      </div>
      <button onClick={onAddSlide}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed text-sm font-semibold"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
        <Plus className="w-4 h-4" /> Add Slide After
      </button>
    </div>
  );
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const DeckPrep = () => {
  const { user } = useOutletContext();
  const [mode, setMode] = useState('home');
  const [step, setStep] = useState(1);
  const [docId, setDocId] = useState(null);
  const [pptJson, setPptJson] = useState(null);
  const [fullText, setFullText] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [regenIdx, setRegenIdx] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [theme, setTheme] = useState('professional');
  const [slideCount, setSlideCount] = useState(12);
  const [audience, setAudience] = useState('business');
  const [extractPrompt, setExtractPrompt] = useState('Extract key points, headings, summaries, tables, and meaningful insights. Group by topic.');
  const [pptPrompt, setPptPrompt] = useState('Generate a professional presentation. First slide = compelling title. Last slide = key takeaways.');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const autoSaveRef = useRef(null);

  const load = (msg) => { setLoading(true); setLoadingMsg(msg); setError(''); };
  const done = () => { setLoading(false); setLoadingMsg(''); };

  const fetchHistory = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/api/documents/history`, { headers: headers() });
      setHistory(r.data.histories || []);
    } catch (e) {
      console.error('Failed to fetch history');
    }
  }, []);

  // ── NEW: Delete a document from history (called on hover button click) ─────
  const handleDelete = useCallback(async (documentId) => {
    if (!window.confirm('Are you sure you want to permanently delete this presentation and all its data? This action cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`${API}/api/documents/${documentId}`, { headers: headers() });
      toast.success('Presentation deleted');
      fetchHistory();
      // If the deleted document was currently loaded, reset the editor
      if (docId === documentId) {
        setDocId(null);
        setPptJson(null);
        setMode('home');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete presentation');
    }
  }, [docId, fetchHistory]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const triggerAutoSave = useCallback((json) => {
    if (!docId || !json) return;
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await axios.post(`${API}/api/documents/save-ppt`, { documentId: docId, pptJson: json }, { headers: headers() });
      } catch {}
      finally { setAutoSaving(false); }
    }, 1500);
  }, [docId]);

  const uploadPDF = async (f) => {
    if (!f) return null;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('files', f);
      const up = await axios.post(`${API}/api/files/upload`, fd, { headers: headers() });
      const fid = up.data.files[0]._id;
      const cr = await axios.post(`${API}/api/documents`, { fileId: fid }, { headers: headers() });
      setDocId(cr.data.document._id);
      toast.success('PDF ready!');
      return cr.data.document._id;
    } catch (e) {
      console.error('Upload error:', e);
      setError('Upload failed');
      toast.error('Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleQuickConvert = async () => {
    if (!file && !docId) return toast.error('Upload a PDF first');
    load('Uploading PDF…');
    let id = docId;
    if (file && !docId) { id = await uploadPDF(file); if (!id) { done(); return; } }
    setLoadingMsg('AI is reading and building your presentation…');
    try {
      const r = await axios.post(`${API}/api/documents/quick-convert`, { documentId: id, slideCount, theme, audience }, { headers: headers() });
      setPptJson(r.data.pptJson); setFullText(r.data.fullText || ''); setActiveSlide(0); setMode('editor'); fetchHistory();
      toast.success(`${r.data.pptJson.slides.length} slides generated!`);
    } catch (e) { setError(e.response?.data?.message || 'Quick convert failed'); toast.error('Failed'); }
    finally { done(); }
  };

  const handleRawExtract = async () => {
    load('Extracting PDF text with AI…');
    try {
      const r = await axios.post(`${API}/api/documents/raw-extract`, { documentId: docId }, { headers: headers() });
      setFullText(r.data.fullText); setStep(3); toast.success('Text extracted!');
    } catch (e) { setError(e.response?.data?.message || 'Extraction failed'); }
    finally { done(); }
  };

  const handleMeaningfulExtract = async () => {
    load('AI is structuring content…');
    try {
      const r = await axios.post(`${API}/api/documents/extract`, { documentId: docId, prompt: extractPrompt }, { headers: headers() });
      setExtractedText(r.data.extractedText); setStep(5); toast.success('Content structured!');
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { done(); }
  };

  const handleGeneratePPT = async () => {
    load('AI is building your slides…');
    try {
      const r = await axios.post(`${API}/api/documents/generate-ppt`, { documentId: docId, prompt: pptPrompt, slideCount, theme }, { headers: headers() });
      setPptJson(r.data.pptJson); setActiveSlide(0); setMode('editor'); fetchHistory();
      toast.success(`${r.data.pptJson.slides.length} slides created!`);
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { done(); }
  };

  const handleSlideUpdate = (upd) => {
    const slides = [...pptJson.slides]; slides[activeSlide] = upd;
    const nj = { ...pptJson, slides }; setPptJson(nj); triggerAutoSave(nj);
  };

  const handleRegenSlide = async (instruction) => {
    if (!docId) return;
    setRegenIdx(activeSlide);
    try {
      const r = await axios.post(`${API}/api/documents/regenerate-slide`, { documentId: docId, slideIndex: activeSlide, instruction }, { headers: headers() });
      setPptJson(r.data.pptJson); toast.success('Slide regenerated!');
    } catch { toast.error('Regeneration failed'); }
    finally { setRegenIdx(null); }
  };

  const handleDeleteSlide = () => {
    if (pptJson.slides.length <= 1) return toast.error('Cannot delete the only slide');
    const slides = pptJson.slides.filter((_, i) => i !== activeSlide).map((s, i) => ({ ...s, id: i + 1 }));
    const nj = { ...pptJson, slides }; setPptJson(nj); setActiveSlide(Math.min(activeSlide, slides.length - 1)); triggerAutoSave(nj);
  };

  const handleAddSlide = () => {
    const ns = { id: pptJson.slides.length + 1, type: 'bullets', title: 'New Slide', bullets: ['Key point 1', 'Key point 2', 'Key point 3'] };
    const slides = [...pptJson.slides.slice(0, activeSlide + 1), ns, ...pptJson.slides.slice(activeSlide + 1)].map((s, i) => ({ ...s, id: i + 1 }));
    const nj = { ...pptJson, slides }; setPptJson(nj); setActiveSlide(activeSlide + 1); triggerAutoSave(nj);
  };

  const loadFromHistory = (h) => {
    setDocId(h._id); setFullText(h.fullText || ''); setExtractedText(h.extractedText || '');
    if (h.pptJson) { setPptJson(h.pptJson); setMode('editor'); setActiveSlide(0); }
    else { setMode('guided'); setStep(h.fullText ? 4 : 2); }
    toast.success('Loaded!');
  };

  const handleExport = async () => {
    if (!pptJson?.slides?.length) return toast.error('No presentation to export');
    load('Building PPTX file…');
    try { await exportToPPTX(pptJson, theme); toast.success('PPTX downloaded!'); }
    catch (e) { toast.error('Export failed: ' + e.message); }
    finally { done(); }
  };

  // Shared sub-components
  const inp = { backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' };
  const inpFocus = (e) => { e.target.style.borderColor = 'var(--brand-accent)'; };
  const inpBlur = (e) => { e.target.style.borderColor = 'var(--input-border)'; };
  const SectionLabel = ({ children }) => (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{children}</h2>
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
  );

  // Loading screen
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-5">
      <Toaster position="top-right" />
      <div className="relative">
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--brand-primary)' }} />
      </div>
      <div className="text-center">
        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{loadingMsg || 'Processing…'}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>AI is working on your presentation</p>
      </div>
    </div>
  );

  const ErrorBox = ({ msg }) => msg ? (
    <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(220,38,38,.06)', borderColor: 'rgba(220,38,38,.3)' }}>
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
      <p className="text-sm" style={{ color: '#dc2626' }}>{msg}</p>
    </div>
  ) : null;

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (mode === 'home') return (
    <div className="space-y-8 py-4">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <span className="text-3xl">📊</span> FundCo DeckPrep AI
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Convert PDFs into polished PowerPoint presentations</p>
        </div>
        {history.length > 0 && <button onClick={() => setMode('history')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}>
          <HistoryIcon className="w-4 h-4" /> History ({history.length})
        </button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'quick', icon: Zap, title: 'Quick Convert', desc: 'Upload a PDF and get a complete polished presentation in one click. AI reads, structures, and designs everything.', tags: ['PDF Upload', 'AI Extraction', 'Auto Slides', 'PPTX Export'], color: 'var(--brand-primary)', bg: 'var(--brand-light)' },
          { key: 'guided', icon: Wand2, title: 'AI-Guided Builder', desc: 'Full control at every step — extract raw text, structure content with custom prompts, then generate and fine-tune slides.', tags: ['Step-by-Step', 'Custom Prompts', 'Full Control', 'Edit Everything'], color: '#36a9e1', bg: 'rgba(54,169,225,.1)' },
        ].map(card => (
          <motion.div key={card.key} whileHover={{ y: -2 }}
            className="rounded-2xl border p-8 cursor-pointer transition-all"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            onClick={() => { setMode(card.key); if (card.key === 'guided') setStep(1); }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = card.color; e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-color)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: card.bg }}>
              <card.icon className="w-7 h-7" style={{ color: card.color }} />
            </div>
            <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>{card.title}</h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>{card.desc}</p>
            <div className="flex flex-wrap gap-2">
              {card.tags.map(t => <span key={t} className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: card.bg, color: card.color }}>{t}</span>)}
            </div>
            <div className="mt-6 flex items-center gap-2 font-bold text-sm" style={{ color: card.color }}>
              Get Started <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Presentations – now with hover delete button */}
      {history.length > 0 && <>
        <SectionLabel>Recent Presentations</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {history.slice(0, 6).map(h => (
            <motion.div
              key={h._id}
              whileHover={{ y: -1 }}
              onClick={() => loadFromHistory(h)}
              className="rounded-xl border p-4 cursor-pointer transition-all flex items-center gap-3 group relative"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: h.pptJson ? 'var(--brand-light)' : 'var(--bg-subtle)' }}>
                <FileText className="w-5 h-5" style={{ color: h.pptJson ? 'var(--brand-primary)' : 'var(--text-muted)' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{h.originalFileId?.fileName || 'Untitled'}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {h.pptJson ? `${h.pptJson.slides?.length || 0} slides` : 'No slides'} · {new Date(h.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Hover-only delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(h._id);
                }}
                className="absolute top-3 right-3 p-2 rounded-xl bg-white shadow-sm border border-transparent hover:border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Delete presentation"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </motion.div>
          ))}
        </div>
      </>}
    </div>
  );

  // ── QUICK CONVERT ─────────────────────────────────────────────────────────
  if (mode === 'quick') return (
    <div className="space-y-6 py-4 max-w-2xl mx-auto">
      <Toaster position="top-right" />
      <button onClick={() => setMode('home')} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}><ChevronLeft className="w-4 h-4" /> Back</button>
      <div><h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Quick Convert</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Upload PDF → Get PPTX in seconds</p></div>
      <div onClick={() => fileRef.current?.click()}
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
        style={{ borderColor: file ? 'var(--brand-primary)' : 'var(--border-color)', backgroundColor: file ? 'var(--brand-light)' : 'var(--bg-surface)' }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.pdf')) { setFile(f); setDocId(null); } else toast.error('PDF only'); }}>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setDocId(null); } }} />
        {file ? <>
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary)' }}><FileText className="w-6 h-6 text-white" /></div>
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <button onClick={e => { e.stopPropagation(); setFile(null); setDocId(null); }} className="mt-2 text-xs" style={{ color: '#dc2626' }}>Remove</button>
        </> : <>
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Drop PDF here or click to browse</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Works with searchable PDFs (not scanned images)</p>
        </>}
      </div>
      {history.filter(h => h.originalFileId).length > 0 && <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Or use a previous PDF</p>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {history.filter(h => h.originalFileId).slice(0, 5).map(h => (
            <div key={h._id} onClick={() => { setDocId(h._id); setFile(null); }}
              className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
              style={{ backgroundColor: docId === h._id ? 'var(--brand-light)' : 'var(--bg-surface)', borderColor: docId === h._id ? 'var(--brand-primary)' : 'var(--border-color)' }}>
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>{h.originalFileId.fileName}</span>
              {docId === h._id && <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />}
            </div>
          ))}
        </div>
      </div>}
      <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Settings2 className="w-4 h-4" /> Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Slides</label>
            <input type="number" min={6} max={30} value={slideCount} onChange={e => setSlideCount(+e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp} onFocus={inpFocus} onBlur={inpBlur} /></div>
          <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Audience</label>
            <select value={audience} onChange={e => setAudience(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp}>
              {['business', 'technical', 'academic', 'executive', 'general'].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
            </select></div>
        </div>
        <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Visual Theme</label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(THEMES).map(([k, v]) => (
              <button key={k} onClick={() => setTheme(k)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all"
                style={{ borderColor: theme === k ? 'var(--brand-primary)' : 'var(--border-color)', backgroundColor: theme === k ? 'var(--brand-light)' : 'var(--bg-subtle)' }}>
                <div className="flex gap-1">{v.preview.map((c, i) => <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />)}</div>
                <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <ErrorBox msg={error} />
      <button onClick={handleQuickConvert} disabled={!file && !docId}
        className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-3 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: 'var(--brand-primary)' }}>
         Generate Presentation
      </button>
    </div>
  );

  // ── GUIDED MODE ───────────────────────────────────────────────────────────
  if (mode === 'guided') {
    const steps = [{ n: 1, label: 'Upload' }, { n: 2, label: 'Extract' }, { n: 3, label: 'Review' }, { n: 4, label: 'Structure' }, { n: 5, label: 'Edit' }, { n: 6, label: 'Generate' }];
    return (
      <div className="space-y-6 py-4 max-w-3xl mx-auto">
        <Toaster position="top-right" />
        <button onClick={() => setMode('home')} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}><ChevronLeft className="w-4 h-4" /> Back</button>
        <div><h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>AI-Guided Builder</h1></div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {steps.map((s, i) => (
            <React.Fragment key={s.n}>
              <button onClick={() => step >= s.n && setStep(s.n)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all"
                style={step === s.n ? { backgroundColor: 'var(--brand-primary)', color: '#fff' } : step > s.n ? { backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' } : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ backgroundColor: step === s.n ? 'rgba(255,255,255,.25)' : step > s.n ? 'var(--brand-primary)' : 'var(--bg-hover)', color: step > s.n ? '#fff' : 'inherit' }}>
                  {step > s.n ? '✓' : s.n}
                </span>{s.label}
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
            </React.Fragment>
          ))}
        </div>
        <ErrorBox msg={error} />
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {step === 1 && <div className="rounded-2xl border p-8 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Upload className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />Upload PDF</h2>
              <div onClick={() => fileRef.current?.click()} className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer"
                style={{ borderColor: file ? 'var(--brand-primary)' : 'var(--border-color)' }}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.name.endsWith('.pdf')) setFile(f); }}
                onDragOver={e => e.preventDefault()}>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
                {file ? <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>📄 {file.name}</p>
                  : <><Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} /><p style={{ color: 'var(--text-secondary)' }}>Click or drop PDF</p></>}
              </div>
              <button onClick={async () => { if (!file) return toast.error('Select a PDF'); setUploading(true); const id = await uploadPDF(file); setUploading(false); if (id) setStep(2); }}
                disabled={!file || uploading}
                className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)' }}>
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : 'Upload & Continue'}
              </button>
              {history.length > 0 && <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Or load existing</p>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {history.slice(0, 5).map(h => (
                    <div key={h._id} onClick={() => loadFromHistory(h)} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                      <FileText className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} /><span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{h.originalFileId?.fileName || 'Untitled'}</span>
                    </div>
                  ))}
                </div>
              </div>}
            </div>}
            {step === 2 && <div className="rounded-2xl border p-8 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><FileText className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />Extract PDF Text</h2>
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>AI reads your entire PDF and extracts all text. Works best with searchable (non-scanned) PDFs.</p>
              </div>
              <button onClick={handleRawExtract} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                <Zap className="w-4 h-4" /> Extract All Text
              </button>
            </div>}
            {step === 3 && <div className="rounded-2xl border p-8 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Edit2 className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />Review Extracted Text</h2>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{fullText.length.toLocaleString()} chars</span><span>~{Math.ceil(fullText.split(' ').length / 250)} pages</span>
              </div>
              <textarea value={fullText} onChange={e => setFullText(e.target.value)} rows={14}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                style={{ ...inp, fontFamily: 'monospace' }} onFocus={inpFocus} onBlur={inpBlur} />
              <button onClick={() => setStep(4)} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>}
            {step === 4 && <div className="rounded-2xl border p-8 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>Structure Content</h2>
              <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Extraction Prompt</label>
                <textarea value={extractPrompt} onChange={e => setExtractPrompt(e.target.value)} rows={5}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                  style={inp} onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <button onClick={handleMeaningfulExtract} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                <Wand2 className="w-4 h-4" /> Structure with AI
              </button>
            </div>}
            {step === 5 && <div className="rounded-2xl border p-8 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Edit2 className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />Edit Structured Content</h2>
              <textarea value={extractedText} onChange={e => setExtractedText(e.target.value)} rows={14}
                className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                style={inp} onFocus={inpFocus} onBlur={inpBlur} />
              <button onClick={() => setStep(6)} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                Continue to Slides <ArrowRight className="w-4 h-4" />
              </button>
            </div>}
            {step === 6 && <div className="rounded-2xl border p-8 space-y-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Generate Presentation</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Slides</label>
                  <input type="number" min={6} max={30} value={slideCount} onChange={e => setSlideCount(+e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp} onFocus={inpFocus} onBlur={inpBlur} /></div>
                <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Theme</label>
                  <select value={theme} onChange={e => setTheme(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-sm focus:outline-none" style={inp}>
                    {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Generation Prompt</label>
                <textarea value={pptPrompt} onChange={e => setPptPrompt(e.target.value)} rows={4}
                  className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-y"
                  style={inp} onFocus={inpFocus} onBlur={inpBlur} />
              </div>
              <button onClick={handleGeneratePPT} className="w-full py-4 rounded-xl font-black text-white text-base flex items-center justify-center gap-3 hover:opacity-90" style={{ backgroundColor: 'var(--brand-primary)' }}>
                <Sparkles className="w-5 h-5" /> Generate Presentation
              </button>
            </div>}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── EDITOR ────────────────────────────────────────────────────────────────
  if (mode === 'editor' && pptJson) {
    const slide = pptJson.slides[activeSlide];
    const SlideIcon = slideIcons[slide?.type] || AlignLeft;
    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
        <Toaster position="top-right" />
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 flex-wrap gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMode('home')}
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <ChevronLeft className="w-3.5 h-3.5" /> Home
            </button>
            <div className="w-px h-5" style={{ backgroundColor: 'var(--border-color)' }} />
            <div className="min-w-0">
              <p className="text-sm font-black truncate" style={{ color: 'var(--text-primary)' }}>{pptJson.title || 'Untitled Presentation'}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pptJson.slides.length} slides</span>
                {autoSaving && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={theme} onChange={e => setTheme(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border focus:outline-none"
              style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
              {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90"
              style={{ backgroundColor: '#16a34a' }}>
              <Download className="w-3.5 h-3.5" /> Export PPTX
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Thumbnail strip */}
          <div className="w-44 flex-shrink-0 border-r flex flex-col overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
            <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Slides</span>
              <button onClick={handleAddSlide} className="w-5 h-5 rounded flex items-center justify-center"
                style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}><Plus className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {pptJson.slides.map((s, i) => (
                <div key={s.id || i} onClick={() => setActiveSlide(i)}
                  className="relative cursor-pointer rounded-lg overflow-hidden"
                  style={{ outline: activeSlide === i ? '2px solid var(--brand-primary)' : '2px solid transparent' }}>
                  <SlidePreview slide={s} theme={theme} scale={0.22} />
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 flex items-center gap-1"
                    style={{ backgroundColor: 'rgba(0,0,0,.55)' }}>
                    <span className="text-white text-[9px] opacity-80">{i + 1}</span>
                  </div>
                  {regenIdx === i && <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,.6)' }}>
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>}
                </div>
              ))}
            </div>
          </div>
          {/* Main preview */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
            <div className="flex items-center justify-center gap-4 py-3 flex-shrink-0">
              <button onClick={() => setActiveSlide(p => Math.max(0, p - 1))} disabled={activeSlide === 0}
                className="p-1.5 rounded-lg disabled:opacity-30"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Slide {activeSlide + 1} of {pptJson.slides.length}
              </span>
              <button onClick={() => setActiveSlide(p => Math.min(pptJson.slides.length - 1, p + 1))} disabled={activeSlide === pptJson.slides.length - 1}
                className="p-1.5 rounded-lg disabled:opacity-30"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={activeSlide} initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
                  <SlidePreview slide={pptJson.slides[activeSlide]} theme={theme}
                    scale={Math.min(1, Math.max(.5, (window.innerWidth - 500) / 640))} isActive />
                </motion.div>
              </AnimatePresence>
            </div>
            {pptJson.slides[activeSlide]?.note && <div className="mx-6 mb-4 px-4 py-3 rounded-xl border text-xs"
              style={{ backgroundColor: 'rgba(245,158,11,.06)', borderColor: 'rgba(245,158,11,.3)', color: 'var(--text-secondary)' }}>
              📝 {pptJson.slides[activeSlide].note}
            </div>}
          </div>
          {/* Edit panel */}
          <div className="w-72 flex-shrink-0 border-l overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="px-5 py-3 border-b flex items-center gap-2 sticky top-0 z-10"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <SlideIcon className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Edit Slide</span>
            </div>
            <SlideEditor slide={pptJson.slides[activeSlide]} onUpdate={handleSlideUpdate}
              onRegenerate={handleRegenSlide} onDelete={handleDeleteSlide}
              onAddSlide={handleAddSlide} isRegenerating={regenIdx === activeSlide} />
          </div>
        </div>
      </div>
    );
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────
  if (mode === 'history') return (
    <div className="space-y-6 py-4">
      <Toaster position="top-right" />
      <button onClick={() => setMode('home')} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}><ChevronLeft className="w-4 h-4" /> Back</button>
      <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Presentation History</h1>
      <div className="space-y-3">
        {history.length === 0 ? <p className="text-center py-12" style={{ color: 'var(--text-muted)' }}>No history yet</p>
          : history.map(h => (
            <motion.div
              key={h._id}
              whileHover={{ y: -1 }}
              onClick={() => loadFromHistory(h)}
              className="rounded-xl border p-4 cursor-pointer transition-all flex items-center gap-4 group relative"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: h.pptJson ? 'var(--brand-light)' : 'var(--bg-subtle)' }}>
                <FileText className="w-5 h-5" style={{ color: h.pptJson ? 'var(--brand-primary)' : 'var(--text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{h.originalFileId?.fileName || 'Untitled'}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {h.pptJson ? `${h.pptJson.slides?.length || 0} slides` : 'No slides'} · {new Date(h.createdAt).toLocaleDateString()}
                  {h.pptJson?.title ? ` · "${h.pptJson.title}"` : ''}
                </p>
              </div>

              {/* Hover-only delete button – appears exactly when mouse hovers the card */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(h._id);
                }}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white shadow-sm border border-transparent hover:border-red-200 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="Delete presentation"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>

              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            </motion.div>
          ))}
      </div>
    </div>
  );

  return null;
};

export default DeckPrep;