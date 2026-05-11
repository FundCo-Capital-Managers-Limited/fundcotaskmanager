import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CircleDollarSign,
  Flag,
  Edit2,
  FolderKanban,
  Link2,
  ListTodo,
  Plus,
  Search,
  Target,
  Trash2,
  Unlink2,
  UserPlus,
  Users,
  X,
  ShieldAlert,
} from 'lucide-react';
import api, { API_BASE } from '../utils/api.js';
import { useNotifications } from '../context/NotificationContext.jsx';
import {
  AvatarStack,
  EmptyState,
  FilterChip,
  InfoStrip,
  LoadingScreen,
  MiniStat,
  Modal,
  PageHeader,
  Panel,
  ProgressBar,
  SearchInput,
  SegmentedTabs,
  StatusPill,
} from '../components/ui.jsx';

const statusMeta = {
  planning: { label: 'Planning', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  'on-hold': { label: 'On Hold', tone: 'warning' },
  completed: { label: 'Completed', tone: 'brand' },
  archived: { label: 'Archived', tone: 'neutral' },
};

const healthMeta = {
  'on-track': { label: 'On Track', tone: 'success' },
  watch: { label: 'Needs Attention', tone: 'warning' },
  'at-risk': { label: 'At Risk', tone: 'danger' },
  settled: { label: 'Settled', tone: 'brand' },
};

const priorityMeta = {
  High: { bg: '#fef2f2', color: '#dc2626' },
  Medium: { bg: '#fff7ed', color: '#c2410c' },
  Low: { bg: '#f3f4f6', color: '#4b5563' },
};

const taskLaneMeta = {
  planned: { label: 'Planned', tone: 'info' },
  review: { label: 'In Review', tone: 'warning' },
  blocked: { label: 'Rejected', tone: 'danger' },
  done: { label: 'Done', tone: 'success' },
};

const milestoneStatusMeta = {
  planned: { label: 'Planned', tone: 'info' },
  active: { label: 'Active', tone: 'brand' },
  blocked: { label: 'Blocked', tone: 'danger' },
  completed: { label: 'Completed', tone: 'success' },
};

const severityMeta = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'warning' },
  critical: { label: 'Critical', tone: 'danger' },
};

const riskStatusMeta = {
  open: { label: 'Open', tone: 'danger' },
  mitigating: { label: 'Mitigating', tone: 'warning' },
  watching: { label: 'Watching', tone: 'info' },
  closed: { label: 'Closed', tone: 'success' },
};

const issueStatusMeta = {
  open: { label: 'Open', tone: 'warning' },
  'in-progress': { label: 'In Progress', tone: 'info' },
  escalated: { label: 'Escalated', tone: 'danger' },
  resolved: { label: 'Resolved', tone: 'success' },
};

const formatShortDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return format(date, 'MMM d, yyyy');
};
const formatCurrency = (value, currency = 'NGN') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '-';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};
const formatTaskMoment = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'MMM d, h:mm a');
};
const getPersonName = (user, fallback = '') => {
  if (!user) return fallback;
  return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || fallback;
};
const getTaskSubmissionLabel = (task) => {
  if (!task) return '';
  if (task.submissionStatus === 'approved') {
    const reviewer = getPersonName(task.reviewedBy, '');
    return reviewer ? `Approved by ${reviewer}` : 'Approved';
  }
  if (task.submissionStatus === 'submitted') {
    const submittedAt = formatTaskMoment(task.submittedAt);
    return submittedAt ? `Submitted ${submittedAt}` : 'Submitted';
  }
  if (task.submissionStatus === 'rejected') {
    const reviewer = getPersonName(task.reviewedBy, '');
    return reviewer ? `Rejected by ${reviewer}` : 'Rejected';
  }
  return '';
};
const getTaskAssignerLabel = (task) => {
  const assigner = getPersonName(task?.assignedBy, '');
  return assigner ? `Assigned by ${assigner}` : '';
};

const uniqueIds = (values = []) => [...new Set(values.map((value) => String(value?._id || value || '')).filter(Boolean))];

const projectTone = (project) => (healthMeta[project.health] || healthMeta['on-track']).tone;
const getAdminToken = () => localStorage.getItem('adminToken');

const getTaskLane = (task) => {
  if (task.submissionStatus === 'rejected') return 'blocked';
  if (task.submissionStatus === 'submitted') return 'review';
  if (task.submissionStatus === 'approved' || task.completed) return 'done';
  return 'planned';
};

const buildTaskLanes = (tasks = []) => tasks.reduce((accumulator, task) => {
  const key = getTaskLane(task);
  accumulator[key].push(task);
  return accumulator;
}, { planned: [], review: [], blocked: [], done: [] });

const MemberIdentity = (member) => member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Team member';

