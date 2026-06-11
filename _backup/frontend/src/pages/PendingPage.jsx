// PendingPage.jsx
import React, { useMemo, useState, useCallback } from 'react';
import { Clock, Filter, ListChecks, Plus, CheckCircle, CheckSquare, Pen, Trash2, Search } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/tasks`;

// Updated TaskActionModal using new design system
const TaskActionModal = ({ isOpen, onClose, onAction, task }) => {
  if (!isOpen || !task) return null;
  const isCompleted = task.completed === true || task.completed === 1 || (typeof task.completed === 'string' && task.completed.toLowerCase() === 'yes');
  const { submissionStatus } = task;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[1000] p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Choose an action</p>
        </div>
        <div className="p-4 space-y-2">
          <button
            onClick={() => onAction('complete')}
            disabled={isCompleted}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
              isCompleted
                ? 'bg-green-50 text-green-600 cursor-not-allowed opacity-60'
                : 'hover:bg-green-50'
            }`}
            style={{ color: isCompleted ? '#16a34a' : '#16a34a' }}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {isCompleted ? 'Already Completed' : 'Mark as Done'}
          </button>

          {isCompleted && submissionStatus === 'not_submitted' && (
            <button
              onClick={() => onAction('submit')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-amber-50"
              style={{ color: '#c2410c' }}
            >
              <CheckSquare className="w-4 h-4 flex-shrink-0" /> Submit for Approval
            </button>
          )}

          {isCompleted && submissionStatus && submissionStatus !== 'not_submitted' && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            >
              <CheckSquare className="w-4 h-4 flex-shrink-0" />
              {submissionStatus === 'submitted'
                ? 'Waiting Approval'
                : submissionStatus === 'approved'
                ? 'Approved ✓'
                : 'Rejected'}
            </div>
          )}

          <button
            onClick={() => onAction('edit')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-[var(--brand-light)]"
            style={{ color: 'var(--brand-primary)' }}
          >
            <Pen className="w-4 h-4 flex-shrink-0" /> Edit Task
          </button>

          <button
            onClick={() => onAction('delete')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-red-50 text-red-600"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" /> Delete Task
          </button>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const SkeletonCard = () => (
  <div
    className="rounded-xl border p-4 animate-pulse"
    style={{
      backgroundColor: 'var(--bg-surface)',
      borderColor: 'var(--border-color)',
    }}
  >
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

const PendingPage = () => {
  const { tasks = [], tasksLoading, fetchTasks: refreshTasks, user, onLogout } = useOutletContext();

  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);

  // NEW: Error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);

  const sortedPendingTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.completed || (typeof t.completed === 'string' && t.completed.toLowerCase() === 'no'))
      .filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        const order = { high: 3, medium: 2, low: 1 };
        return (order[b.priority?.toLowerCase()] || 0) - (order[a.priority?.toLowerCase()] || 0);
      });
  }, [tasks, sortBy, search]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token found');
    return { Authorization: `Bearer ${token}` };
  };

  const handleTaskSave = useCallback(async (taskData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const payload = {
        title: taskData.title?.trim() || '',
        description: taskData.description || '',
        priority: taskData.priority || 'Low',
        dueDate: taskData.dueDate || undefined,
        checklist: taskData.checklist || [],
      };

      if (!payload.title) return;

      if (taskData._id) {
        await axios.put(`${API_BASE_URL}/${taskData._id}/gp`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_BASE_URL}/gp`, { ...payload, userId: user?.id || null }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      await refreshTasks();
      setShowModal(false);
      setSelectedTask(null);
    } catch (err) {
      if (err.response?.status === 401) onLogout?.();
    }
  }, [refreshTasks, user, onLogout]);

  const handleComplete = async (task) => {
    if (!task.checklist || task.checklist.length === 0) {
      setShowErrorModal(true);
      return;
    }
    try {
      const payload = task.checklist?.length > 0
        ? { checklist: task.checklist.map((i) => ({ ...i, completed: true })) }
        : { completed: 'Yes' };
      await axios.put(`${API_BASE_URL}/${task._id}/gp`, payload, { headers: getAuthHeaders() });
      await refreshTasks();
      setShowActionModal(false);
      setSelectedTask(null);
    } catch (err) {
      if (err.response?.status === 401) onLogout?.();
    }
  };

  const handleSubmit = async (task) => {
    if (!task.checklist || task.checklist.length === 0) {
      setShowErrorModal(true);
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/${task._id}/submit`, {}, { headers: getAuthHeaders() });
      await refreshTasks();
      setShowActionModal(false);
      setSelectedTask(null);
    } catch (err) {
      if (err.response?.status === 401) onLogout?.();
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/${selectedTask._id}/gp`, { headers: getAuthHeaders() });
      await refreshTasks();
      setShowActionModal(false);
      setSelectedTask(null);
    } catch (err) {
      if (err.response?.status === 401) onLogout?.();
    }
  };

  const handleAction = (action) => {
    if (action === 'complete') handleComplete(selectedTask);
    else if (action === 'submit') handleSubmit(selectedTask);
    else if (action === 'edit') { setShowActionModal(false); setShowModal(true); }
    else if (action === 'delete') handleDelete();
  };

  return (
    <div className="space-y-5 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--brand-light)' }}
          >
            <ListChecks className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Pending Tasks</h1>
            <p className="text-sm font-medium" style={{ color: 'var(--brand-primary)' }}>
              {sortedPendingTasks.length} active task{sortedPendingTasks.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setSelectedTask(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pending tasks…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-muted)' }}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-lg border text-sm focus:outline-none appearance-none cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">By Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task list */}
      {tasksLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sortedPendingTasks.length === 0 ? (
        <div
          className="rounded-xl border py-16 text-center"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--brand-light)' }}
          >
            <Clock className="w-7 h-7" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>All caught up!</h3>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>No pending tasks right now.</p>
          <button
            onClick={() => { setSelectedTask(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {sortedPendingTasks.map((task, idx) => (
            <motion.div
              key={task._id || task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => { setSelectedTask(task); setShowActionModal(true); }}
              className="cursor-pointer"
            >
              <TaskItem
                task={task}
                showCompleteCheckbox
                onRefresh={refreshTasks}
                onLogout={onLogout}
              />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showActionModal && (
          <TaskActionModal
            isOpen={showActionModal}
            onClose={() => setShowActionModal(false)}
            onAction={handleAction}
            task={selectedTask}
          />
        )}
      </AnimatePresence>

      <TaskModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedTask(null); refreshTasks?.(); }}
        taskToEdit={selectedTask}
        onSave={handleTaskSave}
        onLogout={onLogout}
      />

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

export default PendingPage;