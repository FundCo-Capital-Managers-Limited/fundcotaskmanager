import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Edit2,
  ListTodo,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  User2,
  X,
} from 'lucide-react';
import api from '../utils/api.js';
import userApi from '../utils/userApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import {
  EmptyState,
  FilterChip,
  LoadingScreen,
  Modal,
  PageHeader,
  Panel,
  ProgressBar,
  SearchInput,
  SegmentedTabs,
  StatCard,
} from '../components/ui.jsx';

const PRI = {
  High: { c: '#dc2626', bg: '#fef2f2' },
  Medium: { c: '#d97706', bg: '#fffbeb' },
  Low: { c: '#6b7494', bg: '#f7f8fb' },
};

const SUB = {
  approved: { c: '#059669', bg: '#ecfdf5', label: 'Approved' },
  submitted: { c: '#d97706', bg: '#fffbeb', label: 'Submitted' },
  rejected: { c: '#dc2626', bg: '#fef2f2', label: 'Rejected' },
  not_submitted: { c: '#6b7494', bg: '#f7f8fb', label: 'Pending' },
};

const progressFor = (task) => {
  if (task?.checklist?.length) {
    return Math.round((task.checklist.filter((item) => item.completed).length / task.checklist.length) * 100);
  }
  return task?.completed ? 100 : 0;
};

const getAssignerId = (task) => String(task?.assignedBy?._id || task?.assignedBy || '');
const getCurrentUserId = (user) => String(user?._id || user?.id || '');

const getAssignerLabel = (task, currentUserId) => {
  const assignerId = getAssignerId(task);
  if (!assignerId || assignerId === currentUserId) return 'Created by you';
  const firstName = task?.assignedBy?.firstName || '';
  const lastName = task?.assignedBy?.lastName || '';
  return `${firstName} ${lastName}`.trim() || task?.assignedBy?.email || 'Another admin';
};

const matchesScope = (task, scope, currentUserId) => {
  if (scope === 'created') {
    const assignerId = getAssignerId(task);
    return !assignerId || assignerId === currentUserId;
  }
  if (scope === 'received') {
    const assignerId = getAssignerId(task);
    return Boolean(assignerId) && assignerId !== currentUserId;
  }
  return true;
};

const matchesStatus = (task, status) => {
  if (!status || status === 'all') return true;
  if (status === 'pending') return !task.completed;
  if (status === 'done') return Boolean(task.completed);
  if (status === 'submitted') return task.submissionStatus === 'submitted';
  if (status === 'approved') return task.submissionStatus === 'approved';
  if (status === 'rejected') return task.submissionStatus === 'rejected';
  if (status === 'overdue') {
    return Boolean(task.dueDate) && new Date(task.dueDate) < new Date() && !task.completed;
  }
  return true;
};

