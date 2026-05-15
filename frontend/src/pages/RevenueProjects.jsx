import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { CheckSquare, CircleDollarSign, FolderKanban, Layers3, ListTodo, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAccessToken, getUserApiBase } from '../security/authClient.js';

const API_BASE = getUserApiBase();

const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatShortDate = (value) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return format(date, 'MMM d, yyyy');
};

const formatCurrency = (value, currency = 'NGN') => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '-';
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toLocaleString()}`;
  }
};

const memberLabel = (user) => user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User';
const sortPhases = (phases = []) => (
  [...phases].sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left?.order)) ? Number(left.order) : 0;
    const rightOrder = Number.isFinite(Number(right?.order)) ? Number(right.order) : 0;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left?.title || '').localeCompare(String(right?.title || ''));
  })
);

const RevenueProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const currentUserId = useMemo(() => {
    try {
      const fromCurrent = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (fromCurrent?._id || fromCurrent?.id) return String(fromCurrent._id || fromCurrent.id);
    } catch {}
    return '';
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/revenue-projects`, { headers: authHeaders() });
      const nextProjects = response.data?.projects || [];
      setProjects(nextProjects);
      setSelectedId((current) => (
        current && nextProjects.some((project) => project._id === current)
          ? current
          : nextProjects[0]?._id || ''
      ));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load revenue projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => (
    projects.filter((project) => {
      if (!search.trim()) return true;
      const needle = search.trim().toLowerCase();
      return [
        project.name,
        project.code,
        project.description,
        project.clientName,
        project.assetName,
        project.location,
        project.revenueOutcome,
      ].some((value) => String(value || '').toLowerCase().includes(needle));
    })
  ), [projects, search]);

  useEffect(() => {
    if (!filteredProjects.length) {
      setSelectedId('');
      return;
    }
    if (!filteredProjects.some((project) => project._id === selectedId)) {
      setSelectedId(filteredProjects[0]._id);
    }
  }, [filteredProjects, selectedId]);

  const selectedProject = useMemo(
    () => filteredProjects.find((project) => project._id === selectedId) || filteredProjects[0] || null,
    [filteredProjects, selectedId]
  );

  const selectedProjectPhases = useMemo(
    () => sortPhases(selectedProject?.phases || []),
    [selectedProject]
  );

  const selectedProjectPhaseGroups = useMemo(() => {
    if (!selectedProject) return [];
    const tasks = (selectedProject.tasks || [])
      .filter((task) => !currentUserId || String(task.owner?._id || '') === currentUserId);

    const groups = selectedProjectPhases.map((phase) => ({
      phase,
      tasks: tasks.filter((task) => String(task?.revenueProject?.phaseId || '') === String(phase?._id || '')),
    }));

    const unassignedTasks = tasks.filter((task) => !groups.some((group) => group.tasks.some((entry) => entry._id === task._id)));
    if (unassignedTasks.length) {
      groups.push({
        phase: { _id: 'unassigned', title: 'Unassigned phase', description: 'Legacy linked tasks without a phase assignment.', completed: false },
        tasks: unassignedTasks,
      });
    }

    return groups;
  }, [currentUserId, selectedProject, selectedProjectPhases]);

  const stats = useMemo(() => ({
    total: projects.length,
    myTasks: projects.reduce((sum, project) => sum + (project.metrics?.myTasks || 0), 0),
    myOpenTasks: projects.reduce((sum, project) => sum + (project.metrics?.myOpenTasks || 0), 0),
    releasedTasks: projects.reduce((sum, project) => sum + (project.metrics?.releasedTasks || 0), 0),
  }), [projects]);

  if (loading) {
    return <div className="py-10 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading revenue projects...</div>;
  }

  return (
    <div className="space-y-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--brand-primary)' }}>Revenue Outcome Delivery</p>
          <h1 className="mt-2 text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Revenue Projects</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            These projects show how your assigned work is tied to delivery phases. You can work checklist items immediately, but final task closeout opens only when admin completes the matching phase.
          </p>
        </div>
        <button type="button" onClick={loadProjects} className="rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: 'var(--brand-primary)', color: '#fff' }}>
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Projects', value: stats.total, icon: FolderKanban, tone: 'var(--brand-primary)' },
          { label: 'My Linked Tasks', value: stats.myTasks, icon: ListTodo, tone: 'var(--brand-accent)' },
          { label: 'Still Open', value: stats.myOpenTasks, icon: CheckSquare, tone: '#f59e0b' },
          { label: 'Released Tasks', value: stats.releasedTasks, icon: CircleDollarSign, tone: '#10b981' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                <p className="mt-2 text-2xl font-black leading-none" style={{ color: item.tone }}>{item.value}</p>
              </div>
              <item.icon className="h-5 w-5" style={{ color: item.tone }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px,1fr]">
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="w-full rounded-lg border py-2.5 pl-9 pr-4 text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects, assets, client names..."
            />
          </div>

          <div className="mt-4 space-y-3">
            {!filteredProjects.length ? (
              <div className="rounded-xl border py-12 text-center" style={{ borderColor: 'var(--border-color)' }}>
                <FolderKanban className="mx-auto mb-3 h-9 w-9" style={{ color: 'var(--text-muted)' }} />
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>No revenue projects yet</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Projects linked to your work will appear here.</p>
              </div>
            ) : filteredProjects.map((project) => (
              <button
                key={project._id}
                type="button"
                onClick={() => setSelectedId(project._id)}
                className="w-full rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5"
                style={{
                  backgroundColor: project._id === selectedId ? 'var(--brand-light)' : 'var(--bg-surface)',
                  borderColor: project._id === selectedId ? 'var(--brand-primary)' : 'var(--border-color)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black" style={{ color: 'var(--text-primary)' }}>{project.name}</p>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {project.assetName || 'No asset name'}{project.clientName ? ` | ${project.clientName}` : ''}
                    </p>
                  </div>
                  <span className="rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: project.metrics?.allPhasesCompleted ? '#ecfdf5' : '#fff7ed', color: project.metrics?.allPhasesCompleted ? '#15803d' : '#c2410c' }}>
                    {project.metrics?.phaseProgress || 0}%
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <div className="h-full rounded-full" style={{ width: `${project.metrics?.phaseProgress || 0}%`, backgroundColor: 'var(--brand-primary)' }} />
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="inline-flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" />{project.metrics?.completedPhases || 0}/{project.metrics?.totalPhases || 0} phases</span>
                  <span className="inline-flex items-center gap-1"><ListTodo className="h-3.5 w-3.5" />{project.metrics?.myTasks || 0} of your tasks</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedProject ? (
          <div className="space-y-4">
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: selectedProject.metrics?.allPhasesCompleted ? '#ecfdf5' : '#fff7ed', color: selectedProject.metrics?.allPhasesCompleted ? '#15803d' : '#c2410c' }}>
                      {selectedProject.metrics?.allPhasesCompleted ? 'All phases complete' : 'Phase-controlled delivery'}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-black" style={{ color: 'var(--text-primary)' }}>{selectedProject.name}</h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{selectedProject.description || 'No description added yet.'}</p>
                </div>
                <div className="rounded-xl px-4 py-3 text-right" style={{ backgroundColor: 'var(--brand-light)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Revenue Target</p>
                  <p className="mt-2 text-lg font-black" style={{ color: 'var(--brand-primary)' }}>
                    {formatCurrency(selectedProject.revenueTarget, selectedProject.currency)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Client</p>
                  <p className="mt-2 font-black" style={{ color: 'var(--text-primary)' }}>{selectedProject.clientName || 'Not set'}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Asset / Site</p>
                  <p className="mt-2 font-black" style={{ color: 'var(--text-primary)' }}>{selectedProject.assetName || 'Not set'}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>Location</p>
                  <p className="mt-2 font-black" style={{ color: 'var(--text-primary)' }}>{selectedProject.location || 'Not set'}</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>My Open Tasks</p>
                  <p className="mt-2 font-black" style={{ color: 'var(--text-primary)' }}>{selectedProject.metrics?.myOpenTasks || 0}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black" style={{ color: 'var(--text-primary)' }}>Project Phases</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Each phase controls the closeout of the tasks attached to it.
                  </p>
                </div>
                <span className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
                  {selectedProject.metrics?.completedPhases || 0}/{selectedProject.metrics?.totalPhases || 0}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {selectedProjectPhases.map((phase, index) => (
                  <div key={phase._id || index} className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="mt-0.5 h-4 w-4 rounded border" style={{ backgroundColor: phase.completed ? 'var(--brand-primary)' : 'transparent', borderColor: phase.completed ? 'var(--brand-primary)' : 'var(--border-color)' }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{phase.title}</p>
                        <span className="rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: phase.completed ? '#ecfdf5' : '#fff7ed', color: phase.completed ? '#15803d' : '#c2410c' }}>
                          {phase.completed ? 'Released' : 'Waiting'}
                        </span>
                      </div>
                      {phase.description ? <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{phase.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black" style={{ color: 'var(--text-primary)' }}>My Linked Tasks by Phase</h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Your work stays grouped under the phase it belongs to, so you can see exactly what is still waiting and what is already released for closeout.
                  </p>
                </div>
                <span className="rounded-lg px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                  {selectedProject.metrics?.myTasks || 0} tasks
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {selectedProjectPhaseGroups.map(({ phase, tasks }) => (
                  <div key={`phase-${phase._id}`} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-black" style={{ color: 'var(--text-primary)' }}>{phase.title}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {phase.completed ? 'Tasks in this phase can now be marked done and submitted.' : 'Tasks in this phase stay open until admin completes this phase.'}
                        </p>
                      </div>
                      <span className="rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: phase.completed ? '#ecfdf5' : '#fff7ed', color: phase.completed ? '#15803d' : '#c2410c' }}>
                        {phase.completed ? 'Released' : 'Waiting'}
                      </span>
                    </div>

                    {!tasks.length ? (
                      <div className="mt-4 rounded-xl border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                        No tasks assigned to you under this phase yet.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {tasks.map((task) => {
                          const completionBlocked = task.revenueProject?.completionRequiresPhaseRelease && !task.revenueProject?.phaseCompletionUnlocked;
                          return (
                            <div key={task._id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)' }}>
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <p className="font-black" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
                                  <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : 'No due date'}
                                    {task.assignedBy ? ` · Assigned by ${memberLabel(task.assignedBy)}` : ''}
                                  </p>
                                  {task.description ? <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>{task.description}</p> : null}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
                                    {task.priority || 'Medium'}
                                  </span>
                                  <span className="rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: completionBlocked ? '#fff7ed' : task.completed ? '#ecfdf5' : '#f3f4f6', color: completionBlocked ? '#c2410c' : task.completed ? '#15803d' : '#4b5563' }}>
                                    {task.completed ? 'Completed' : completionBlocked ? 'Waiting for this phase' : 'Open for completion'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border py-20 text-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <CircleDollarSign className="mx-auto mb-4 h-10 w-10" style={{ color: 'var(--text-muted)' }} />
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Select a revenue project</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Open a project from the left to see phases and linked work.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueProjects;
