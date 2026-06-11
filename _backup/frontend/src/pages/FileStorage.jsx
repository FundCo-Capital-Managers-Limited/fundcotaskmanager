// src/pages/FileStorage.jsx
// FundCo Cloud Storage — Complete rebuild
// Features: folder tree, grid/list, preview (pdf/image/video/docx),
//           drag-to-move, bulk ops, tags, share links, trash, storage bar
import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  HardDrive, ArrowLeftRight, Upload, FolderPlus, Grid3X3, List, Search, Star, Trash2,
  ChevronRight, ChevronLeft, ChevronDown, ChevronUp, X, Plus, Download,
  Share2, Tag, Link2, Info, Folder, FolderOpen, FileText, Image, Film,
  File as FileIcon, RefreshCw, Check, Copy, Edit2, Move, Loader2,
  AlertTriangle, Eye, RotateCcw, Layers, Menu,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL;
const IPFS = 'https://gateway.pinata.cloud/ipfs';
const TOTAL_STORAGE = 2 * 1024 * 1024 * 1024; // 2 GB
const ALLOWED_EXTS  = ['pdf','docx','doc','jpg','jpeg','png','mp4','webm','xls','xlsx','ppt','pptx','txt','csv','zip'];

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const fmtSize = (b) => {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  if (b < 1073741824) return `${(b/1048576).toFixed(1)} MB`;
  return `${(b/1073741824).toFixed(2)} GB`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';

// ── File type helpers ─────────────────────────────────────────────────────────
const EXT_GROUPS = {
  image:  ['jpg','jpeg','png','gif','webp'],
  video:  ['mp4','webm','mov'],
  pdf:    ['pdf'],
  doc:    ['docx','doc'],
  sheet:  ['xls','xlsx','csv'],
  slide:  ['ppt','pptx'],
  text:   ['txt','md'],
  archive:['zip','tar','gz'],
};
const extGroup = (ext) => {
  const e = (ext||'').toLowerCase();
  return Object.keys(EXT_GROUPS).find(g => EXT_GROUPS[g].includes(e)) || 'other';
};
const EXT_COLORS = {
  image:'#22c55e', video:'#a855f7', pdf:'#ef4444',
  doc:'#3b82f6',   sheet:'#16a34a', slide:'#f97316',
  text:'#64748b',  archive:'#f59e0b', other:'#94a3b8',
};
const EXT_ICONS = {
  image: Image, video: Film, pdf: FileText, doc: FileText,
  sheet: FileText, slide: FileText, text: FileText,
  archive: Layers, other: FileIcon,
};
const FileTypeIcon = ({ type, size = 5 }) => {
  const g = extGroup(type);
  const Icon = EXT_ICONS[g] || FileIcon;
  return <Icon className={`w-${size} h-${size}`} style={{ color: EXT_COLORS[g] }} />;
};

// ── Modal shell ───────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, width = 'max-w-lg', children }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          className="fixed inset-0 z-40 bg-black/55" onClick={onClose} />
        <motion.div initial={{ opacity:0, scale:.96, y:10 }} animate={{ opacity:1, scale:1, y:0 }}
          exit={{ opacity:0, scale:.96 }}
          className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] ${width} rounded-2xl border shadow-2xl`}
          style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor:'var(--border-color)' }}>
            <h3 className="font-black text-sm" style={{ color:'var(--text-primary)' }}>{title}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg"
              style={{ color:'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ── Field helper ──────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wide mb-1.5"
      style={{ color:'var(--text-muted)' }}>{label}</label>
    {children}
  </div>
);
const inp = { backgroundColor:'var(--input-bg)', color:'var(--text-primary)', border:'1px solid var(--input-border)', borderRadius:10, padding:'8px 12px', width:'100%', fontSize:13, outline:'none' };

// ── Storage bar ───────────────────────────────────────────────────────────────
const StorageBar = ({ used, total }) => {
  const pct = Math.min((used / total) * 100, 100);
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : 'var(--brand-primary)';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color:'var(--text-muted)' }}>{fmtSize(used)} used</span>
        <span className="font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor:'var(--bg-hover)' }}>
        <motion.div className="h-full rounded-full" style={{ backgroundColor:color }}
          initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.6 }} />
      </div>
      <p className="text-xs mt-1" style={{ color:'var(--text-muted)' }}>
        {fmtSize(total)} total
      </p>
    </div>
  );
};

// ── Folder tree node ──────────────────────────────────────────────────────────
const FolderTreeNode = ({ folder, allFolders, activeId, onSelect, depth = 0 }) => {
  const [open, setOpen] = useState(false);
  const children = allFolders.filter(f => f.parentId === folder._id);
  const isActive = activeId === folder._id;

  return (
    <div>
      <div className="flex items-center gap-1 rounded-xl px-2 py-1.5 cursor-pointer group transition-colors"
        style={{
          paddingLeft: `${8 + depth * 14}px`,
          backgroundColor: isActive ? 'var(--brand-light)' : 'transparent',
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
        onClick={() => { onSelect(folder._id); }}>
        <button onClick={e => { e.stopPropagation(); setOpen(p => !p); }}
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}>
          {children.length > 0
            ? (open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)
            : <span className="w-3" />}
        </button>
        {isActive
          ? <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color:'var(--brand-primary)' }} />
          : <Folder className="w-4 h-4 flex-shrink-0" style={{ color: folder.color || '#f59e0b' }} />}
        <span className="text-xs font-semibold truncate ml-1.5"
          style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
          {folder.name}
        </span>
      </div>
      {open && children.map(c => (
        <FolderTreeNode key={c._id} folder={c} allFolders={allFolders}
          activeId={activeId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
};

// ── Upload zone ───────────────────────────────────────────────────────────────
const UploadModal = ({ open, onClose, folderId, tasks, onDone }) => {
  const [files,     setFiles]     = useState([]);
  const [taskId,    setTaskId]    = useState('');
  const [tags,      setTags]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef();

  const addFiles = (incoming) => {
    const valid = [...incoming].filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) { toast.error(`${f.name}: unsupported type`); return false; }
      if (f.size > 25 * 1024 * 1024)  { toast.error(`${f.name}: exceeds 25 MB`);    return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
  };

  const submit = async () => {
    if (!files.length) return toast.error('Select at least one file');
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      if (taskId)     fd.append('taskId', taskId);
      if (tags.trim()) fd.append('tags', JSON.stringify(tags.split(',').map(t => t.trim()).filter(Boolean)));
      if (folderId)   fd.append('folderId', folderId);

      await axios.post(`${API}/api/files/upload`, fd, {
        headers: { ...auth() },
        onUploadProgress: e => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      toast.success('Files uploaded!');
      setFiles([]); setTags(''); setTaskId(''); setProgress(0);
      onDone(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Files" width="max-w-md">
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          className="border-2 border-dashed rounded-xl p-8 text-center transition-colors"
          style={{ borderColor: dragging ? 'var(--brand-primary)' : 'var(--border-color)', backgroundColor: dragging ? 'var(--brand-light)' : 'var(--bg-subtle)', cursor: 'pointer' }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}>
          <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--brand-primary)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Drop files here or click to browse
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            PDF, DOCX, JPG, PNG, MP4, XLSX, PPTX · Max 25 MB each
          </p>
          <input ref={inputRef} type="file" multiple className="hidden"
            accept={ALLOWED_EXTS.map(e => `.${e}`).join(',')}
            onChange={e => addFiles(e.target.files)} />
        </div>

        {/* Selected files */}
        {files.length > 0 && (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <FileTypeIcon type={f.name.split('.').pop()} size={4} />
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtSize(f.size)}</span>
                <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                  style={{ color: '#dc2626' }}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}

        <Field label="Link to Task (optional)">
          <select value={taskId} onChange={e => setTaskId(e.target.value)} style={inp}>
            <option value="">No task</option>
            {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
          </select>
        </Field>

        <Field label="Tags (comma-separated, optional)">
          <input value={tags} onChange={e => setTags(e.target.value)}
            placeholder="e.g. report, urgent, q3" style={inp} />
        </Field>

        {progress > 0 && progress < 100 && (
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: 'var(--brand-primary)' }} />
          </div>
        )}

        <button onClick={submit} disabled={loading || !files.length}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Upload ${files.length ? `(${files.length} file${files.length > 1 ? 's' : ''})` : ''}`}
        </button>
      </div>
    </Modal>
  );
};

