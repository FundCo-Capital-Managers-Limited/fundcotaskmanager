// src/pages/Goals.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Target, X, Plus, Loader2, Edit2, Trash2, CheckCircle2, Circle,
  Search, ChevronRight, Calendar, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import moment from 'moment-timezone';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcProgress = (subGoals) => {
  if (!subGoals?.length) return 0;
  return Math.round((subGoals.filter(s => s.completed).length / subGoals.length) * 100);
};

const TYPE_CONFIG = {
  personal: { label: 'Personal', color: 'var(--brand-primary)', bg: 'var(--brand-light)' },
  task:     { label: 'Task',     color: '#36a9e1',               bg: 'rgba(54,169,225,.12)' },
};

const TIMEFRAMES = ['daily','weekly','monthly','quarterly'];

// ── Progress ring ─────────────────────────────────────────────────────────────
const Ring = ({ pct, size = 56, stroke = 4, color = 'var(--brand-primary)' }) => {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={off}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize={size < 48 ? 9 : 11}
        fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color, active, onClick }) => (
  <motion.div whileHover={{ y: -1 }} onClick={onClick}
    className="rounded-xl border p-4 cursor-pointer transition-all"
    style={{
      backgroundColor: active ? 'var(--brand-light)' : 'var(--bg-surface)',
      borderColor: active ? 'var(--brand-primary)' : 'var(--border-color)',
    }}>
    <p className="text-2xl font-black" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
    <p className="text-xs font-semibold mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
  </motion.div>
);