const ProjectControlModal = ({
  open,
  title,
  subtitle,
  config,
  members,
  value,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: config.statusOptions[0]?.value || '',
    severity: config.severityOptions?.[0]?.value || 'medium',
    owner: '',
    dueDate: '',
    notes: '',
    impact: '',
    mitigation: '',
    resolution: '',
  });

  useEffect(() => {
    setForm({
      title: value?.title || '',
      description: value?.description || '',
      status: value?.status || config.statusOptions[0]?.value || '',
      severity: value?.severity || config.severityOptions?.[0]?.value || 'medium',
      owner: value?.owner?._id || value?.owner || '',
      dueDate: value?.dueDate ? new Date(value.dueDate).toISOString().split('T')[0] : '',
      notes: value?.notes || '',
      impact: value?.impact || '',
      mitigation: value?.mitigation || '',
      resolution: value?.resolution || '',
    });
  }, [value, open, config]);

  const submit = () => {
    if (!form.title.trim()) {
      toast.error(`${config.label} title required`);
      return;
    }
    onSave({
      title: form.title,
      description: form.description,
      status: form.status,
      severity: config.severityOptions ? form.severity : undefined,
      owner: form.owner || undefined,
      dueDate: form.dueDate || undefined,
      notes: config.type === 'milestone' ? form.notes : undefined,
      impact: config.type === 'risk' ? form.impact : undefined,
      mitigation: config.type === 'risk' ? form.mitigation : undefined,
      resolution: config.type === 'issue' ? form.resolution : undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="label">{config.label} Title</label>
          <input className="input-base" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base min-h-24" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        </div>
        <div className={`grid gap-4 ${config.severityOptions ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          <div>
            <label className="label">Status</label>
            <select className="input-base" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              {config.statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          {config.severityOptions ? (
            <div>
              <label className="label">Severity</label>
              <select className="input-base" value={form.severity} onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))}>
                {config.severityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          ) : null}
          <div>
            <label className="label">Owner</label>
            <select className="input-base" value={form.owner} onChange={(event) => setForm((prev) => ({ ...prev, owner: event.target.value }))}>
              <option value="">Unassigned</option>
              {members.map((member) => <option key={member._id} value={member._id}>{MemberIdentity(member)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Due Date</label>
          <input type="date" className="input-base" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
        </div>
        {config.type === 'milestone' ? (
          <div>
            <label className="label">Notes</label>
            <textarea className="input-base min-h-24" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </div>
        ) : null}
        {config.type === 'risk' ? (
          <>
            <div>
              <label className="label">Impact</label>
              <textarea className="input-base min-h-24" value={form.impact} onChange={(event) => setForm((prev) => ({ ...prev, impact: event.target.value }))} />
            </div>
            <div>
              <label className="label">Mitigation</label>
              <textarea className="input-base min-h-24" value={form.mitigation} onChange={(event) => setForm((prev) => ({ ...prev, mitigation: event.target.value }))} />
            </div>
          </>
        ) : null}
        {config.type === 'issue' ? (
          <div>
            <label className="label">Resolution Plan</label>
            <textarea className="input-base min-h-24" value={form.resolution} onChange={(event) => setForm((prev) => ({ ...prev, resolution: event.target.value }))} />
          </div>
        ) : null}
        <button type="button" className="btn-primary w-full" onClick={submit}>
          {value ? `Save ${config.label}` : `Create ${config.label}`}
        </button>
      </div>
    </Modal>
  );
};

const ProjectCard = ({ project, onOpen, onEdit, onDelete }) => {
  const status = statusMeta[project.status] || statusMeta.planning;
  const health = healthMeta[project.health] || healthMeta['on-track'];
  const priority = priorityMeta[project.priority] || priorityMeta.Medium;

  return (
    <article
      className="surface-card surface-card-hover cursor-pointer p-4"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(project)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(project);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            <StatusPill tone={health.tone}>{health.label}</StatusPill>
            <span className="badge" style={{ background: priority.bg, color: priority.color }}>{project.priority || 'Medium'}</span>
          </div>
          <h3 className="text-lg font-black leading-tight" style={{ color: 'var(--c-text)' }}>{project.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost h-9 w-9 rounded-[0.7rem] p-0"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(project);
            }}
            aria-label="Edit project"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="btn-danger h-9 w-9 rounded-[0.7rem] p-0"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(project);
            }}
            aria-label="Delete project"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 line-clamp-3" style={{ color: 'var(--c-text-muted)' }}>
        {project.description || 'No description yet.'}
      </p>
      {(project.client?.name || project.client?.account) ? (
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
          {(project.client?.name || 'Internal project')}{project.client?.account ? ` · ${project.client.account}` : ''}
        </p>
      ) : null}

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
          <span>Completion</span>
          <span>{project.metrics?.completion || 0}%</span>
        </div>
        <ProgressBar value={project.metrics?.completion || 0} tone={project.health === 'at-risk' ? 'var(--c-danger)' : 'var(--brand-primary)'} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Open" value={project.metrics?.openTasks || 0} tone="var(--c-warning)" />
        <MiniStat label="Overdue" value={project.metrics?.overdueTasks || 0} tone="var(--c-danger)" />
        <MiniStat label="Risks" value={project.metrics?.openRisks || 0} tone="var(--brand-secondary)" />
        <MiniStat label="Milestones" value={project.metrics?.milestones || 0} tone="var(--c-info)" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {project.metrics?.members || 0} members</span>
        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {formatShortDate(project.metrics?.endDate || project.endDate)}</span>
      </div>

      {project.members?.length ? (
        <div className="mt-4">
          <AvatarStack items={project.members} />
        </div>
      ) : null}
    </article>
  );
};

const BoardView = ({ projects, onOpen, onEdit, onDelete }) => {
  const columns = [
    { key: 'planning', label: 'Planning' },
    { key: 'active', label: 'Active' },
    { key: 'on-hold', label: 'On Hold' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {columns.map((column) => {
        const items = projects.filter((project) => project.status === column.key);
        return (
          <Panel key={column.key} title={column.label} subtitle={`${items.length} projects`} bodyClassName="space-y-3">
            {items.length ? items.map((project) => (
              <ProjectCard key={project._id} project={project} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
            )) : (
              <div className="rounded-[0.85rem] border border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-faint)' }}>
                No projects here
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
};

const TimelineView = ({ projects, onOpen }) => (
  <Panel title="Delivery timeline" subtitle="Projects ordered by the nearest operating deadline">
    <div className="space-y-3">
      {projects.map((project) => {
        const status = statusMeta[project.status] || statusMeta.planning;
        const health = healthMeta[project.health] || healthMeta['on-track'];
        return (
          <button
            key={project._id}
            type="button"
            onClick={() => onOpen(project)}
            className="surface-card w-full p-4 text-left transition-colors hover:bg-[var(--c-panel-subtle)]"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  <StatusPill tone={health.tone}>{health.label}</StatusPill>
                </div>
                <p className="text-base font-black" style={{ color: 'var(--c-text)' }}>{project.name}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                  Ends {formatShortDate(project.metrics?.endDate || project.endDate)} · {project.metrics?.openTasks || 0} open tasks
                </p>
              </div>
              <div className="w-full lg:w-72">
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                  <span>Delivery progress</span>
                  <span>{project.metrics?.completion || 0}%</span>
                </div>
                <ProgressBar value={project.metrics?.completion || 0} tone={project.health === 'at-risk' ? 'var(--c-danger)' : 'var(--brand-primary)'} />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  </Panel>
);

const TaskCard = ({ task, onRemove }) => {
  const lane = taskLaneMeta[getTaskLane(task)] || taskLaneMeta.planned;
  const priority = priorityMeta[task.priority] || priorityMeta.Low;
  const assignerLabel = getTaskAssignerLabel(task);
  const submissionLabel = getTaskSubmissionLabel(task);

  return (
    <div className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black" style={{ color: 'var(--c-text)' }}>{task.title}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{task.description || 'No description provided.'}</p>
        </div>
        {onRemove ? (
          <button type="button" className="btn-ghost h-8 w-8 rounded-[0.65rem] p-0" onClick={() => onRemove(task)} aria-label="Remove task from project">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="badge" style={{ background: priority.bg, color: priority.color }}>{task.priority || 'Low'}</span>
        <StatusPill tone={lane.tone}>{lane.label}</StatusPill>
      </div>
      <div className="mt-3 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
        <div>{MemberIdentity(task.owner || {})}</div>
        <div className="mt-1">{task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : 'No due date'}</div>
        {assignerLabel ? <div className="mt-1">{assignerLabel}</div> : null}
        {submissionLabel ? <div className="mt-1">{submissionLabel}</div> : null}
      </div>
    </div>
  );
};

const GoalCard = ({ goal, onUnlink }) => {
  const total = goal.subGoals?.length || 0;
  const done = goal.subGoals?.filter((item) => item.completed).length || 0;
  const completion = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-black" style={{ color: 'var(--c-text)' }}>{goal.title}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>
            {MemberIdentity(goal.owner || {})} · {goal.timeframe || 'custom'}
          </p>
        </div>
        {onUnlink ? (
          <button type="button" className="btn-ghost h-8 w-8 rounded-[0.65rem] p-0" onClick={() => onUnlink(goal)} aria-label="Unlink goal">
            <Unlink2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
          <span>Milestone progress</span>
          <span>{completion}%</span>
        </div>
        <ProgressBar value={completion} />
      </div>
    </div>
  );
};

const MemberCard = ({ member, workload }) => (
  <div className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
    <p className="font-black" style={{ color: 'var(--c-text)' }}>{MemberIdentity(member)}</p>
    <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{member.position || member.role || 'Project member'}</p>
    {member.unitSector ? <p className="mt-1 text-xs" style={{ color: 'var(--c-text-faint)' }}>{member.unitSector}</p> : null}
    <div className="mt-3 grid grid-cols-3 gap-2">
      <MiniStat label="Assigned" value={workload.assigned} />
      <MiniStat label="Open" value={workload.open} tone="var(--c-warning)" />
      <MiniStat label="Done" value={workload.completed} tone="var(--c-success)" />
    </div>
  </div>
);

const ProjectMembersModal = ({ open, users, value, onSave, onClose }) => {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    setSelected(value || []);
  }, [value, open]);

  const toggle = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Members" subtitle="Add or remove people responsible for this project." width="max-w-2xl">
      <div className="space-y-4">
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {users.map((user) => (
            <label key={user._id} className="flex items-center gap-3 rounded-[0.75rem] border px-4 py-3 text-sm" style={{ borderColor: 'var(--c-border)' }}>
              <input type="checkbox" checked={selected.includes(user._id)} onChange={() => toggle(user._id)} />
              <span className="flex-1">{MemberIdentity(user)}</span>
              <span style={{ color: 'var(--c-text-faint)' }}>{user.position || user.role}</span>
            </label>
          ))}
        </div>
        <button type="button" className="btn-primary w-full" onClick={() => onSave(selected)}>
          Save Member Set
        </button>
      </div>
    </Modal>
  );
};

const ExistingTaskModal = ({ open, availableTasks, linkedTaskIds, onAttach, onClose }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
  }, [open]);

  const items = useMemo(() => {
    const linked = new Set(linkedTaskIds);
    return availableTasks.filter((task) => {
      if (linked.has(String(task._id))) return false;
      const text = `${task.title} ${task.description || ''} ${MemberIdentity(task.owner || {})}`.toLowerCase();
      return text.includes(query.trim().toLowerCase());
    });
  }, [availableTasks, linkedTaskIds, query]);

  return (
    <Modal open={open} onClose={onClose} title="Attach Existing Task" subtitle="Pull an existing task into this project." width="max-w-2xl">
      <div className="space-y-4">
        <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks..." icon={Search} />
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {items.length ? items.map((task) => (
            <div key={task._id} className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="font-black" style={{ color: 'var(--c-text)' }}>{task.title}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{task.description || 'No description provided.'}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>{MemberIdentity(task.owner || {})}</p>
                </div>
                <button type="button" className="btn-primary" onClick={() => onAttach(task)}>
                  <Link2 className="h-4 w-4" /> Attach
                </button>
              </div>
            </div>
          )) : (
            <EmptyState icon={ListTodo} title="No matching tasks" description="There are no available tasks left to attach with the current search." />
          )}
        </div>
      </div>
    </Modal>
  );
};

const GoalLinkModal = ({ open, goals, linkedGoalIds, onSave, onClose }) => {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setSelected(linkedGoalIds || []);
    setQuery('');
  }, [linkedGoalIds, open]);

  const visibleGoals = useMemo(() => goals.filter((goal) => {
    const text = `${goal.title} ${MemberIdentity(goal.owner || {})}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }), [goals, query]);

  const toggle = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <Modal open={open} onClose={onClose} title="Link Project Goals" subtitle="Connect goals that should be tracked as part of this project." width="max-w-2xl">
      <div className="space-y-4">
        <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search goals..." icon={Search} />
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {visibleGoals.map((goal) => (
            <label key={goal._id} className="flex items-start gap-3 rounded-[0.75rem] border px-4 py-3 text-sm" style={{ borderColor: 'var(--c-border)' }}>
              <input type="checkbox" checked={selected.includes(goal._id)} onChange={() => toggle(goal._id)} />
              <span className="flex-1">
                <span className="block font-black" style={{ color: 'var(--c-text)' }}>{goal.title}</span>
                <span className="mt-1 block" style={{ color: 'var(--c-text-muted)' }}>{MemberIdentity(goal.owner || {})} · {goal.timeframe || 'custom'}</span>
              </span>
            </label>
          ))}
        </div>
        <button type="button" className="btn-primary w-full" onClick={() => onSave(selected)}>
          Save Linked Goals
        </button>
      </div>
    </Modal>
  );
};