// ── Universal File Viewer ────────────────────────────────────────────────────
// Handles: PDF, DOCX/DOC, XLSX/XLS/CSV, PPTX/PPT, images, video, TXT/CSV plain,
//          ZIP (shows contents), and any unknown type via Google Docs Viewer fallback.

// ── PDF viewer — Google Docs Viewer iframe (no worker, no CORS issues) ─────────
// react-pdf requires a worker script which gets blocked by MIME/CORS in many
// hosting environments. Google Docs Viewer is dependency-free and handles PDFs,
// DOCX, XLSX, PPTX natively via a simple iframe — no installation needed.
const PDFViewer = ({ url }) => (
  <iframe
    src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
    className="w-full rounded-xl border"
    style={{ height: '65vh', borderColor: 'var(--border-color)' }}
    title="PDF preview"
  />
);

// ── Word doc viewer (mammoth DOCX → HTML, DOC → Google Viewer) ───────────────
const DocViewer = ({ url, ext }) => {
  const [html,    setHtml]    = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (ext === 'docx') {
      import('mammoth').then(async m => {
        try {
          const r   = await fetch(url);
          const buf = await r.arrayBuffer();
          const res = await m.default.convertToHtml({ arrayBuffer: buf });
          setHtml(res.value || '<p><em>Empty document</em></p>');
        } catch { setError('Could not render document. Use the Download button.'); }
        finally { setLoading(false); }
      }).catch(() => { setError('mammoth not installed.'); setLoading(false); });
    } else {
      // .doc — old binary format, use Google Docs viewer iframe
      setLoading(false);
    }
  }, [url, ext]);

  if (ext === 'doc') return (
    <iframe
      src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
      className="w-full rounded-xl border"
      style={{ height:'60vh', borderColor:'var(--border-color)' }}
      title="Document preview" />
  );
  if (loading) return <div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color:'var(--brand-primary)' }} /></div>;
  if (error)   return <FallbackViewer url={url} message={error} />;
  return (
    <div className="max-h-[60vh] overflow-y-auto px-5 py-4 rounded-xl border prose prose-sm max-w-none"
      style={{ borderColor:'var(--border-color)', color:'var(--text-primary)', backgroundColor:'var(--bg-subtle)', lineHeight:1.7 }}
      dangerouslySetInnerHTML={{ __html: html }} />
  );
};

