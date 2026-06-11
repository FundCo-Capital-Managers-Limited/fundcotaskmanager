// src/pages/Training.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import debounce from 'lodash/debounce';
import {
  BookOpen, Search, Filter, ChevronDown, Award, Clock, CheckCircle2,
  BarChart2, Lock, Play, RotateCcw, Flag, ChevronLeft, ChevronRight,
  AlertCircle, X, Send, Bot, Loader2, Minimize2,
  GraduationCap, Zap, TrendingUp, Star, MessageCircle,
  CheckSquare, Info, Sparkles, Download, Shield, Plus
} from 'lucide-react';

const API  = import.meta.env.VITE_API_URL;
const hdrs = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const LEVELS   = ['beginner', 'intermediate', 'expert'];
const ASSETCOS = ['General', 'EML', 'GroSolar', 'Agronomie', 'SSM'];

const LVL = {
  beginner:     { label: 'Beginner',     color: '#16a34a', bg: 'rgba(22,163,74,.12)',   border: 'rgba(22,163,74,.3)'   },
  intermediate: { label: 'Intermediate', color: '#d97706', bg: 'rgba(217,119,6,.12)',   border: 'rgba(217,119,6,.3)'   },
  expert:       { label: 'Expert',       color: '#7c3aed', bg: 'rgba(124,58,237,.12)',  border: 'rgba(124,58,237,.3)'  },
};

// ─── content renderer ─────────────────────────────────────────────────────────
function renderContent(raw) {
  const text = (raw != null ? String(raw) : '').trim();
  if (!text) return <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No content available for this module.</p>;
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    if (/^[A-Z0-9 &()/:–\-·]{5,65}$/.test(t) && t === t.toUpperCase() && t.length < 65)
      return <h3 key={i} className="text-xs font-extrabold uppercase tracking-widest mt-6 mb-2 pb-1 border-b"
        style={{ color: 'var(--brand-accent)', borderColor: 'var(--border-color)' }}>{t}</h3>;
    if (/^[●•·▪▸✓✗\-–]\s/.test(t) || /^\d+[.):]\s/.test(t)) {
      const c = t.replace(/^[●•·▪▸✓✗\-–]\s|^\d+[.):]\s/, '');
      return <div key={i} className="flex gap-2 my-1">
        <span className="flex-shrink-0 mt-1 text-xs" style={{ color: 'var(--brand-accent)' }}>›</span>
        <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c}</span>
      </div>;
    }
    return <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-primary)' }}>{t}</p>;
  });
}

