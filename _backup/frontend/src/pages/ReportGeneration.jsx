// src/pages/ReportGeneration.jsx
// Complete rebuild — Manual editor + AI generator + History in one page
// No sub-component files needed. CSS variables throughout.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText, Zap, History, RefreshCw, Save, Download, Send, Trash2,
  Edit2, Eye, X, CheckSquare, Square, Loader2, ChevronDown, ChevronUp,
  Sparkles, Calendar, Search, Plus, Check, AlertCircle, BookOpen,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ── Shared helpers ────────────────────────────────────────────────────────────
const REPORT_TYPES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'];

const STATUS_STYLES = {
  draft:     { bg: 'rgba(245,158,11,.12)', color: '#d97706'  },
  submitted: { bg: 'var(--brand-light)',   color: 'var(--brand-primary)' },
  approved:  { bg: 'rgba(22,163,74,.12)',  color: '#16a34a'  },
  rejected:  { bg: 'rgba(220,38,38,.12)',  color: '#dc2626'  },
};

const inp = (focus) => ({
  backgroundColor: 'var(--input-bg)',
  color:           'var(--text-primary)',
  border:          `1px solid ${focus ? 'var(--brand-accent)' : 'var(--input-border)'}`,
  borderRadius:    12,
  outline:         'none',
  width:           '100%',
  padding:         '10px 14px',
  fontSize:        14,
});

const cleanMarkdown = (text) =>
  text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ── PDF export via jsPDF ──────────────────────────────────────────────────────
const exportPDF = async (title, reportType, content) => {
  const jsPDF = (await import('jspdf')).default;
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
  const margin = 1;
  const printW = doc.internal.pageSize.getWidth() - 2 * margin;
  let y = margin + 0.5;

  const write = (text, size, bold = false, gap = 1.15) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.splitTextToSize(text, printW).forEach(line => {
      if (y > 10) { doc.addPage(); y = margin + 0.5; }
      doc.text(line, margin, y);
      y += (size / 72) * gap;
    });
  };

  write(title || 'Progress Report', 20, true, 1.5);
  y += 0.3;
  write(`${reportType?.toUpperCase()} · ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}`, 12, false, 1.2);
  y += 0.5;

  cleanMarkdown(content).split('\n\n').filter(p => p.trim()).forEach(p => {
    write(p, 12, false, 1.2);
    y += 0.25;
  });

  doc.save(`${(title || 'report').replace(/[^a-z0-9]/gi, '_')}.pdf`);
};

// ── Section heading ───────────────────────────────────────────────────────────
const SectionHeading = ({ children, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-5">
    {Icon && <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
    <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{children}</h2>
    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
  </div>
);

// ── Focused input/textarea helper component ───────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
      {label}
    </label>
    {children}
  </div>
);

const FocusInput = ({ ...props }) => {
  const [f, setF] = useState(false);
  return (
    <input {...props}
      style={inp(f)}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)} />
  );
};

const FocusSelect = ({ children, ...props }) => {
  const [f, setF] = useState(false);
  return (
    <select {...props}
      style={{ ...inp(f), cursor: 'pointer' }}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}>
      {children}
    </select>
  );
};

