import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, FolderKanban, ListTodo, Search, Target, Users } from 'lucide-react';
import { io } from 'socket.io-client';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext.jsx';
import { getAccessToken, getUserApiBase } from '../security/authClient.js';

const API_BASE = getUserApiBase();

const statusMeta = {
  planning: { label: 'Planning', bg: '#eff6ff', color: '#2563eb' },
  active: { label: 'Active', bg: '#ecfdf5', color: '#059669' },
  'on-hold': { label: 'On Hold', bg: '#fff7ed', color: '#c2410c' },
  completed: { label: 'Completed', bg: '#f5f3ff', color: '#7c3aed' },
  archived: { label: 'Archived', bg: '#f3f4f6', color: '#6b7280' },
};

const healthMeta = {
  'on-track': { label: 'On Track', bg: '#ecfdf5', color: '#15803d' },
  watch: { label: 'Needs Attention', bg: '#fff7ed', color: '#c2410c' },
  'at-risk': { label: 'At Risk', bg: '#fef2f2', color: '#dc2626' },
  settled: { label: 'Settled', bg: '#eef2ff', color: '#4338ca' },
};

const readToken = () => getAccessToken();
const authHeaders = () => {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatShortDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return format(date, 'MMM d, yyyy');
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

const getTaskStatusLabel = (task) => {
  if (task.submissionStatus === 'approved') {
    const reviewer = getPersonName(task.reviewedBy, '');
    return reviewer ? `Approved by ${reviewer}` : 'Approved';
  }
  if (task.submissionStatus === 'submitted') {
    const submittedAt = formatTaskMoment(task.submittedAt);
    return submittedAt ? `Submitted ${submittedAt}` : 'Waiting review';
  }
  if (task.submissionStatus === 'rejected') {
    const reviewer = getPersonName(task.reviewedBy, '');
    return reviewer ? `Rejected by ${reviewer}` : 'Rejected';
  }
  return task.completed ? 'Done' : 'Open';
};

const FilterButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
    style={active ? { backgroundColor: 'var(--brand-primary)', color: '#fff' } : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
  >
    {children}
  </button>
);

const SummaryCard = ({ label, value, helper, tone }) => (
  <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
    <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    <p className="mt-2 text-2xl font-black leading-none" style={{ color: tone }}>{value}</p>
    {helper ? <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{helper}</p> : null}
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="rounded-xl border py-16 text-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
    <FolderKanban className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
    <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{description}</p>
  </div>
);

const ProjectCard = ({ project, onSelect }) => {
  const status = statusMeta[project.status] || statusMeta.planning;
  const health = healthMeta[project.health] || healthMeta['on-track'];

  return (
    <button
      type="button"
      onClick={() => onSelect(project)}
      className="w-full rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', boxShadow: '0 1px 4px var(--shadow-color)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: status.bg, color: status.color }}>{status.label}</span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: health.bg, color: health.color }}>{health.label}</span>
          </div>
          <h3 className="text-lg font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{project.name}</h3>
        </div>
        <div className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
          {project.metrics?.completion || 0}%
        </div>
      </div>

      <p className="mt-3 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
        {project.description || 'No description yet.'}
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          <span>Progress</span>
          <span>{project.metrics?.completedTasks || 0} / {project.metrics?.totalTasks || 0} tasks</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <div className="h-full rounded-full" style={{ width: `${project.metrics?.completion || 0}%`, backgroundColor: 'var(--brand-primary)' }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>My work</p>
          <p className="mt-1 font-black" style={{ color: 'var(--text-primary)' }}>{project.metrics?.myOpenTasks || 0}</p>
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Members</p>
          <p className="mt-1 font-black" style={{ color: 'var(--text-primary)' }}>{project.metrics?.members || 0}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{project.metrics?.endDate ? formatShortDate(project.metrics.endDate) : 'No end date'}</span>
        <span className="inline-flex items-center gap-1"><ListTodo className="w-3.5 h-3.5" />{project.metrics?.openTasks || 0} open</span>
      </div>
    </button>
  );
};

const TaskRow = ({ task }) => {
  const submissionLabel = getTaskStatusLabel(task);
  const assignedBy = getPersonName(task.assignedBy, '');

  return (
    <div className="rounded-xl border p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {(task.owner?.fullName || `${task.owner?.firstName || ''} ${task.owner?.lastName || ''}`).trim() || 'Unassigned'}
            {task.dueDate ? ` · Due ${formatShortDate(task.dueDate)}` : ''}
            {assignedBy ? ` · Assigned by ${assignedBy}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>{task.priority || 'Low'}</span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: task.completed ? '#ecfdf5' : '#f3f4f6', color: task.completed ? '#15803d' : '#4b5563' }}>{submissionLabel}</span>
        </div>
      </div>
      {task.description ? <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{task.description}</p> : null}
    </div>
  );
};

const MemberCard = ({ member }) => (
  <div className="rounded-xl border p-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
      {member.fullName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email}
    </p>
    <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{member.position || member.role || 'Project member'}</p>
    {member.unitSector ? <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{member.unitSector}</p> : null}
  </div>
);

const TimelineRow = ({ label, date, tone = 'var(--brand-primary)' }) => (
  <div className="flex items-start gap-3">
    <div className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tone }} />
    <div>
      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{formatShortDate(date)}</p>
    </div>
  </div>
);

const ProjectDetail = ({ project, onBack }) => {
  const navigate = useNavigate();
  const myOpenTasks = (project.tasks || []).filter((task) => String(task.owner?._id || task.owner) === String(project.viewerId || '') && !task.completed);
  const teamTasks = (project.tasks || []).filter((task) => String(task.owner?._id || task.owner) !== String(project.viewerId || ''));
  const timeline = useMemo(() => {
    const rows = [];
    if (project.startDate) rows.push({ label: 'Project start', date: project.startDate, tone: 'var(--brand-primary)' });
    (project.tasks || [])
      .filter((task) => task.dueDate)
      .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
      .slice(0, 6)
      .forEach((task) => {
        rows.push({
          label: task.completed ? `Completed task: ${task.title}` : `Upcoming task: ${task.title}`,
          date: task.dueDate,
          tone: task.completed ? '#15803d' : 'var(--brand-accent)',
        });
      });
    if (project.endDate) rows.push({ label: 'Project end', date: project.endDate, tone: '#dc2626' });
    return rows.sort((left, right) => new Date(left.date) - new Date(right.date));
  }, [project]);

  return (
    <div className="space-y-5 py-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-bold"
        style={{ color: 'var(--brand-primary)' }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: (statusMeta[project.status] || statusMeta.planning).bg, color: (statusMeta[project.status] || statusMeta.planning).color }}>
                {(statusMeta[project.status] || statusMeta.planning).label}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: (healthMeta[project.health] || healthMeta['on-track']).bg, color: (healthMeta[project.health] || healthMeta['on-track']).color }}>
                {(healthMeta[project.health] || healthMeta['on-track']).label}
              </span>
            </div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{project.name}</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7" style={{ color: 'var(--text-secondary)' }}>
              {project.description || 'No description yet.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>Owner: {project.createdBy?.fullName || `${project.createdBy?.firstName || ''} ${project.createdBy?.lastName || ''}`.trim() || 'Unknown'}</span>
              <span>Start: {formatShortDate(project.startDate)}</span>
              <span>End: {formatShortDate(project.endDate)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:w-[18rem]">
            <SummaryCard label="Completion" value={`${project.metrics?.completion || 0}%`} tone="var(--brand-primary)" />
            <SummaryCard label="Open tasks" value={project.metrics?.openTasks || 0} tone="#c2410c" />
            <SummaryCard label="My open tasks" value={project.metrics?.myOpenTasks || 0} tone="#2563eb" />
            <SummaryCard label="Team members" value={project.metrics?.members || 0} tone="#15803d" />
          </div>
        </div>
      </div>

      {myOpenTasks.length ? (
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>My next deliverables</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Tasks inside this project that need your attention now.</p>
            </div>
            <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }} onClick={() => navigate('/assigned')}>
              Open Assigned Tasks
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {myOpenTasks.map((task) => <TaskRow key={task._id} task={task} />)}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.5fr,1fr]">
        <div className="space-y-5">
          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Project workboard</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Everything currently being delivered inside this project.</p>
              </div>
              <div className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                {(project.tasks || []).length} tasks
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {(project.tasks || []).length ? (project.tasks || []).map((task) => <TaskRow key={task._id} task={task} />) : (
                <EmptyState title="No project tasks yet" description="Tasks attached to this project will appear here." />
              )}
            </div>
          </div>

          {(project.goals || []).length ? (
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Project goals</h2>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(project.goals || []).map((goal) => {
                  const total = goal.subGoals?.length || 0;
                  const done = goal.subGoals?.filter((item) => item.completed).length || 0;
                  const completion = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={goal._id} className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{goal.title}</p>
                      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{done} of {total} milestones complete</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: '#e5e7eb' }}>
                        <div className="h-full rounded-full" style={{ width: `${completion}%`, backgroundColor: 'var(--brand-primary)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Team members</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(project.members || []).length ? (project.members || []).map((member) => <MemberCard key={member._id} member={member} />) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No members assigned.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
              <h2 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Timeline</h2>
            </div>
            <div className="mt-4 space-y-4">
              {timeline.length ? timeline.map((item, index) => <TimelineRow key={`${item.label}-${index}`} {...item} />) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No project dates yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  const navigate = useNavigate();
  const { projectId = '' } = useParams();
  const { user } = useOutletContext();
  const { markTypeRead } = useNotifications();
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, atRisk: 0, myOpenTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [focusFilter, setFocusFilter] = useState('all');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (focusFilter === 'active') params.focus = 'active';
      const { data } = await axios.get(`${API_BASE}/api/projects`, {
        params,
        headers: authHeaders(),
        withCredentials: true,
      });

      const nextProjects = Array.isArray(data.projects) ? data.projects.map((project) => ({
        ...project,
        viewerId: user?.id || user?._id || '',
      })) : [];
      setProjects(nextProjects);
      setSummary(data.summary || { total: nextProjects.length, active: 0, atRisk: 0, myOpenTasks: 0 });
    } finally {
      setLoading(false);
    }
  }, [focusFilter, search, statusFilter, user?.id, user?._id]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    markTypeRead('project');
  }, [markTypeRead]);

  useEffect(() => {
    const token = readToken();
    if (!token) return undefined;

    const socket = io(API_BASE, {
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    const refreshIfRelevant = (payload) => {
      if (!payload) return;
      if (payload.type === 'project' || payload.entityType === 'project' || payload.data?.projectId) {
        fetchProjects();
      }
    };

    const handleTaskActivity = () => fetchProjects();

    socket.on('notification:new', refreshIfRelevant);
    socket.on('newTask', handleTaskActivity);
    socket.on('updateTask', handleTaskActivity);
    socket.on('taskReviewed', handleTaskActivity);

    return () => {
      socket.off('notification:new', refreshIfRelevant);
      socket.off('newTask', handleTaskActivity);
      socket.off('updateTask', handleTaskActivity);
      socket.off('taskReviewed', handleTaskActivity);
      socket.disconnect();
    };
  }, [fetchProjects]);

  const filteredProjects = useMemo(() => {
    if (focusFilter === 'risk') return projects.filter((project) => project.health === 'at-risk');
    if (focusFilter === 'mine') return projects.filter((project) => (project.metrics?.myTasks || 0) > 0);
    return projects;
  }, [focusFilter, projects]);

  const selectedProject = useMemo(() => {
    if (!projectId) return null;
    return projects.find((project) => String(project._id) === String(projectId)) || null;
  }, [projectId, projects]);

  const openProject = useCallback((project) => {
    if (!project?._id) return;
    navigate(`/projects/${project._id}`);
  }, [navigate]);

  if (projectId && loading) {
    return <div className="py-10"><EmptyState title="Loading project" description="Fetching the latest project workspace..." /></div>;
  }

  if (projectId && selectedProject) {
    return <ProjectDetail project={selectedProject} onBack={() => navigate('/projects')} />;
  }

  if (projectId && !selectedProject && !loading) {
    return <div className="py-10"><EmptyState title="Project not found" description="This project is no longer visible to your account or does not exist." /></div>;
  }

  return (
    <div className="space-y-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Projects</h1>
          <p className="mt-1 text-sm max-w-3xl" style={{ color: 'var(--text-secondary)' }}>
            Every project you are part of appears here with members, work progress, deadlines, and your next deliverables.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[32rem]">
          <SummaryCard label="Projects" value={summary.total || 0} tone="var(--brand-primary)" />
          <SummaryCard label="Active" value={summary.active || 0} tone="#15803d" />
          <SummaryCard label="At risk" value={summary.atRisk || 0} tone="#dc2626" />
          <SummaryCard label="My open tasks" value={summary.myOpenTasks || 0} tone="#2563eb" />
        </div>
      </div>

      <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterButton active={focusFilter === 'all'} onClick={() => setFocusFilter('all')}>All</FilterButton>
            <FilterButton active={focusFilter === 'active'} onClick={() => setFocusFilter('active')}>Active</FilterButton>
            <FilterButton active={focusFilter === 'mine'} onClick={() => setFocusFilter('mine')}>My Work</FilterButton>
            <FilterButton active={focusFilter === 'risk'} onClick={() => setFocusFilter('risk')}>At Risk</FilterButton>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['', 'planning', 'active', 'on-hold', 'completed'].map((item) => (
            <FilterButton key={item || 'all-status'} active={statusFilter === item} onClick={() => setStatusFilter(item)}>
              {item ? (statusMeta[item]?.label || item) : 'All Statuses'}
            </FilterButton>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-xl border p-4 animate-pulse" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="h-4 w-28 rounded" style={{ backgroundColor: 'var(--bg-hover)' }} />
              <div className="mt-4 h-6 w-2/3 rounded" style={{ backgroundColor: 'var(--bg-hover)' }} />
              <div className="mt-4 h-20 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyState title="No projects found" description="Projects where you are a member or have project work will appear here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project._id} project={project} onSelect={openProject} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;