const ProjectGoalCreateModal = ({ open, members, tasks, onSave, onClose }) => {
  const [form, setForm] = useState({
    ownerId: '',
    title: '',
    timeframe: 'monthly',
    startDate: '',
    endDate: '',
    subGoalsText: '',
    associatedTaskIds: [],
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      ownerId: members[0]?._id || '',
      title: '',
      timeframe: 'monthly',
      startDate: '',
      endDate: '',
      subGoalsText: '',
      associatedTaskIds: [],
    });
  }, [members, open]);

  const toggleTask = (id) => {
    setForm((current) => ({
      ...current,
      associatedTaskIds: current.associatedTaskIds.includes(id)
        ? current.associatedTaskIds.filter((item) => item !== id)
        : [...current.associatedTaskIds, id],
    }));
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Project Goal" subtitle="Create a goal and link it directly to this project." width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="label">Owner</label>
          <select className="input-base" value={form.ownerId} onChange={(event) => setForm((current) => ({ ...current, ownerId: event.target.value }))}>
            <option value="">Select owner...</option>
            {members.map((member) => <option key={member._id} value={member._id}>{MemberIdentity(member)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Goal Title</label>
          <input className="input-base" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Timeframe</label>
            <select className="input-base" value={form.timeframe} onChange={(event) => setForm((current) => ({ ...current, timeframe: event.target.value }))}>
              {['daily', 'weekly', 'monthly', 'quarterly', 'custom'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input-base" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input-base" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Sub-goals</label>
          <textarea className="input-base min-h-28" value={form.subGoalsText} onChange={(event) => setForm((current) => ({ ...current, subGoalsText: event.target.value }))} placeholder="One sub-goal per line" />
        </div>
        <div>
          <label className="label">Associate tasks ({form.associatedTaskIds.length})</label>
          <div className="max-h-44 space-y-2 overflow-y-auto">
            {tasks.map((task) => (
              <label key={task._id} className="flex items-center gap-3 rounded-[0.75rem] border px-4 py-3 text-sm" style={{ borderColor: 'var(--c-border)' }}>
                <input type="checkbox" checked={form.associatedTaskIds.includes(task._id)} onChange={() => toggleTask(task._id)} />
                <span className="flex-1">{task.title}</span>
                <span style={{ color: 'var(--c-text-faint)' }}>{MemberIdentity(task.owner || {})}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            if (!form.ownerId) return toast.error('Select a goal owner');
            if (!form.title.trim()) return toast.error('Goal title required');
            if (!form.startDate || !form.endDate) return toast.error('Start and end dates are required');
            onSave({
              ownerId: form.ownerId,
              title: form.title.trim(),
              timeframe: form.timeframe,
              startDate: form.startDate,
              endDate: form.endDate,
              associatedTasks: form.associatedTaskIds,
              subGoals: form.subGoalsText
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean)
                .map((title) => ({ title, completed: false })),
            });
          }}
        >
          Create Goal
        </button>
      </div>
    </Modal>
  );
};

const ProjectTaskModal = ({ open, users, onSave, onClose }) => {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', ownerId: '', checklist: [] });
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({ title: '', description: '', priority: 'Medium', dueDate: '', ownerId: users[0]?._id || '', checklist: [] });
    setNewItem('');
  }, [open, users]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setForm((prev) => ({ ...prev, checklist: [...prev.checklist, { text: newItem.trim(), completed: false }] }));
    setNewItem('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Project Task" subtitle="Assign a task directly into this project.">
      <div className="space-y-4">
        <div>
          <label className="label">Assign To</label>
          <select className="input-base" value={form.ownerId} onChange={(event) => setForm((prev) => ({ ...prev, ownerId: event.target.value }))}>
            <option value="">Select project member...</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>{MemberIdentity(user)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Task Title</label>
          <input className="input-base" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base min-h-28" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Priority</label>
            <select className="input-base" value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
              {['Low', 'Medium', 'High'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input-base" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Checklist ({form.checklist.length})</label>
          <div className="space-y-2">
            {form.checklist.map((item, index) => (
              <div key={`${item.text}-${index}`} className="flex items-center gap-3 rounded-[0.75rem] border px-3 py-3" style={{ borderColor: 'var(--c-border)' }}>
                <span className="flex-1 text-sm">{item.text}</span>
                <button type="button" className="btn-danger h-8 w-8 rounded-[0.6rem] p-0" onClick={() => setForm((prev) => ({ ...prev, checklist: prev.checklist.filter((_, entryIndex) => entryIndex !== index) }))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className="input-base"
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Add checklist item..."
              />
              <button type="button" className="btn-secondary" onClick={addItem}>Add</button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            if (!form.title.trim()) return toast.error('Task title required');
            if (!form.ownerId) return toast.error('Select an assignee');
            onSave({ ...form, checklist: form.checklist.filter((item) => item.text.trim()) });
          }}
        >
          Create Task
        </button>
      </div>
    </Modal>
  );
};

const ProjectModal = ({ open, project, users, onSave, onClose }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'planning',
    priority: 'Medium',
    startDate: '',
    endDate: '',
    members: [],
    tagsText: '',
    clientName: '',
    clientAccount: '',
    clientContactName: '',
    clientContactEmail: '',
    budgetPlanned: '',
    budgetActual: '',
    budgetRevenueTarget: '',
    budgetCurrency: 'NGN',
  });

  useEffect(() => {
    setForm({
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'planning',
      priority: project?.priority || 'Medium',
      startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      members: project?.members?.map((member) => member._id || member) || [],
      tagsText: Array.isArray(project?.tags) ? project.tags.join(', ') : '',
      clientName: project?.client?.name || '',
      clientAccount: project?.client?.account || '',
      clientContactName: project?.client?.contactName || '',
      clientContactEmail: project?.client?.contactEmail || '',
      budgetPlanned: project?.budget?.planned ?? '',
      budgetActual: project?.budget?.actual ?? '',
      budgetRevenueTarget: project?.budget?.revenueTarget ?? '',
      budgetCurrency: project?.budget?.currency || 'NGN',
    });
  }, [project, open]);

  const toggleMember = (id) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.includes(id) ? prev.members.filter((memberId) => memberId !== id) : [...prev.members, id],
    }));
  };

  return (
    <Modal open={open} onClose={onClose} title={project ? 'Edit Project' : 'New Project'} subtitle="Set the project team, delivery window, and operating priority." width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="label">Project Name</label>
          <input className="input-base" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base min-h-28" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select className="input-base" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
              {Object.entries(statusMeta).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input-base" value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
              {['Low', 'Medium', 'High'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input-base" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input-base" value={form.endDate} onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Tags</label>
          <input className="input-base" value={form.tagsText} onChange={(event) => setForm((prev) => ({ ...prev, tagsText: event.target.value }))} placeholder="e.g. capital-project, due-diligence, treasury" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Client / Entity</label>
            <input className="input-base" value={form.clientName} onChange={(event) => setForm((prev) => ({ ...prev, clientName: event.target.value }))} placeholder="e.g. FundCo AssetCo" />
          </div>
          <div>
            <label className="label">Account / Workstream</label>
            <input className="input-base" value={form.clientAccount} onChange={(event) => setForm((prev) => ({ ...prev, clientAccount: event.target.value }))} placeholder="e.g. Treasury transformation" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Primary Contact</label>
            <input className="input-base" value={form.clientContactName} onChange={(event) => setForm((prev) => ({ ...prev, clientContactName: event.target.value }))} />
          </div>
          <div>
            <label className="label">Contact Email</label>
            <input className="input-base" value={form.clientContactEmail} onChange={(event) => setForm((prev) => ({ ...prev, clientContactEmail: event.target.value }))} />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="label">Planned Budget</label>
            <input type="number" min="0" className="input-base" value={form.budgetPlanned} onChange={(event) => setForm((prev) => ({ ...prev, budgetPlanned: event.target.value }))} />
          </div>
          <div>
            <label className="label">Actual Spend</label>
            <input type="number" min="0" className="input-base" value={form.budgetActual} onChange={(event) => setForm((prev) => ({ ...prev, budgetActual: event.target.value }))} />
          </div>
          <div>
            <label className="label">Revenue Target</label>
            <input type="number" min="0" className="input-base" value={form.budgetRevenueTarget} onChange={(event) => setForm((prev) => ({ ...prev, budgetRevenueTarget: event.target.value }))} />
          </div>
          <div>
            <label className="label">Currency</label>
            <input className="input-base" value={form.budgetCurrency} onChange={(event) => setForm((prev) => ({ ...prev, budgetCurrency: event.target.value.toUpperCase() }))} />
          </div>
        </div>
        <div>
          <label className="label">Members ({form.members.length} selected)</label>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {users.map((user) => (
              <label key={user._id} className="flex items-center gap-3 rounded-[0.75rem] border px-4 py-3 text-sm" style={{ borderColor: 'var(--c-border)' }}>
                <input type="checkbox" checked={form.members.includes(user._id)} onChange={() => toggleMember(user._id)} />
                <span className="flex-1">{MemberIdentity(user)}</span>
                <span style={{ color: 'var(--c-text-faint)' }}>{user.position || user.role}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            if (!form.name.trim()) return toast.error('Project name required');
            onSave({
              ...form,
              tags: form.tagsText.split(',').map((item) => item.trim()).filter(Boolean),
              client: {
                name: form.clientName,
                account: form.clientAccount,
                contactName: form.clientContactName,
                contactEmail: form.clientContactEmail,
              },
              budget: {
                planned: form.budgetPlanned,
                actual: form.budgetActual,
                revenueTarget: form.budgetRevenueTarget,
                currency: form.budgetCurrency,
              },
            });
          }}
        >
          {project ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </Modal>
  );
};

const ProjectDashboard = ({ projectId, seedProject, users, onBack, onRefresh, onEdit }) => {
  const [project, setProject] = useState(seedProject || { _id: projectId });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAttachTask, setShowAttachTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showGoalLink, setShowGoalLink] = useState(false);
  const [showGoalCreate, setShowGoalCreate] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);
  const [editingIssue, setEditingIssue] = useState(null);
  const [goalOptions, setGoalOptions] = useState([]);
  const [taskOptions, setTaskOptions] = useState([]);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    setProject(seedProject || { _id: projectId });
  }, [projectId, seedProject]);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [projectRes, goalRes, taskRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get('/goals'),
        api.get('/tasks', { params: { limit: 200 } }),
      ]);
      setProject(projectRes.data.project);
      setGoalOptions(goalRes.data.goals || []);
      setTaskOptions(taskRes.data.tasks || []);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to load project';
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const members = project.members || [];
  const tasks = project.tasks || [];
  const goals = project.goals || [];
  const milestones = project.milestones || [];
  const risks = project.risks || [];
  const issues = project.issues || [];
  const activity = project.activity || [];
  const linkedTaskIds = uniqueIds(tasks.map((task) => task._id));
  const linkedGoalIds = uniqueIds(goals.map((goal) => goal._id));
  const lanes = buildTaskLanes(tasks);
  const memberWorkload = members.map((member) => {
    const assigned = tasks.filter((task) => String(task.owner?._id || task.owner) === String(member._id));
    const completed = assigned.filter((task) => task.completed || task.submissionStatus === 'approved').length;
    return {
      member,
      assigned: assigned.length,
      open: Math.max(0, assigned.length - completed),
      completed,
    };
  });

  const timelineRows = [
    ...(project.startDate ? [{ label: 'Project start', date: project.startDate, tone: 'var(--brand-primary)' }] : []),
    ...milestones.filter((milestone) => milestone.dueDate).map((milestone) => ({
      label: `${milestone.status === 'completed' ? 'Milestone complete' : 'Milestone due'} · ${milestone.title}`,
      date: milestone.dueDate,
      tone: milestone.status === 'completed' ? 'var(--c-success)' : milestone.status === 'blocked' ? 'var(--c-danger)' : 'var(--brand-secondary)',
    })),
    ...tasks.filter((task) => task.dueDate).map((task) => ({
      label: `${task.completed || task.submissionStatus === 'approved' ? 'Completed' : 'Due'} · ${task.title}`,
      date: task.dueDate,
      tone: task.completed || task.submissionStatus === 'approved' ? 'var(--c-success)' : 'var(--c-warning)',
    })),
    ...(project.endDate ? [{ label: 'Project end', date: project.endDate, tone: 'var(--c-danger)' }] : []),
  ].sort((left, right) => new Date(left.date) - new Date(right.date));

  const budget = project.budget || {};
  const client = project.client || {};

  const createTaskForProject = async (taskForm) => {
    try {
      const { data: taskData } = await api.post('/tasks', taskForm);
      await api.post(`/projects/${projectId}/task`, { taskId: taskData.task._id });
      toast.success('Task created and attached to project');
      setShowAddTask(false);
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  const attachExistingTask = async (task) => {
    try {
      await api.post(`/projects/${projectId}/task`, { taskId: task._id });
      toast.success('Task attached');
      setShowAttachTask(false);
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to attach task');
    }
  };

  const removeTask = async (task) => {
    if (!confirm(`Remove "${task.title}" from this project?`)) return;
    try {
      await api.delete(`/projects/${projectId}/task/${task._id}`);
      toast.success('Task removed from project');
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove task');
    }
  };

  const saveMembers = async (memberIds) => {
    try {
      await api.put(`/projects/${projectId}/members`, { members: memberIds });
      toast.success('Project members updated');
      setShowMembers(false);
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update members');
    }
  };

  const saveLinkedGoals = async (goalIds) => {
    try {
      await api.put(`/projects/${projectId}`, { goals: goalIds });
      toast.success('Project goals updated');
      setShowGoalLink(false);
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update linked goals');
    }
  };

  const unlinkGoal = async (goal) => {
    try {
      await api.put(`/projects/${projectId}`, { goals: linkedGoalIds.filter((id) => id !== String(goal._id)) });
      toast.success('Goal unlinked');
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unlink goal');
    }
  };

  const createGoalForProject = async (goalForm) => {
    try {
      const { data } = await api.post('/goals', goalForm);
      await api.put(`/projects/${projectId}`, { goals: [...linkedGoalIds, data.goal._id] });
      toast.success('Goal created and linked');
      setShowGoalCreate(false);
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create project goal');
    }
  };

  const saveMilestone = async (payload) => {
    try {
      if (editingMilestone?._id) {
        await api.put(`/projects/${projectId}/milestones/${editingMilestone._id}`, payload);
        toast.success('Milestone updated');
      } else {
        await api.post(`/projects/${projectId}/milestones`, payload);
        toast.success('Milestone added');
      }
      setShowMilestoneModal(false);
      setEditingMilestone(null);
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save milestone');
    }
  };

  const removeMilestone = async (milestone) => {
    if (!confirm(`Remove milestone "${milestone.title}"?`)) return;
    try {
      await api.delete(`/projects/${projectId}/milestones/${milestone._id}`);
      toast.success('Milestone removed');
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove milestone');
    }
  };

  const saveRisk = async (payload) => {
    try {
      if (editingRisk?._id) {
        await api.put(`/projects/${projectId}/risks/${editingRisk._id}`, payload);
        toast.success('Risk updated');
      } else {
        await api.post(`/projects/${projectId}/risks`, payload);
        toast.success('Risk logged');
      }
      setShowRiskModal(false);
      setEditingRisk(null);
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save risk');
    }
  };

  const removeRisk = async (risk) => {
    if (!confirm(`Remove risk "${risk.title}"?`)) return;
    try {
      await api.delete(`/projects/${projectId}/risks/${risk._id}`);
      toast.success('Risk removed');
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove risk');
    }
  };

  const saveIssue = async (payload) => {
    try {
      if (editingIssue?._id) {
        await api.put(`/projects/${projectId}/issues/${editingIssue._id}`, payload);
        toast.success('Issue updated');
      } else {
        await api.post(`/projects/${projectId}/issues`, payload);
        toast.success('Issue logged');
      }
      setShowIssueModal(false);
      setEditingIssue(null);
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save issue');
    }
  };

  const removeIssue = async (issue) => {
    if (!confirm(`Remove issue "${issue.title}"?`)) return;
    try {
      await api.delete(`/projects/${projectId}/issues/${issue._id}`);
      toast.success('Issue removed');
      fetchProject();
      onRefresh?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove issue');
    }
  };

  const tabs = [
    { value: 'overview', label: 'Overview' },
    { value: 'workboard', label: 'Workboard' },
    { value: 'members', label: 'Members' },
    { value: 'goals', label: 'Goals' },
    { value: 'controls', label: 'Controls' },
    { value: 'activity', label: 'Activity' },
    { value: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="page-shell">
      <button type="button" className="btn-ghost w-fit" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Projects
      </button>

      <PageHeader
        eyebrow="Project Workspace"
        title={project.name || 'Project Workspace'}
        description={project.description || 'No description provided.'}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => onEdit(project)}>
              <Edit2 className="h-4 w-4" /> Edit Project
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowMembers(true)}>
              <UserPlus className="h-4 w-4" /> Manage Members
            </button>
            <button type="button" className="btn-primary" onClick={() => setShowAddTask(true)}>
              <Plus className="h-4 w-4" /> New Task
            </button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MiniStat label="Completion" value={`${project.metrics?.completion || 0}%`} tone="var(--brand-primary)" />
        <MiniStat label="Open Tasks" value={project.metrics?.openTasks || 0} tone="var(--c-warning)" />
        <MiniStat label="In Review" value={lanes.review.length} tone="var(--c-info)" />
        <MiniStat label="Goals" value={goals.length} tone="var(--c-success)" />
        <MiniStat label="Milestones" value={project.metrics?.milestones || 0} tone="var(--brand-secondary)" />
        <MiniStat label="Members" value={project.metrics?.members || 0} tone="var(--c-info)" />
      </div>

      <InfoStrip
        title={`Health: ${(healthMeta[project.health] || healthMeta['on-track']).label}`}
        description={`Lead owner: ${MemberIdentity(project.createdBy || {})} · Deadline ${formatShortDate(project.metrics?.endDate || project.endDate)} · ${project.metrics?.overdueTasks || 0} overdue tasks · ${project.metrics?.openRisks || 0} open risks · ${project.metrics?.openIssues || 0} open issues`}
        tone={projectTone(project)}
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowAttachTask(true)}>
              <Link2 className="h-4 w-4" /> Attach Task
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowGoalLink(true)}>
              <Target className="h-4 w-4" /> Link Goals
            </button>
            <button type="button" className="btn-primary" onClick={() => setShowGoalCreate(true)}>
              <Plus className="h-4 w-4" /> New Goal
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setEditingMilestone(null); setShowMilestoneModal(true); }}>
              <Flag className="h-4 w-4" /> Add Milestone
            </button>
          </>
        }
      />

      <Panel title="Project control" subtitle="Manage delivery, members, and outcomes from one workspace." action={<SegmentedTabs items={tabs} value={tab} onChange={setTab} />}>
        {loading ? <LoadingScreen height="16rem" /> : null}
        {!loading && loadError ? (
          <EmptyState icon={FolderKanban} title="Project unavailable" description={loadError} action={<button type="button" className="btn-secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back to Projects</button>} />
        ) : null}

        {!loading && !loadError && tab === 'overview' ? (
          <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
            <div className="space-y-4">
              <Panel title="Execution lanes" subtitle="How work is moving right now">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(lanes).map(([key, items]) => (
                    <div key={key} className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{taskLaneMeta[key].label}</p>
                        <StatusPill tone={taskLaneMeta[key].tone}>{items.length}</StatusPill>
                      </div>
                      <div className="mt-3 space-y-2">
                        {items.slice(0, 3).map((task) => (
                          <div key={task._id} className="rounded-[0.65rem] border px-3 py-2 text-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                            <div className="font-black" style={{ color: 'var(--c-text)' }}>{task.title}</div>
                            <div className="mt-1 text-xs" style={{ color: 'var(--c-text-faint)' }}>{MemberIdentity(task.owner || {})}</div>
                            {getTaskAssignerLabel(task) ? <div className="mt-1 text-[11px]" style={{ color: 'var(--c-text-faint)' }}>{getTaskAssignerLabel(task)}</div> : null}
                            {getTaskSubmissionLabel(task) ? <div className="mt-1 text-[11px]" style={{ color: 'var(--c-text-faint)' }}>{getTaskSubmissionLabel(task)}</div> : null}
                          </div>
                        ))}
                        {!items.length ? <p className="text-sm" style={{ color: 'var(--c-text-faint)' }}>No tasks here</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Priority tasks" subtitle="Current work that needs management attention">
                <div className="space-y-3">
                  {tasks.length ? tasks.slice(0, 6).map((task) => <TaskCard key={task._id} task={task} />) : (
                    <EmptyState icon={ListTodo} title="No tasks yet" description="Add tasks to start operational tracking for this project." />
                  )}
                </div>
              </Panel>
            </div>

            <div className="space-y-4">
              <Panel title="Team workload" subtitle="Who carries the execution load">
                <div className="space-y-3">
                  {memberWorkload.length ? memberWorkload.map((entry) => <MemberCard key={entry.member._id} member={entry.member} workload={entry} />) : (
                    <EmptyState icon={Users} title="No members yet" description="Assign members to start distributing work." />
                  )}
                </div>
              </Panel>
              <Panel title="Commercial context" subtitle="Client and budget position">
                <div className="space-y-3">
                  <div className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                    <p className="section-title">Client / Entity</p>
                    <p className="mt-2 font-black" style={{ color: 'var(--c-text)' }}>{client.name || 'Internal project'}</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{client.account || 'No account stream set'}</p>
                    {(client.contactName || client.contactEmail) ? (
                      <p className="mt-2 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                        {client.contactName || 'No contact'} {client.contactEmail ? `· ${client.contactEmail}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat label="Planned" value={formatCurrency(budget.planned, budget.currency)} tone="var(--brand-primary)" />
                    <MiniStat label="Actual" value={formatCurrency(budget.actual, budget.currency)} tone="var(--c-warning)" />
                    <MiniStat label="Revenue" value={formatCurrency(budget.revenueTarget, budget.currency)} tone="var(--c-success)" />
                    <MiniStat label="Variance" value={formatCurrency((Number(budget.actual || 0) - Number(budget.planned || 0)), budget.currency)} tone={Number(budget.actual || 0) > Number(budget.planned || 0) ? 'var(--c-danger)' : 'var(--brand-secondary)'} />
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        ) : null}

        {!loading && !loadError && tab === 'workboard' ? (
          <div className="grid gap-4 xl:grid-cols-4">
            {Object.entries(lanes).map(([key, items]) => (
              <Panel key={key} title={taskLaneMeta[key].label} subtitle={`${items.length} task${items.length === 1 ? '' : 's'}`} bodyClassName="space-y-3">
                {items.length ? items.map((task) => <TaskCard key={task._id} task={task} onRemove={removeTask} />) : (
                  <div className="rounded-[0.85rem] border border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-faint)' }}>
                    No tasks here
                  </div>
                )}
              </Panel>
            ))}
          </div>
        ) : null}

        {!loading && !loadError && tab === 'members' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <InfoStrip title="Member management" description="Project members automatically gain project visibility on the user side and can receive project-linked work." tone="brand" />
              <button type="button" className="btn-secondary" onClick={() => setShowMembers(true)}>
                <Users className="h-4 w-4" /> Update Members
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {memberWorkload.length ? memberWorkload.map((entry) => <MemberCard key={entry.member._id} member={entry.member} workload={entry} />) : (
                <EmptyState icon={Users} title="No members assigned" description="Add members so tasks, goals, and project visibility can be managed properly." />
              )}
            </div>
          </div>
        ) : null}

        {!loading && !loadError && tab === 'goals' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary" onClick={() => setShowGoalLink(true)}>
                <Link2 className="h-4 w-4" /> Link Existing Goals
              </button>
              <button type="button" className="btn-primary" onClick={() => setShowGoalCreate(true)}>
                <Plus className="h-4 w-4" /> Create Project Goal
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {goals.length ? goals.map((goal) => <GoalCard key={goal._id} goal={goal} onUnlink={unlinkGoal} />) : (
                <EmptyState icon={Target} title="No goals linked" description="Link existing goals or create a new project goal from here." />
              )}
            </div>
          </div>
        ) : null}

        {!loading && !loadError && tab === 'controls' ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
              <Panel title="Milestones" subtitle={`${milestones.length} tracked milestone${milestones.length === 1 ? '' : 's'}`} action={<button type="button" className="btn-secondary" onClick={() => { setEditingMilestone(null); setShowMilestoneModal(true); }}><Plus className="h-4 w-4" /> Add Milestone</button>}>
                <div className="space-y-3">
                  {milestones.length ? milestones.map((milestone) => (
                    <div key={milestone._id} className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={(milestoneStatusMeta[milestone.status] || milestoneStatusMeta.planned).tone}>
                              {(milestoneStatusMeta[milestone.status] || milestoneStatusMeta.planned).label}
                            </StatusPill>
                            {milestone.dueDate ? <StatusPill tone={new Date(milestone.dueDate) < new Date() && milestone.status !== 'completed' ? 'danger' : 'neutral'}>{formatShortDate(milestone.dueDate)}</StatusPill> : null}
                          </div>
                          <p className="mt-2 font-black" style={{ color: 'var(--c-text)' }}>{milestone.title}</p>
                          <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{milestone.description || 'No description provided.'}</p>
                          <p className="mt-2 text-xs" style={{ color: 'var(--c-text-faint)' }}>{MemberIdentity(milestone.owner || {})}</p>
                          {milestone.notes ? <p className="mt-2 text-sm" style={{ color: 'var(--c-text-soft)' }}>{milestone.notes}</p> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="btn-ghost h-9 w-9 rounded-[0.7rem] p-0" onClick={() => { setEditingMilestone(milestone); setShowMilestoneModal(true); }}><Edit2 className="h-4 w-4" /></button>
                          <button type="button" className="btn-danger h-9 w-9 rounded-[0.7rem] p-0" onClick={() => removeMilestone(milestone)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  )) : <EmptyState icon={Flag} title="No milestones" description="Add delivery checkpoints so progress can be reviewed at the right level." />}
                </div>
              </Panel>

              <Panel title="Project goals" subtitle={`${goals.length} linked goal${goals.length === 1 ? '' : 's'}`} action={<button type="button" className="btn-secondary" onClick={() => setShowGoalLink(true)}><Link2 className="h-4 w-4" /> Manage Goals</button>}>
                <div className="space-y-3">
                  {goals.length ? goals.map((goal) => <GoalCard key={goal._id} goal={goal} onUnlink={unlinkGoal} />) : (
                    <EmptyState icon={Target} title="No goals linked" description="Link goals so the project can be measured against clear outcomes." />
                  )}
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Panel title="Risk register" subtitle={`${risks.filter((item) => item.status !== 'closed').length} open risk${risks.filter((item) => item.status !== 'closed').length === 1 ? '' : 's'}`} action={<button type="button" className="btn-secondary" onClick={() => { setEditingRisk(null); setShowRiskModal(true); }}><Plus className="h-4 w-4" /> Add Risk</button>}>
                <div className="space-y-3">
                  {risks.length ? risks.map((risk) => (
                    <div key={risk._id} className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={(severityMeta[risk.severity] || severityMeta.medium).tone}>{(severityMeta[risk.severity] || severityMeta.medium).label}</StatusPill>
                            <StatusPill tone={(riskStatusMeta[risk.status] || riskStatusMeta.open).tone}>{(riskStatusMeta[risk.status] || riskStatusMeta.open).label}</StatusPill>
                          </div>
                          <p className="mt-2 font-black" style={{ color: 'var(--c-text)' }}>{risk.title}</p>
                          <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{risk.description || 'No description provided.'}</p>
                          <p className="mt-2 text-xs" style={{ color: 'var(--c-text-faint)' }}>{MemberIdentity(risk.owner || {})} {risk.dueDate ? `· due ${formatShortDate(risk.dueDate)}` : ''}</p>
                          {risk.impact ? <p className="mt-2 text-sm" style={{ color: 'var(--c-text-soft)' }}><strong>Impact:</strong> {risk.impact}</p> : null}
                          {risk.mitigation ? <p className="mt-1 text-sm" style={{ color: 'var(--c-text-soft)' }}><strong>Mitigation:</strong> {risk.mitigation}</p> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="btn-ghost h-9 w-9 rounded-[0.7rem] p-0" onClick={() => { setEditingRisk(risk); setShowRiskModal(true); }}><Edit2 className="h-4 w-4" /></button>
                          <button type="button" className="btn-danger h-9 w-9 rounded-[0.7rem] p-0" onClick={() => removeRisk(risk)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  )) : <EmptyState icon={ShieldAlert} title="No risks logged" description="Track risks formally so delivery pressure is visible before it becomes failure." />}
                </div>
              </Panel>

              <Panel title="Issue tracker" subtitle={`${issues.filter((item) => item.status !== 'resolved').length} open issue${issues.filter((item) => item.status !== 'resolved').length === 1 ? '' : 's'}`} action={<button type="button" className="btn-secondary" onClick={() => { setEditingIssue(null); setShowIssueModal(true); }}><Plus className="h-4 w-4" /> Add Issue</button>}>
                <div className="space-y-3">
                  {issues.length ? issues.map((issue) => (
                    <div key={issue._id} className="rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={(severityMeta[issue.severity] || severityMeta.medium).tone}>{(severityMeta[issue.severity] || severityMeta.medium).label}</StatusPill>
                            <StatusPill tone={(issueStatusMeta[issue.status] || issueStatusMeta.open).tone}>{(issueStatusMeta[issue.status] || issueStatusMeta.open).label}</StatusPill>
                          </div>
                          <p className="mt-2 font-black" style={{ color: 'var(--c-text)' }}>{issue.title}</p>
                          <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{issue.description || 'No description provided.'}</p>
                          <p className="mt-2 text-xs" style={{ color: 'var(--c-text-faint)' }}>{MemberIdentity(issue.owner || {})} {issue.dueDate ? `· due ${formatShortDate(issue.dueDate)}` : ''}</p>
                          {issue.resolution ? <p className="mt-2 text-sm" style={{ color: 'var(--c-text-soft)' }}><strong>Resolution:</strong> {issue.resolution}</p> : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="btn-ghost h-9 w-9 rounded-[0.7rem] p-0" onClick={() => { setEditingIssue(issue); setShowIssueModal(true); }}><Edit2 className="h-4 w-4" /></button>
                          <button type="button" className="btn-danger h-9 w-9 rounded-[0.7rem] p-0" onClick={() => removeIssue(issue)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  )) : <EmptyState icon={AlertTriangle} title="No issues logged" description="Track blockers formally so the escalation path is visible and owned." />}
                </div>
              </Panel>
            </div>
          </div>
        ) : null}

        {!loading && !loadError && tab === 'activity' ? (
          <div className="space-y-3">
            {activity.length ? activity.map((item) => (
              <div key={item._id} className="flex items-start gap-3 rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-black" style={{ color: 'var(--c-text)' }}>{item.message}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                    {item.actorName || MemberIdentity(item.actor || {})} · {formatTaskMoment(item.createdAt)}
                  </p>
                </div>
              </div>
            )) : (
              <EmptyState icon={Calendar} title="No activity recorded yet" description="Project decisions, control updates, and delivery changes will appear here." />
            )}
          </div>
        ) : null}

        {!loading && !loadError && tab === 'timeline' ? (
          <div className="space-y-3">
            {timelineRows.length ? timelineRows.map((row, index) => (
              <div key={`${row.label}-${index}`} className="flex items-start gap-3 rounded-[0.85rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <div className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: row.tone }} />
                <div>
                  <p className="font-black" style={{ color: 'var(--c-text)' }}>{row.label}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--c-text-muted)' }}>{formatShortDate(row.date)}</p>
                </div>
              </div>
            )) : (
              <EmptyState icon={Calendar} title="No timeline entries" description="Start and end dates or task deadlines will build the project timeline here." />
            )}
          </div>
        ) : null}
      </Panel>

      <ProjectTaskModal open={showAddTask} users={members.length ? members : users} onSave={createTaskForProject} onClose={() => setShowAddTask(false)} />
      <ExistingTaskModal open={showAttachTask} availableTasks={taskOptions} linkedTaskIds={linkedTaskIds} onAttach={attachExistingTask} onClose={() => setShowAttachTask(false)} />
      <ProjectMembersModal open={showMembers} users={users} value={members.map((member) => member._id)} onSave={saveMembers} onClose={() => setShowMembers(false)} />
      <GoalLinkModal open={showGoalLink} goals={goalOptions} linkedGoalIds={linkedGoalIds} onSave={saveLinkedGoals} onClose={() => setShowGoalLink(false)} />
      <ProjectGoalCreateModal open={showGoalCreate} members={members.length ? members : users} tasks={tasks} onSave={createGoalForProject} onClose={() => setShowGoalCreate(false)} />
      <ProjectControlModal
        open={showMilestoneModal}
        title={editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
        subtitle="Track delivery checkpoints that leadership can review directly."
        config={{ type: 'milestone', label: 'Milestone', statusOptions: Object.entries(milestoneStatusMeta).map(([value, meta]) => ({ value, label: meta.label })) }}
        members={members.length ? members : users}
        value={editingMilestone}
        onSave={saveMilestone}
        onClose={() => { setShowMilestoneModal(false); setEditingMilestone(null); }}
      />
      <ProjectControlModal
        open={showRiskModal}
        title={editingRisk ? 'Edit Risk' : 'Add Risk'}
        subtitle="Track delivery threats before they become operational failures."
        config={{
          type: 'risk',
          label: 'Risk',
          statusOptions: Object.entries(riskStatusMeta).map(([value, meta]) => ({ value, label: meta.label })),
          severityOptions: Object.entries(severityMeta).map(([value, meta]) => ({ value, label: meta.label })),
        }}
        members={members.length ? members : users}
        value={editingRisk}
        onSave={saveRisk}
        onClose={() => { setShowRiskModal(false); setEditingRisk(null); }}
      />
      <ProjectControlModal
        open={showIssueModal}
        title={editingIssue ? 'Edit Issue' : 'Add Issue'}
        subtitle="Track blockers, ownership, and resolution paths in one place."
        config={{
          type: 'issue',
          label: 'Issue',
          statusOptions: Object.entries(issueStatusMeta).map(([value, meta]) => ({ value, label: meta.label })),
          severityOptions: Object.entries(severityMeta).map(([value, meta]) => ({ value, label: meta.label })),
        }}
        members={members.length ? members : users}
        value={editingIssue}
        onSave={saveIssue}
        onClose={() => { setShowIssueModal(false); setEditingIssue(null); }}
      />
    </div>
  );
};

const Projects = () => {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const { markTypeRead } = useNotifications();
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, atRisk: 0, overdueTasks: 0, members: 0, openRisks: 0, overdueMilestones: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [viewMode, setViewMode] = useState('portfolio');
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [projectRes, userRes] = await Promise.all([
        api.get('/projects', {
          params: {
            ...(search.trim() && { search: search.trim() }),
            ...(statusFilter && { status: statusFilter }),
            ...(memberFilter && { memberId: memberFilter }),
          },
        }),
        api.get('/team/available-users'),
      ]);

      setProjects(projectRes.data.projects || []);
      setSummary(projectRes.data.summary || { total: 0, active: 0, atRisk: 0, overdueTasks: 0, members: 0, openRisks: 0, overdueMilestones: 0 });
      setUsers(userRes.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [memberFilter, search, statusFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    markTypeRead?.('project');
  }, [markTypeRead]);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return undefined;

    const socket = io(API_BASE, {
      auth: (cb) => cb({ token: localStorage.getItem('adminToken') }),
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    const refreshIfRelevant = (payload) => {
      if (!payload) return;
      if (payload.type === 'project' || payload.entityType === 'project' || payload.data?.projectId) {
        fetchAll();
      }
    };

    socket.on('notification:new', refreshIfRelevant);

    return () => {
      socket.off('notification:new', refreshIfRelevant);
      socket.disconnect();
    };
  }, [fetchAll]);

  const saveProject = async (form) => {
    try {
      const payload = {
        name: form.name,
        description: form.description,
        status: form.status,
        priority: form.priority,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        members: form.members,
        tags: form.tags || [],
        client: form.client,
        budget: form.budget,
      };
      if (editProject) {
        await api.put(`/projects/${editProject._id}`, payload);
        toast.success('Project updated');
      } else {
        await api.post('/projects', payload);
        toast.success('Project created');
      }
      setShowForm(false);
      setEditProject(null);
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save project');
    }
  };

  const deleteProject = async (project) => {
    if (!confirm(`Delete project "${project.name}"?`)) return;
    try {
      await api.delete(`/projects/${project._id}`);
      toast.success('Project deleted');
      if (String(projectId) === String(project._id)) {
        navigate('/projects', { replace: true });
      }
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete project');
    }
  };

  const orderedProjects = useMemo(() => {
    if (viewMode === 'timeline') {
      return [...projects].sort((left, right) => new Date(left.metrics?.endDate || left.endDate || 0) - new Date(right.metrics?.endDate || right.endDate || 0));
    }
    return projects;
  }, [projects, viewMode]);

  const selectedProject = useMemo(() => {
    if (!projectId) return null;
    return projects.find((project) => String(project._id) === String(projectId)) || null;
  }, [projectId, projects]);

  const openProject = useCallback((project) => {
    if (!project?._id) return;
    navigate(`/projects/${project._id}`);
  }, [navigate]);

  if (projectId) {
    return (
      <>
        <ProjectDashboard
          projectId={projectId}
          seedProject={selectedProject}
          users={users}
          onBack={() => navigate('/projects')}
          onRefresh={fetchAll}
          onEdit={(project) => {
            setEditProject(project);
            setShowForm(true);
          }}
        />
        <ProjectModal
          open={showForm}
          project={editProject}
          users={users}
          onSave={saveProject}
          onClose={() => {
            setShowForm(false);
            setEditProject(null);
          }}
        />
      </>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Projects"
        actions={
          <button type="button" className="btn-primary" onClick={() => { setEditProject(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> New Project
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MiniStat label="Projects" value={summary.total || 0} tone="var(--brand-primary)" />
        <MiniStat label="Active" value={summary.active || 0} tone="var(--c-success)" />
        <MiniStat label="At Risk" value={summary.atRisk || 0} tone="var(--c-danger)" />
        <MiniStat label="Overdue Tasks" value={summary.overdueTasks || 0} tone="var(--c-warning)" />
        <MiniStat label="Open Risks" value={summary.openRisks || 0} tone="var(--brand-secondary)" />
        <MiniStat label="Members Engaged" value={summary.members || 0} tone="var(--c-info)" />
      </div>

      <Panel
        action={
          <SegmentedTabs
            items={[
              { value: 'portfolio', label: 'Portfolio' },
              { value: 'board', label: 'Board' },
              { value: 'timeline', label: 'Timeline' },
            ]}
            value={viewMode}
            onChange={setViewMode}
          />
        }
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full xl:max-w-lg">
            <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects..." icon={Search} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {['', 'planning', 'active', 'on-hold', 'completed'].map((item) => (
              <FilterChip key={item || 'all'} active={statusFilter === item} onClick={() => setStatusFilter(item)}>
                {item ? statusMeta[item]?.label : 'All'}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr),18rem]">
 
          <div>
            <label className="label">Filter by member</label>
            <select className="input-base" value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)}>
              <option value="">All visible members</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>{MemberIdentity(user)}</option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {loading ? <LoadingScreen height="20rem" /> : null}

      {!loading && orderedProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create a project, set the team, and start managing delivery from a single workspace."
          action={<button type="button" className="btn-primary" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Create Project</button>}
        />
      ) : null}

      {!loading && orderedProjects.length > 0 && viewMode === 'portfolio' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedProjects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onOpen={openProject}
              onEdit={(value) => {
                setEditProject(value);
                setShowForm(true);
              }}
              onDelete={deleteProject}
            />
          ))}
        </div>
      ) : null}

      {!loading && orderedProjects.length > 0 && viewMode === 'board' ? (
        <BoardView
          projects={orderedProjects}
          onOpen={openProject}
          onEdit={(value) => {
            setEditProject(value);
            setShowForm(true);
          }}
          onDelete={deleteProject}
        />
      ) : null}

      {!loading && orderedProjects.length > 0 && viewMode === 'timeline' ? (
        <TimelineView projects={orderedProjects} onOpen={openProject} />
      ) : null}

      <ProjectModal
        open={showForm}
        project={editProject}
        users={users}
        onSave={saveProject}
        onClose={() => {
          setShowForm(false);
          setEditProject(null);
        }}
      />
    </div>
  );
};

export default Projects;