const FocusTextarea = ({ rows = 6, ...props }) => {
  const [f, setF] = useState(false);
  return (
    <textarea {...props} rows={rows}
      style={{ ...inp(f), resize: 'vertical' }}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)} />
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── MANUAL EDITOR ────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const ManualEditor = ({ user, tasks, editReport = null, onSaved, onCancel }) => {
  const [title,      setTitle]      = useState(editReport?.title || '');
  const [type,       setType]       = useState(editReport?.reportType || 'weekly');
  const [start,      setStart]      = useState(editReport?.periodStart ? new Date(editReport.periodStart).toISOString().split('T')[0] : '');
  const [end,        setEnd]        = useState(editReport?.periodEnd   ? new Date(editReport.periodEnd).toISOString().split('T')[0]   : '');
  const [content,    setContent]    = useState(editReport?.content || '');
  const [saving,     setSaving]     = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const isEdit = !!editReport;

  const save = async () => {
    if (!title.trim() || !content.trim()) return toast.error('Title and content are required');
    setSaving(true);
    try {
      const body = {
        title, reportType: type,
        periodStart: start || new Date().toISOString().split('T')[0],
        periodEnd:   end   || new Date().toISOString().split('T')[0],
        content,
      };
      if (isEdit) {
        await axios.put(`${API}/api/reports/${editReport._id}`, body, { headers: headers() });
        toast.success('Report updated!');
      } else {
        await axios.post(`${API}/api/reports`, body, { headers: headers() });
        toast.success('Saved as draft!');
        setTitle(''); setContent('');
      }
      onSaved?.();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const doExport = async () => {
    if (!content.trim()) return toast.error('Nothing to export');
    setExporting(true);
    try { await exportPDF(title, type, content); toast.success('PDF exported!'); }
    catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <SectionHeading icon={FileText}>{isEdit ? 'Edit Report' : 'Write Report'}</SectionHeading>

      <div className="rounded-2xl border p-6 space-y-5"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>

        <Field label="Report Title">
          <FocusInput value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Weekly Progress Report — Week 24" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Type">
            <FocusSelect value={type} onChange={e => setType(e.target.value)}>
              {REPORT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </FocusSelect>
          </Field>
          <Field label="From">
            <FocusInput type="date" value={start} onChange={e => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <FocusInput type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </Field>
        </div>

        <Field label={`Content (${content.length}/10000 chars)`}>
          <FocusTextarea rows={14} value={content} onChange={e => setContent(e.target.value)}
            placeholder="Write your report here. Include what you completed, what is pending, and any blockers." />
        </Field>

        {/* Live preview toggle */}
        {content.trim() && <MarkdownPreview content={content} />}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save as Draft'}
          </button>
          <button onClick={doExport} disabled={exporting || !content.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#16a34a' }}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
          {isEdit && (
            <button onClick={onCancel}
              className="px-6 py-3 rounded-xl font-bold transition-colors"
              style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Markdown preview (collapsible) ───────────────────────────────────────────
const MarkdownPreview = ({ content }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Preview
        </div>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-5 py-4 border-t prose prose-sm max-w-none"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-subtle)' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── AI GENERATOR ─────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const AIGenerator = ({ user, tasks, onSaved }) => {
  const [type,       setType]       = useState('weekly');
  const [start,      setStart]      = useState('');
  const [end,        setEnd]        = useState('');
  const [prompt,     setPrompt]     = useState('');
  const [selected,   setSelected]   = useState(new Set());
  const [search,     setSearch]     = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [result,     setResult]     = useState('');
  const [error,      setError]      = useState('');

  // Filter tasks by date range + search
  const filtered = (tasks || []).filter(t => {
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (start && end && t.dueDate) {
      const d = new Date(t.dueDate);
      return d >= new Date(start) && d <= new Date(end);
    }
    return true;
  });

  const toggle = id => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const selectAll   = () => setSelected(new Set(filtered.map(t => t._id)));
  const deselectAll = () => setSelected(new Set());

  const generate = async () => {
    if (!selected.size) return toast.error('Select at least one task');
    setGenerating(true); setResult(''); setError('');
    try {
      const r = await axios.post(`${API}/api/reports/ai-generate`, {
        reportType: type, periodStart: start, periodEnd: end,
        selectedTaskIds: [...selected], customPrompt: prompt,
      }, { headers: headers() });
      setResult(r.data.content || '');
      toast.success('Report generated!');
    } catch (e) {
      const msg = e.response?.data?.message || 'Generation failed';
      setError(msg); toast.error(msg);
    } finally { setGenerating(false); }
  };

  const save = async () => {
    if (!result.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/api/reports/ai-save`, {
        reportType: type, periodStart: start, periodEnd: end,
        content: result, selectedTaskIds: [...selected],
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} AI Report`,
      }, { headers: headers() });
      toast.success('Saved to history!');
      onSaved?.();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const doExport = async () => {
    if (!result.trim()) return;
    setExporting(true);
    try {
      await exportPDF(`${type.charAt(0).toUpperCase() + type.slice(1)} AI Report`, type, result);
      toast.success('PDF exported!');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-6">
      <SectionHeading icon={Sparkles}>AI Report Generator</SectionHeading>

      {/* Config row */}
      <div className="rounded-2xl border p-6 space-y-5"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Report Type">
            <FocusSelect value={type} onChange={e => setType(e.target.value)}>
              {REPORT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </FocusSelect>
          </Field>
          <Field label="From">
            <FocusInput type="date" value={start} onChange={e => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <FocusInput type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </Field>
        </div>

        <Field label="Special Instructions (optional)">
          <FocusTextarea rows={3} value={prompt} onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. Focus on blockers. Use formal tone. Include a summary table." />
        </Field>
      </div>

      {/* Task selector */}
      <div className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Select Tasks to Include
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              ({selected.size} of {filtered.length} selected)
            </span>
          </p>
          <div className="flex gap-2">
            <button onClick={selectAll}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
              All
            </button>
            <button onClick={deselectAll}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              None
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y" style={{ divideColor: 'var(--border-color)' }}>
          {filtered.length === 0 && (
            <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No tasks found</p>
          )}
          {filtered.map(task => {
            const sel = selected.has(task._id);
            const done = (task.checklist || []).filter(c => c.completed).length;
            const tot  = (task.checklist || []).length;
            return (
              <div key={task._id} onClick={() => toggle(task._id)}
                className="flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors"
                style={{ backgroundColor: sel ? 'var(--brand-light)' : 'transparent' }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <div className="mt-0.5 flex-shrink-0">
                  {sel
                    ? <CheckSquare className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                    : <Square className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {task.priority && <span className="capitalize">{task.priority}</span>}
                    {task.dueDate  && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
                    {tot > 0 && <span style={{ color: 'var(--brand-accent)' }}>{done}/{tot} checklist</span>}
                  </div>
                </div>
                {task.completed && <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Generate button */}
      <button onClick={generate} disabled={generating || !selected.size}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-white text-base hover:opacity-90 transition-opacity disabled:opacity-40"
        style={{ backgroundColor: 'var(--brand-primary)' }}>
        {generating
          ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating with AI…</>
          : <> Generate Report with AI</>}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border"
          style={{ backgroundColor: 'rgba(220,38,38,.06)', borderColor: 'rgba(220,38,38,.3)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
          <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Generated Report</span>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-primary)' }}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : 'Save to History'}
              </button>
              <button onClick={doExport} disabled={exporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#16a34a' }}>
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {exporting ? 'Exporting…' : 'Export PDF'}
              </button>
            </div>
          </div>
          <div className="px-6 py-5 prose prose-sm max-w-none"
            style={{ color: 'var(--text-primary)' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── HISTORY ───────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const ReportHistory = ({ user, onEditReport }) => {
  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('');
  const [viewing,   setViewing]   = useState(null);
  const [deleteId,  setDeleteId]  = useState(null);
  const [exporting, setExporting] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/api/reports`, { headers: headers() });
      setReports(r.data.reports || []);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const submit = async (id) => {
    try {
      await axios.post(`${API}/api/reports/${id}/submit`, {}, { headers: headers() });
      toast.success('Submitted!'); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Submit failed'); }
  };

  const doDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API}/api/reports/${deleteId}`, { headers: headers() });
      toast.success('Deleted'); setDeleteId(null); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Delete failed'); }
  };

  const doExport = async (report) => {
    setExporting(report._id);
    try { await exportPDF(report.title, report.reportType, report.content); toast.success('PDF exported!'); }
    catch { toast.error('Export failed'); }
    finally { setExporting(null); }
  };

  const filtered = reports.filter(r => {
    if (filter && r.status !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const STAT_FILTER = [
    { key: '', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading icon={History}>Report History</SectionHeading>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search reports…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text-primary)' }} />
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          {STAT_FILTER.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={filter === f.key
                ? { backgroundColor: 'var(--brand-primary)', color: '#fff' }
                : { color: 'var(--text-secondary)' }}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={fetch}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin" style={{ color: 'var(--brand-primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>No reports yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Create your first report above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => {
            const st = STATUS_STYLES[report.status] || STATUS_STYLES.draft;
            const hasAdminNotes = report.adminNotes?.length > 0;
            const reviewerName = report.reviewedBy
              ? `${report.reviewedBy.firstName || ''} ${report.reviewedBy.lastName || ''}`.trim()
              : null;

            return (
              <motion.div key={report._id} whileHover={{ y: -1 }}
                className="rounded-xl border p-4 transition-all"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{report.title}</p>
                      {report.aiGenerated && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                          style={{ backgroundColor: 'rgba(54,169,225,.1)', color: '#36a9e1' }}>AI</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                      <span className="capitalize">{report.reportType}</span>
                      <span>{new Date(report.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: st.bg, color: st.color }}>
                        {report.status.toUpperCase()}
                      </span>
                    </div>

                    {/* NEW: Show reviewer info */}
                    {reviewerName && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Reviewed by <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{reviewerName}</span>
                      </p>
                    )}

                    {/* NEW: Show feedback indicator */}
                    {report.feedback && (
                      <p className="text-xs mt-1 italic" style={{ color: '#d97706' }}>
                        💬 Admin feedback available
                      </p>
                    )}

                    {/* NEW: Show admin notes count */}
                    {hasAdminNotes && (
                      <p className="text-xs mt-1" style={{ color: '#7c3aed' }}>
                        📝 {report.adminNotes.length} admin note{report.adminNotes.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                    <button onClick={() => setViewing(report)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>

                    {report.status === 'draft' && (
                      <button onClick={() => onEditReport(report)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}

                    <button onClick={() => doExport(report)} disabled={exporting === report._id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: 'rgba(22,163,74,.1)', color: '#16a34a' }}>
                      {exporting === report._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      PDF
                    </button>

                    {report.status === 'draft' && (
                      <>
                        <button onClick={() => submit(report._id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: 'var(--brand-primary)' }}>
                          <Send className="w-3.5 h-3.5" /> Submit
                        </button>
                        <button onClick={() => setDeleteId(report._id)}
                          className="p-1.5 rounded-lg" style={{ color: '#dc2626' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* View modal — UPDATED: shows admin notes and feedback */}
      <AnimatePresence>
        {viewing && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-40" style={{ backgroundColor:'rgba(0,0,0,.55)' }}
              onClick={() => setViewing(null)} />
            <motion.div initial={{ opacity:0, scale:.96, y:12 }} animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:.96 }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
              style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
                style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-subtle)' }}>
                <div className="min-w-0">
                  <h3 className="font-black truncate" style={{ color:'var(--text-primary)' }}>{viewing.title}</h3>
                  <p className="text-xs mt-0.5" style={{ color:'var(--text-muted)' }}>
                    {viewing.reportType} · {new Date(viewing.createdAt).toLocaleDateString()}
                    {viewing.reviewedBy && (
                      <span> · Reviewed by {viewing.reviewedBy.firstName} {viewing.reviewedBy.lastName}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => doExport(viewing)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor:'#16a34a' }}>
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={() => setViewing(null)}
                    className="p-1.5 rounded-lg" style={{ color:'var(--text-muted)' }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* Report status banner */}
                {viewing.status !== 'draft' && (
                  <div className="mb-4 px-4 py-3 rounded-xl border flex items-center gap-3"
                    style={{
                      backgroundColor: viewing.status === 'approved' ? 'rgba(22,163,74,.06)' : viewing.status === 'rejected' ? 'rgba(220,38,38,.06)' : 'rgba(217,119,6,.06)',
                      borderColor: viewing.status === 'approved' ? 'rgba(22,163,74,.3)' : viewing.status === 'rejected' ? 'rgba(220,38,38,.3)' : 'rgba(217,119,6,.3)',
                    }}>
                    <span className="text-sm font-bold capitalize"
                      style={{ color: viewing.status === 'approved' ? '#16a34a' : viewing.status === 'rejected' ? '#dc2626' : '#d97706' }}>
                      {viewing.status === 'approved' ? '✅ Approved' : viewing.status === 'rejected' ? '❌ Rejected' : '⏳ ' + viewing.status}
                    </span>
                  </div>
                )}

                <div className="prose prose-sm max-w-none" style={{ color:'var(--text-primary)' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewing.content}</ReactMarkdown>
                </div>

                {/* Admin feedback */}
                {viewing.feedback && (
                  <div className="mt-6 p-4 rounded-xl border"
                    style={{ backgroundColor:'rgba(245,158,11,.06)', borderColor:'rgba(245,158,11,.3)' }}>
                    <p className="text-sm font-bold mb-2" style={{ color:'#b45309' }}>💬 Admin Feedback</p>
                    <p className="text-sm whitespace-pre-wrap" style={{ color:'var(--text-secondary)' }}>{viewing.feedback}</p>
                  </div>
                )}

                {/* NEW: Admin Notes section */}
                {viewing.adminNotes?.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-wide mb-3 flex items-center gap-1.5"
                      style={{ color: '#7c3aed' }}>
                      📝 Admin Notes ({viewing.adminNotes.length})
                    </p>
                    <div className="space-y-3">
                      {viewing.adminNotes.map((note, i) => (
                        <div key={i} className="p-4 rounded-xl border"
                          style={{ backgroundColor: 'rgba(147,51,234,0.04)', borderColor: 'rgba(147,51,234,0.2)' }}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: '#7c3aed' }}>
                              {(note.user?.firstName || 'A').charAt(0)}
                            </div>
                            <p className="text-xs font-bold" style={{ color: '#7c3aed' }}>
                              {note.user?.firstName || 'Admin'} {note.user?.lastName || ''}
                              {note.user?.role && note.user.role !== 'standard' && (
                                <span className="ml-1 text-[10px] font-normal opacity-70">({note.user.role})</span>
                              )}
                            </p>
                            <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                              {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                            {note.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-40" style={{ backgroundColor:'rgba(0,0,0,.5)' }}
              onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity:0, scale:.95 }} animate={{ opacity:1, scale:1 }}
              exit={{ opacity:0, scale:.95 }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
              style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
              <h3 className="font-bold text-base mb-2" style={{ color:'var(--text-primary)' }}>Delete Report?</h3>
              <p className="text-sm mb-5" style={{ color:'var(--text-secondary)' }}>This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor:'var(--border-color)', color:'var(--text-secondary)' }}>Cancel</button>
                <button onClick={doDelete}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor:'#dc2626' }}>Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'manual',  label: 'Write Report', icon: FileText  },
  { key: 'ai',      label: 'AI Generate',  icon: Sparkles  },
  { key: 'history', label: 'History',      icon: History   },
];

const ReportGeneration = () => {
  const { user, tasks = [], fetchTasks } = useOutletContext();
  const [tab,        setTab]        = useState('manual');
  const [editReport, setEditReport] = useState(null);   // report being edited (from history)
  const [refreshing, setRefreshing] = useState(false);
  const historyKey = useRef(0); // force history re-mount on save

  const refresh = async () => {
    setRefreshing(true);
    await fetchTasks?.();
    setRefreshing(false);
    toast.success('Tasks refreshed');
  };

  const goHistory = () => { historyKey.current++; setTab('history'); setEditReport(null); };

  const handleEditFromHistory = (report) => {
    setEditReport(report);
    setTab('manual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 py-4">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <FileText className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            Report Generation
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Write manually or let AI build your report from tasks
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Tasks
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== 'manual') setEditReport(null); }}
            className="flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all"
            style={tab === t.key
              ? { borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }
              : { borderColor: 'transparent', color: 'var(--text-secondary)' }}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab + (editReport?._id || '')}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}>
          {tab === 'manual' && (
            <ManualEditor
              user={user}
              tasks={tasks}
              editReport={editReport}
              onSaved={goHistory}
              onCancel={() => setEditReport(null)}
            />
          )}
          {tab === 'ai' && (
            <AIGenerator
              user={user}
              tasks={tasks}
              onSaved={goHistory}
            />
          )}
          {tab === 'history' && (
            <ReportHistory
              key={historyKey.current}
              user={user}
              onEditReport={handleEditFromHistory}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ReportGeneration;