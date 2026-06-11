// src/pages/CalendarView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Clock, Plus, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/tasks`;

// ── Priority colours ──────────────────────────────────────────────────────────
const PRIORITY_COLOR = {
  high:   { dot: '#ef4444', bg: 'rgba(239,68,68,.12)',   text: '#ef4444'  },
  medium: { dot: '#f59e0b', bg: 'rgba(245,158,11,.12)',  text: '#d97706'  },
  low:    { dot: '#22c55e', bg: 'rgba(34,197,94,.12)',   text: '#16a34a'  },
};

// ── Mini calendar ─────────────────────────────────────────────────────────────
const MiniCalendar = ({ value, onChange, tasksByDate }) => {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const year  = view.getFullYear();
  const month = view.getMonth();

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const cells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today     = new Date();
  const isToday   = (d) => d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const isSelected= (d) => d && value.getFullYear() === year && value.getMonth() === month && value.getDate() === d;
  const key       = (d) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const hasTasks  = (d) => d && (tasksByDate[key(d)]?.length > 0);

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={() => setView(new Date(year, month - 1, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          {view.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setView(new Date(year, month + 1, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[11px] font-bold py-1"
              style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const selected = isSelected(day);
            const today_   = isToday(day);
            const tasks    = tasksByDate[key(day)] || [];
            const hasDot   = tasks.length > 0;

            return (
              <button key={i} onClick={() => onChange(new Date(year, month, day))}
                className="flex flex-col items-center py-1 rounded-xl transition-all"
                style={{
                  backgroundColor: selected ? 'var(--brand-primary)' : today_ ? 'var(--brand-light)' : 'transparent',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.backgroundColor = today_ ? 'var(--brand-light)' : 'transparent'; }}>
                <span className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                  style={{ color: selected ? '#fff' : today_ ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                  {day}
                </span>
                {hasDot && (
                  <div className="flex gap-0.5 mt-0.5">
                    {tasks.slice(0, 3).map((t, ti) => {
                      const p = (t.priority || 'low').toLowerCase();
                      return <span key={ti} className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: selected ? 'rgba(255,255,255,0.7)' : (PRIORITY_COLOR[p]?.dot || '#94a3b8') }} />;
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Today button */}
      <div className="px-4 pb-4">
        <button onClick={() => { onChange(new Date()); setView(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); }}
          className="w-full py-2 rounded-xl text-xs font-bold transition-colors"
          style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}>
          Today
        </button>
      </div>
    </div>
  );
};

// ── Month strip (mini month overview) ────────────────────────────────────────
const MonthStrip = ({ tasksByDate, selectedDate, onSelect }) => {
  const year  = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
        const k   = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const n   = (tasksByDate[k] || []).length;
        const sel = selectedDate.getDate() === day;
        const d   = new Date(year, month, day);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();

        return (
          <button key={day} onClick={() => onSelect(d)}
            className="flex flex-col items-center flex-shrink-0 w-10 py-2 rounded-xl transition-all"
            style={{
              backgroundColor: sel ? 'var(--brand-primary)' : isToday ? 'var(--brand-light)' : 'var(--bg-subtle)',
            }}>
            <span className="text-[10px] font-medium"
              style={{ color: sel ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
              {['S','M','T','W','T','F','S'][d.getDay()]}
            </span>
            <span className="text-sm font-bold"
              style={{ color: sel ? '#fff' : isToday ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
              {day}
            </span>
            {n > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black mt-0.5"
                style={{ backgroundColor: sel ? 'rgba(255,255,255,0.25)' : 'var(--brand-primary)', color: '#fff' }}>
                {n > 9 ? '9+' : n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ── Task card ─────────────────────────────────────────────────────────────────
const TaskCard = ({ task, onClick, onRefresh, onLogout }) => {
  const p    = (task.priority || 'low').toLowerCase();
  const pc   = PRIORITY_COLOR[p] || PRIORITY_COLOR.low;
  const time = task.dueDate
    ? new Date(task.dueDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  return (
    <motion.div whileHover={{ y: -1 }}
      onClick={onClick}
      className="group rounded-xl border p-4 cursor-pointer transition-all"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = pc.dot; e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-color)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div className="flex items-start gap-3">
        {/* Priority accent */}
        <div className="w-1 h-10 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: pc.dot }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold truncate ${task.completed ? 'line-through' : ''}`}
              style={{ color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
              {task.title}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: pc.bg, color: pc.text }}>
              {task.priority || 'Low'}
            </span>
          </div>

          {task.description && (
            <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            {time && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-3 h-3" /> {time}
              </span>
            )}
            {task.checklist?.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {task.checklist.filter(c => c.completed).length}/{task.checklist.length} done
              </span>
            )}
            {task.completed && (
              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#16a34a' }}>
                <CheckCircle2 className="w-3 h-3" /> Complete
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const CalendarView = () => {
  const { user, tasks, fetchTasks, onLogout } = useOutletContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal]       = useState(false);
  const [taskToEdit, setTaskToEdit]     = useState(null);
  const [currentTime, setCurrentTime]   = useState('');

  // Live clock WAT
  useEffect(() => {
    const tick = () => setCurrentTime(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit',
        hour12: true, timeZone: 'Africa/Lagos',
      }).format(new Date())
    );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Tasks for selected day
  const dailyTasks = useMemo(() => tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d.getFullYear() === selectedDate.getFullYear() &&
           d.getMonth()    === selectedDate.getMonth()    &&
           d.getDate()     === selectedDate.getDate();
  }), [tasks, selectedDate]);

  // Tasks by date (for dots)
  const tasksByDate = useMemo(() => {
    const m = {};
    tasks.forEach(t => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!m[k]) m[k] = [];
      m[k].push(t);
    });
    return m;
  }, [tasks]);

  const handleSave = async (taskData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');
      const payload = {
        title:       taskData.title?.trim() || '',
        description: taskData.description || '',
        priority:    taskData.priority || 'Low',
        dueDate:     taskData.dueDate || selectedDate.toISOString().split('T')[0],
        completed:   taskData.completed === 'Yes' || taskData.completed === true,
        userId:      user?.id || null,
      };
      if (!payload.title) return;
      if (taskData._id) {
        await axios.put(`${API_BASE_URL}/${taskData._id}/gp`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_BASE_URL}/gp`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      await fetchTasks();
      setShowModal(false);
      setTaskToEdit(null);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) onLogout?.();
    }
  };

  const openNew = () => {
    setTaskToEdit({ dueDate: selectedDate.toISOString().split('T')[0] });
    setShowModal(true);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const completedCount = dailyTasks.filter(t => t.completed).length;
  const pendingCount   = dailyTasks.filter(t => !t.completed).length;

  return (
    <div className="space-y-5 py-4">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <CalendarDays className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
            Calendar
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live clock */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <Clock className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
            {currentTime} WAT
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* Left: mini calendar + stats */}
        <div className="space-y-4">
          <MiniCalendar value={selectedDate} onChange={setSelectedDate} tasksByDate={tasksByDate} />

          {/* Daily stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total',     value: dailyTasks.length,  color: 'var(--brand-primary)' },
              { label: 'Done',      value: completedCount,     color: '#16a34a' },
              { label: 'Pending',   value: pendingCount,       color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: task panel */}
        <div className="rounded-2xl border flex flex-col overflow-hidden"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', minHeight: 520 }}>

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: isToday ? '#22c55e' : 'var(--brand-primary)' }} />
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                {isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h2>
              {dailyTasks.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
                  {dailyTasks.length} task{dailyTasks.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--brand-primary)' }}>
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {/* Month strip */}
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
            <MonthStrip tasksByDate={tasksByDate} selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto p-5">
            {dailyTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <CalendarDays className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>No tasks for this day</p>
                <p className="text-sm mt-1 mb-5" style={{ color: 'var(--text-muted)' }}>Schedule something for this date</p>
                <button onClick={openNew}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--brand-primary)' }}>
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>
            ) : (
              <AnimatePresence>
                <div className="space-y-3">
                  {dailyTasks.map((task, i) => (
                    <motion.div key={task._id || task.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <TaskCard
                        task={task}
                        onClick={() => { setTaskToEdit(task); setShowModal(true); }}
                        onRefresh={fetchTasks}
                        onLogout={onLogout}
                      />
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>

          {/* Progress footer */}
          {dailyTasks.length > 0 && (
            <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span style={{ color: 'var(--text-muted)' }}>Day progress</span>
                <span className="font-bold" style={{ color: 'var(--brand-primary)' }}>
                  {dailyTasks.length > 0 ? Math.round((completedCount / dailyTasks.length) * 100) : 0}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyTasks.length > 0 ? (completedCount / dailyTasks.length) * 100 : 0}%` }}
                  transition={{ duration: 0.5 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task modal */}
      <TaskModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setTaskToEdit(null); }}
        taskToEdit={taskToEdit}
        onSave={handleSave}
        onLogout={onLogout}
      />
    </div>
  );
};

export default CalendarView;