// ── Spreadsheet viewer (SheetJS) ──────────────────────────────────────────────
const SheetViewer = ({ url, ext }) => {
  const [sheets,   setSheets]   = useState([]);   // [{ name, rows }]
  const [active,   setActive]   = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    import('xlsx').then(async XLSX => {
      try {
        const r   = await fetch(url);
        const buf = await r.arrayBuffer();
        const wb  = XLSX.read(buf, { type:'array' });
        const parsed = wb.SheetNames.map(name => ({
          name,
          rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header:1, defval:'' }),
        }));
        setSheets(parsed);
      } catch { setError('Could not parse spreadsheet.'); }
      finally { setLoading(false); }
    }).catch(() => { setError('SheetJS (xlsx) not installed.'); setLoading(false); });
  }, [url]);

  if (loading) return <div className="h-48 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color:'var(--brand-primary)' }} /></div>;
  if (error)   return <FallbackViewer url={url} message={error} />;
  if (!sheets.length) return <FallbackViewer url={url} message="Empty spreadsheet" />;

  const { rows } = sheets[active];
  const headers  = rows[0] || [];
  const body     = rows.slice(1);

  return (
    <div className="space-y-3">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {sheets.map((s, i) => (
            <button key={i} onClick={() => setActive(i)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all"
              style={active === i
                ? { backgroundColor:'var(--brand-primary)', color:'#fff' }
                : { backgroundColor:'var(--bg-subtle)', color:'var(--text-secondary)' }}>
              {s.name}
            </button>
          ))}
        </div>
      )}
      {/* Table */}
      <div className="max-h-[58vh] overflow-auto rounded-xl border"
        style={{ borderColor:'var(--border-color)' }}>
        <table className="text-xs min-w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor:'var(--bg-subtle)' }}>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-bold border-b border-r whitespace-nowrap"
                  style={{ borderColor:'var(--border-color)', color:'var(--text-primary)', position:'sticky', top:0, backgroundColor:'var(--bg-subtle)' }}>
                  {String(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, ri) => (
              <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-subtle)' }}>
                {headers.map((_, ci) => (
                  <td key={ci} className="px-3 py-1.5 border-b border-r"
                    style={{ borderColor:'var(--border-color)', color:'var(--text-primary)', whiteSpace:'nowrap', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis' }}>
                    {String(row[ci] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {body.length === 0 && (
          <p className="text-center py-8 text-xs" style={{ color:'var(--text-muted)' }}>No data rows</p>
        )}
      </div>
      <p className="text-[10px]" style={{ color:'var(--text-muted)' }}>
        {body.length} row{body.length !== 1 ? 's' : ''} · {headers.length} column{headers.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
};


// ── PPT/PPTX Viewer — Simple & Reliable (Google Docs Viewer) ─────────────────
const SlideViewer = ({ url, ext }) => (
  <div className="space-y-2">
    <iframe
      src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
      className="w-full rounded-xl border"
      style={{ height: '60vh', borderColor: 'var(--border-color)' }}
      title="Presentation preview"
    />
    <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
      Previewing {ext?.toUpperCase()} file • If the preview is blank, use the Download button
    </p>
  </div>
);

// ── Plain text / CSV viewer ───────────────────────────────────────────────────
const TextViewer = ({ url, ext }) => {
  const [text,    setText]    = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(t => setText(t))
      .catch(() => setError('Could not load file text.'))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <div className="h-32 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color:'var(--brand-primary)' }} /></div>;
  if (error)   return <FallbackViewer url={url} message={error} />;

  return (
    <div className="max-h-[60vh] overflow-auto rounded-xl border p-4"
      style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-subtle)' }}>
      <pre className="text-xs whitespace-pre-wrap break-words" style={{ color:'var(--text-primary)', fontFamily:'monospace', lineHeight:1.6 }}>
        {text || '(empty file)'}
      </pre>
    </div>
  );
};

// ── Fallback: Google Docs Viewer (handles most office formats when lib missing) ─
const GoogleDocsViewer = ({ url }) => (
  <iframe
    src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
    className="w-full rounded-xl border"
    style={{ height:'60vh', borderColor:'var(--border-color)' }}
    title="File preview" />
);

// ── Generic fallback ──────────────────────────────────────────────────────────
const FallbackViewer = ({ url, message }) => (
  <div className="flex flex-col items-center justify-center py-10 rounded-xl border gap-3"
    style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-subtle)' }}>
    <FileIcon className="w-12 h-12" style={{ color:'var(--text-muted)' }} />
    {message && <p className="text-sm text-center max-w-xs" style={{ color:'var(--text-secondary)' }}>{message}</p>}
    <div className="flex gap-2">
      <a href={url} download className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90"
        style={{ backgroundColor:'var(--brand-primary)' }}>
        <Download className="w-3.5 h-3.5" /> Download
      </a>
      <a href={url} target="_blank" rel="noreferrer"
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border"
        style={{ borderColor:'var(--border-color)', color:'var(--text-secondary)' }}>
        <Eye className="w-3.5 h-3.5" /> Open in browser
      </a>
    </div>
  </div>
);

// ── PreviewModal — orchestrates all viewers ───────────────────────────────────
const PreviewModal = ({ file, onClose }) => {
  const url   = file ? `${IPFS}/${file.cid}` : '';
  const ext   = (file?.type || '').toLowerCase();
  const group = extGroup(ext);

  const renderViewer = () => {
    if (!file) return null;

    // ── Image ──────────────────────────────────────────────────────────────
    if (group === 'image') return (
      <div className="flex items-center justify-center max-h-[70vh] overflow-auto rounded-xl"
        style={{ backgroundColor:'var(--bg-subtle)' }}>
        <img src={url} alt={file.fileName}
          className="max-w-full max-h-[70vh] object-contain rounded-xl" />
      </div>
    );

    // ── Video ──────────────────────────────────────────────────────────────
    if (group === 'video') return (
      <video controls autoPlay muted playsInline className="w-full max-h-[70vh] rounded-xl bg-black">
        <source src={url} type={ext === 'webm' ? 'video/webm' : 'video/mp4'} />
        Your browser does not support video playback.
      </video>
    );

    // ── PDF ────────────────────────────────────────────────────────────────
    if (group === 'pdf') return <PDFViewer url={url} />;

    // ── Word (DOCX / DOC) ──────────────────────────────────────────────────
    if (group === 'doc') return <DocViewer url={url} ext={ext} />;

    // ── Spreadsheet (XLSX / XLS / CSV) ─────────────────────────────────────
    if (group === 'sheet' || ext === 'csv') return <SheetViewer url={url} ext={ext} />;

    // ── Presentation (PPTX / PPT) ──────────────────────────────────────────
    if (group === 'slide') return <SlideViewer url={url} ext={ext} />;

    // ── Plain text ─────────────────────────────────────────────────────────
    if (group === 'text') return <TextViewer url={url} ext={ext} />;

    // ── Unknown — try Google Docs Viewer first, then fallback ───────────────
    return (
      <div className="space-y-3">
        <GoogleDocsViewer url={url} />
        <p className="text-xs text-center" style={{ color:'var(--text-muted)' }}>
          If the preview above is blank, download the file to view it locally.
        </p>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {file && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ opacity:0, scale:.97, y:12 }} animate={{ opacity:1, scale:1, y:0 }}
            exit={{ opacity:0, scale:.97 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-4xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
            style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0"
              style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-subtle)' }}>
              <FileTypeIcon type={ext} size={5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate" style={{ color:'var(--text-primary)' }}>{file.fileName}</p>
                <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                  {(ext || '').toUpperCase()} · {fmtSize(file.size)} · {fmtDate(file.createdAt)}
                </p>
              </div>
              {/* Action buttons */}
              <a href={url} download={file.fileName}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 flex-shrink-0"
                style={{ backgroundColor:'var(--brand-primary)' }}>
                <Download className="w-3.5 h-3.5" /> Download
              </a>
              <a href={url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border flex-shrink-0"
                style={{ borderColor:'var(--border-color)', color:'var(--text-secondary)' }}>
                <Eye className="w-3.5 h-3.5" /> Open
              </a>
              <button onClick={onClose} className="p-1.5 rounded-lg flex-shrink-0"
                style={{ color:'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {renderViewer()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ── Move modal ────────────────────────────────────────────────────────────────
const MoveModal = ({ open, onClose, folders, onMove }) => {
  const [dest, setDest] = useState('');
  const roots = folders.filter(f => !f.parentId);
  const renderOpts = (list, depth = 0) => list.map(f => {
    const children = folders.filter(c => c.parentId === f._id);
    return (
      <React.Fragment key={f._id}>
        <option value={f._id}>{'— '.repeat(depth)}{f.name}</option>
        {renderOpts(children, depth + 1)}
      </React.Fragment>
    );
  });
  return (
    <Modal open={open} onClose={onClose} title="Move to Folder">
      <div className="space-y-4">
        <Field label="Destination">
          <select value={dest} onChange={e => setDest(e.target.value)} style={inp}>
            <option value="">Root (no folder)</option>
            {renderOpts(roots)}
          </select>
        </Field>
        <button onClick={() => { onMove(dest || null); onClose(); }}
          className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90"
          style={{ backgroundColor:'var(--brand-primary)' }}>
          Move
        </button>
      </div>
    </Modal>
  );
};

// ── Details panel ─────────────────────────────────────────────────────────────
const DetailsPanel = ({ file, folders, tasks, onClose, onRefresh }) => {
  const [tagInput, setTagInput] = useState('');
  const [taskId,   setTaskId]   = useState(file?.taskId || '');
  const [savingTag,  setSavingTag]  = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [shareLink,  setShareLink]  = useState(file?.shareLink || '');
  const [sharing,    setSharing]    = useState(false);

  useEffect(() => {
    setTaskId(file?.taskId || '');
    setShareLink(file?.shareLink || '');
  }, [file]);

  const addTag = async () => {
    if (!tagInput.trim()) return;
    setSavingTag(true);
    try {
      const current = file.tags || [];
      if (current.includes(tagInput.trim())) { toast.error('Tag already exists'); return; }
      await axios.patch(`${API}/api/files/${file._id}/tags`,
        { tags: [...current, tagInput.trim()] }, { headers: auth() });
      setTagInput('');
      onRefresh();
      toast.success('Tag added');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSavingTag(false); }
  };

  const removeTag = async (tag) => {
    try {
      await axios.patch(`${API}/api/files/${file._id}/tags`,
        { tags: (file.tags || []).filter(t => t !== tag) }, { headers: auth() });
      onRefresh();
    } catch { toast.error('Failed to remove tag'); }
  };

  const saveTask = async () => {
    setSavingTask(true);
    try {
      await axios.patch(`${API}/api/files/${file._id}/task`,
        { taskId: taskId || null }, { headers: auth() });
      onRefresh();
      toast.success('Task linked');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSavingTask(false); }
  };

  const getShare = async () => {
    setSharing(true);
    try {
      const r = await axios.post(`${API}/api/files/${file._id}/share`,
        { expiresInDays: 7 }, { headers: auth() });
      setShareLink(r.data.shareLink);
      await navigator.clipboard.writeText(r.data.shareLink);
      toast.success('Share link copied!');
    } catch { toast.error('Failed to generate share link'); }
    finally { setSharing(false); }
  };

  const folderName = file?.folderId
    ? folders.find(f => f._id === file.folderId)?.name || 'Unknown'
    : 'Root';

  return (
    <motion.div initial={{ x: 280, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      exit={{ x: 280, opacity: 0 }} transition={{ type:'tween', duration:.2 }}
      className="w-72 flex-shrink-0 border-l flex flex-col overflow-hidden"
      style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor:'var(--border-color)' }}>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color:'var(--text-muted)' }}>Details</span>
        <button onClick={onClose} className="p-1.5 rounded-lg"
          style={{ color:'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Thumbnail */}
        <div className="w-full h-28 rounded-xl flex items-center justify-center"
          style={{ backgroundColor:'var(--bg-subtle)' }}>
          {['jpg','jpeg','png'].includes(file?.type)
            ? <img src={`${IPFS}/${file.cid}`} alt={file.fileName}
                className="w-full h-full object-cover rounded-xl" />
            : <FileTypeIcon type={file?.type} size={12} />}
        </div>

        {/* Meta */}
        <div className="space-y-2 text-xs">
          <p className="font-bold text-sm truncate" style={{ color:'var(--text-primary)' }}>{file?.fileName}</p>
          {[
            ['Type',     (file?.type || '').toUpperCase()],
            ['Size',     fmtSize(file?.size)],
            ['Folder',   folderName],
            ['Uploaded', fmtDate(file?.createdAt)],
            ['Task',     file?.taskTitle || '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color:'var(--text-muted)' }}>{k}</span>
              <span className="font-medium truncate ml-2" style={{ color:'var(--text-primary)' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color:'var(--text-muted)' }}>Tags</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(file?.tags || []).map(t => (
              <span key={t} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor:'var(--brand-light)', color:'var(--brand-primary)' }}>
                {t}
                <button onClick={() => removeTag(t)} style={{ color:'var(--brand-primary)' }}><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag()}
              placeholder="Add tag…"
              style={{ ...inp, flex: 1, padding: '6px 10px', fontSize: 12 }} />
            <button onClick={addTag} disabled={savingTag}
              className="px-3 rounded-xl text-xs font-bold text-white hover:opacity-90"
              style={{ backgroundColor:'var(--brand-primary)' }}>
              {savingTag ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Link task */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color:'var(--text-muted)' }}>Linked Task</p>
          <div className="flex gap-2">
            <select value={taskId} onChange={e => setTaskId(e.target.value)}
              style={{ ...inp, flex: 1, fontSize: 12, padding: '6px 10px' }}>
              <option value="">No task</option>
              {tasks.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
            </select>
            <button onClick={saveTask} disabled={savingTask}
              className="px-3 rounded-xl text-xs font-bold text-white hover:opacity-90"
              style={{ backgroundColor:'var(--brand-primary)' }}>
              {savingTask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Share */}
        <div>
          <p className="text-xs font-bold mb-2" style={{ color:'var(--text-muted)' }}>Share Link</p>
          {shareLink ? (
            <div className="flex gap-2">
              <input value={shareLink} readOnly
                style={{ ...inp, flex: 1, fontSize: 11, padding: '6px 8px' }} />
              <button onClick={() => { navigator.clipboard.writeText(shareLink); toast.success('Copied!'); }}
                className="px-3 rounded-xl text-xs text-white hover:opacity-90"
                style={{ backgroundColor:'var(--brand-primary)' }}>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={getShare} disabled={sharing}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border"
              style={{ borderColor:'var(--border-color)', color:'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
              {sharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              Generate share link (7 days)
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── File card (grid) ──────────────────────────────────────────────────────────
const FileCard = ({ file, selected, onSelect, onPreview, onDetails, onDelete, onStar }) => {
  const isImg = ['jpg','jpeg','png'].includes(file.type);
  const url   = `${IPFS}/${file.cid}`;

  return (
    <motion.div whileHover={{ y: -2 }}
      className="group rounded-xl border overflow-hidden cursor-pointer transition-all relative"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: selected ? 'var(--brand-primary)' : 'var(--border-color)',
        boxShadow: selected ? '0 0 0 2px var(--brand-primary)' : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--brand-accent)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
      onClick={() => onPreview(file)}>

      {/* Checkbox */}
      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: selected ? 1 : undefined }}
        onClick={e => { e.stopPropagation(); onSelect(file._id); }}>
        <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center"
          style={{ backgroundColor: selected ? 'var(--brand-primary)' : 'var(--bg-surface)', borderColor: selected ? 'var(--brand-primary)' : 'var(--border-color)' }}>
          {selected && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>

      {/* Star */}
      <button className="absolute top-2 right-2 z-10 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: file.starred ? 1 : undefined, backgroundColor: 'var(--bg-surface)' }}
        onClick={e => { e.stopPropagation(); onStar(file._id); }}>
        <Star className="w-3.5 h-3.5" style={{ color: file.starred ? '#f59e0b' : 'var(--text-muted)', fill: file.starred ? '#f59e0b' : 'none' }} />
      </button>

      {/* Thumbnail */}
      <div className="h-32 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-subtle)' }}>
        {isImg
          ? <img src={url} alt={file.fileName} className="w-full h-full object-cover" />
          : <FileTypeIcon type={file.type} size={10} />}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{file.fileName}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {fmtSize(file.size)} · {fmtDate(file.createdAt)}
        </p>
        {file.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {file.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 rounded-lg" style={{ backgroundColor:'var(--bg-surface)', color:'var(--text-muted)' }}
          onClick={e => { e.stopPropagation(); onDetails(file); }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor='var(--bg-surface)'}>
          <Info className="w-3.5 h-3.5" />
        </button>
        <button className="p-1.5 rounded-lg" style={{ backgroundColor:'var(--bg-surface)', color:'#dc2626' }}
          onClick={e => { e.stopPropagation(); onDelete(file._id); }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(220,38,38,.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor='var(--bg-surface)'}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
};

// ── File row (list) ───────────────────────────────────────────────────────────
const FileRow = ({ file, selected, onSelect, onPreview, onDetails, onDelete, onStar }) => (
  <div className="group flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer"
    style={{
      backgroundColor: selected ? 'var(--brand-light)' : 'var(--bg-surface)',
      borderColor: selected ? 'var(--brand-primary)' : 'var(--border-color)',
    }}
    onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--brand-accent)'; e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}}
    onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; }}}
    onClick={() => onPreview(file)}>

    <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: selected ? 'var(--brand-primary)' : 'transparent', borderColor: selected ? 'var(--brand-primary)' : 'var(--border-color)' }}
      onClick={e => { e.stopPropagation(); onSelect(file._id); }}>
      {selected && <Check className="w-3 h-3 text-white" />}
    </div>

    <FileTypeIcon type={file.type} size={4.5} />

    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate" style={{ color:'var(--text-primary)' }}>{file.fileName}</p>
      <p className="text-xs" style={{ color:'var(--text-muted)' }}>
        {(file.type||'').toUpperCase()} · {fmtSize(file.size)} · {fmtDate(file.createdAt)}
      </p>
    </div>

    {file.tags?.slice(0,2).map(t => (
      <span key={t} className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ backgroundColor:'var(--bg-hover)', color:'var(--text-muted)' }}>{t}</span>
    ))}

    {file.taskTitle && (
      <span className="hidden md:inline text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ backgroundColor:'var(--brand-light)', color:'var(--brand-primary)' }}>
        {file.taskTitle}
      </span>
    )}

    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={e => { e.stopPropagation(); onStar(file._id); }} className="p-1.5 rounded-lg"
        style={{ color: file.starred ? '#f59e0b' : 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
        <Star className="w-3.5 h-3.5" style={{ fill: file.starred ? '#f59e0b' : 'none' }} />
      </button>
      <button onClick={e => { e.stopPropagation(); onDetails(file); }} className="p-1.5 rounded-lg"
        style={{ color:'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
        <Info className="w-3.5 h-3.5" />
      </button>
      <button onClick={e => { e.stopPropagation(); onDelete(file._id); }} className="p-1.5 rounded-lg"
        style={{ color:'#dc2626' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(220,38,38,.1)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

// ── Folder card ───────────────────────────────────────────────────────────────
const FolderCard = ({ folder, onOpen, onDelete, onRename, viewMode }) => {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(folder.name);

  const commitRename = async () => {
    if (!name.trim() || name === folder.name) { setRenaming(false); return; }
    await onRename(folder._id, name.trim());
    setRenaming(false);
  };

  if (viewMode === 'list') return (
    <div className="group flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all cursor-pointer"
      style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-accent)'; e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; }}
      onClick={() => onOpen(folder._id)}>
      <Folder className="w-5 h-5 flex-shrink-0" style={{ color: folder.color || '#f59e0b' }} />
      <span className="flex-1 text-sm font-semibold" style={{ color:'var(--text-primary)' }}>{folder.name}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); setRenaming(true); }} className="p-1.5 rounded-lg"
          style={{ color:'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(folder._id); }} className="p-1.5 rounded-lg"
          style={{ color:'#dc2626' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(220,38,38,.1)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <motion.div whileHover={{ y: -2 }}
      className="group rounded-xl border p-4 cursor-pointer transition-all"
      style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
      onClick={() => onOpen(folder._id)}>
      <div className="flex items-start justify-between">
        <Folder className="w-10 h-10 mb-3" style={{ color: folder.color || '#f59e0b' }} />
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); setRenaming(true); }} className="p-1.5 rounded-lg"
            style={{ color:'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete(folder._id); }} className="p-1.5 rounded-lg"
            style={{ color:'#dc2626' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(220,38,38,.1)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {renaming ? (
        <input value={name} autoFocus
          onChange={e => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(folder.name); setRenaming(false); }}}
          style={{ ...inp, padding: '4px 8px', fontSize: 12 }}
          onClick={e => e.stopPropagation()} />
      ) : (
        <p className="text-sm font-bold truncate" style={{ color:'var(--text-primary)' }}>{folder.name}</p>
      )}
    </motion.div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const FileStorage = () => {
  const { user, tasks = [], onLogout } = useOutletContext();

  // ── State ────────────────────────────────────────────────────────────────
  const [files,       setFiles]       = useState([]);
  const [folders,     setFolders]     = useState([]);
  const [currentFolderId, setCurrent] = useState(null); // null = root
  const [viewMode,    setViewMode]    = useState('grid');
  const [showTrash,   setShowTrash]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [sortBy,      setSortBy]      = useState('createdAt');
  const [selected,    setSelected]    = useState(new Set());
  const [storageUsed, setStorageUsed] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [page,        setPage]        = useState(1);

  // modals
  const [uploadOpen,    setUploadOpen]    = useState(false);
  const [previewFile,   setPreviewFile]   = useState(null);
  const [detailsFile,   setDetailsFile]   = useState(null);
  const [moveOpen,      setMoveOpen]      = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [confirmTrash,  setConfirmTrash]  = useState(false);

  const bottomRef = useRef();

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (pg = 1, reset = true) => {
    setLoading(true);
    try {
      const params = {
        page: pg, limit: 40,
        trashed: showTrash,
        folderId: showTrash ? undefined : (currentFolderId ?? 'null'),
        search: search || undefined,
        type:   typeFilter !== 'all' ? typeFilter : undefined,
        sort:   sortBy,
      };
      const [fr, fldr, stor] = await Promise.all([
        axios.get(`${API}/api/files`,         { headers: auth(), params }),
        axios.get(`${API}/api/files/folders`,  { headers: auth() }),
        axios.get(`${API}/api/files/storage`,  { headers: auth() }),
      ]);
      setFiles(prev => reset ? (fr.data.files || []) : [...prev, ...(fr.data.files || [])]);
      setHasMore(fr.data.hasMore || false);
      setFolders(fldr.data.folders || []);
      setStorageUsed(stor.data.used || 0);
    } catch (e) {
      if (e.response?.status === 401) { onLogout?.(); return; }
      toast.error(e.response?.data?.message || 'Failed to load files');
    } finally { setLoading(false); }
  }, [showTrash, currentFolderId, search, typeFilter, sortBy, onLogout]);

  useEffect(() => { setPage(1); fetchAll(1, true); }, [fetchAll]);
  useEffect(() => { if (page > 1) fetchAll(page, false); }, [page]); // eslint-disable-line

  // Infinite scroll
  useEffect(() => {
    if (!bottomRef.current || !hasMore) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setPage(p => p + 1); });
    ob.observe(bottomRef.current);
    return () => ob.disconnect();
  }, [hasMore, files]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const softDelete = async (id) => {
    try {
      await axios.patch(`${API}/api/files/${id}/soft-delete`, {}, { headers: auth() });
      setFiles(p => p.filter(f => f._id !== id));
      setSelected(p => { const n = new Set(p); n.delete(id); return n; });
      toast.success('Moved to trash');
    } catch { toast.error('Delete failed'); }
  };

  const permDelete = async (id) => {
    try {
      await axios.delete(`${API}/api/files/${id}`, { headers: auth() });
      setFiles(p => p.filter(f => f._id !== id));
      setSelected(p => { const n = new Set(p); n.delete(id); return n; });
      toast.success('Permanently deleted');
    } catch { toast.error('Delete failed'); }
  };

  const restore = async (id) => {
    try {
      await axios.patch(`${API}/api/files/${id}/restore`, {}, { headers: auth() });
      setFiles(p => p.filter(f => f._id !== id));
      toast.success('File restored');
    } catch { toast.error('Restore failed'); }
  };

  const clearTrash = async () => {
    try {
      await axios.delete(`${API}/api/files/trash/clear`, { headers: auth() });
      setFiles([]); setConfirmTrash(false);
      toast.success('Trash emptied');
    } catch { toast.error('Failed to clear trash'); }
  };

  const toggleStar = async (id) => {
    try {
      const r = await axios.patch(`${API}/api/files/${id}/star`, {}, { headers: auth() });
      setFiles(p => p.map(f => f._id === id ? { ...f, starred: r.data.starred } : f));
    } catch { toast.error('Failed'); }
  };

  const moveSelected = async (destFolderId) => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      await axios.post(`${API}/api/files/move`, { fileIds: ids, folderId: destFolderId }, { headers: auth() });
      toast.success('Files moved');
      setSelected(new Set());
      fetchAll(1, true);
    } catch { toast.error('Move failed'); }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return toast.error('Enter a folder name');
    try {
      const r = await axios.post(`${API}/api/files/folders`,
        { name: newFolderName.trim(), parentId: currentFolderId || null },
        { headers: auth() });
      setFolders(p => [...p, r.data.folder]);
      setNewFolderName('');
      toast.success('Folder created');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to create folder'); }
  };

  const renameFolder = async (id, name) => {
    try {
      const r = await axios.patch(`${API}/api/files/folders/${id}`, { name }, { headers: auth() });
      setFolders(p => p.map(f => f._id === id ? r.data.folder : f));
    } catch { toast.error('Rename failed'); }
  };

  const deleteFolder = async (id) => {
    try {
      await axios.delete(`${API}/api/files/folders/${id}`, { headers: auth() });
      setFolders(p => p.filter(f => f._id !== id));
      if (currentFolderId === id) setCurrent(null);
      toast.success('Folder deleted');
      fetchAll(1, true);
    } catch { toast.error('Delete failed'); }
  };

  const bulkDelete = () => {
    const arr = [...selected];
    Promise.all(arr.map(id => showTrash ? permDelete(id) : softDelete(id)))
      .then(() => setSelected(new Set()));
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const currentFolders = useMemo(() =>
    folders.filter(f => (f.parentId || null) === (currentFolderId || null)),
    [folders, currentFolderId]);

  const breadcrumbs = useMemo(() => {
    const path = [];
    let id = currentFolderId;
    const map = Object.fromEntries(folders.map(f => [f._id, f]));
    while (id && map[id]) { path.unshift(map[id]); id = map[id].parentId; }
    return path;
  }, [folders, currentFolderId]);

  const TYPE_FILTERS = ['all','pdf','docx','jpg','png','mp4','xlsx','pptx','zip'];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      <Toaster position="top-right" />

      {/* ── Sidebar ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside initial={{ width:0, opacity:0 }} animate={{ width:256, opacity:1 }}
            exit={{ width:0, opacity:0 }} transition={{ duration:.2 }}
            className="flex-shrink-0 border-r flex flex-col overflow-hidden"
            style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>

            {/* Logo row */}
            <div className="flex items-center gap-2 px-4 py-4 border-b"
              style={{ borderColor:'var(--border-color)' }}>
              <HardDrive className="w-5 h-5" style={{ color:'var(--brand-primary)' }} />
              <span className="font-black text-sm" style={{ color:'var(--text-primary)' }}>File Storage</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-5">
              {/* Upload + New Folder */}
              <div className="space-y-2">
                <button onClick={() => setUploadOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor:'var(--brand-primary)' }}>
                  <Upload className="w-4 h-4" /> Upload Files
                </button>
                <div className="flex gap-2">
                  <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createFolder()}
                    placeholder="New folder name…"
                    className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none"
                    style={{ backgroundColor:'var(--bg-subtle)', borderColor:'var(--border-color)', color:'var(--text-primary)' }} />
                  <button onClick={createFolder}
                    className="px-3 py-2 rounded-xl text-white hover:opacity-90"
                    style={{ backgroundColor:'var(--brand-accent)' }}>
                    <FolderPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick nav */}
              <div className="space-y-1">
                {[
                  { label:'All Files',  icon:Folder,    action:() => { setShowTrash(false); setCurrent(null); }, active:!showTrash && currentFolderId === null },
                  { label:'Starred',    icon:Star,       action:() => {}, active:false },
                  { label:'Trash',      icon:Trash2,     action:() => { setShowTrash(true); setCurrent(null); }, active:showTrash },
                ].map(nav => (
                  <button key={nav.label} onClick={nav.action}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all text-left"
                    style={nav.active
                      ? { backgroundColor:'var(--brand-light)', color:'var(--brand-primary)', fontWeight:700 }
                      : { color:'var(--text-secondary)' }}
                    onMouseEnter={e => { if (!nav.active) e.currentTarget.style.backgroundColor='var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!nav.active) e.currentTarget.style.backgroundColor='transparent'; }}>
                    <nav.icon className="w-4 h-4" />
                    {nav.label}
                  </button>
                ))}
              </div>

              {/* Folder tree */}
              {folders.filter(f => !f.parentId).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color:'var(--text-muted)' }}>Folders</p>
                  {folders.filter(f => !f.parentId).map(f => (
                    <FolderTreeNode key={f._id} folder={f} allFolders={folders}
                      activeId={currentFolderId} onSelect={id => { setCurrent(id); setShowTrash(false); }} />
                  ))}
                </div>
              )}

              {/* Storage */}
              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color:'var(--text-muted)' }}>Storage</p>
                <StorageBar used={storageUsed} total={TOTAL_STORAGE} />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 flex-wrap"
          style={{ borderColor:'var(--border-color)', backgroundColor:'var(--bg-surface)' }}>

          <button onClick={() => setSidebarOpen(p => !p)}
            className="p-1.5 rounded-lg"
            style={{ color:'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm min-w-0 flex-1">
            <button onClick={() => { setCurrent(null); setShowTrash(false); }}
              className="font-semibold hover:underline flex-shrink-0"
              style={{ color:'var(--brand-primary)' }}>
              {showTrash ? 'Trash' : 'My Drive'}
            </button>
            {breadcrumbs.map(f => (
              <React.Fragment key={f._id}>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color:'var(--text-muted)' }} />
                <button onClick={() => setCurrent(f._id)}
                  className="font-semibold truncate hover:underline"
                  style={{ color:'var(--brand-primary)' }}>{f.name}</button>
              </React.Fragment>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
            style={{ backgroundColor:'var(--bg-subtle)', borderColor:'var(--border-color)' }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color:'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search files…" className="bg-transparent text-xs focus:outline-none w-36"
              style={{ color:'var(--text-primary)' }} />
            {search && <button onClick={() => setSearch('')} style={{ color:'var(--text-muted)' }}><X className="w-3 h-3" /></button>}
          </div>

          {/* Type filter pills */}
          <div className="flex gap-1 overflow-x-auto">
            {TYPE_FILTERS.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize flex-shrink-0 transition-all"
                style={typeFilter === t
                  ? { backgroundColor:'var(--brand-primary)', color:'#fff' }
                  : { backgroundColor:'var(--bg-subtle)', color:'var(--text-muted)' }}>
                {t === 'all' ? 'All' : t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none"
            style={{ backgroundColor:'var(--bg-subtle)', color:'var(--text-secondary)', borderColor:'var(--border-color)' }}>
            <option value="createdAt">Date</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>

          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor:'var(--border-color)' }}>
            {[['grid', Grid3X3], ['list', List]].map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="p-1.5 transition-colors"
                style={{ backgroundColor: viewMode === mode ? 'var(--brand-primary)' : 'transparent', color: viewMode === mode ? '#fff' : 'var(--text-muted)' }}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <button onClick={() => fetchAll(1, true)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color:'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Bulk action bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
              exit={{ height:0, opacity:0 }}
              className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
              style={{ backgroundColor:'var(--brand-light)', borderColor:'var(--brand-primary)' }}>
              <span className="text-sm font-bold" style={{ color:'var(--brand-primary)' }}>
                {selected.size} selected
              </span>
              {!showTrash && (
                <button onClick={() => setMoveOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor:'var(--brand-primary)', color:'#fff' }}>
                  <Move className="w-3.5 h-3.5" /> Move
                </button>
              )}
              {showTrash && (
                <button onClick={() => [...selected].forEach(id => restore(id)).then && setSelected(new Set())}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor:'#16a34a', color:'#fff' }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
              )}
              <button onClick={bulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ backgroundColor:'rgba(220,38,38,.1)', color:'#dc2626' }}>
                <Trash2 className="w-3.5 h-3.5" />
                {showTrash ? 'Delete forever' : 'Move to trash'}
              </button>
              {showTrash && (
                <button onClick={() => setConfirmTrash(true)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ backgroundColor:'#dc2626', color:'#fff' }}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Empty Trash
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="ml-auto p-1.5 rounded-lg"
                style={{ color:'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content area + details panel */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-4">
            {loading && files.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color:'var(--brand-primary)' }} />
              </div>
            ) : (
              <>
                {/* Folders section */}
                {!showTrash && currentFolders.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color:'var(--text-muted)' }}>
                      Folders ({currentFolders.length})
                    </p>
                    <div className={viewMode === 'grid'
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'
                      : 'space-y-2'}>
                      {currentFolders.map(f => (
                        <FolderCard key={f._id} folder={f}
                          viewMode={viewMode}
                          onOpen={id => { setCurrent(id); setSelected(new Set()); }}
                          onDelete={deleteFolder}
                          onRename={renameFolder} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Files section */}
                {files.length > 0 ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color:'var(--text-muted)' }}>
                      {showTrash ? 'Trash' : 'Files'} ({files.length}{hasMore ? '+' : ''})
                    </p>
                    <div className={viewMode === 'grid'
                      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3'
                      : 'space-y-2'}>
                      <AnimatePresence>
                        {files.map(file => (
                          showTrash ? (
                            // Trash row
                            <motion.div key={file._id} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                              className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
                              style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
                              <FileTypeIcon type={file.type} size={4} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color:'var(--text-primary)' }}>{file.fileName}</p>
                                <p className="text-xs" style={{ color:'var(--text-muted)' }}>
                                  Deleted {fmtDate(file.deletedAt)} · {fmtSize(file.size)}
                                </p>
                              </div>
                              <button onClick={() => restore(file._id)}
                                className="p-1.5 rounded-lg" style={{ color:'#16a34a' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(22,163,74,.1)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button onClick={() => permDelete(file._id)}
                                className="p-1.5 rounded-lg" style={{ color:'#dc2626' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(220,38,38,.1)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}>
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ) : viewMode === 'grid' ? (
                            <FileCard key={file._id} file={file}
                              selected={selected.has(file._id)}
                              onSelect={id => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                              onPreview={setPreviewFile}
                              onDetails={setDetailsFile}
                              onDelete={softDelete}
                              onStar={toggleStar} />
                          ) : (
                            <FileRow key={file._id} file={file}
                              selected={selected.has(file._id)}
                              onSelect={id => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                              onPreview={setPreviewFile}
                              onDetails={setDetailsFile}
                              onDelete={softDelete}
                              onStar={toggleStar} />
                          )
                        ))}
                      </AnimatePresence>
                    </div>
                    <div ref={bottomRef} className="h-4" />
                  </div>
                ) : !loading && currentFolders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <HardDrive className="w-14 h-14 mb-4" style={{ color:'var(--text-muted)' }} />
                    <p className="font-bold" style={{ color:'var(--text-secondary)' }}>
                      {showTrash ? 'Trash is empty' : search ? 'No files match your search' : 'This folder is empty'}
                    </p>
                    {!showTrash && !search && (
                      <button onClick={() => setUploadOpen(true)}
                        className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90"
                        style={{ backgroundColor:'var(--brand-primary)' }}>
                        <Upload className="w-4 h-4" /> Upload Files
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Details panel */}
          <AnimatePresence>
            {detailsFile && (
              <DetailsPanel
                file={detailsFile}
                folders={folders}
                tasks={tasks}
                onClose={() => setDetailsFile(null)}
                onRefresh={() => fetchAll(1, true)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modals ── */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)}
        folderId={currentFolderId} tasks={tasks}
        onDone={() => fetchAll(1, true)} />

      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      <MoveModal open={moveOpen} onClose={() => setMoveOpen(false)}
        folders={folders} onMove={moveSelected} />

      {/* Empty trash confirm */}
      <Modal open={confirmTrash} onClose={() => setConfirmTrash(false)} title="Empty Trash?">
        <div className="space-y-4">
          <p className="text-sm" style={{ color:'var(--text-secondary)' }}>
            All files in trash will be permanently deleted. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmTrash(false)}
              className="flex-1 py-2.5 rounded-xl border text-sm font-semibold"
              style={{ borderColor:'var(--border-color)', color:'var(--text-secondary)' }}>
              Cancel
            </button>
            <button onClick={clearTrash}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor:'#dc2626' }}>
              Empty Trash
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FileStorage;