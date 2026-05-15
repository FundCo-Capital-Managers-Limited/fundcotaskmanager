import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  CircleDollarSign,
  FolderKanban,
  Layers3,
  ListTodo,
  Plus,
  Save,
  Search,
  Users,
  X,
} from 'lucide-react';
import api from '../utils/api.js';
import {
  EmptyState,
  FilterChip,
  MiniStat,
  Modal,
  PageHeader,
  Panel,
  ProgressBar,
  SearchInput,
  StatusPill,
} from '../components/ui.jsx';

const STATUS_OPTIONS = ['planning', 'active', 'blocked', 'completed', 'archived'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const blankPhase = () => ({ title: '', description: '' });
const blankChecklistItem = () => ({ text: '', completed: false });
const blankProjectForm = {
  name: '',
  code: '',
  description: '',
  status: 'planning',
  clientName: '',
  assetName: '',
  location: '',
  revenueOutcome: '',
  revenueTarget: '',
  currency: 'NGN',
  expectedStartDate: '',
  expectedEndDate: '',
  memberIds: [],
  phases: [blankPhase()],
  notes: '',
};
const blankTaskForm = {
  ownerId: '',
  phaseId: '',
  title: '',
  description: '',
  priority: 'Medium',
  dueDate: '',
  checklist: [blankChecklistItem()],
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
const sortByDisplayName = (items = []) => (
  [...items].sort((left, right) => memberLabel(left).localeCompare(memberLabel(right)))
);
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectSaving, setProjectSaving] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState(blankProjectForm);
  const [taskForm, setTaskForm] = useState(blankTaskForm);
  const [projectFormError, setProjectFormError] = useState('');
  const [taskFormError, setTaskFormError] = useState('');
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const memberPickerRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsResponse, usersResponse] = await Promise.all([
        api.get('/revenue-projects'),
        api.get('/revenue-projects/members'),
      ]);

      const nextProjects = projectsResponse.data?.projects || [];
      setProjects(nextProjects);
      setUsers(usersResponse.data?.users || []);
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
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!memberPickerOpen) return undefined;
    const handleClickOutside = (event) => {
      if (!memberPickerRef.current?.contains(event.target)) {
        setMemberPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [memberPickerOpen]);

  const sortedUsers = useMemo(() => sortByDisplayName(users), [users]);

  const filteredProjects = useMemo(() => (
    projects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) return false;
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
  ), [projects, search, statusFilter]);

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

  const selectedProjectMembers = useMemo(
    () => sortByDisplayName(selectedProject?.members || []),
    [selectedProject]
  );

  const selectedProjectPhases = useMemo(
    () => sortPhases(selectedProject?.phases || []),
    [selectedProject]
  );

  const selectedProjectPhaseGroups = useMemo(() => {
    if (!selectedProject) return [];
    const tasks = selectedProject.tasks || [];
    const grouped = selectedProjectPhases.map((phase) => ({
      phase,
      tasks: tasks.filter((task) => String(task?.revenueProject?.phaseId || '') === String(phase?._id || '')),
    }));
    const unassignedTasks = tasks.filter((task) => !grouped.some((group) => group.tasks.some((entry) => entry._id === task._id)));
    if (unassignedTasks.length) {
      grouped.push({
        phase: { _id: 'unassigned', title: 'Unassigned phase', description: 'Legacy linked tasks without a phase assignment.', completed: false },
        tasks: unassignedTasks,
      });
    }
    return grouped;
  }, [selectedProject, selectedProjectPhases]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => project.status === 'active').length,
    ready: projects.filter((project) => project.metrics?.releasedTasks > 0).length,
    linkedTasks: projects.reduce((sum, project) => sum + (project.metrics?.totalTasks || 0), 0),
  }), [projects]);

  const selectedMembers = useMemo(
    () => sortByDisplayName(sortedUsers.filter((user) => projectForm.memberIds.includes(user._id))),
    [projectForm.memberIds, sortedUsers]
  );

  const visibleMemberOptions = useMemo(() => {
    const needle = memberSearch.trim().toLowerCase();
    if (!needle) return sortedUsers;
    return sortedUsers.filter((user) => (
      memberLabel(user).toLowerCase().includes(needle)
      || String(user.position || '').toLowerCase().includes(needle)
      || String(user.role || '').toLowerCase().includes(needle)
      || String(user.email || '').toLowerCase().includes(needle)
    ));
  }, [memberSearch, sortedUsers]);

  const taskPhaseOptions = useMemo(
    () => selectedProjectPhases.filter((phase) => phase?._id),
    [selectedProjectPhases]
  );

  const openCreateProject = () => {
    setEditingProject(null);
    setProjectForm(blankProjectForm);
    setProjectFormError('');
    setMemberSearch('');
    setMemberPickerOpen(false);
    setProjectModalOpen(true);
  };

  const openEditProject = () => {
    if (!selectedProject) return;
    setEditingProject(selectedProject);
    setProjectForm({
      name: selectedProject.name || '',
      code: selectedProject.code || '',
      description: selectedProject.description || '',
      status: selectedProject.status || 'planning',
      clientName: selectedProject.clientName || '',
      assetName: selectedProject.assetName || '',
      location: selectedProject.location || '',
      revenueOutcome: selectedProject.revenueOutcome || '',
      revenueTarget: selectedProject.revenueTarget || '',
      currency: selectedProject.currency || 'NGN',
      expectedStartDate: selectedProject.expectedStartDate ? new Date(selectedProject.expectedStartDate).toISOString().split('T')[0] : '',
      expectedEndDate: selectedProject.expectedEndDate ? new Date(selectedProject.expectedEndDate).toISOString().split('T')[0] : '',
      memberIds: (selectedProject.members || []).map((member) => member?._id).filter(Boolean),
      phases: sortPhases(selectedProject.phases || []).map((phase) => ({
        _id: phase._id,
        title: phase.title || '',
        description: phase.description || '',
        completed: Boolean(phase.completed),
      })),
      notes: selectedProject.notes || '',
    });
    setProjectFormError('');
    setMemberSearch('');
    setMemberPickerOpen(false);
    setProjectModalOpen(true);
  };

  const toggleMember = (memberId) => {
    setProjectForm((current) => ({
      ...current,
      memberIds: current.memberIds.includes(memberId)
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId],
    }));
  };

  const setPhaseField = (index, field, value) => {
    setProjectForm((current) => ({
      ...current,
      phases: current.phases.map((phase, phaseIndex) => (
        phaseIndex === index ? { ...phase, [field]: value } : phase
      )),
    }));
  };

  const validateProjectForm = () => {
    if (!projectForm.name.trim()) return 'Project name is required';
    if (!projectForm.memberIds.length) return 'Select at least one project member';

    const phases = projectForm.phases
      .map((phase) => ({
        ...phase,
        title: String(phase.title || '').trim(),
        description: String(phase.description || '').trim(),
      }))
      .filter((phase) => phase.title);

    if (!phases.length) return 'Add at least one project phase';

    const titles = phases.map((phase) => phase.title.toLowerCase());
    if (new Set(titles).size !== titles.length) return 'Phase titles must be unique';

    if (
      projectForm.expectedStartDate
      && projectForm.expectedEndDate
      && new Date(projectForm.expectedEndDate) < new Date(projectForm.expectedStartDate)
    ) {
      return 'Expected end date cannot be earlier than expected start date';
    }

    return '';
  };

  const saveProject = async (event) => {
    event?.preventDefault?.();
    const validationError = validateProjectForm();
    if (validationError) {
      setProjectFormError(validationError);
      toast.error(validationError);
      return;
    }

    setProjectSaving(true);
    setProjectFormError('');

    try {
      const payload = {
        ...projectForm,
        revenueTarget: Number(projectForm.revenueTarget || 0),
        phases: projectForm.phases
          .map((phase, index) => ({
            _id: phase._id,
            title: String(phase.title || '').trim(),
            description: String(phase.description || '').trim(),
            completed: Boolean(phase.completed),
            order: index,
          }))
          .filter((phase) => phase.title),
      };

      let response;
      if (editingProject?._id) {
        response = await api.put(`/revenue-projects/${editingProject._id}`, payload);
        toast.success('Revenue project updated');
      } else {
        response = await api.post('/revenue-projects', payload);
        toast.success('Revenue project created');
      }

      const nextProject = response.data?.project;
      setProjectModalOpen(false);
      setEditingProject(null);
      setProjectForm(blankProjectForm);
      setMemberSearch('');
      setMemberPickerOpen(false);
      await loadData();
      if (nextProject?._id) {
        setSelectedId(nextProject._id);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save revenue project';
      setProjectFormError(message);
      toast.error(message);
    } finally {
      setProjectSaving(false);
    }
  };

  const togglePhase = async (phaseId, completed) => {
    if (!selectedProject?._id || !phaseId) return;
    try {
      const response = await api.post(`/revenue-projects/${selectedProject._id}/phases/${phaseId}/toggle`, { completed });
      const nextProject = response.data?.project;
      if (nextProject) {
        setProjects((current) => current.map((project) => (project._id === nextProject._id ? nextProject : project)));
        setSelectedId(nextProject._id);
      }
      toast.success(completed ? 'Phase marked complete' : 'Phase reopened');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update phase');
    }
  };

  const openTaskModal = () => {
    if (!selectedProject) return;
    if (!selectedProjectMembers.length) {
      toast.error('Add project members before creating linked tasks');
      return;
    }
    if (!taskPhaseOptions.length) {
      toast.error('Add project phases before creating linked tasks');
      return;
    }

    setTaskForm({
      ...blankTaskForm,
      ownerId: selectedProjectMembers[0]?._id || '',
      phaseId: taskPhaseOptions[0]?._id || '',
    });
    setTaskFormError('');
    setTaskModalOpen(true);
  };

  const setTaskChecklist = (index, field, value) => {
    setTaskForm((current) => ({
      ...current,
      checklist: current.checklist.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [field]: value } : item
      )),
    }));
  };

  const validateTaskForm = () => {
    if (!selectedProject?._id) return 'Select a revenue project first';
    if (!taskForm.phaseId) return 'Select the project phase for this task';
    if (!taskForm.ownerId) return 'Select an assignee';
    if (!taskForm.title.trim()) return 'Task title is required';
    const checklist = taskForm.checklist.filter((item) => String(item.text || '').trim());
    if (!checklist.length) return 'Add at least one checklist item';
    return '';
  };

  const saveLinkedTask = async (event) => {
    event?.preventDefault?.();
    const validationError = validateTaskForm();
    if (validationError) {
      setTaskFormError(validationError);
      toast.error(validationError);
      return;
    }

    setTaskSaving(true);
    setTaskFormError('');

    try {
      const response = await api.post(`/revenue-projects/${selectedProject._id}/tasks`, {
        ...taskForm,
        checklist: taskForm.checklist
          .map((item) => ({ text: String(item.text || '').trim(), completed: Boolean(item.completed) }))
          .filter((item) => item.text),
      });

      const nextProject = response.data?.project;
      if (nextProject) {
        setProjects((current) => current.map((project) => (project._id === nextProject._id ? nextProject : project)));
        setSelectedId(nextProject._id);
      }
      setTaskModalOpen(false);
      setTaskForm(blankTaskForm);
      toast.success('Linked task created');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create linked task';
      setTaskFormError(message);
      toast.error(message);
    } finally {
      setTaskSaving(false);
    }
  };

  const selectedTaskPhase = useMemo(
    () => taskPhaseOptions.find((phase) => String(phase._id) === String(taskForm.phaseId || '')) || null,
    [taskForm.phaseId, taskPhaseOptions]
  );

  if (loading) {
    return <div className="py-10 text-sm" style={{ color: 'var(--c-text-muted)' }}>Loading revenue projects...</div>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Revenue Outcome Delivery"
        title="Revenue Projects"
        actions={(
          <>
            <button type="button" className="btn-secondary" onClick={loadData}>Refresh</button>
            <button type="button" className="btn-primary" onClick={openCreateProject}>
              <Plus className="h-4 w-4" />
              New Revenue Project
            </button>
          </>
        )}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Projects" value={stats.total} tone="var(--brand-primary)" helper="Outcome-linked project records" />
        <MiniStat label="Active" value={stats.active} tone="var(--c-success)" helper="Currently in delivery" />
        <MiniStat label="Released Tasks" value={stats.ready} tone="var(--brand-secondary)" helper="Projects with at least one released phase" />
        <MiniStat label="Linked Tasks" value={stats.linkedTasks} tone="var(--c-warning)" helper="Tasks governed by project phases" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px,1fr]">
        <Panel title="Project Directory" subtitle="Search and open revenue-linked projects.">
          <div className="space-y-4">
            <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, assets, client names..." />
            <div className="flex flex-wrap gap-2">
              <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterChip>
              {STATUS_OPTIONS.map((status) => (
                <FilterChip key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
                  {status.replace('-', ' ')}
                </FilterChip>
              ))}
            </div>

            {!filteredProjects.length ? (
              <EmptyState icon={FolderKanban} title="No revenue projects yet" description="Create a project to start phase-governed delivery work." />
            ) : (
              <div className="space-y-3">
                {filteredProjects.map((project) => (
                  <button
                    key={project._id}
                    type="button"
                    onClick={() => setSelectedId(project._id)}
                    className="w-full rounded-[0.9rem] border p-4 text-left transition-colors"
                    style={{
                      borderColor: project._id === selectedId ? 'var(--brand-primary)' : 'var(--c-border)',
                      background: project._id === selectedId ? 'var(--brand-primary-soft)' : 'var(--c-panel)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-black" style={{ color: 'var(--c-text)' }}>{project.name}</p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                          {project.assetName || 'No asset name'}{project.clientName ? ` | ${project.clientName}` : ''}
                        </p>
                      </div>
                      <StatusPill tone={project.metrics?.allPhasesCompleted ? 'success' : 'warning'}>
                        {project.metrics?.phaseProgress || 0}%
                      </StatusPill>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={project.metrics?.phaseProgress || 0} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                      <span className="inline-flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" />{project.metrics?.completedPhases || 0}/{project.metrics?.totalPhases || 0} phases</span>
                      <span className="inline-flex items-center gap-1"><ListTodo className="h-3.5 w-3.5" />{project.metrics?.totalTasks || 0} tasks</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {selectedProject ? (
          <div className="space-y-5">
            <Panel
              title={selectedProject.name}
              subtitle={selectedProject.description || 'No description added yet.'}
              action={(
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={selectedProject.metrics?.allPhasesCompleted ? 'success' : 'warning'}>
                    {selectedProject.metrics?.allPhasesCompleted ? 'All phases complete' : 'In controlled delivery'}
                  </StatusPill>
                  <button type="button" className="btn-secondary" onClick={openEditProject}>Edit Project</button>
                  <button type="button" className="btn-primary" onClick={openTaskModal}>
                    <Plus className="h-4 w-4" />
                    Add Linked Task
                  </button>
                </div>
              )}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="Revenue Target" value={formatCurrency(selectedProject.revenueTarget, selectedProject.currency)} tone="var(--brand-primary)" />
                <MiniStat label="Members" value={selectedProject.metrics?.members || 0} tone="var(--brand-secondary)" />
                <MiniStat label="Phase Progress" value={`${selectedProject.metrics?.phaseProgress || 0}%`} tone="var(--c-success)" />
                <MiniStat label="Linked Tasks" value={selectedProject.metrics?.totalTasks || 0} tone="var(--c-warning)" />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[0.9rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <p className="text-xs font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-muted)' }}>Project Context</p>
                  <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                    <p><span className="font-black" style={{ color: 'var(--c-text)' }}>Client:</span> {selectedProject.clientName || 'Not set'}</p>
                    <p><span className="font-black" style={{ color: 'var(--c-text)' }}>Asset / Site:</span> {selectedProject.assetName || 'Not set'}</p>
                    <p><span className="font-black" style={{ color: 'var(--c-text)' }}>Location:</span> {selectedProject.location || 'Not set'}</p>
                    <p><span className="font-black" style={{ color: 'var(--c-text)' }}>Outcome:</span> {selectedProject.revenueOutcome || 'Not set'}</p>
                  </div>
                </div>
                <div className="rounded-[0.9rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <p className="text-xs font-black uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-muted)' }}>Dates & Controls</p>
                  <div className="mt-3 space-y-2 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                    <p><span className="font-black" style={{ color: 'var(--c-text)' }}>Start:</span> {formatShortDate(selectedProject.expectedStartDate)}</p>
                    <p><span className="font-black" style={{ color: 'var(--c-text)' }}>End:</span> {formatShortDate(selectedProject.expectedEndDate)}</p>
                    <p><span className="font-black" style={{ color: 'var(--c-text)' }}>Priority Lock:</span> {selectedProject.lockedTaskPriority ? 'Enabled' : 'Disabled'}</p>
                    <p><span className="font-black" style={{ color: 'var(--c-text)' }}>Completion Gate:</span> {selectedProject.requirePhaseCompletionBeforeTaskDone ? 'Each phase controls its own task closeout' : 'Task completion is open'}</p>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Project Members" subtitle="These are the people allowed to receive linked tasks on this revenue project.">
              {!selectedProjectMembers.length ? (
                <EmptyState icon={Users} title="No project members yet" description="Edit this project and add the delivery team first." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {selectedProjectMembers.map((member) => (
                    <div key={member._id} className="rounded-[0.9rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                      <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{memberLabel(member)}</p>
                      <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>{member.position || member.role || member.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Delivery Phases" subtitle="Each phase controls when its own linked tasks can be marked done by users.">
              <div className="space-y-3">
                {selectedProjectPhases.map((phase) => {
                  const phaseTasks = (selectedProject.tasks || []).filter((task) => String(task?.revenueProject?.phaseId || '') === String(phase?._id || ''));
                  return (
                  <div key={phase._id} className="rounded-[0.9rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={Boolean(phase.completed)}
                          onChange={(event) => togglePhase(phase._id, event.target.checked)}
                          className="mt-1 h-4 w-4"
                          style={{ accentColor: 'var(--brand-primary)' }}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{phase.title}</p>
                            <StatusPill tone={phase.completed ? 'success' : 'warning'}>
                              {phase.completed ? 'Task release open' : 'Task release locked'}
                            </StatusPill>
                          </div>
                          {phase.description ? (
                            <p className="mt-1 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>{phase.description}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill tone="brand">{phaseTasks.length} linked task{phaseTasks.length === 1 ? '' : 's'}</StatusPill>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </Panel>

            <Panel title="Tasks by Phase" subtitle="Each linked task belongs to one phase. Users can only close the task after that phase is completed by admin.">
              {!selectedProject.tasks?.length ? (
                <EmptyState
                  icon={ListTodo}
                  title="No linked tasks yet"
                  description="Create the first governed task under this project."
                  action={<button type="button" className="btn-primary" onClick={openTaskModal}><Plus className="h-4 w-4" />Add Linked Task</button>}
                />
              ) : (
                <div className="space-y-4">
                  {selectedProjectPhaseGroups.map(({ phase, tasks }) => (
                    <div key={`phase-group-${phase._id}`} className="rounded-[0.9rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{phase.title}</p>
                          <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                            {phase.completed ? 'Users can now mark tasks in this phase as done and submit them.' : 'Tasks in this phase stay open until admin marks this phase complete.'}
                          </p>
                        </div>
                        <StatusPill tone={phase.completed ? 'success' : 'warning'}>
                          {phase.completed ? 'Released' : 'Waiting'}
                        </StatusPill>
                      </div>

                      {!tasks.length ? (
                        <div className="mt-4 rounded-[0.9rem] border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}>
                          No linked tasks under this phase yet.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {tasks.map((task) => (
                            <div key={task._id} className="rounded-[0.9rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>{task.title}</p>
                                  <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                                    {memberLabel(task.owner)}
                                    {task.dueDate ? ` · Due ${formatShortDate(task.dueDate)}` : ''}
                                  </p>
                                  {task.description ? (
                                    <p className="mt-2 text-sm leading-6" style={{ color: 'var(--c-text-soft)' }}>{task.description}</p>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <StatusPill tone="brand">{task.priority || 'Medium'}</StatusPill>
                                  <StatusPill tone={task.completed ? 'success' : task.revenueProject?.phaseCompletionUnlocked ? 'brand' : 'warning'}>
                                    {task.completed ? 'Completed' : task.revenueProject?.phaseCompletionUnlocked ? 'Open for completion' : 'Waiting for this phase'}
                                  </StatusPill>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        ) : (
          <EmptyState icon={CircleDollarSign} title="Select a revenue project" description="Choose a project from the left to manage phases and linked tasks." />
        )}
      </div>

      <Modal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        title={editingProject ? 'Edit Revenue Project' : 'New Revenue Project'}
        subtitle="Create a governed project where each phase controls the closeout of its own linked tasks."
        width="max-w-4xl"
      >
        <form onSubmit={saveProject} className="space-y-5">
          {projectFormError ? (
            <div className="rounded-[0.9rem] border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>
              {projectFormError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Project Name</span>
              <input className="input-base" value={projectForm.name} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Reference Code</span>
              <input className="input-base" value={projectForm.code} onChange={(event) => setProjectForm((current) => ({ ...current, code: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold md:col-span-2" style={{ color: 'var(--c-text-soft)' }}>
              <span>Description</span>
              <textarea className="input-base min-h-[110px]" value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Status</span>
              <select className="input-base" value={projectForm.status} onChange={(event) => setProjectForm((current) => ({ ...current, status: event.target.value }))}>
                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replace('-', ' ')}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Client</span>
              <input className="input-base" value={projectForm.clientName} onChange={(event) => setProjectForm((current) => ({ ...current, clientName: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Asset / Site</span>
              <input className="input-base" value={projectForm.assetName} onChange={(event) => setProjectForm((current) => ({ ...current, assetName: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Location</span>
              <input className="input-base" value={projectForm.location} onChange={(event) => setProjectForm((current) => ({ ...current, location: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold md:col-span-2" style={{ color: 'var(--c-text-soft)' }}>
              <span>Revenue Outcome</span>
              <input className="input-base" value={projectForm.revenueOutcome} onChange={(event) => setProjectForm((current) => ({ ...current, revenueOutcome: event.target.value }))} placeholder="What revenue result should this project produce?" />
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Revenue Target</span>
              <input className="input-base" type="number" min="0" value={projectForm.revenueTarget} onChange={(event) => setProjectForm((current) => ({ ...current, revenueTarget: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Currency</span>
              <input className="input-base" value={projectForm.currency} onChange={(event) => setProjectForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Expected Start</span>
              <input className="input-base" type="date" value={projectForm.expectedStartDate} onChange={(event) => setProjectForm((current) => ({ ...current, expectedStartDate: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Expected End</span>
              <input className="input-base" type="date" value={projectForm.expectedEndDate} onChange={(event) => setProjectForm((current) => ({ ...current, expectedEndDate: event.target.value }))} />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Delivery Phases</p>
              <button type="button" className="btn-secondary" onClick={() => setProjectForm((current) => ({ ...current, phases: [...current.phases, blankPhase()] }))}>
                <Plus className="h-4 w-4" />
                Add Phase
              </button>
            </div>
            <div className="space-y-3">
              {projectForm.phases.map((phase, index) => (
                <div key={phase._id || `phase-${index}`} className="rounded-[0.9rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                  <div className="grid gap-3 md:grid-cols-[1fr,1fr,auto]">
                    <input className="input-base" value={phase.title} onChange={(event) => setPhaseField(index, 'title', event.target.value)} placeholder={`Phase ${index + 1} title`} />
                    <input className="input-base" value={phase.description} onChange={(event) => setPhaseField(index, 'description', event.target.value)} placeholder="What should be completed in this phase?" />
                    <button type="button" className="btn-ghost h-[48px]" onClick={() => setProjectForm((current) => ({ ...current, phases: current.phases.filter((_, phaseIndex) => phaseIndex !== index) }))} disabled={projectForm.phases.length === 1}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Project Members</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                  Only selected members can receive linked tasks on this project.
                </p>
              </div>
              <StatusPill tone="brand">{projectForm.memberIds.length} selected</StatusPill>
            </div>

            <div ref={memberPickerRef} className="relative">
              <button
                type="button"
                onClick={() => setMemberPickerOpen((current) => !current)}
                className="input-base flex w-full items-center justify-between gap-3 text-left"
              >
                <span style={{ color: projectForm.memberIds.length ? 'var(--c-text)' : 'var(--c-text-muted)' }}>
                  {projectForm.memberIds.length ? `${projectForm.memberIds.length} project member(s) selected` : 'Select project members'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${memberPickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {memberPickerOpen ? (
                <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-[1rem] border shadow-xl" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                  <div className="border-b p-3" style={{ borderColor: 'var(--c-border)' }}>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                      <input
                        className="input-base w-full pl-9"
                        value={memberSearch}
                        onChange={(event) => setMemberSearch(event.target.value)}
                        placeholder="Search users by name, role, email..."
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto p-2">
                    {!visibleMemberOptions.length ? (
                      <div className="px-3 py-4 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                        No matching users found.
                      </div>
                    ) : (
                      visibleMemberOptions.map((user) => {
                        const active = projectForm.memberIds.includes(user._id);
                        return (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => toggleMember(user._id)}
                            className="flex w-full items-start gap-3 rounded-[0.9rem] px-3 py-3 text-left transition-colors"
                            style={{ background: active ? 'var(--brand-primary-soft)' : 'transparent' }}
                          >
                            <span
                              className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border"
                              style={{
                                borderColor: active ? 'var(--brand-primary)' : 'var(--c-border)',
                                background: active ? 'var(--brand-primary)' : 'transparent',
                                color: '#fff',
                              }}
                            >
                              {active ? <Check className="h-3.5 w-3.5" /> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-black" style={{ color: 'var(--c-text)' }}>{memberLabel(user)}</span>
                              <span className="mt-1 block text-xs" style={{ color: 'var(--c-text-muted)' }}>
                                {user.position || user.role || user.email}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {selectedMembers.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <span key={member._id} className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
                    <span style={{ color: 'var(--c-text)' }}>{memberLabel(member)}</span>
                    <button type="button" onClick={() => toggleMember(member._id)} className="rounded-full" style={{ color: 'var(--c-text-muted)' }}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
            <span>Notes</span>
            <textarea className="input-base min-h-[100px]" value={projectForm.notes} onChange={(event) => setProjectForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setProjectModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={projectSaving}>
              <Save className="h-4 w-4" />
              {projectSaving ? 'Saving...' : editingProject ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Add Linked Task"
        subtitle="Attach this task to a specific phase. Users can work the checklist immediately, but final completion opens only when that phase is completed by admin."
        width="max-w-2xl"
      >
        <form onSubmit={saveLinkedTask} className="space-y-4">
          {taskFormError ? (
            <div className="rounded-[0.9rem] border px-4 py-3 text-sm" style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>
              {taskFormError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Project Phase</span>
              <select className="input-base" value={taskForm.phaseId} onChange={(event) => setTaskForm((current) => ({ ...current, phaseId: event.target.value }))}>
                <option value="">Select project phase...</option>
                {taskPhaseOptions.map((phase) => (
                  <option key={phase._id} value={phase._id}>
                    {phase.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Assignee</span>
              <select className="input-base" value={taskForm.ownerId} onChange={(event) => setTaskForm((current) => ({ ...current, ownerId: event.target.value }))}>
                <option value="">Select project member...</option>
                {selectedProjectMembers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {memberLabel(user)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Priority</span>
              <select className="input-base" value={taskForm.priority} onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))}>
                {PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold" style={{ color: 'var(--c-text-soft)' }}>
              <span>Due Date</span>
              <input className="input-base" type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold md:col-span-2" style={{ color: 'var(--c-text-soft)' }}>
              <span>Task Title</span>
              <input className="input-base" value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-semibold md:col-span-2" style={{ color: 'var(--c-text-soft)' }}>
              <span>Description</span>
              <textarea className="input-base min-h-[100px]" value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Task Checklist</p>
              <button type="button" className="btn-secondary" onClick={() => setTaskForm((current) => ({ ...current, checklist: [...current.checklist, blankChecklistItem()] }))}>
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>
            {taskForm.checklist.map((item, index) => (
              <div key={`checklist-${index}`} className="flex gap-2">
                <input className="input-base" value={item.text} onChange={(event) => setTaskChecklist(index, 'text', event.target.value)} placeholder={`Checklist item ${index + 1}`} />
                <button type="button" className="btn-ghost h-[48px]" onClick={() => setTaskForm((current) => ({ ...current, checklist: current.checklist.filter((_, itemIndex) => itemIndex !== index) }))} disabled={taskForm.checklist.length === 1}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-[0.9rem] border px-4 py-3 text-sm leading-6" style={{ borderColor: 'var(--c-border)', background: 'var(--brand-primary-soft)', color: 'var(--c-text-soft)' }}>
            {selectedTaskPhase
              ? `Users can complete checklist work immediately, but they will only be able to mark this task done after the "${selectedTaskPhase.title}" phase is completed by admin.`
              : 'Users can complete checklist work immediately, but final task completion will wait on the selected project phase.'}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setTaskModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={taskSaving}>
              <Save className="h-4 w-4" />
              {taskSaving ? 'Saving...' : 'Create Linked Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RevenueProjects;
