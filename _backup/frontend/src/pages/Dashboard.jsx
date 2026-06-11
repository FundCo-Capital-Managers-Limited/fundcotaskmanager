// Dashboard.jsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Flag, Clock, CheckSquare, Filter, Plus, Rocket,
  Search, ArrowUpDown, CircleCheck, Layers, CheckCircle, Pen, Trash2,
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TaskItem from '../components/TaskItem';
import axios from 'axios';
import TaskModal from '../components/TaskModal';
import io from 'socket.io-client';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/tasks`;
const USER_API_URL = import.meta.env.VITE_USER_API_URL || 'http://localhost:4001';

const FILTER_LABELS = {
  all: 'All', today: 'Today', week: 'Week', month: 'Month',
  high: 'High', medium: 'Medium', low: 'Low',
  done: 'Done', undone: 'Undone', overdue: 'Overdue',
  approved: 'Approved', rejected: 'Rejected',
};
const FILTER_OPTIONS = Object.keys(FILTER_LABELS);
const SORT_OPTIONS = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
];

/* ── Skeleton ──────────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="rounded-xl border p-4 animate-pulse"
    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--bg-hover)' }} />
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 rounded w-3/4" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-2.5 rounded w-1/3" style={{ backgroundColor: 'var(--bg-subtle)' }} />
        <div className="h-2 rounded w-full" style={{ backgroundColor: 'var(--bg-subtle)' }} />
      </div>
    </div>
  </div>
);

/* ── Task Action Modal ─────────────────────────────────────────────────────── */
const TaskActionModal = ({ isOpen, onClose, onAction, task }) => {
  if (!isOpen || !task) return null;
  const isComp = task.completed === true || task.completed === 1 || (typeof task.completed === 'string' && task.completed.toLowerCase() === 'yes');
  const { submissionStatus } = task;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1000] p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose an action</p>
        </div>
        <div className="p-4 space-y-2">
          <button onClick={() => onAction('complete')} disabled={isComp}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${isComp ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-50'}`}
            style={{ color: '#16a34a', backgroundColor: isComp ? '#f0fdf4' : undefined }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {isComp ? 'Already Completed' : 'Mark as Done'}
          </button>
          {isComp && submissionStatus === 'not_submitted' && (
            <button onClick={() => onAction('submit')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors">
              <CheckSquare className="w-4 h-4 flex-shrink-0" /> Submit for Approval
            </button>
          )}
          {isComp && submissionStatus && submissionStatus !== 'not_submitted' && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-not-allowed"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
              <CheckSquare className="w-4 h-4 flex-shrink-0" />
              {submissionStatus === 'submitted' ? 'Waiting Approval' : submissionStatus === 'approved' ? 'Approved ✓' : 'Rejected'}
            </div>
          )}
          <button onClick={() => onAction('edit')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: 'var(--brand-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brand-light)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Pen className="w-4 h-4 flex-shrink-0" /> Edit Task
          </button>
          <button onClick={() => onAction('delete')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4 flex-shrink-0" /> Delete Task
          </button>
        </div>
        <div className="px-4 pb-4">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ── Delete Confirm ───────────────────────────────────────────────────────── */
const DeleteModal = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1001] p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onCancel}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl shadow-2xl w-full max-w-sm p-6 border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>Delete Task?</h3>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
            Keep It
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/* ── Stat Card ────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, icon: Icon, bg, color }) => (
  <div className="rounded-xl border p-4 flex items-center gap-3"
    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <div>
      <p className="text-xl font-black leading-none" style={{ color }}>{value}</p>
      <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    </div>
  </div>
);

/* ── Dashboard ────────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const { user, tasks, tasksLoading, fetchTasks: refreshTasks, onLogout } = useOutletContext();
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('dueDate');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [localTasks, setLocalTasks] = useState(tasks);

  // NEW: Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    const socket = io(USER_API_URL, { auth: { token: localStorage.getItem('token') } });
    socket.on('newTask', (t) => { if (t.owner?._id === user?.id) setLocalTasks((p) => [...p, t]); });
    socket.on('updateTask', (t) => { if (t.owner?._id === user?.id) setLocalTasks((p) => p.map((x) => x._id === t._id ? t : x)); });
    socket.on('deleteTask', (tid) => setLocalTasks((p) => p.filter((x) => x._id !== tid)));
    return () => socket.disconnect();
  }, [user?.id]);

  useEffect(() => setLocalTasks(tasks), [tasks]);
  useEffect(() => { const t = setInterval(() => setCurrentTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const isComp = (t) => t.completed === true || t.completed === 1 || (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes');

  const stats = useMemo(() => ({
    total: localTasks.length,
    completed: localTasks.filter(isComp).length,
    undone: localTasks.filter((t) => !isComp(t)).length,
    highPri: localTasks.filter((t) => t.priority?.toLowerCase() === 'high').length,
    overdue: localTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && !isComp(t)).length,
    approved: localTasks.filter((t) => t.submissionStatus === 'approved').length,
  }), [localTasks]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const nw = new Date(now); nw.setDate(now.getDate() + 7);
    const nm = new Date(now); nm.setMonth(now.getMonth() + 1);
    const sl = search.toLowerCase();
    return localTasks
      .filter((task) => {
        if (!task?.title) return false;
        const ms = task.title.toLowerCase().includes(sl) || (task.description || '').toLowerCase().includes(sl);
        const due = task.dueDate ? new Date(task.dueDate) : null;
        switch (filter) {
          case 'today': return due && due.toDateString() === now.toDateString() && ms;
          case 'week': return due && due >= now && due <= nw && ms;
          case 'month': return due && due >= now && due <= nm && ms;
          case 'high': case 'medium': case 'low': return task.priority?.toLowerCase() === filter && ms;
          case 'done': return isComp(task) && ms;
          case 'undone': return !isComp(task) && ms;
          case 'overdue': return due && due < now && !isComp(task) && ms;
          case 'approved': return task.submissionStatus === 'approved' && ms;
          case 'rejected': return task.submissionStatus === 'rejected' && ms;
          default: return ms;
        }
      })
      .sort((a, b) => {
        if (sort === 'dueDate') return (a.dueDate ? new Date(a.dueDate) : Infinity) - (b.dueDate ? new Date(b.dueDate) : Infinity);
        if (sort === 'priority') { const o = { high: 3, medium: 2, low: 1 }; return (o[b.priority?.toLowerCase()] || 0) - (o[a.priority?.toLowerCase()] || 0); }
        if (sort === 'title') return a.title.localeCompare(b.title);
        return 0;
      });
  }, [localTasks, filter, search, sort]);

  const getAuth = () => { const t = localStorage.getItem('token'); if (!t) throw new Error('No token'); return { Authorization: `Bearer ${t}` }; };

  const handleComplete = async (task) => {
    if (!task.checklist || task.checklist.length === 0) {
      setShowErrorModal(true);
      return;
    }
    try {
      const payload = task.checklist?.length
        ? { checklist: task.checklist.map((i) => ({ ...i, completed: true })) }
        : { completed: 'Yes' };
      await axios.put(`${API_BASE_URL}/${task._id}/gp`, payload, { headers: getAuth() });
      await refreshTasks(); setShowActionModal(false); setSelectedTask(null);
    } catch (err) { if (err.response?.status === 401) onLogout?.(); }
  };

  const handleSubmit = async (task) => {
    if (!task.checklist || task.checklist.length === 0) {
      setShowErrorModal(true);
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/${task._id}/submit`, {}, { headers: getAuth() });
      await refreshTasks(); setShowActionModal(false); setSelectedTask(null);
    } catch (err) { if (err.response?.status === 401) onLogout?.(); }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/${selectedTask._id}/gp`, { headers: getAuth() });
      await refreshTasks(); setShowDeleteConfirm(false); setShowActionModal(false); setSelectedTask(null);
    } catch (err) { if (err.response?.status === 401) onLogout?.(); }
  };

  const handleTaskSave = useCallback(async (taskData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');
      const payload = { title: taskData.title?.trim() || '', description: taskData.description || '', priority: taskData.priority || 'Low', dueDate: taskData.dueDate || undefined, checklist: taskData.checklist || [] };
      if (!payload.title) return;
      if (taskData._id) {
        await axios.put(`${API_BASE_URL}/${taskData._id}/gp`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_BASE_URL}/gp`, { ...payload, userId: user?.id || null }, { headers: { Authorization: `Bearer ${token}` } });
      }
      await refreshTasks(); setShowModal(false); setSelectedTask(null);
    } catch (err) { if (err.response?.status === 401) onLogout?.(); }
  }, [refreshTasks, user, onLogout]);

  const handleAction = (action) => {
    if (action === 'complete') handleComplete(selectedTask);
    else if (action === 'submit') handleSubmit(selectedTask);
    else if (action === 'edit') { setShowActionModal(false); setShowModal(true); }
    else if (action === 'delete') setShowDeleteConfirm(true);
  };

  const STAT_CARDS = [
    { label: 'Total Tasks', value: stats.total, icon: Layers, bg: 'var(--brand-light)', color: 'var(--brand-primary)' },
    { label: 'Completed', value: stats.completed, icon: CircleCheck, bg: '#f0fdf4', color: '#16a34a' },
    { label: 'Pending', value: stats.undone, icon: Clock, bg: '#fff7ed', color: '#ea580c' },
    { label: 'High Priority', value: stats.highPri, icon: Flag, bg: '#fef2f2', color: '#dc2626' },
    { label: 'Overdue', value: stats.overdue, icon: Clock, bg: '#fefce8', color: '#ca8a04' },
    { label: 'Approved', value: stats.approved, icon: CheckSquare, bg: '#f0fdf4', color: '#15803d' },
  ];

  return (
    <div className="space-y-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {currentTime.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}
            <span style={{ color: 'var(--brand-accent)' }}>
              {currentTime.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Africa/Lagos' })}
            </span>
          </p>
        </div>
        <button onClick={() => { setSelectedTask(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 active:scale-[0.98] transition-all"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--brand-accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--input-border)'}
            />
          </div>
          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-lg border text-sm focus:outline-none appearance-none cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}>
              {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTER_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setFilter(opt)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={filter === opt
                ? { backgroundColor: 'var(--brand-primary)', color: '#fff' }
                : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
              }>
              {FILTER_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* Task grid */}
      {tasksLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border py-16 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <Layers className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No tasks found</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            {filter === 'all' && !search ? 'Start by adding a task.' : 'Try a different filter.'}
          </p>
          <button onClick={() => { setSelectedTask(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredTasks.map((task, idx) => (
            <motion.div key={task._id || task.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => { setSelectedTask(task); setShowActionModal(true); }}
              className="cursor-pointer">
              <TaskItem task={task} onRefresh={refreshTasks} showCompleteCheckbox onLogout={onLogout} />
            </motion.div>
          ))}
        </div>
      )}

      <TaskModal isOpen={showModal} onClose={() => { setShowModal(false); setSelectedTask(null); }} taskToEdit={selectedTask} onSave={handleTaskSave} onLogout={onLogout} />
      <AnimatePresence>
        {showActionModal && <TaskActionModal isOpen task={selectedTask} onClose={() => { setShowActionModal(false); setSelectedTask(null); }} onAction={handleAction} />}
      </AnimatePresence>
      <DeleteModal isOpen={showDeleteConfirm} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)} />

      {/* CHECKLIST ERROR POPUP MODAL */}
      {showErrorModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[1300] p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
          onClick={() => setShowErrorModal(false)}
        >
          <div
            className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-amber-100 flex items-center justify-center text-3xl">
                ⚠️
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                Checklist Required
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Please add a checklist first.<br />
                A checklist is required as it shows the process breakdown of how the task will be achieved.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;