const MyTasks = () => {
  const { user } = useAuth();
  const { markTypeRead } = useNotifications();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all');
  const [status, setStatus] = useState('all');
  const [viewTask, setViewTask] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const currentUserId = getCurrentUserId(user);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userApi.get('/api/tasks/gp');
      setTasks(data.tasks || []);
    } catch {
      toast.error('Failed to load your tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignableUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data } = await api.get('/users', { params: { isActive: true } });
      setUsers(data.users || []);
    } catch {
      toast.error('Failed to load visible users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchAssignableUsers();
  }, [fetchAssignableUsers]);

  useEffect(() => {
    markTypeRead?.('task');
  }, [markTypeRead]);

  const applyTaskUpdate = useCallback((nextTask) => {
    if (!nextTask?._id) return;

    setTasks((previous) => {
      const exists = previous.some((task) => task._id === nextTask._id);
      if (!exists) return [nextTask, ...previous];
      return previous.map((task) => task._id === nextTask._id ? nextTask : task);
    });
    setViewTask(nextTask);
  }, []);

  const stats = useMemo(() => {
    const received = tasks.filter((task) => matchesScope(task, 'received', currentUserId)).length;
    const created = tasks.filter((task) => matchesScope(task, 'created', currentUserId)).length;
    const submitted = tasks.filter((task) => task.submissionStatus === 'submitted').length;
    const completed = tasks.filter((task) => task.completed).length;
    return {
      total: tasks.length,
      received,
      created,
      submitted,
      completed,
    };
  }, [currentUserId, tasks]);

  const filteredTasks = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return tasks
      .filter((task) => matchesScope(task, scope, currentUserId))
      .filter((task) => matchesStatus(task, status))
      .filter((task) => {
        if (!searchValue) return true;
        const haystack = [
          task.title,
          task.description,
          getAssignerLabel(task, currentUserId),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchValue);
      })
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }, [currentUserId, scope, search, status, tasks]);

  const handleMarkDone = useCallback(async (task) => {
    try {
      const payload = task.checklist?.length
        ? { checklist: task.checklist.map((item) => ({ ...item, completed: true })) }
        : { completed: true };

      const { data } = await userApi.put(`/api/tasks/${task._id}/gp`, payload);
      toast.success('Task marked as done');
      if (data?.task) applyTaskUpdate(data.task);
      else fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  }, [applyTaskUpdate, fetchTasks]);

  const handleSubmit = useCallback(async (task) => {
    try {
      const { data } = await userApi.post(`/api/tasks/${task._id}/submit`, {});
      toast.success('Task submitted for review');
      if (data?.task) applyTaskUpdate(data.task);
      else fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit task');
    }
  }, [applyTaskUpdate, fetchTasks]);

  const handleSaveTask = useCallback(async (taskId, payload) => {
    try {
      const { data } = await userApi.put(`/api/tasks/${taskId}/gp`, payload);
      if (data?.task) {
        applyTaskUpdate(data.task);
      } else {
        await fetchTasks();
      }
      toast.success('Task updated');
      return data?.task || null;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save task');
      return null;
    }
  }, [applyTaskUpdate, fetchTasks]);

  const handleAssignTask = useCallback(async (payload) => {
    try {
      await api.post('/tasks', payload);
      toast.success('Task assigned');
      setShowAssignModal(false);
      await fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign task');
    }
  }, [fetchTasks]);

  return (
    <div className="page-shell">
      <PageHeader
        title="My Tasks"
        actions={
          <button className="btn-primary rounded-full" onClick={() => setShowAssignModal(true)}>
            <Plus className="h-4 w-4" />
            Assign Task
          </button>
        }
        aside={
          <SegmentedTabs
            items={[
              { value: 'all', label: 'All' },
              { value: 'created', label: 'Created By Me' },
              { value: 'received', label: 'Assigned To Me' },
            ]}
            value={scope}
            onChange={setScope}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={ClipboardList} tone="var(--brand-primary)" />
        <StatCard label="Created By Me" value={stats.created} icon={User2} tone="var(--brand-secondary)" />
        <StatCard label="Assigned To Me" value={stats.received} icon={ListTodo} tone="#d97706" />
        <StatCard label="In Review" value={stats.submitted} icon={Send} tone="#059669" />
      </div>

      <Panel title="Task queue" subtitle={`${filteredTasks.length} task${filteredTasks.length === 1 ? '' : 's'} visible`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your tasks..." icon={Search} />
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'done', label: 'Done' },
              { key: 'submitted', label: 'Submitted' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
              { key: 'overdue', label: 'Overdue' },
            ].map((item) => (
              <FilterChip key={item.key} active={status === item.key} onClick={() => setStatus(item.key)}>
                {item.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </Panel>

      {loading ? (
        <LoadingScreen height="18rem" />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks found"
          description="Tasks you assign to yourself or receive from other admins will show up here."
        />
      ) : (
        <Panel title="Your workload" subtitle="Open any task to see progress, comments, and submit it for approval.">
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const pri = PRI[task.priority] || PRI.Low;
              const sub = SUB[task.submissionStatus] || SUB.not_submitted;
              const progress = progressFor(task);
              const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

              return (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => setViewTask(task)}
                  className="card card-hover w-full p-4 text-left"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="badge" style={{ background: pri.bg, color: pri.c }}>{task.priority}</span>
                        <span className="badge" style={{ background: sub.bg, color: sub.c }}>{sub.label}</span>
                        {overdue ? <span className="badge" style={{ background: '#fef2f2', color: '#dc2626' }}>Overdue</span> : null}
                      </div>
                      <h3 className={`text-base font-bold ${task.completed ? 'line-through' : ''}`} style={{ color: task.completed ? 'var(--c-text-3)' : 'var(--c-text-0)' }}>
                        {task.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--c-text-3)' }}>
                        <span className="inline-flex items-center gap-1">
                          <User2 className="h-3.5 w-3.5" />
                          {getAssignerLabel(task, currentUserId)}
                        </span>
                        {task.dueDate ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        ) : null}
                        {task.adminComments?.length ? (
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {task.adminComments.length}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="w-full xl:w-64">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--c-text-3)' }}>Progress</span>
                        <span className="font-bold" style={{ color: progress === 100 ? '#059669' : 'var(--c-accent)' }}>{progress}%</span>
                      </div>
                      <ProgressBar value={progress} tone={progress === 100 ? '#059669' : 'var(--c-accent)'} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      <MyTaskDetailModal
        task={viewTask}
        open={!!viewTask}
        currentUserId={currentUserId}
        onClose={() => setViewTask(null)}
        onMarkDone={handleMarkDone}
        onSubmit={handleSubmit}
        onSaveTask={handleSaveTask}
      />
      <AssignTaskModal
        open={showAssignModal}
        users={users}
        usersLoading={usersLoading}
        currentUserId={currentUserId}
        onClose={() => setShowAssignModal(false)}
        onAssign={handleAssignTask}
      />
    </div>
  );
};

const MyTaskDetailModal = ({ task, open, currentUserId, onClose, onMarkDone, onSubmit, onSaveTask }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', checklist: [] });

  useEffect(() => {
    if (!task) return;
    setEditing(false);
    setNewItem('');
    setForm({
      title: task.title || '',
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      checklist: task.checklist?.map((item) => ({ text: item.text, completed: item.completed })) || [],
    });
  }, [task]);

  if (!task) return null;

  const pri = PRI[task.priority] || PRI.Low;
  const sub = SUB[task.submissionStatus] || SUB.not_submitted;
  const progress = progressFor(task);
  const canMarkDone = !task.completed;
  const canSubmit = Boolean(task.completed) && task.submissionStatus === 'not_submitted';

  const addChecklistItem = () => {
    if (!newItem.trim()) return;
    setForm((previous) => ({
      ...previous,
      checklist: [...previous.checklist, { text: newItem.trim(), completed: false }],
    }));
    setNewItem('');
  };

  const saveChanges = async () => {
    if (!form.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setSaving(true);
    const updatedTask = await onSaveTask(task._id, {
      title: form.title.trim(),
      description: form.description,
      dueDate: form.dueDate || undefined,
      checklist: form.checklist.filter((item) => item.text.trim()),
    });
    setSaving(false);
    if (updatedTask) {
      setEditing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task.title}
      subtitle={`${getAssignerLabel(task, currentUserId)}${task.dueDate ? ` - due ${format(new Date(task.dueDate), 'MMM d, yyyy')}` : ''}`}
      width="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <span className="badge" style={{ background: pri.bg, color: pri.c }}>{task.priority}</span>
          <span className="badge" style={{ background: sub.bg, color: sub.c }}>{sub.label}</span>
          <span className="badge" style={{ background: 'var(--c-surface-3)', color: 'var(--c-text-soft)' }}>{progress}% complete</span>
        </div>

        {editing ? (
          <div className="space-y-5 rounded-[1.35rem] border p-5" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="label">Title</label>
                <input
                  className="input-base"
                  value={form.title}
                  onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="label">Due Date</label>
                <input
                  type="date"
                  className="input-base"
                  value={form.dueDate}
                  onChange={(event) => setForm((previous) => ({ ...previous, dueDate: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea
                  className="input-base min-h-28"
                  value={form.description}
                  onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                  placeholder="Add context or delivery notes..."
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="section-title">Checklist</p>
                <span className="text-xs font-bold" style={{ color: 'var(--c-text-faint)' }}>{form.checklist.length} items</span>
              </div>
              <div className="space-y-2">
                {form.checklist.map((item, index) => (
                  <div key={`${task._id}-edit-${index}`} className="flex items-center gap-3 rounded-[1rem] border px-3 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => setForm((previous) => ({
                        ...previous,
                        checklist: previous.checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, completed: !entry.completed } : entry),
                      }))}
                    />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      value={item.text}
                      onChange={(event) => setForm((previous) => ({
                        ...previous,
                        checklist: previous.checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, text: event.target.value } : entry),
                      }))}
                    />
                    <button
                      type="button"
                      className="btn-ghost h-9 w-9 rounded-xl p-0"
                      onClick={() => setForm((previous) => ({
                        ...previous,
                        checklist: previous.checklist.filter((_, entryIndex) => entryIndex !== index),
                      }))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    className="input-base"
                    value={newItem}
                    onChange={(event) => setNewItem(event.target.value)}
                    placeholder="Add checklist item..."
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addChecklistItem();
                      }
                    }}
                  />
                  <button type="button" className="btn-secondary" onClick={addChecklistItem}>Add</button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={saveChanges} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {task.description ? (
              <div className="rounded-[1.2rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
                <p className="text-sm leading-6" style={{ color: 'var(--c-text-1)' }}>{task.description}</p>
              </div>
            ) : null}

            {task.checklist?.length ? (
              <div className="space-y-3">
                <p className="section-title">Checklist</p>
                <div className="space-y-2">
                  {task.checklist.map((item, index) => (
                    <div key={`${task._id}-check-${index}`} className="flex items-center gap-3 rounded-[1rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)' }}>
                      <CheckCircle2 className="h-4 w-4" style={{ color: item.completed ? 'var(--c-success)' : 'var(--c-text-faint)' }} />
                      <span style={{ color: item.completed ? 'var(--c-text-1)' : 'var(--c-text)' }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="rounded-[1.2rem] border p-4" style={{ borderColor: 'var(--c-border)' }}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span style={{ color: 'var(--c-text-soft)' }}>Progress</span>
            <span className="font-bold" style={{ color: progress === 100 ? 'var(--c-success)' : 'var(--c-accent)' }}>{progress}%</span>
          </div>
          <ProgressBar value={progress} tone={progress === 100 ? 'var(--c-success)' : 'var(--c-accent)'} />
        </div>

        {task.adminComments?.length ? (
          <div className="space-y-3">
            <p className="section-title">Admin Comments</p>
            <div className="space-y-3">
              {task.adminComments.map((comment) => (
                <div key={comment._id || `${task._id}-${comment.createdAt}`} className="rounded-[1.2rem] border p-4" style={{ borderColor: 'var(--c-border)' }}>
                  <p className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                    {`${comment.user?.firstName || ''} ${comment.user?.lastName || ''}`.trim() || 'Admin'}
                  </p>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--c-text-1)' }}>{comment.content}</p>
                  {comment.createdAt ? (
                    <p className="mt-2 text-xs" style={{ color: 'var(--c-text-faint)' }}>{format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {!editing ? (
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4" />
              Edit Task
            </button>
          ) : null}
          {!editing ? (
            canMarkDone ? (
              <button className="btn-secondary" onClick={() => onMarkDone(task)}>
                <CheckCircle2 className="h-4 w-4" />
                Mark Done
              </button>
            ) : (
              <div className="inline-flex min-h-[2.75rem] items-center rounded-[0.95rem] border px-4 text-sm font-bold" style={{ borderColor: 'var(--c-border)', color: 'var(--c-success)', background: 'var(--c-success-soft)' }}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Completed
              </div>
            )
          ) : null}

          {!editing ? (
            canSubmit ? (
              <button className="btn-primary" onClick={() => onSubmit(task)}>
                <Send className="h-4 w-4" />
                Submit For Review
              </button>
            ) : (
              <div className="inline-flex min-h-[2.75rem] items-center rounded-[0.95rem] border px-4 text-sm font-bold" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-soft)', background: 'var(--c-surface-2)' }}>
                <Clock3 className="mr-2 h-4 w-4" />
                {sub.label}
              </div>
            )
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

const AssignTaskModal = ({ open, users, usersLoading, currentUserId, onClose, onAssign }) => {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', ownerId: currentUserId || '', checklist: [] });
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ title: '', description: '', priority: 'Medium', dueDate: '', ownerId: currentUserId || '', checklist: [] });
    setNewItem('');
    setSaving(false);
  }, [currentUserId, open]);

  const addChecklistItem = () => {
    if (!newItem.trim()) return;
    setForm((previous) => ({
      ...previous,
      checklist: [...previous.checklist, { text: newItem.trim(), completed: false }],
    }));
    setNewItem('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title required');
      return;
    }
    if (!form.ownerId) {
      toast.error('Select assignee');
      return;
    }
    setSaving(true);
    await onAssign({
      title: form.title.trim(),
      description: form.description,
      priority: form.priority,
      dueDate: form.dueDate || undefined,
      ownerId: form.ownerId,
      checklist: form.checklist.filter((item) => item.text.trim()),
    });
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign Task" subtitle="Create work for yourself or another visible team member." width="max-w-2xl">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Assign To *</label>
            <select
              className="input-base"
              value={form.ownerId}
              onChange={(event) => setForm((previous) => ({ ...previous, ownerId: event.target.value }))}
              disabled={usersLoading}
            >
              <option value="">{usersLoading ? 'Loading users...' : 'Select user...'}</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {['Low', 'Medium', 'High'].map((priority) => (
                <button
                  key={priority}
                  type="button"
                  className="rounded-2xl border px-3 py-3 text-sm font-bold"
                  style={form.priority === priority ? { background: PRI[priority].c, color: '#ffffff', borderColor: PRI[priority].c } : { borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}
                  onClick={() => setForm((previous) => ({ ...previous, priority }))}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Title *</label>
          <input className="input-base" value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} placeholder="Task title" />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input-base min-h-28" value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} placeholder="Context, outcome, or delivery notes..." />
        </div>

        <div>
          <label className="label">Due Date</label>
          <input type="date" className="input-base" value={form.dueDate} onChange={(event) => setForm((previous) => ({ ...previous, dueDate: event.target.value }))} />
        </div>

        <div>
          <label className="label">Checklist ({form.checklist.length})</label>
          <div className="space-y-2">
            {form.checklist.map((item, index) => (
              <div key={`assign-check-${index}`} className="flex items-center gap-3 rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--c-border)' }}>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => setForm((previous) => ({
                    ...previous,
                    checklist: previous.checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, completed: !entry.completed } : entry),
                  }))}
                />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  value={item.text}
                  onChange={(event) => setForm((previous) => ({
                    ...previous,
                    checklist: previous.checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, text: event.target.value } : entry),
                  }))}
                />
                <button
                  type="button"
                  className="btn-ghost h-9 w-9 rounded-xl p-0"
                  onClick={() => setForm((previous) => ({
                    ...previous,
                    checklist: previous.checklist.filter((_, entryIndex) => entryIndex !== index),
                  }))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className="input-base"
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                placeholder="Add checklist item..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addChecklistItem();
                  }
                }}
              />
              <button type="button" className="btn-secondary" onClick={addChecklistItem}>Add</button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving || usersLoading}>
            {saving ? 'Assigning...' : 'Assign Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MyTasks;
