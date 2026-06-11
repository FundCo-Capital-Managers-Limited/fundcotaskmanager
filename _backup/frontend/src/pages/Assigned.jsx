import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, CheckSquare, Clock, Filter, ListChecks, PenSquare, Search, ShieldAlert, X } from 'lucide-react';
import axios from 'axios';
import { useOutletContext } from 'react-router-dom';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import { useNotifications } from '../context/NotificationContext.jsx';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/tasks`;
const isCompletedValue = (value) => [true, 1, 'yes'].includes(typeof value === 'string' ? value.toLowerCase() : value);

const getSubmissionLabel = (status) => {
  if (status === 'submitted') return 'Waiting Approval';
  if (status === 'approved') return 'Approved';
  if (status === 'rejected') return 'Rejected';
  return 'Not Submitted';
};

const getAppealLabel = (status) => {
  if (status === 'accepted') return 'Accepted';
  if (status === 'rejected') return 'Rejected';
  return 'Not Responded';
};

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
    <div className="flex gap-3">
      <div className="flex-1 space-y-2.5">
        <div className="h-3.5 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-hover)' }} />
        <div className="h-2.5 w-1/3 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
      </div>
    </div>
  </div>
);

const AssignedTaskActionModal = ({ isOpen, task, onClose, onAction }) => {
  if (!isOpen || !task) return null;

  const isCompleted = isCompletedValue(task.completed);
  const canSubmit = isCompleted && task.submissionStatus === 'not_submitted';
  const canAppeal = task.createdByAdmin && task.appealStatus === 'not_appealed';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-color)' }}>
          <p className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Choose what you want to do next.</p>
        </div>

        <div className="space-y-2 p-4">
          <button
            onClick={() => onAction('complete')}
            disabled={isCompleted}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isCompleted ? 'cursor-not-allowed opacity-60' : 'hover:bg-green-50'}`}
            style={{ color: '#16a34a', backgroundColor: isCompleted ? '#f0fdf4' : 'transparent' }}
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {isCompleted ? 'Already Completed' : 'Mark as Done'}
          </button>

          {canSubmit ? (
            <button
              onClick={() => onAction('submit')}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-amber-50"
              style={{ color: '#c2410c' }}
            >
              <CheckSquare className="h-4 w-4 flex-shrink-0" />
              Submit for Approval
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              <CheckSquare className="h-4 w-4 flex-shrink-0" />
              {getSubmissionLabel(task.submissionStatus)}
            </div>
          )}

          {task.createdByAdmin ? (
            canAppeal ? (
              <button
                onClick={() => onAction('appeal')}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-red-50"
                style={{ color: '#b91c1c' }}
              >
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                Appeal Task
              </button>
            ) : (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                Appeal status: {getAppealLabel(task.appealStatus)}
              </div>
            )
          ) : null}

          <button
            onClick={() => onAction('edit')}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-[var(--brand-light)]"
            style={{ color: 'var(--brand-primary)' }}
          >
            <PenSquare className="h-4 w-4 flex-shrink-0" />
            Edit Task
          </button>
        </div>

        <div className="px-4 pb-4">
          <button onClick={onClose} className="w-full rounded-xl py-2.5 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const TaskAppealModal = ({ isOpen, task, onClose, onSubmit }) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Task Appeal</h3>
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
              Choose how you want to respond to this assigned task.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2" style={{ color: 'var(--text-muted)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <button onClick={() => onSubmit('accepted')} className="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-green-50" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-sm font-bold text-green-700">Accept Task</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Record that you are accepting the assignment.</p>
          </button>

          <button onClick={() => onSubmit('rejected')} className="w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-red-50" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-sm font-bold text-red-600">Reject Task</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Record that you are disputing or rejecting the assignment.</p>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Assigned = () => {
  const { tasks = [], tasksLoading, fetchTasks: refreshTasks, onLogout } = useOutletContext();
  const { markTypeRead } = useNotifications();
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);

  useEffect(() => {
    markTypeRead?.('task');
  }, [markTypeRead]);

  const sortedTasks = useMemo(() => (
    tasks
      .filter((task) => task.createdByAdmin)
      .filter((task) =>
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase())
      )
      .sort((left, right) => {
        if (sortBy === 'newest') return new Date(right.createdAt) - new Date(left.createdAt);
        if (sortBy === 'oldest') return new Date(left.createdAt) - new Date(right.createdAt);
        const order = { high: 3, medium: 2, low: 1 };
        return (order[right.priority?.toLowerCase()] || 0) - (order[left.priority?.toLowerCase()] || 0);
      })
  ), [tasks, sortBy, search]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token found');
    return { Authorization: `Bearer ${token}` };
  };

  const handleTaskSave = useCallback(async (taskData) => {
    if (!taskData?._id) return;

    try {
      await axios.put(`${API_BASE_URL}/${taskData._id}/gp`, {
        title: taskData.title?.trim() || '',
        description: taskData.description || '',
        priority: taskData.priority || 'Low',
        dueDate: taskData.dueDate || undefined,
        checklist: taskData.checklist || [],
      }, { headers: getAuthHeaders() });

      await refreshTasks?.();
      setShowEditModal(false);
      setSelectedTask(null);
    } catch (error) {
      if (error.response?.status === 401) onLogout?.();
    }
  }, [onLogout, refreshTasks]);

  const handleComplete = async (task) => {
    if (!task) return;

    try {
      const payload = task.checklist?.length
        ? { checklist: task.checklist.map((item) => ({ ...item, completed: true })) }
        : { completed: 'Yes' };

      await axios.put(`${API_BASE_URL}/${task._id}/gp`, payload, { headers: getAuthHeaders() });
      await refreshTasks?.();
      setShowActionModal(false);
      setSelectedTask(null);
    } catch (error) {
      if (error.response?.status === 401) onLogout?.();
    }
  };

  const handleSubmit = async (task) => {
    if (!task) return;

    try {
      await axios.post(`${API_BASE_URL}/${task._id}/submit`, {}, { headers: getAuthHeaders() });
      await refreshTasks?.();
      setShowActionModal(false);
      setSelectedTask(null);
    } catch (error) {
      if (error.response?.status === 401) onLogout?.();
    }
  };

  const handleAppeal = async (appealStatus) => {
    if (!selectedTask || !appealStatus) return;

    try {
      await axios.post(`${API_BASE_URL}/${selectedTask._id}/appeal`, { appealStatus }, { headers: getAuthHeaders() });
      await refreshTasks?.();
      setShowAppealModal(false);
      setShowActionModal(false);
      setSelectedTask(null);
    } catch (error) {
      if (error.response?.status === 401) onLogout?.();
    }
  };

  const handleAction = (action) => {
    if (!selectedTask) return;

    if (action === 'complete') {
      handleComplete(selectedTask);
      return;
    }

    if (action === 'submit') {
      handleSubmit(selectedTask);
      return;
    }

    if (action === 'appeal') {
      setShowActionModal(false);
      setShowAppealModal(true);
      return;
    }

    if (action === 'edit') {
      setShowActionModal(false);
      setShowEditModal(true);
    }
  };

  return (
    <div className="space-y-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--brand-light)' }}>
          <ListChecks className="h-5 w-5" style={{ color: 'var(--brand-primary)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Assigned Tasks</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--brand-primary)' }}>
            {sortedTasks.length} assigned task{sortedTasks.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assigned tasks..."
              className="w-full rounded-lg border py-2.5 pl-9 pr-4 text-sm focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}
              onFocus={(event) => { event.target.style.borderColor = 'var(--brand-accent)'; }}
              onBlur={(event) => { event.target.style.borderColor = 'var(--input-border)'; }}
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="cursor-pointer appearance-none rounded-lg border py-2.5 pl-9 pr-8 text-sm focus:outline-none transition-colors"
              style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">By Priority</option>
            </select>
          </div>
        </div>
      </div>

      {tasksLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="rounded-xl border py-16 text-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--brand-light)' }}>
            <Clock className="h-7 w-7" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h3 className="mb-1 font-bold" style={{ color: 'var(--text-primary)' }}>No assigned tasks</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tasks assigned by admin will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedTasks.map((task, index) => (
            <motion.div
              key={task._id || task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="cursor-pointer"
              onClick={() => {
                setSelectedTask(task);
                setShowActionModal(true);
              }}
            >
              <TaskItem
                task={task}
                showCompleteCheckbox
                onRefresh={refreshTasks}
                onLogout={onLogout}
                allowDelete={false}
                allowQuickSubmit={false}
              />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showActionModal ? (
          <AssignedTaskActionModal
            isOpen={showActionModal}
            task={selectedTask}
            onClose={() => setShowActionModal(false)}
            onAction={handleAction}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showAppealModal ? (
          <TaskAppealModal
            isOpen={showAppealModal}
            task={selectedTask}
            onClose={() => setShowAppealModal(false)}
            onSubmit={handleAppeal}
          />
        ) : null}
      </AnimatePresence>

      <TaskModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTask(null);
          refreshTasks?.();
        }}
        taskToEdit={selectedTask}
        onSave={handleTaskSave}
        onLogout={onLogout}
      />
    </div>
  );
};

export default Assigned;
