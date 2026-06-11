import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Calendar, ChevronLeft, Edit2, FolderKanban, ListTodo, Plus, Search, Trash2, Users, X } from 'lucide-react';
import api from '../utils/api.js';
import { AvatarStack, EmptyState, FilterChip, LoadingScreen, Modal, PageHeader, Panel, ProgressBar, SearchInput } from '../components/ui.jsx';

const statusMap = {
  planning: { label: 'Planning', color: '#2563eb', bg: '#eff6ff' },
  active: { label: 'Active', color: '#059669', bg: '#ecfdf5' },
  'on-hold': { label: 'On Hold', color: '#d97706', bg: '#fffbeb' },
  completed: { label: 'Completed', color: '#7c3aed', bg: '#f5f3ff' },
  archived: { label: 'Archived', color: '#6b7494', bg: '#f7f8fb' },
};

const priMap = {
  High: { c: '#dc2626', bg: '#fef2f2' },
  Medium: { c: '#d97706', bg: '#fffbeb' },
  Low: { c: '#6b7494', bg: '#f7f8fb' },
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [viewProject, setViewProject] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([
        api.get('/projects', { params: { search, ...(statusFilter && { status: statusFilter }) } }),
        api.get('/team/available-users'),
      ]);
      setProjects(p.data.projects || []);
      setUsers(u.data.users || []);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveProject = async (form) => {
    try {
      if (editProject) {
        await api.put(`/projects/${editProject._id}`, form);
        toast.success('Updated');
      } else {
        await api.post('/projects', form);
        toast.success('Project created');
      }
      setShowForm(false);
      setEditProject(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const deleteProject = async (id) => {
    if (!confirm('Delete this project and all associated data?')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Deleted');
      fetchAll();
      if (viewProject?._id === id) setViewProject(null);
    } catch {
      toast.error('Failed');
    }
  };

  if (viewProject) {
    return <ProjectDashboard project={viewProject} users={users} onBack={() => { setViewProject(null); fetchAll(); }} />;
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Projects"
        actions={
          <button className="btn-primary rounded-full" onClick={() => { setEditProject(null); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> New Project
          </button>
        }
      />

      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            icon={Search}
          />
          <div className="flex flex-wrap gap-2">
            {['', 'planning', 'active', 'on-hold', 'completed'].map((item) => (
              <FilterChip
                key={item || 'all'}
                active={statusFilter === item}
                onClick={() => setStatusFilter(item)}
              >
                {item ? statusMap[item]?.label : 'All'}
              </FilterChip>
            ))}
          </div>
        </div>
      </Panel>

      {loading ? (
        <LoadingScreen height="18rem" />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create your first project to begin structuring workstreams."
          action={
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Create Project
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const st = statusMap[project.status] || statusMap.planning;
            const tasksCount = project.tasks?.length || 0;
            const completedCount = project.tasks?.filter((task) => task.completed).length || 0;
            const pct = tasksCount ? Math.round((completedCount / tasksCount) * 100) : 0;

            return (
              <div
                key={project._id}
                className="card card-hover p-5 text-left cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => setViewProject(project)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setViewProject(project);
                  }
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="badge" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                      {project.priority && (
                        <span
                          className="badge"
                          style={{
                            background: priMap[project.priority]?.bg,
                            color: priMap[project.priority]?.c,
                          }}
                        >
                          {project.priority}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold" style={{ color: 'var(--c-text-0)' }}>
                      {project.name}
                    </h3>
                  </div>

                  {/* Inner action buttons - now safe */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProject(project);
                        setShowForm(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>
                  {project.description || 'No description yet.'}
                </p>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--c-text-3)' }}>Progress</span>
                    <span className="font-bold" style={{ color: 'var(--c-accent)' }}>
                      {pct}%
                    </span>
                  </div>
                  <ProgressBar value={pct} tone={pct === 100 ? '#059669' : 'var(--c-accent)'} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--c-text-3)' }}>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {project.members?.length || 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ListTodo className="h-3.5 w-3.5" />
                    {tasksCount}
                  </span>
                  {project.endDate && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(project.endDate), 'MMM d')}
                    </span>
                  )}
                </div>

                {project.members?.length ? (
                  <div className="mt-4">
                    <AvatarStack items={project.members} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

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

// ===================================================================
//  REMAINING COMPONENTS (unchanged)
// ===================================================================

const ProjectDashboard = ({ project: initialProject, users, onBack }) => {
  const [project, setProject] = useState(initialProject);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${project._id}`);
      setProject(data.project);
      setTasks(data.project.tasks || []);
    } catch {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, []);

  const createTaskForProject = async (taskForm) => {
    try {
      const { data: taskData } = await api.post('/tasks', taskForm);
      const currentTaskIds = tasks.map((task) => task._id);
      currentTaskIds.push(taskData.task._id);
      await api.put(`/projects/${project._id}`, { tasks: currentTaskIds });
      toast.success('Task created and added to project');
      fetchProject();
      setShowAddTask(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  };

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalTasks = tasks.length;
  const pct = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;
  const overdue = tasks.filter((task) => !task.completed && task.dueDate && new Date(task.dueDate) < new Date()).length;
  const st = statusMap[project.status] || statusMap.planning;

  return (
    <div className="page-shell">
      <button className="btn-ghost w-fit" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" /> Projects
      </button>
      <PageHeader
        eyebrow="Project Detail"
        title={project.name}
        description={project.description || 'No description provided.'}
        actions={<button className="btn-primary rounded-full" onClick={() => setShowAddTask(true)}><Plus className="h-4 w-4" /> Add Task</button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total tasks', value: totalTasks, tone: 'var(--c-accent)' },
          { label: 'Completed', value: completedCount, tone: '#059669' },
          { label: 'Overdue', value: overdue, tone: '#dc2626' },
          { label: 'Members', value: project.members?.length || 0, tone: '#3B82F6' },
        ].map((item) => (
          <div key={item.label} className="card p-5">
            <p className="section-title mb-3">{item.label}</p>
            <p className="stat-value text-4xl" style={{ color: item.tone }}>{item.value}</p>
          </div>
        ))}
      </div>
      <Panel title="Project status" subtitle={st.label}>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span style={{ color: 'var(--c-text-3)' }}>Completion</span>
          <span className="font-bold" style={{ color: 'var(--c-accent)' }}>{pct}%</span>
        </div>
        <ProgressBar value={pct} tone={pct === 100 ? '#059669' : 'var(--c-accent)'} />
      </Panel>
      <Panel title="Project tasks" subtitle={`${completedCount} of ${totalTasks} complete`}>
        {loading ? (
          <LoadingScreen height="12rem" />
        ) : !tasks.length ? (
          <EmptyState
            icon={ListTodo}
            title="No tasks yet"
            description="Add tasks to start tracking project delivery."
            action={<button className="btn-primary" onClick={() => setShowAddTask(true)}><Plus className="h-4 w-4" /> Add Task</button>}
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => {
              const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
              const pri = priMap[task.priority] || priMap.Low;
              const progress = task.checklist?.length
                ? Math.round((task.checklist.filter((item) => item.completed).length / task.checklist.length) * 100)
                : task.completed
                ? 100
                : 0;
              const ownerName = task.owner
                ? typeof task.owner === 'object'
                  ? `${task.owner.firstName || ''} ${task.owner.lastName || ''}`.trim()
                  : 'Assigned'
                : 'Unassigned';

              return (
                <div key={task._id || index} className="card p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="badge" style={{ background: pri.bg, color: pri.c }}>{task.priority}</span>
                        {isOverdue && <span className="badge" style={{ background: '#fef2f2', color: '#dc2626' }}>Overdue</span>}
                      </div>
                      <p className="font-bold" style={{ color: 'var(--c-text-0)' }}>{task.title}</p>
                      <p className="mt-1 text-sm" style={{ color: 'var(--c-text-3)' }}>
                        {ownerName}
                        {task.dueDate ? ` - ${format(new Date(task.dueDate), 'MMM d')}` : ''}
                      </p>
                    </div>
                    <div className="w-full xl:w-64">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--c-text-3)' }}>Progress</span>
                        <span className="font-bold" style={{ color: 'var(--c-accent)' }}>{progress}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      {project.members?.length ? (
        <Panel title="Team members" subtitle={`${project.members.length} assigned`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {project.members.map((member) => (
              <div key={member._id} className="card p-4">
                <p className="font-bold" style={{ color: 'var(--c-text-0)' }}>
                  {member.firstName} {member.lastName}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--c-text-3)' }}>
                  {member.position || member.role}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
      <ProjectTaskModal open={showAddTask} users={project.members || users} onSave={createTaskForProject} onClose={() => setShowAddTask(false)} />
    </div>
  );
};

const ProjectTaskModal = ({ open, users, onSave, onClose }) => {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', ownerId: '', checklist: [] });
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem.trim()) return;
    setForm((prev) => ({ ...prev, checklist: [...prev.checklist, { text: newItem.trim(), completed: false }] }));
    setNewItem('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Task to Project" subtitle="Create a task and immediately attach it to this project.">
      <div className="space-y-4">
        <div>
          <label className="label">Assign To</label>
          <select className="input-base" value={form.ownerId} onChange={(e) => setForm((prev) => ({ ...prev, ownerId: e.target.value }))}>
            <option value="">Select team member...</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Task Title</label>
          <input className="input-base" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base min-h-28" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Priority</label>
            <select className="input-base" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
              {['Low', 'Medium', 'High'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input-base" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Checklist ({form.checklist.length})</label>
          <div className="space-y-2">
            {form.checklist.map((item, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--c-border)' }}>
                <span className="flex-1 text-sm">{item.text}</span>
                <button
                  className="btn-danger"
                  onClick={() => setForm((prev) => ({ ...prev, checklist: prev.checklist.filter((_, entryIndex) => entryIndex !== index) }))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className="input-base"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Add checklist item..."
              />
              <button className="btn-secondary" onClick={addItem}>
                Add
              </button>
            </div>
          </div>
        </div>
        <button
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
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', priority: 'Medium', startDate: '', endDate: '', members: [] });

  useEffect(() => {
    setForm({
      name: project?.name || '',
      description: project?.description || '',
      status: project?.status || 'planning',
      priority: project?.priority || 'Medium',
      startDate: project?.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      members: project?.members?.map((member) => member._id || member) || [],
    });
  }, [project, open]);

  const toggleMember = (id) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.includes(id) ? prev.members.filter((member) => member !== id) : [...prev.members, id],
    }));
  };

  return (
    <Modal open={open} onClose={onClose} title={project ? 'Edit Project' : 'New Project'} subtitle="Project create and edit actions stay tied to the current API." width="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="label">Project Name</label>
          <input className="input-base" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base min-h-28" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Status</label>
            <select className="input-base" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              {Object.entries(statusMap).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input-base" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
              {['Low', 'Medium', 'High'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input-base" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input-base" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Members ({form.members.length} selected)</label>
          <div className="max-h-56 overflow-y-auto space-y-2">
            {users.map((user) => (
              <label
                key={user._id}
                className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm"
                style={{ borderColor: 'var(--c-border)' }}
              >
                <input type="checkbox" checked={form.members.includes(user._id)} onChange={() => toggleMember(user._id)} />
                <span className="flex-1">
                  {user.firstName} {user.lastName}
                </span>
                <span style={{ color: 'var(--c-text-3)' }}>{user.position || user.role}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          className="btn-primary w-full"
          onClick={() => {
            if (!form.name.trim()) return toast.error('Name required');
            onSave(form);
          }}
        >
          {project ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </Modal>
  );
};

export default Projects;
