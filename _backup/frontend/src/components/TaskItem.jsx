import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CheckCircle2, Clock, MessageSquare, MoreVertical, Shield, Trash2 } from 'lucide-react';
import axios from 'axios';
import { format, isPast, isToday } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/tasks`
  : 'http://localhost:4001/api/tasks';

const PRIORITY_CONFIG = {
  urgent: { bg: '#fef2f2', text: '#dc2626', border: '#dc2626', dot: '#dc2626' },
  high: { bg: '#fff7ed', text: '#ea580c', border: '#ea580c', dot: '#ea580c' },
  medium: { bg: '#fefce8', text: '#ca8a04', border: '#ca8a04', dot: '#ca8a04' },
  low: { bg: '#f0f9ff', text: '#0369a1', border: '#e2e8f0', dot: '#94a3b8' },
};

const SUBMISSION_LABELS = {
  submitted: { label: 'Submitted', bg: '#fff7ed', text: '#c2410c' },
  approved: { label: 'Approved', bg: '#f0fdf4', text: '#15803d' },
  rejected: { label: 'Rejected', bg: '#fef2f2', text: '#dc2626' },
};

const getPriority = (priority) => PRIORITY_CONFIG[String(priority || '').toLowerCase()] || PRIORITY_CONFIG.low;
const isCompletedValue = (value) => [true, 1, 'yes'].includes(typeof value === 'string' ? value.toLowerCase() : value);

const TaskItem = ({
  task,
  onRefresh,
  showCompleteCheckbox = true,
  onLogout,
  allowDelete = true,
  allowQuickSubmit = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showHover, setShowHover] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isCompleted, setIsCompleted] = useState(isCompletedValue(task.completed));

  useEffect(() => {
    setIsCompleted(isCompletedValue(task.completed));
  }, [task.completed]);

  const pConfig = getPriority(task.priority);
  const progress = task.checklist?.length
    ? Math.round((task.checklist.filter((item) => item.completed).length / task.checklist.length) * 100)
    : isCompleted
      ? 100
      : 0;
  const submissionLabel = SUBMISSION_LABELS[task.submissionStatus];
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isCompleted;
  const hasAdminComments = Array.isArray(task.adminComments) && task.adminComments.length > 0;
  const assignedByName = task.assignedBy
    ? `${task.assignedBy.firstName || ''} ${task.assignedBy.lastName || ''}`.trim()
    : '';

  const menuActions = useMemo(() => {
    const actions = [];

    if (allowQuickSubmit && isCompleted && task.submissionStatus === 'not_submitted') {
      actions.push({
        key: 'submit',
        label: 'Submit for Approval',
        icon: Check,
        color: '#c2410c',
      });
    }

    if (allowDelete) {
      actions.push({
        key: 'delete',
        label: 'Delete Task',
        icon: Trash2,
        color: '#dc2626',
      });
    }

    return actions;
  }, [allowDelete, allowQuickSubmit, isCompleted, task.submissionStatus]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token found');
    return { Authorization: `Bearer ${token}` };
  };

  const handleComplete = async (event) => {
    event.stopPropagation();

    const nextCompleted = !isCompleted;
    if (nextCompleted && (!task.checklist || task.checklist.length === 0)) {
      setShowErrorModal(true);
      return;
    }

    try {
      const payload = task.checklist?.length
        ? { checklist: task.checklist.map((item) => ({ ...item, completed: nextCompleted })) }
        : { completed: nextCompleted ? 'Yes' : 'No' };

      await axios.put(`${API_BASE}/${task._id}/gp`, payload, { headers: getAuthHeaders() });
      setIsCompleted(nextCompleted);
      onRefresh?.();
    } catch (error) {
      if (error.response?.status === 401) onLogout?.();
    }
  };

  const handleAction = async (action, event) => {
    event.stopPropagation();
    setShowMenu(false);

    try {
      if (action === 'submit') {
        if (!task.checklist || task.checklist.length === 0) {
          setShowErrorModal(true);
          return;
        }

        await axios.post(`${API_BASE}/${task._id}/submit`, {}, { headers: getAuthHeaders() });
        onRefresh?.();
        return;
      }

      if (action === 'delete') {
        await axios.delete(`${API_BASE}/${task._id}/gp`, { headers: getAuthHeaders() });
        onRefresh?.();
      }
    } catch (error) {
      if (error.response?.status === 401) onLogout?.();
    }
  };

  return (
    <div
      className="relative cursor-pointer overflow-hidden rounded-xl border transition-all hover:shadow-md"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
        borderLeftWidth: '3px',
        borderLeftColor: isCompleted ? '#16a34a' : pConfig.border,
      }}
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {showCompleteCheckbox ? (
            <button onClick={handleComplete} className="mt-0.5 flex-shrink-0 transition-colors">
              <CheckCircle2 className={`h-5 w-5 transition-colors ${isCompleted ? 'fill-green-500 text-green-500' : 'text-[var(--text-muted)] hover:text-green-500'}`} />
            </button>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`truncate text-sm font-semibold leading-snug ${isCompleted ? 'line-through' : ''}`}
                style={{ color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >
                {task.title}
              </h3>

              {menuActions.length > 0 ? (
                <div className="relative flex-shrink-0" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => setShowMenu((current) => !current)} className="rounded-lg p-1" style={{ color: 'var(--text-muted)' }}>
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {showMenu ? (
                    <div
                      className="absolute right-0 top-7 z-50 w-48 rounded-xl border py-1 shadow-xl"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                    >
                      {menuActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.key}
                            onClick={(event) => handleAction(action.key, event)}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm"
                            style={{ color: action.color }}
                          >
                            <Icon className="h-4 w-4" />
                            {action.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: pConfig.bg, color: pConfig.text }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pConfig.dot }} />
                {task.priority || 'Low'}
              </span>

              {submissionLabel ? (
                <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: submissionLabel.bg, color: submissionLabel.text }}>
                  {submissionLabel.label}
                </span>
              ) : null}

              {isOverdue ? <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Overdue</span> : null}

              {task.createdByAdmin ? (
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
                >
                  <Shield className="h-3 w-3" />
                  Admin Assigned
                </span>
              ) : null}

              {hasAdminComments ? (
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: 'rgba(147,51,234,0.08)', color: '#7c3aed' }}
                >
                  <MessageSquare className="h-3 w-3" />
                  {task.adminComments.length} note{task.adminComments.length === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>

            {assignedByName ? (
              <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Shield className="h-3 w-3" />
                Assigned by {assignedByName}
              </p>
            ) : null}

            {task.description ? (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {task.description}
              </p>
            ) : null}
          </div>
        </div>

        {task.checklist?.length ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Progress</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-subtle)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#16a34a' : 'var(--brand-primary)' }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'font-semibold text-red-500' : ''}`} style={{ color: isOverdue ? '#dc2626' : 'var(--text-muted)' }}>
            <CalendarDays className="h-3.5 w-3.5" />
            {task.dueDate ? (isToday(new Date(task.dueDate)) ? 'Due Today' : format(new Date(task.dueDate), 'MMM dd, yyyy')) : 'No due date'}
          </div>

          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Clock className="h-3.5 w-3.5" />
            {task.createdAt ? format(new Date(task.createdAt), 'MMM dd') : '-'}
          </div>
        </div>
      </div>

      {showHover && (task.description || task.checklist?.length || hasAdminComments) ? (
        <div
          className="absolute inset-0 z-20 overflow-y-auto rounded-xl border p-4 shadow-xl"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
          onMouseLeave={() => setShowHover(false)}
        >
          <div className="mb-3 flex items-start justify-between">
            <h4 className="line-clamp-2 pr-4 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{task.title}</h4>
            <span className="flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: pConfig.bg, color: pConfig.text }}>
              {task.priority}
            </span>
          </div>

          {task.description ? (
            <div className="mb-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Description</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{task.description}</p>
            </div>
          ) : null}

          {task.checklist?.length ? (
            <div className="mb-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Checklist ({task.checklist.filter((item) => item.completed).length}/{task.checklist.length})
              </p>
              <ul className="space-y-1.5">
                {task.checklist.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${item.completed ? 'fill-green-500 text-green-500' : 'text-[var(--text-muted)]'}`} />
                    <span className={`text-sm ${item.completed ? 'line-through' : ''}`} style={{ color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasAdminComments ? (
            <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wider" style={{ color: '#7c3aed' }}>
                <Shield className="h-3 w-3" />
                Admin Notes
              </p>
              <div className="space-y-2">
                {task.adminComments.map((comment, index) => (
                  <div
                    key={index}
                    className="rounded-lg p-2.5"
                    style={{ backgroundColor: 'rgba(147,51,234,0.05)', border: '1px solid rgba(147,51,234,0.15)' }}
                  >
                    <p className="text-xs font-bold" style={{ color: '#7c3aed' }}>
                      {comment.user?.firstName || 'Admin'} {comment.user?.lastName || ''}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{comment.content}</p>
                    <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {comment.createdAt ? format(new Date(comment.createdAt), 'MMM dd, yyyy h:mm a') : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            <span>Created {task.createdAt ? format(new Date(task.createdAt), 'MMM dd, yyyy') : '-'}</span>
            <span>Due {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'None'}</span>
          </div>
        </div>
      ) : null}

      {showErrorModal ? (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
          onClick={() => setShowErrorModal(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-lg font-bold text-amber-700">
                !
              </div>
              <h3 className="mb-2 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Checklist Required</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Please add a checklist first. A checklist is required because it shows the process breakdown for the task.
              </p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TaskItem;