// ─── AI Mentor Panel ──────────────────────────────────────────────────────────
function AIMentorPanel({ courseId = null, moduleId = null }) {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState([]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const SUGGESTIONS = courseId
    ? ['Summarise this course', 'What should I study first?', 'Give me practice questions', 'Explain key concepts']
    : ['Where should I start?', 'What is PuE?', 'Explain the LOTO procedure', 'What is the GroSolar SaaS model?'];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setMsgs(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const r = await axios.post(`${API}/api/learning/ai-query`, { question: q, courseId, moduleId }, hdrs());
      setMsgs(m => [...m, { role: 'bot', text: r.data.answer || 'No response received.' }]);
    } catch {
      setMsgs(m => [...m, { role: 'bot', text: "I'm having trouble connecting right now. Please try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: .96 }} transition={{ duration: .2 }}
            className="w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--brand-primary)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">AI Mentor</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>FundCo Knowledge Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition">
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-64" style={{ backgroundColor: 'var(--bg-subtle)' }}>
              {msgs.length === 0 && (
                <div className="text-center py-6">
                  <Sparkles className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--brand-accent)', opacity: 0.5 }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ask me anything about FundCo training materials, SOPs, or company knowledge.</p>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed"
                    style={m.role === 'user'
                      ? { backgroundColor: 'var(--brand-primary)', color: '#fff', borderBottomRightRadius: 4 }
                      : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderBottomLeftRadius: 4 }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: 'var(--brand-accent)', animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Suggestion chips */}
            {msgs.length < 2 && (
              <div className="px-3 py-2 border-t flex flex-wrap gap-1.5" style={{ borderColor: 'var(--border-color)' }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    className="text-xs rounded-full px-2.5 py-1 border transition-colors"
                    style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)', borderColor: 'var(--border-color)' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={e => { e.preventDefault(); send(); }}
              className="flex border-t" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} disabled={loading}
                placeholder="Ask a question…"
                className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                style={{ color: 'var(--text-primary)' }} />
              <button type="submit" disabled={!input.trim() || loading}
                className="px-3 transition-opacity disabled:opacity-30"
                style={{ color: 'var(--brand-accent)' }}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .95 }}
        onClick={() => setOpen(v => !v)}
        className="w-13 h-13 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl hover:shadow-2xl transition-all relative"
        style={{ backgroundColor: 'var(--brand-primary)' }}>
        {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        {!open && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />}
      </motion.button>
    </div>
  );
}

// ─── Certificate Modal ────────────────────────────────────────────────────────
function CertModal({ course, user, onClose }) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const name = user?.fullName || user?.name || 'Staff Member';
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        {/* Cert banner */}
        <div className="p-8 text-center relative overflow-hidden" style={{ backgroundColor: 'var(--brand-primary)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '18px 18px' }} />
          <div className="relative">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Award className="w-9 h-9 text-yellow-900" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>FundCo Capital Managers</p>
            <h2 className="text-white text-2xl font-black mb-1">Certificate of Completion</h2>
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.7)' }}>This certifies that</p>
            <p className="text-white text-3xl font-black mb-4" style={{ fontFamily: 'Georgia, serif' }}>{name}</p>
            <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>has successfully completed</p>
            <p className="text-yellow-300 text-xl font-bold mb-4">"{course?.title}"</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Awarded on {date}</p>
          </div>
        </div>
        <div className="p-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>Close</button>
          <button onClick={() => { toast.success('Print from browser to save'); window.print(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Download className="w-4 h-4" /> Save / Print
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Quiz Component ───────────────────────────────────────────────────────────
function QuizComponent({ quiz, moduleTitle, previousScore, onComplete }) {
  const [phase,  setPhase]  = useState('intro');
  const [cur,    setCur]    = useState(0);
  const [sel,    setSel]    = useState(null);
  const [conf,   setConf]   = useState(false);
  const [ans,    setAns]    = useState([]);
  const [score,  setScore]  = useState(null);

  if (!Array.isArray(quiz) || !quiz.length)
    return <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No quiz questions for this module.</p>;

  const q = quiz[cur];

  const next = () => {
    const a = [...ans, { q: q?.question || '', sel, correct: q?.answer || '', ok: sel === q?.answer, expl: q?.explanation || '' }];
    setAns(a);
    if (cur + 1 < quiz.length) { setCur(c => c + 1); setSel(null); setConf(false); }
    else { setScore(Math.round((a.filter(x => x.ok).length / quiz.length) * 100)); setPhase('review'); }
  };
  const reset = () => { setCur(0); setSel(null); setConf(false); setAns([]); setScore(null); setPhase('taking'); };

  if (phase === 'intro') return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: 'var(--brand-light)' }}>
        <CheckSquare className="w-7 h-7" style={{ color: 'var(--brand-primary)' }} />
      </div>
      <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Module Quiz</h3>
      <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{moduleTitle}</p>
      <div className="flex justify-center gap-6 text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <span>{quiz.length} questions</span>
        {previousScore != null && <span>Best: <strong style={{ color: previousScore >= 70 ? '#16a34a' : '#dc2626' }}>{previousScore}%</strong></span>}
      </div>
      <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Passing score: 70% · Explanations shown after each answer</p>
      <button onClick={() => setPhase('taking')}
        className="px-6 py-2.5 rounded-lg font-bold text-sm text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: 'var(--brand-primary)' }}>Start Quiz →</button>
    </div>
  );

  if (phase === 'done') return (
    <div className="text-center py-8">
      <div className="text-5xl mb-3">{score >= 70 ? '🎉' : '📚'}</div>
      <div className="text-4xl font-black mb-2" style={{ color: score >= 70 ? '#16a34a' : '#d97706' }}>{score}%</div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{ans.filter(a => a.ok).length}/{quiz.length} correct</p>
      <button onClick={reset} className="text-sm border px-4 py-2 rounded-lg transition-colors"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>↺ Try Again</button>
    </div>
  );

  if (phase === 'review') return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Quiz Results</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ans.filter(a => a.ok).length}/{quiz.length} correct</p>
        </div>
        <div className="text-3xl font-black" style={{ color: score >= 70 ? '#16a34a' : '#d97706' }}>{score}%</div>
      </div>
      <div className="space-y-2.5 mb-4 max-h-64 overflow-y-auto pr-1">
        {ans.map((a, i) => (
          <div key={i} className="p-3 rounded-xl border text-sm"
            style={{ backgroundColor: a.ok ? 'rgba(22,163,74,.06)' : 'rgba(220,38,38,.06)', borderColor: a.ok ? 'rgba(22,163,74,.3)' : 'rgba(220,38,38,.3)' }}>
            <div className="flex gap-2 font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              <span>{a.ok ? '✅' : '❌'}</span><span>{a.q}</span>
            </div>
            {!a.ok && <div className="pl-6 text-xs space-y-0.5">
              <div style={{ color: '#dc2626' }}>Your answer: {a.sel}</div>
              <div style={{ color: '#16a34a' }}>Correct: {a.correct}</div>
            </div>}
            {a.expl && <p className="pl-6 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>💡 {a.expl}</p>}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm font-medium transition-colors"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
        <button onClick={() => { onComplete?.(score); setPhase('done'); }}
          className="flex-1 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--brand-primary)' }}>Continue →</button>
      </div>
    </div>
  );

  if (!q) return null;
  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(cur / quiz.length) * 100}%`, backgroundColor: 'var(--brand-primary)' }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{cur + 1}/{quiz.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={cur} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: .16 }}>
          <p className="font-bold text-base leading-snug mb-5" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
          <div className="space-y-2.5 mb-5">
            {(q.options || []).map((opt, i) => {
              let borderColor = 'var(--border-color)', bgColor = 'var(--bg-surface)';
              if (conf) {
                if (opt === q.answer) { borderColor = '#16a34a'; bgColor = 'rgba(22,163,74,.06)'; }
                else if (opt === sel) { borderColor = '#dc2626'; bgColor = 'rgba(220,38,38,.06)'; }
              } else if (opt === sel) { borderColor = 'var(--brand-accent)'; bgColor = 'var(--brand-light)'; }
              return (
                <button key={i} disabled={conf} onClick={() => setSel(opt)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all"
                  style={{ borderColor, backgroundColor: bgColor }}>
                  <span className="w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all"
                    style={opt === sel ? { backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#fff' }
                      : conf && opt === q.answer ? { backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#fff' }
                        : { borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{opt}</span>
                  {conf && opt === q.answer && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />}
                  {conf && opt === sel && opt !== q.answer && <X className="w-4 h-4 flex-shrink-0" style={{ color: '#dc2626' }} />}
                </button>
              );
            })}
          </div>

          {conf && q.explanation && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg text-sm mb-4 border"
              style={sel === q.answer
                ? { backgroundColor: 'rgba(22,163,74,.06)', borderColor: 'rgba(22,163,74,.3)' }
                : { backgroundColor: 'rgba(245,158,11,.06)', borderColor: 'rgba(245,158,11,.3)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{sel === q.answer ? '✅ Correct! ' : '❌ Not quite — '}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{q.explanation}</span>
            </motion.div>
          )}

          <div className="flex justify-end">
            {!conf
              ? <button onClick={() => setConf(true)} disabled={!sel}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--brand-primary)' }}>Check Answer</button>
              : <button onClick={next}
                  className="px-5 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#16a34a' }}>{cur + 1 < quiz.length ? 'Next →' : 'See Results'}</button>
            }
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({ course, prog, onSelect, i }) {
  const p        = prog?.progress || 0;
  const lm       = LVL[course.level] || LVL.beginner;
  const nM       = course.modules?.length || 0;
  const cert     = prog?.certificationEarned;
  const hasExam  = (course.exam?.length || 0) > 0;
  const examReady = p === 100 && hasExam && !(prog?.bestExamScore >= (course.passingScore || 70));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }}
      onClick={() => onSelect(course)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onSelect(course)}
      className="rounded-2xl border p-5 cursor-pointer flex flex-col relative overflow-hidden transition-all hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-accent)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-color)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>

      {examReady && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md animate-pulse">
            <GraduationCap className="w-3 h-3" /> Take Exam!
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
          style={{ color: lm.color, backgroundColor: lm.bg, borderColor: lm.border }}>{lm.label}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>{course.assetco}</span>
        {course.required && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
          <Lock className="w-2.5 h-2.5" /> Required
        </span>}
        {cert && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 flex items-center gap-1">
          <Award className="w-2.5 h-2.5" /> Certified
        </span>}
      </div>

      <h3 className="font-extrabold text-sm leading-snug mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{course.title}</h3>
      <p className="text-xs leading-relaxed mb-3 line-clamp-2 flex-1" style={{ color: 'var(--text-secondary)' }}>{course.description}</p>

      <div className="flex gap-3 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{nM} module{nM !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{Math.ceil(nM * 2)}h</span>
        {hasExam && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{course.exam.length}Q exam</span>}
      </div>

      <div>
        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--bg-hover)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${p}%`, backgroundColor: p === 100 ? '#16a34a' : 'var(--brand-primary)' }} />
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold" style={{ color: p === 100 ? '#16a34a' : 'var(--brand-primary)' }}>{p}% complete</span>
          {p === 100
            ? <span className="font-bold" style={{ color: '#16a34a' }}>Done ✓</span>
            : p > 0 ? <span style={{ color: 'var(--brand-accent)' }}>Continue →</span>
              : <span style={{ color: 'var(--text-muted)' }}>Start ▶</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Course Grid ──────────────────────────────────────────────────────────────
function CourseGrid({ courses, progressMap, loading, onSelect }) {
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border p-5 animate-pulse"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="h-4 rounded w-1/3 mb-3" style={{ backgroundColor: 'var(--bg-hover)' }} />
          <div className="h-5 rounded w-4/5 mb-2" style={{ backgroundColor: 'var(--bg-hover)' }} />
          <div className="h-3 rounded w-2/3 mb-4" style={{ backgroundColor: 'var(--bg-subtle)' }} />
          <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-hover)' }} />
        </div>
      ))}
    </div>
  );

  if (!courses.length) return (
    <div className="text-center py-16 rounded-2xl border border-dashed"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
      <Search className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
      <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No courses found</h3>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Try different keywords or clear your filters.</p>
    </div>
  );

  const order = ['beginner', 'intermediate', 'expert'];
  const groups = {};
  courses.forEach(c => { if (!groups[c.level]) groups[c.level] = []; groups[c.level].push(c); });

  return (
    <>
      {order.filter(l => groups[l]?.length).map(level => (
        <div key={level} className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LVL[level].color }} />
            <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>{LVL[level].label} Training</h2>
            <span className="text-xs rounded-full px-2.5 py-0.5 border"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              {groups[level].length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups[level].map((c, i) => <CourseCard key={c._id} course={c} prog={progressMap[String(c._id)]} onSelect={onSelect} i={i} />)}
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Course Viewer ────────────────────────────────────────────────────────────
function CourseViewer({ courseId, progress, onBack, onProgressUpdate, user }) {
  const [course,   setCourse]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [modIdx,   setModIdx]   = useState(0);
  const [tab,      setTab]      = useState('content');
  const [showExam, setShowExam] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const [doneIds,  setDoneIds]  = useState(new Set());
  const [modProg,  setModProg]  = useState([]);
  const [pct,      setPct]      = useState(0);
  const [saving,   setSaving]   = useState(false);
  const [notes,    setNotes]    = useState(() => {
    try { return JSON.parse(localStorage.getItem(`lms-notes-${courseId}`) || '{}'); } catch { return {}; }
  });
  const notesTimer = useRef(null);

  const saveNote = (modId, text) => {
    const u = { ...notes, [modId]: text };
    setNotes(u);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => { localStorage.setItem(`lms-notes-${courseId}`, JSON.stringify(u)); }, 600);
  };

  useEffect(() => {
    let c = false; setLoading(true); setError(false);
    axios.get(`${API}/api/learning/courses/${courseId}`, hdrs())
      .then(r => {
        if (c) return;
        const crs = r.data.course;
        if (!crs) { setError(true); return; }
        crs.modules = (crs.modules || []).map(m => ({
          ...m, content: m.content != null ? String(m.content) : '',
          title: m.title != null ? String(m.title) : 'Untitled',
          quiz: Array.isArray(m.quiz) ? m.quiz : [],
          terms: Array.isArray(m.terms) ? m.terms : [],
          objectives: Array.isArray(m.objectives) ? m.objectives : [],
        }));
        setCourse(crs);
      })
      .catch(() => { if (!c) setError(true); })
      .finally(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, [courseId]);

  useEffect(() => {
    if (progress) {
      setDoneIds(new Set((progress.completedModules || []).map(String)));
      setModProg(progress.moduleProgress || []);
      setPct(progress.progress || 0);
    }
  }, [progress]);

  useEffect(() => { setTab('content'); }, [modIdx]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading course…</p>
    </div>
  );
  if (error || !course) return (
    <div className="text-center py-12">
      <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#dc2626' }} />
      <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Could not load this course.</p>
      <button onClick={onBack} className="px-5 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: 'var(--brand-primary)' }}>← Go Back</button>
    </div>
  );

  const mods    = course.modules || [];
  const mod     = mods[modIdx];
  if (!mods.length || !mod) return (
    <div className="text-center py-12">
      <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>This course has no modules yet.</p>
      <button onClick={onBack} className="px-5 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: 'var(--brand-primary)' }}>← Go Back</button>
    </div>
  );

  const isDone    = id => doneIds.has(String(id));
  const mp        = modProg.find(x => String(x.moduleId) === String(mod._id));
  const allDone   = mods.every(m => isDone(m._id));
  const bestExam  = progress?.bestExamScore || 0;
  const examPassed = bestExam >= (course.passingScore || 70);
  const lm        = LVL[course.level] || LVL.beginner;
  const cert      = progress?.certificationEarned;

  const markComplete = async (quizScore = null) => {
    if (!mod || saving) return; setSaving(true);
    try {
      const body = { courseId: course._id, moduleId: mod._id };
      if (quizScore != null) body.quizScore = quizScore;
      const r = await axios.post(`${API}/api/learning/module-progress`, body, hdrs());
      const u = r.data.progress;
      setDoneIds(new Set((u.completedModules || []).map(String)));
      setModProg(u.moduleProgress || []); setPct(u.progress || 0);
      onProgressUpdate?.(); toast.success('Progress saved!');
      if (quizScore == null && modIdx < mods.length - 1) setTimeout(() => setModIdx(i => i + 1), 600);
    } catch { toast.error('Failed to save progress'); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: 'content', label: '📖 Lesson',    show: true },
    { id: 'video',   label: '▶ Video',      show: !!mod.videoUrl },
    { id: 'terms',   label: '📝 Terms',     show: !!(mod.terms?.length) },
    { id: 'quiz',    label: '✅ Quiz',       show: !!(mod.quiz?.length) },
    { id: 'notes',   label: '📓 Notes',     show: true },
  ].filter(t => t.show);

  const embedUrl = url => {
    if (!url) return null;
    if (url.includes('playlist?list=')) { const id = url.split('list=')[1]?.split('&')[0]; return `https://www.youtube.com/embed/videoseries?list=${id}&rel=0&modestbranding=1`; }
    if (url.includes('watch?v='))       { const id = url.split('v=')[1]?.split('&')[0];    return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`; }
    return null;
  };

  if (showExam) return (
    <div>
      <button onClick={() => setShowExam(false)} className="flex items-center gap-1.5 text-sm font-bold mb-5 hover:opacity-75 transition-opacity"
        style={{ color: 'var(--brand-primary)' }}>
        <ChevronLeft className="w-4 h-4" /> Back to Course
      </button>
      <div className="rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <ExamView course={course} onBack={() => setShowExam(false)} onComplete={score => {
          setShowExam(false); onProgressUpdate?.();
          if (score >= (course.passingScore || 70)) { toast.success(`🎓 Passed! ${score}%`, { duration: 4000 }); setShowCert(true); }
          else toast.error(`${score}% — Need ${course.passingScore || 70}%`, { duration: 4000 });
        }} />
      </div>
      <AIMentorPanel courseId={course._id} />
    </div>
  );

  return (
    <div>
      <AnimatePresence>{showCert && <CertModal course={course} user={user} onClose={() => setShowCert(false)} />}</AnimatePresence>

      {/* Exam CTA banner */}
      {course.exam?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center gap-3"
          style={examPassed
            ? { backgroundColor: 'rgba(22,163,74,.06)', borderColor: 'rgba(22,163,74,.3)' }
            : allDone
              ? { backgroundColor: 'rgba(245,158,11,.06)', borderColor: 'rgba(245,158,11,.3)' }
              : { backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: examPassed ? '#16a34a' : allDone ? '#f59e0b' : 'var(--text-muted)' }}>
            {examPassed ? <Shield className="w-5 h-5 text-white" /> : allDone ? <GraduationCap className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            {examPassed
              ? <><p className="font-bold text-sm" style={{ color: '#15803d' }}>🎓 You've passed this exam!</p>
                  <p className="text-xs" style={{ color: '#16a34a' }}>Best score: {bestExam}% · Certificate earned</p></>
              : allDone
                ? <><p className="font-bold text-sm" style={{ color: '#b45309' }}>🎯 All modules complete — Take your Final Exam!</p>
                    <p className="text-xs" style={{ color: '#d97706' }}>{course.exam.length} questions · {course.passingScore || 70}% to pass</p></>
                : <><p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>📝 Final Exam — Complete all modules to unlock</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{doneIds.size}/{mods.length} modules done · {course.exam.length} questions</p></>
            }
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {examPassed && (
              <button onClick={() => setShowCert(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#16a34a' }}>
                <Award className="w-4 h-4" /> Certificate
              </button>
            )}
            <button disabled={!allDone} onClick={() => { if (allDone) setShowExam(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-opacity"
              style={!allDone
                ? { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)', cursor: 'not-allowed' }
                : examPassed
                  ? { backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }
                  : { backgroundColor: '#f59e0b', color: '#fff' }}>
              {!allDone ? <><Lock className="w-4 h-4" /> Locked</> : examPassed ? <><RotateCcw className="w-4 h-4" /> Retake</> : <><Zap className="w-4 h-4" /> Start Exam</>}
            </button>
          </div>
        </motion.div>
      )}

      {/* Course layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px,1fr] gap-5">
        {/* Module sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border overflow-hidden shadow-sm lg:sticky lg:top-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="px-4 py-3 border-b flex justify-between items-center"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Course Content</span>
              <span className="text-xs font-bold" style={{ color: 'var(--brand-primary)' }}>{doneIds.size}/{mods.length} done</span>
            </div>
            {/* Progress bar */}
            <div className="h-1" style={{ backgroundColor: 'var(--bg-hover)' }}>
              <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: 'var(--brand-primary)' }} />
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {mods.map((m, i) => {
                const done = isDone(m._id); const active = i === modIdx;
                return (
                  <button key={m._id || i} onClick={() => setModIdx(i)}
                    className="w-full flex items-start gap-2.5 px-3.5 py-3 border-b text-left transition-all"
                    style={{
                      borderColor: 'var(--border-color)',
                      backgroundColor: active ? 'var(--brand-light)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 text-xs font-bold"
                      style={done
                        ? { backgroundColor: '#16a34a', color: '#fff' }
                        : active
                          ? { backgroundColor: 'var(--brand-primary)', color: '#fff' }
                          : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                      {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-snug"
                        style={{ color: active ? 'var(--brand-primary)' : done ? '#16a34a' : 'var(--text-primary)' }}>
                        {m.title || `Module ${i + 1}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.estimatedMinutes && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.estimatedMinutes}min</p>}
                        {m.quiz?.length > 0 && <span className="text-xs" style={{ color: 'var(--brand-accent)' }}>· Quiz</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Exam in sidebar */}
            {course.exam?.length > 0 && (
              <div className="p-3 border-t"
                style={{ borderColor: 'var(--border-color)', backgroundColor: examPassed ? 'rgba(22,163,74,.05)' : 'rgba(245,158,11,.05)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <GraduationCap className="w-4 h-4" style={{ color: examPassed ? '#16a34a' : '#f59e0b' }} />
                  <span className="text-xs font-bold" style={{ color: examPassed ? '#16a34a' : '#f59e0b' }}>
                    {examPassed ? 'Exam Passed ✓' : 'Final Exam'}
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                  {course.exam.length}Q · {course.passingScore || 70}% pass{bestExam > 0 ? ` · Best: ${bestExam}%` : ''}
                </p>
                <button disabled={!allDone} onClick={() => setShowExam(true)}
                  className="w-full py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                  style={allDone
                    ? { backgroundColor: examPassed ? 'var(--bg-hover)' : '#f59e0b', color: examPassed ? 'var(--text-primary)' : '#fff' }
                    : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)', cursor: 'not-allowed' }}>
                  {examPassed ? 'Retake Exam' : allDone ? '📝 Start Exam →' : '🔒 Locked'}
                </button>
                {examPassed && (
                  <button onClick={() => setShowCert(true)}
                    className="w-full mt-1.5 py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                    style={{ backgroundColor: '#16a34a' }}>
                    <Award className="w-3 h-3" /> View Certificate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          {/* Module header */}
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--brand-primary)' }}>
                  Module {modIdx + 1} of {mods.length} · {course.assetco}
                </p>
                <h2 className="text-lg font-black leading-snug" style={{ color: 'var(--text-primary)' }}>{mod.title || `Module ${modIdx + 1}`}</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full capitalize border"
                  style={{ color: lm.color, backgroundColor: lm.bg, borderColor: lm.border }}>{lm.label}</span>
                {isDone(mod._id) && (
                  <span className="text-xs font-bold rounded-full px-2.5 py-1 flex items-center gap-1 border"
                    style={{ backgroundColor: 'rgba(22,163,74,.06)', borderColor: 'rgba(22,163,74,.3)', color: '#16a34a' }}>
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                )}
              </div>
            </div>
            {mod.objectives?.length > 0 && (
              <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: 'var(--brand-light)' }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'var(--brand-primary)' }}>
                  <Star className="w-3 h-3" /> Learning Objectives
                </p>
                {mod.objectives.map((o, i) => (
                  <div key={i} className="flex gap-2 text-xs mb-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: 'var(--brand-primary)' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{o}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b overflow-x-auto gap-1 px-4" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all"
                style={tab === t.id
                  ? { borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)', backgroundColor: 'var(--bg-surface)' }
                  : { borderColor: 'transparent', color: 'var(--text-secondary)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .16 }}
              className="p-5 min-h-[320px]">
              {tab === 'content' && (
                <div className="max-w-3xl">
                  {renderContent(mod.content)}
                  {!isDone(mod._id) && (
                    <button onClick={() => markComplete()} disabled={saving}
                      className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                      style={{ backgroundColor: '#16a34a' }}>
                      <CheckCircle2 className="w-4 h-4" />{saving ? 'Saving…' : 'Mark as Complete'}
                    </button>
                  )}
                </div>
              )}
              {tab === 'video' && mod.videoUrl && (
                embedUrl(mod.videoUrl)
                  ? <iframe src={embedUrl(mod.videoUrl)} title={mod.title} frameBorder="0"
                      allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
                      allowFullScreen className="w-full aspect-video rounded-xl" />
                  : <a href={mod.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed font-semibold hover:opacity-80 transition-opacity"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--brand-primary)' }}>
                      <Play className="w-8 h-8" /> Open Resource ↗
                    </a>
              )}
              {tab === 'terms' && mod.terms?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mod.terms.map((t, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .025 }}
                      className="rounded-xl p-3.5 border border-l-4"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', borderLeftColor: 'var(--brand-primary)' }}>
                      <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--brand-primary)' }}>{t.term}</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.definition}</p>
                    </motion.div>
                  ))}
                </div>
              )}
              {tab === 'quiz' && mod.quiz?.length > 0 && (
                <QuizComponent quiz={mod.quiz} moduleTitle={mod.title} previousScore={mp?.quizScore} onComplete={score => markComplete(score)} />
              )}
              {tab === 'notes' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>My Notes</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Saved locally in your browser</p>
                    </div>
                    {notes[mod._id] && (
                      <button onClick={() => saveNote(mod._id, '')} className="text-xs text-red-500 hover:text-red-700 transition-colors">Clear</button>
                    )}
                  </div>
                  <textarea
                    value={notes[mod._id] || ''}
                    onChange={e => saveNote(mod._id, e.target.value)}
                    placeholder="Write your notes, key takeaways, or questions here…"
                    className="w-full h-48 text-sm rounded-xl p-4 border focus:outline-none resize-none leading-relaxed"
                    style={{ backgroundColor: 'rgba(245,158,11,.04)', borderColor: 'rgba(245,158,11,.3)', color: 'var(--text-primary)' }}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{(notes[mod._id] || '').length} characters</span>
                    <span className="flex items-center gap-1 text-green-500"><CheckCircle2 className="w-3 h-3" /> Auto-saved</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Completion strip */}
          {isDone(mod._id) && tab === 'content' && (
            <div className="px-5 py-3 border-t flex items-center justify-between"
              style={{ backgroundColor: 'rgba(22,163,74,.05)', borderColor: 'rgba(22,163,74,.2)' }}>
              <span className="text-sm font-bold flex items-center gap-2" style={{ color: '#16a34a' }}>
                <CheckCircle2 className="w-4 h-4" /> Module Complete
              </span>
              {modIdx < mods.length - 1
                ? <button onClick={() => setModIdx(i => i + 1)}
                    className="px-4 py-1.5 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#16a34a' }}>Next Module →</button>
                : allDone && course.exam?.length > 0
                  ? <button onClick={() => setShowExam(true)}
                      className="px-4 py-1.5 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#f59e0b' }}>
                      <GraduationCap className="w-4 h-4 inline mr-1" /> Take Exam →
                    </button>
                  : <span className="text-sm font-bold" style={{ color: '#16a34a' }}>🎓 All complete!</span>
              }
            </div>
          )}

          {/* Nav */}
          <div className="px-5 py-3 border-t flex items-center justify-between"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
            <button onClick={() => setModIdx(i => Math.max(0, i - 1))} disabled={modIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold disabled:opacity-30 transition-colors"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}>
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{modIdx + 1} / {mods.length}</span>
            <button onClick={() => setModIdx(i => Math.min(mods.length - 1, i + 1))} disabled={modIdx === mods.length - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AIMentorPanel courseId={course._id} />
    </div>
  );
}

// ─── Exam View ────────────────────────────────────────────────────────────────
function ExamView({ course, onBack, onComplete }) {
  const [phase,   setPhase]   = useState('loading');
  const [qs,      setQs]      = useState([]);
  const [passing, setPassing] = useState(70);
  const [cur,     setCur]     = useState(0);
  const [answers, setAnswers] = useState([]);
  const [flagged, setFlagged] = useState(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [result,  setResult]  = useState(null);
  const [revIdx,  setRevIdx]  = useState(0);
  const timer = useRef(null);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => {
    axios.get(`${API}/api/learning/exam/${course._id}`, hdrs())
      .then(r => { const q = r.data.questions || []; setQs(q); setAnswers(new Array(q.length).fill(null)); setPassing(r.data.passingScore || 70); setPhase('intro'); })
      .catch(() => { toast.error('Failed to load exam'); onBack(); });
  }, []);

  const startTimer = () => { timer.current = setInterval(() => setElapsed(e => e + 1), 1000); };
  const stopTimer  = () => clearInterval(timer.current);
  useEffect(() => () => stopTimer(), []);

  const submit = async () => {
    stopTimer(); setPhase('grading');
    try {
      const r = await axios.post(`${API}/api/learning/exam/submit`, { courseId: course._id, answers: answers.map(a => a || ''), timeSpent: elapsed }, hdrs());
      setResult(r.data); setPhase('result');
    } catch { toast.error('Submission failed'); setPhase('taking'); startTimer(); }
  };

  const q = qs[cur];
  const answered = answers.filter(a => a !== null).length;

  const Spinner = ({ label }) => (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }} />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  );

  if (phase === 'loading' || phase === 'grading') return <Spinner label={phase === 'loading' ? 'Loading exam questions…' : 'Grading your answers…'} />;

  if (phase === 'intro') return (
    <div className="text-center py-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: 'rgba(245,158,11,.12)' }}>
        <GraduationCap className="w-10 h-10" style={{ color: '#f59e0b' }} />
      </div>
      <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>Final Course Exam</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>{course.title}</p>
      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-6">
        {[{ n: qs.length, l: 'Questions' }, { n: `${passing}%`, l: 'Pass Mark' }, { n: 'Timed', l: 'Format' }].map(s => (
          <div key={s.l} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
            <div className="text-xl font-black" style={{ color: 'var(--brand-primary)' }}>{s.n}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4 max-w-sm mx-auto mb-6 text-left space-y-2 border"
        style={{ backgroundColor: 'var(--brand-light)', borderColor: 'var(--border-color)' }}>
        {['Select one answer per question', 'Flag questions to review later', 'Full explanations shown after submission', 'Certificate awarded on passing'].map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />{r}
          </div>
        ))}
      </div>
      <button onClick={() => { setPhase('taking'); startTimer(); }}
        className="px-8 py-3 rounded-xl font-bold text-base text-white hover:opacity-90 transition-opacity shadow-lg"
        style={{ backgroundColor: '#f59e0b' }}>Begin Exam →</button>
    </div>
  );

  if (phase === 'result' && result) {
    const { score, passed, correct, total, answers: graded, questions: rqArr } = result;
    const rq = rqArr?.[revIdx] || {}; const ra = graded?.[revIdx] || {};
    return (
      <div className="space-y-5">
        <div className="rounded-2xl p-5 flex items-center gap-4 border"
          style={passed
            ? { backgroundColor: 'rgba(22,163,74,.06)', borderColor: 'rgba(22,163,74,.3)' }
            : { backgroundColor: 'rgba(220,38,38,.06)', borderColor: 'rgba(220,38,38,.3)' }}>
          <div className="text-5xl">{passed ? '🎓' : '📚'}</div>
          <div className="flex-1">
            <div className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>{passed ? 'Congratulations — You Passed!' : 'Not quite — Keep going!'}</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{correct}/{total} correct · {fmt(elapsed)} taken</div>
            {!passed && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Need {passing}% to pass. Review and try again.</div>}
          </div>
          <div className="text-4xl font-black" style={{ color: passed ? '#16a34a' : '#dc2626' }}>{score}%</div>
        </div>

        {rqArr?.length > 0 && (
          <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <h3 className="font-bold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Question Review</h3>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {graded.map((a, i) => (
                <button key={i} onClick={() => setRevIdx(i)}
                  className="w-8 h-8 rounded-lg text-xs font-bold border-2 transition-all"
                  style={{
                    backgroundColor: a.correct ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.1)',
                    borderColor: a.correct ? '#16a34a' : '#dc2626',
                    color: a.correct ? '#16a34a' : '#dc2626',
                    boxShadow: i === revIdx ? '0 0 0 2px var(--brand-accent)' : 'none',
                  }}>{i + 1}</button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={revIdx} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: .14 }}>
                <p className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Q{revIdx + 1}. {rq.question}</p>
                <div className="space-y-2 mb-3">
                  {(rq.options || []).map((opt, i) => {
                    const ok = opt === rq.answer, wrong = opt === ra.selectedAnswer && !ok;
                    return (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border"
                        style={ok
                          ? { backgroundColor: 'rgba(22,163,74,.06)', borderColor: 'rgba(22,163,74,.3)' }
                          : wrong
                            ? { backgroundColor: 'rgba(220,38,38,.06)', borderColor: 'rgba(220,38,38,.3)' }
                            : { backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{opt}</span>
                        {ok && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />}
                        {wrong && <X className="w-4 h-4 flex-shrink-0" style={{ color: '#dc2626' }} />}
                      </div>
                    );
                  })}
                </div>
                {ra.explanation && <p className="text-xs p-2 rounded-lg border" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--brand-light)', borderColor: 'var(--border-color)' }}>💡 {ra.explanation}</p>}
                <div className="flex justify-between mt-3">
                  <button onClick={() => setRevIdx(i => Math.max(0, i - 1))} disabled={revIdx === 0}
                    className="text-xs px-3 py-1.5 border rounded-lg disabled:opacity-30 transition-colors"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>← Prev</button>
                  <button onClick={() => setRevIdx(i => Math.min(total - 1, i + 1))} disabled={revIdx === total - 1}
                    className="text-xs px-3 py-1.5 border rounded-lg disabled:opacity-30 transition-colors"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Next →</button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => { setAnswers(new Array(qs.length).fill(null)); setFlagged(new Set()); setCur(0); setElapsed(0); setResult(null); setPhase('intro'); }}
            className="flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            <RotateCcw className="w-4 h-4" /> Retake
          </button>
          <button onClick={() => onComplete?.(score)}
            className="flex-1 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {passed ? '🎓 View My Certificate' : 'Back to Course'}
          </button>
        </div>
      </div>
    );
  }

  if (!q) return null;
  return (
    <div>
      {/* Exam header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--brand-primary)' }}>Q {cur + 1}/{qs.length}</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(answered / qs.length) * 100}%`, backgroundColor: 'var(--brand-primary)' }} />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{answered} answered</span>
        <div className="flex items-center gap-1 text-sm font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
          <Clock className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />{fmt(elapsed)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[140px,1fr] gap-4">
        {/* Q navigator */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Navigator</p>
          <div className="grid grid-cols-5 lg:grid-cols-4 gap-1">
            {qs.map((_, i) => (
              <button key={i} onClick={() => setCur(i)}
                className="aspect-square rounded-lg text-xs font-bold border-2 transition-all"
                style={{
                  backgroundColor: i === cur ? 'var(--brand-primary)' : answers[i] ? 'rgba(22,163,74,.1)' : flagged.has(i) ? 'rgba(245,158,11,.1)' : 'var(--bg-subtle)',
                  borderColor: i === cur ? 'var(--brand-primary)' : answers[i] ? '#16a34a' : flagged.has(i) ? '#f59e0b' : 'var(--border-color)',
                  color: i === cur ? '#fff' : answers[i] ? '#16a34a' : flagged.has(i) ? '#f59e0b' : 'var(--text-muted)',
                }}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={cur} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .15 }}>
            <p className="font-bold text-base leading-snug mb-5" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
            <div className="space-y-2.5 mb-5">
              {(q.options || []).map((opt, i) => (
                <button key={i} onClick={() => { const a = [...answers]; a[cur] = opt; setAnswers(a); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all"
                  style={{
                    borderColor: answers[cur] === opt ? 'var(--brand-primary)' : 'var(--border-color)',
                    backgroundColor: answers[cur] === opt ? 'var(--brand-light)' : 'var(--bg-surface)',
                  }}>
                  <span className="w-7 h-7 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all"
                    style={answers[cur] === opt
                      ? { backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#fff' }
                      : { borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{opt}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setCur(i => Math.max(0, i - 1))} disabled={cur === 0}
                className="flex items-center gap-1 px-3 py-2 border rounded-lg text-sm disabled:opacity-30 transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setFlagged(f => { const n = new Set(f); n.has(cur) ? n.delete(cur) : n.add(cur); return n; })}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm border transition-colors"
                style={flagged.has(cur)
                  ? { backgroundColor: 'rgba(245,158,11,.1)', borderColor: '#f59e0b', color: '#f59e0b' }
                  : { borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                <Flag className="w-3.5 h-3.5" />{flagged.has(cur) ? 'Unflag' : 'Flag'}
              </button>
              {cur < qs.length - 1
                ? <button onClick={() => setCur(i => i + 1)}
                    className="ml-auto flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--brand-primary)' }}>
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                : <button onClick={() => { if (answered < qs.length && !window.confirm(`${qs.length - answered} unanswered. Submit anyway?`)) return; submit(); }}
                    className="ml-auto px-4 py-2 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#16a34a' }}>Submit ✓</button>
              }
            </div>

            {answered === qs.length && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mt-4 p-3 rounded-xl border"
                style={{ backgroundColor: 'rgba(22,163,74,.06)', borderColor: 'rgba(22,163,74,.3)' }}>
                <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#16a34a' }}>
                  <CheckCircle2 className="w-4 h-4" /> All {qs.length} questions answered!
                </span>
                <button onClick={submit} className="px-4 py-1.5 rounded-lg text-sm font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#16a34a' }}>Submit →</button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Training Page ───────────────────────────────────────────────────────
const Training = () => {
  const { user } = useOutletContext();

  const [courses,      setCourses]      = useState([]);
  const [progress,     setProgress]     = useState([]);
  const [stats,        setStats]        = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [selLevels,    setSelLevels]    = useState([]);
  const [selAssets,    setSelAssets]    = useState([]);
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [activeTab,    setActiveTab]    = useState('all');
  const [showGuide,    setShowGuide]    = useState(() => !localStorage.getItem('lms-guide-dismissed'));
  const filterRef = useRef(null);

  useEffect(() => {
    const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { fetchProgress(); fetchStats(); }, []);

  const fetchCourses = useCallback(debounce(async (f) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (f.level)   p.append('level', f.level);
      if (f.assetco) p.append('assetco', f.assetco);
      if (f.search)  p.append('search', f.search);
      const r = await axios.get(`${API}/api/learning/courses?${p}`, hdrs());
      setCourses(r.data.courses || []);
    } catch { toast.error('Failed to load courses'); }
    finally { setLoading(false); }
  }, 300), []);

  useEffect(() => {
    fetchCourses({ level: selLevels.join(','), assetco: selAssets.join(','), search: searchTerm });
  }, [selLevels, selAssets, searchTerm]);

  const fetchProgress = async () => { try { const r = await axios.get(`${API}/api/learning/progress`, hdrs()); setProgress(r.data.progress || []); } catch {} };
  const fetchStats    = async () => { try { const r = await axios.get(`${API}/api/learning/stats`, hdrs()); setStats(r.data.stats || null); } catch {} };

  const handleSelect = c => { setActiveCourse({ _id: c._id, title: c.title }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleBack   = () => { setActiveCourse(null); fetchProgress(); fetchStats(); };

  const toggleLevel = l => setSelLevels(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l]);
  const toggleAsset = a => setSelAssets(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
  const clearAll    = () => { setSelLevels([]); setSelAssets([]); setSearchTerm(''); };
  const filterCount = selLevels.length + selAssets.length;

  const progressMap = progress.reduce((acc, p) => { acc[String(p.courseId?._id || p.courseId)] = p; return acc; }, {});

  const tabCourses = courses.filter(c => {
    const p = progressMap[String(c._id)];
    if (activeTab === 'required')   return c.required;
    if (activeTab === 'inprogress') return p && p.progress > 0 && p.progress < 100;
    if (activeTab === 'completed')  return p && p.progress === 100;
    return true;
  });

  // ── Course viewer ──
  if (activeCourse) return (
    <div className="space-y-5 py-4">
      <Toaster position="top-right" />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <button onClick={handleBack} className="flex items-center gap-1.5 text-sm font-bold hover:opacity-75 transition-opacity flex-shrink-0"
          style={{ color: 'var(--brand-primary)' }}>
          <BookOpen className="w-4 h-4" /> Training
        </button>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm font-semibold truncate flex-1 min-w-0" style={{ color: 'var(--text-secondary)' }}>{activeCourse.title}</span>
      </div>
      <CourseViewer courseId={activeCourse._id} progress={progressMap[String(activeCourse._id)] || null} onBack={handleBack} onProgressUpdate={fetchProgress} user={user} />
    </div>
  );

  // ── Catalog ──
  return (
    <div className="space-y-5 py-4">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-light)' }}>
            <BookOpen className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Training</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>FundCo Capital Managers · Staff Learning Portal</p>
          </div>
        </div>
      </div>

      {/* Onboarding guide */}
      <AnimatePresence>
        {showGuide && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-4 text-white relative overflow-hidden"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '16px 16px' }} />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-black text-base mb-3 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" /> Welcome to FundCo LMS
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    {[
                      { icon: '📖', text: 'Click any course card to start learning' },
                      { icon: '✅', text: 'Complete modules and take quizzes after each' },
                      { icon: '🎓', text: 'Finish all modules → unlock the Final Exam' },
                      { icon: '🤖', text: 'Blue chat button (bottom-right) = AI Mentor' },
                      { icon: '🏅', text: 'Pass the exam → earn a certificate' },
                      { icon: '📓', text: 'Use the Notes tab to save your thoughts' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        <span>{item.icon}</span><span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setShowGuide(false); localStorage.setItem('lms-guide-dismissed', '1'); }}
                  className="text-white/60 hover:text-white transition-colors p-1 rounded-lg flex-shrink-0"
                  style={{ hover: { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { n: stats?.totalCourses ?? courses.length, l: 'Enrolled',     icon: BookOpen,    color: 'var(--brand-primary)', bg: 'var(--brand-light)' },
          { n: stats?.completedCourses ?? 0,          l: 'Completed',    icon: CheckCircle2, color: '#16a34a',              bg: 'rgba(22,163,74,.1)' },
          { n: stats?.overallProgress != null ? `${stats.overallProgress}%` : '–', l: 'Progress', icon: TrendingUp, color: '#d97706', bg: 'rgba(217,119,6,.1)' },
          { n: progress.filter(p => p.certificationEarned).length, l: 'Certificates', icon: Award, color: '#7c3aed', bg: 'rgba(124,58,237,.1)' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 * i }}
            className="rounded-xl border p-3.5 flex items-center gap-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.bg }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-black leading-none" style={{ color: s.color }}>{s.n}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.l}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="rounded-xl border p-3 flex flex-col sm:flex-row gap-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            className="w-full pl-9 pr-9 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}
            placeholder="Search courses, topics, departments…"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--brand-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div ref={filterRef} className="relative">
          <button onClick={() => setFilterOpen(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-semibold transition-colors"
            style={filterCount > 0
              ? { backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#fff' }
              : { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            <Filter className="w-4 h-4" />
            Filters
            {filterCount > 0 && <span className="bg-white/25 rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">{filterCount}</span>}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {filterOpen && (
              <motion.div initial={{ opacity: 0, y: -4, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: .97 }}
                className="absolute right-0 top-full mt-2 z-50 rounded-xl shadow-xl p-4 min-w-[220px] border"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                <p className="text-xs font-extrabold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Level</p>
                {LEVELS.map(l => (
                  <label key={l} className="flex items-center gap-2 py-1.5 px-1 rounded-lg cursor-pointer text-sm"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <input type="checkbox" checked={selLevels.includes(l)} onChange={() => toggleLevel(l)} style={{ accentColor: 'var(--brand-primary)' }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: LVL[l].color }} />
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </label>
                ))}
                <div className="h-px my-2" style={{ backgroundColor: 'var(--border-color)' }} />
                <p className="text-xs font-extrabold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Department</p>
                {ASSETCOS.map(a => (
                  <label key={a} className="flex items-center gap-2 py-1.5 px-1 rounded-lg cursor-pointer text-sm"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <input type="checkbox" checked={selAssets.includes(a)} onChange={() => toggleAsset(a)} style={{ accentColor: 'var(--brand-primary)' }} />
                    {a}
                  </label>
                ))}
                {filterCount > 0 && (
                  <button onClick={clearAll} className="w-full mt-2 text-xs py-1.5 border rounded-lg transition-colors text-red-500 border-red-200 hover:bg-red-50">
                    Clear all filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--border-color)' }}>
        {[
          { id: 'all',        label: 'All Courses',  n: courses.length },
          { id: 'required',   label: 'Required',     n: courses.filter(c => c.required).length },
          { id: 'inprogress', label: 'In Progress',  n: courses.filter(c => { const p = progressMap[String(c._id)]; return p && p.progress > 0 && p.progress < 100; }).length },
          { id: 'completed',  label: 'Completed',    n: courses.filter(c => progressMap[String(c._id)]?.progress === 100).length },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap -mb-px"
            style={activeTab === t.id
              ? { borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }
              : { borderColor: 'transparent', color: 'var(--text-secondary)' }}>
            {t.label}
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={activeTab === t.id
                ? { backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }
                : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              {t.n}
            </span>
          </button>
        ))}
      </div>

      <CourseGrid courses={tabCourses} progressMap={progressMap} loading={loading} onSelect={handleSelect} />

      <AIMentorPanel />
    </div>
  );
};

export default Training;