// ── Goal card ─────────────────────────────────────────────────────────────────
const GoalCard = ({ goal, onClick, index }) => {
  const pct  = calcProgress(goal.subGoals);
  const tc   = TYPE_CONFIG[goal.type] || TYPE_CONFIG.personal;
  const done = pct === 100;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      className="group rounded-xl border p-5 cursor-pointer transition-all"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-primary)'; e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-color)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div className="flex items-start gap-4">
        <Ring pct={pct} size={52} stroke={4} color={done ? '#16a34a' : 'var(--brand-primary)'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{goal.title}</h3>
            <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: tc.bg, color: tc.color }}>
              {tc.label}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              {goal.timeframe}
            </span>
            {done && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(22,163,74,.12)', color: '#16a34a' }}>
                ✓ Complete
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2.5">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <Calendar className="w-3 h-3 inline mr-1" />
              {moment(goal.endDate).tz('Africa/Lagos').format('MMM D, YYYY')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {goal.subGoals?.filter(s => s.completed).length || 0}/{goal.subGoals?.length || 0} sub-goals
            </p>
          </div>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <motion.div className="h-full rounded-full"
              style={{ backgroundColor: done ? '#16a34a' : 'var(--brand-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: index * 0.04 }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Field helper ──────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
      {label}
    </label>
    {children}
  </div>
);

const baseInput = {
  backgroundColor: 'var(--input-bg)',
  color:           'var(--text-primary)',
  border:          '1px solid var(--input-border)',
  borderRadius:    10,
  padding:         '9px 13px',
  width:           '100%',
  fontSize:        13,
  outline:         'none',
};

const FocusInput = (props) => {
  const [f, setF] = useState(false);
  return <input {...props} style={{ ...baseInput, borderColor: f ? 'var(--brand-accent)' : 'var(--input-border)' }}
    onFocus={() => setF(true)} onBlur={() => setF(false)} />;
};

const FocusSelect = ({ children, ...props }) => {
  const [f, setF] = useState(false);
  return <select {...props} style={{ ...baseInput, borderColor: f ? 'var(--brand-accent)' : 'var(--input-border)', cursor: 'pointer' }}
    onFocus={() => setF(true)} onBlur={() => setF(false)}>{children}</select>;
};

// ── Goal form (shared by create & edit) ───────────────────────────────────────
const GoalForm = ({ initial, onSubmit, onCancel, isLoading, isEdit = false, tasks = [] }) => {
  const [data, setData] = useState(initial);
  const [subInput, setSubInput] = useState('');

  const upd = (field, val) => setData(p => ({ ...p, [field]: val }));

  const addSub = () => {
    if (!subInput.trim()) return toast.error('Sub-goal title required');
    upd('subGoals', [...(data.subGoals || []), { title: subInput.trim(), completed: false, taskId: null }]);
    setSubInput('');
  };

  const removeSub = (i) => upd('subGoals', data.subGoals.filter((_, idx) => idx !== i));

  const toggleSub = (i) => {
    const updated = [...data.subGoals];
    updated[i] = { ...updated[i], completed: !updated[i].completed };
    upd('subGoals', updated);
  };

  const setDefaultDates = (timeframe) => {
    const s = new Date();
    const e = new Date();
    if (timeframe === 'daily')     e.setDate(s.getDate() + 1);
    if (timeframe === 'weekly')    e.setDate(s.getDate() + 7);
    if (timeframe === 'monthly')   e.setMonth(s.getMonth() + 1);
    if (timeframe === 'quarterly') e.setMonth(s.getMonth() + 3);
    upd('startDate', s); upd('endDate', e);
  };

  return (
    <div className="space-y-5 overflow-y-auto max-h-[65vh] pr-1">
      <Field label="Goal Title">
        <FocusInput value={data.title} onChange={e => upd('title', e.target.value)}
          placeholder="e.g. Complete Q3 project plan" />
      </Field>

      {data.type === 'task' && (
        <Field label="Associate with Task(s)">
          <select multiple value={data.associatedTasks || []} 
            onChange={e => upd('associatedTasks', Array.from(e.target.selectedOptions, option => option.value))}
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)', minHeight: '120px' }}>
            {tasks.map(task => (
              <option key={task._id} value={task._id}>
                {task.title}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-muted mt-1">Hold Ctrl/Cmd to select multiple tasks</p>
        </Field>
      )}

      <Field label={`Sub-Goals (${(data.subGoals||[]).length})`}>
        <div className="flex gap-2 mb-2">
          <FocusInput value={subInput} onChange={e => setSubInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSub()}
            placeholder="Add a sub-goal and press Enter" style={{ flex: 1, ...baseInput }} />
          <button onClick={addSub}
            className="px-4 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {(data.subGoals || []).length > 0 && (
          <div className="space-y-2 mt-2">
            {data.subGoals.map((sub, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <button onClick={() => toggleSub(i)} className="flex-shrink-0">
                  {sub.completed
                    ? <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />
                    : <Circle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                </button>
                <span className={`flex-1 text-sm ${sub.completed ? 'line-through' : ''}`}
                  style={{ color: sub.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {sub.title}
                </span>
                <button onClick={() => removeSub(i)} style={{ color: '#dc2626' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Goal Type">
          <FocusSelect value={data.type} onChange={e => upd('type', e.target.value)}>
            <option value="personal">Personal</option>
            <option value="task">Task</option>
          </FocusSelect>
        </Field>
        <Field label="Timeframe">
          <FocusSelect value={data.timeframe} onChange={e => { upd('timeframe', e.target.value); if (!isEdit) setDefaultDates(e.target.value); }}>
            {TIMEFRAMES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </FocusSelect>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date">
          <DatePicker selected={data.startDate}
            onChange={d => upd('startDate', d)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}
            wrapperClassName="w-full" />
        </Field>
        <Field label="End Date">
          <DatePicker selected={data.endDate}
            onChange={d => upd('endDate', d)}
            className="w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none"
            wrapperClassName="w-full" />
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onCancel}
          className="flex-1 py-3 rounded-xl border text-sm font-semibold transition-colors"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          Cancel
        </button>
        <button onClick={() => onSubmit(data)} disabled={isLoading}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isEdit ? 'Save Changes' : 'Create Goal'}
        </button>
      </div>
    </div>
  );
};

// ── Goal detail modal (BATCH SUB-GOAL UPDATE) ───────────────────────────────
const GoalDetailModal = ({ goal, onClose, onUpdate, onDelete, isLoading, tasks = [] }) => {
  const [localGoal, setLocalGoal] = useState({ ...goal });
  const [localSubGoals, setLocalSubGoals] = useState(goal.subGoals || []);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const pct  = calcProgress(localSubGoals);
  const done = pct === 100;
  const tc   = TYPE_CONFIG[localGoal.type] || TYPE_CONFIG.personal;
  const hasAdminComments = goal.adminComments?.length > 0;

  useEffect(() => {
    setLocalGoal({ ...goal });
    setLocalSubGoals(goal.subGoals || []);
    setHasChanges(false);
  }, [goal]);

  useEffect(() => {
    const originalCompleted = goal.subGoals?.map(s => s.completed) || [];
    const currentCompleted = localSubGoals.map(s => s.completed);
    setHasChanges(JSON.stringify(originalCompleted) !== JSON.stringify(currentCompleted));
  }, [localSubGoals, goal.subGoals]);

  const toggleSubGoal = (index) => {
    const updated = [...localSubGoals];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setLocalSubGoals(updated);
  };

  const handleBatchUpdate = async () => {
    if (!hasChanges) return;
    const updatedGoal = { ...localGoal, subGoals: localSubGoals };
    setLocalGoal(updatedGoal);
    try {
      await onUpdate({ ...updatedGoal, startDate: updatedGoal.startDate, endDate: updatedGoal.endDate });
      toast.success('Progress updated successfully');
      setHasChanges(false);
    } catch (e) {
      toast.error('Failed to update progress');
    }
  };

  if (confirmDelete) return (
    <div className="space-y-5">
      <div className="text-center py-4">
        <Trash2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#dc2626' }} />
        <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Delete Goal?</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>This cannot be undone.</p>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setConfirmDelete(false)}
          className="flex-1 py-3 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
        <button onClick={onDelete} disabled={isLoading}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: '#dc2626' }}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Delete'}
        </button>
      </div>
    </div>
  );

  if (editing) return (
    <>
      <h2 className="text-base font-black mb-5" style={{ color: 'var(--text-primary)' }}>Edit Goal</h2>
      <GoalForm
        initial={{ ...localGoal, startDate: new Date(localGoal.startDate), endDate: new Date(localGoal.endDate) }}
        onSubmit={onUpdate}
        onCancel={() => setEditing(false)}
        isLoading={isLoading}
        isEdit
        tasks={tasks}
      />
    </>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Ring pct={pct} size={64} stroke={5} color={done ? '#16a34a' : 'var(--brand-primary)'} />
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-base leading-tight" style={{ color: 'var(--text-primary)' }}>{localGoal.title}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: tc.bg, color: tc.color }}>{tc.label}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold capitalize" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>{localGoal.timeframe}</span>
            {done && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'rgba(22,163,74,.12)', color: '#16a34a' }}>✓ Complete</span>}
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            {moment(localGoal.startDate).tz('Africa/Lagos').format('MMM D')} → {moment(localGoal.endDate).tz('Africa/Lagos').format('MMM D, YYYY')}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span style={{ color: 'var(--text-muted)' }}>Progress</span>
          <span className="font-bold" style={{ color: done ? '#16a34a' : 'var(--brand-primary)' }}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
          <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
            style={{ backgroundColor: done ? '#16a34a' : 'var(--brand-primary)' }} />
        </div>
      </div>

      {/* Sub-goals */}
      {localSubGoals?.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Sub-Goals ({localSubGoals.filter(s => s.completed).length}/{localSubGoals.length})
          </p>
          <div className="space-y-2">
            {localSubGoals.map((sub, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/50 transition-colors"
                style={{ backgroundColor: 'var(--bg-subtle)' }}
                onClick={() => toggleSubGoal(i)}>
                {sub.completed
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#16a34a' }} />
                  : <Circle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
                <span className={`flex-1 text-sm ${sub.completed ? 'line-through' : ''}`}
                  style={{ color: sub.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {sub.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW: Admin Comments section */}
      {hasAdminComments && (
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5"
            style={{ color: '#7c3aed' }}>
            📋 Admin Feedback ({goal.adminComments.length})
          </p>
          <div className="space-y-2">
            {goal.adminComments.map((c, i) => (
              <div key={i} className="rounded-xl p-3"
                style={{ backgroundColor: 'rgba(147,51,234,0.04)', border: '1px solid rgba(147,51,234,0.15)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold"
                    style={{ backgroundColor: '#7c3aed' }}>
                    {(c.user?.firstName || 'A').charAt(0)}
                  </div>
                  <p className="text-xs font-bold" style={{ color: '#7c3aed' }}>
                    {c.user?.firstName || 'Admin'} {c.user?.lastName || ''}
                    {c.user?.role && c.user.role !== 'standard' && (
                      <span className="ml-1 text-[10px] font-normal opacity-70">({c.user.role})</span>
                    )}
                  </p>
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                    {c.createdAt ? moment(c.createdAt).fromNow() : ''}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{c.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update button */}
      {hasChanges && (
        <button onClick={handleBatchUpdate} disabled={isLoading}
          className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Progress'}
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button onClick={() => setEditing(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <Edit2 className="w-4 h-4" /> Full Edit
        </button>
        <button onClick={() => setConfirmDelete(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: 'rgba(220,38,38,.08)', color: '#dc2626' }}>
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const Goals = () => {
  const { user, onLogout } = useOutletContext();
  const navigate = useNavigate();

  const [goals,         setGoals]         = useState([]);
  const [tasks,         setTasks]         = useState([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const [search,        setSearch]        = useState('');
  const [sortBy,        setSortBy]        = useState('date');
  const [filterBy,      setFilterBy]      = useState('all');
  const [showCreate,    setShowCreate]    = useState(false);
  const [activeGoal,    setActiveGoal]    = useState(null);

  const getHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }), []);

  // ── Socket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket', 'polling'],
    });
    socket.on('newGoal',     g  => { if (g?._id) setGoals(p => p.some(x => x._id === g._id) ? p : [g, ...p]); });
    socket.on('goalUpdated', g  => { if (g?._id) setGoals(p => p.map(x => x._id === g._id ? g : x)); });
    socket.on('goalDeleted', id => { if (id) setGoals(p => p.filter(x => x._id !== id)); });
    return () => socket.disconnect();
  }, []);

  // ── Auth interceptor ─────────────────────────────────────────────────────
  useEffect(() => {
    const id = axios.interceptors.response.use(r => r, err => {
      if (err.response?.status === 401) { onLogout?.(); navigate('/login'); }
      return Promise.reject(err);
    });
    return () => axios.interceptors.response.eject(id);
  }, [onLogout, navigate]);

  // ── Fetch Goals + Tasks ──────────────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await axios.get(`${API_BASE_URL}/api/goals`, {
        headers: getHeaders(),
        timeout: 15000
      });
      setGoals(r.data.goals || []);
    } catch (e) {
      if (e.code === 'ECONNABORTED') toast.error('Goals request timed out');
      else if (e.response?.status !== 401) toast.error(e.response?.data?.message || 'Failed to load goals');
    } finally { setIsLoading(false); }
  }, [getHeaders]);

  const fetchTasks = useCallback(async () => {
    try {
      const r = await axios.get(`${API_BASE_URL}/api/tasks/gp`, { headers: getHeaders() });
      setTasks(r.data.tasks || []);
    } catch {}
  }, [getHeaders]);

  useEffect(() => {
    if (!user || !localStorage.getItem('token')) { navigate('/login'); return; }
    fetchGoals();
    fetchTasks();
  }, [user, navigate, fetchGoals, fetchTasks]);

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async (data) => {
    if (!data.title.trim()) return toast.error('Title required');
    if (!data.subGoals?.length) return toast.error('Add at least one sub-goal');
    if (data.startDate >= data.endDate) return toast.error('End date must be after start date');

    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/goals`, data, { headers: getHeaders(), timeout: 10000 });
      setShowCreate(false);
      toast.success('Goal created!');
    } catch (e) {
      if (e.response?.status !== 401) toast.error(e.response?.data?.message || 'Failed to create');
    } finally { setIsLoading(false); }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const handleUpdate = async (data) => {
    if (!activeGoal?._id) return;
    if (!data.title.trim()) return toast.error('Title required');
    if (!data.subGoals?.length) return toast.error('Add at least one sub-goal');
    if (data.startDate >= data.endDate) return toast.error('End date must be after start date');

    setIsLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/api/goals/${activeGoal._id}`, data, { headers: getHeaders(), timeout: 10000 });
      setActiveGoal(null);
      toast.success('Goal updated!');
    } catch (e) {
      if (e.response?.status !== 401) toast.error(e.response?.data?.message || 'Failed to update');
    } finally { setIsLoading(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!activeGoal?._id) return;
    setIsLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/goals/${activeGoal._id}`, { headers: getHeaders(), timeout: 10000 });
      setActiveGoal(null);
      toast.success('Goal deleted!');
    } catch (e) {
      if (e.response?.status !== 401) toast.error(e.response?.data?.message || 'Failed to delete');
    } finally { setIsLoading(false); }
  };

  // ── Filter + sort ────────────────────────────────────────────────────────
  const filtered = goals.filter(g => {
    if (!g.title.toLowerCase().includes(search.toLowerCase())) return false;
    const pct = calcProgress(g.subGoals);
    if (filterBy === 'completed') return pct === 100;
    if (filterBy === 'active')    return pct < 100;
    if (filterBy === 'personal')  return g.type === 'personal';
    if (filterBy === 'task')      return g.type === 'task';
    return true;
  }).sort((a, b) => {
    if (sortBy === 'progress-asc')  return calcProgress(a.subGoals) - calcProgress(b.subGoals);
    if (sortBy === 'progress-desc') return calcProgress(b.subGoals) - calcProgress(a.subGoals);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const stats = {
    total:    goals.length,
    completed:goals.filter(g => calcProgress(g.subGoals) === 100).length,
    active:   goals.filter(g => calcProgress(g.subGoals) < 100).length,
    avgPct:   Math.round(goals.reduce((s, g) => s + calcProgress(g.subGoals), 0) / (goals.length || 1)),
  };

  const defaultGoal = () => ({
    title: '', subGoals: [], type: 'personal', timeframe: 'weekly',
    startDate: new Date(),
    endDate: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })(),
    associatedTasks: [],
  });

  return (
    <div className="space-y-6 py-4">
      <Toaster position="top-right" />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            
            Goals
          </h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} active={filterBy === 'all'} onClick={() => setFilterBy('all')} />
        <StatCard label="Active" value={stats.active} active={filterBy === 'active'} onClick={() => setFilterBy(f => f === 'active' ? 'all' : 'active')} color="var(--brand-primary)" />
        <StatCard label="Completed" value={stats.completed} active={filterBy === 'completed'} onClick={() => setFilterBy(f => f === 'completed' ? 'all' : 'completed')} color="#16a34a" />
        <StatCard label="Avg Progress" value={`${stats.avgPct}%`} color="#f59e0b" />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search goals…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text-primary)' }} />
          {search && <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>}
        </div>

        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          {['all','active','completed','personal','task'].map(f => (
            <button key={f} onClick={() => setFilterBy(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize"
              style={filterBy === f ? { backgroundColor: 'var(--brand-primary)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
              {f}
            </button>
          ))}
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
          <option value="date">Recent first</option>
          <option value="progress-desc">Progress: high–low</option>
          <option value="progress-asc">Progress: low–high</option>
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <Target className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
            {search || filterBy !== 'all' ? 'No goals match your filters' : 'No goals yet'}
          </p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-muted)' }}>
            {!search && filterBy === 'all' && 'Set your first goal and start tracking progress'}
          </p>
          {filterBy === 'all' && !search && (
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              <Plus className="w-4 h-4" /> Create Goal
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((goal, i) => (
              <GoalCard key={goal._id} goal={goal} index={i} onClick={() => setActiveGoal(goal)} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,.55)' }}
              onClick={() => setShowCreate(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl border shadow-2xl p-6"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Create New Goal</h2>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <GoalForm initial={defaultGoal()} onSubmit={handleCreate}
                onCancel={() => setShowCreate(false)} isLoading={isLoading} tasks={tasks} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail modal */}
      <AnimatePresence>
        {activeGoal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,.55)' }}
              onClick={() => setActiveGoal(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl border shadow-2xl p-6"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Goal</span>
                <button onClick={() => setActiveGoal(null)} className="p-1.5 rounded-lg"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <GoalDetailModal
                goal={activeGoal}
                onClose={() => setActiveGoal(null)}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                isLoading={isLoading}
                tasks={tasks}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Goals;