import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CalendarRange, Edit2, Plus, Search, Send, Target, Trash2, Users, X } from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
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

const Goals = () => {
  const { hasRole } = useAuth();
  const [goals, setGoals] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('board');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [formGoal, setFormGoal] = useState(null);
  const [viewGoal, setViewGoal] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [g, s, u] = await Promise.all([
        api.get('/goals', { params: { search } }),
        api.get('/goals/stats'),
        api.get('/team/available-users'),
      ]);
      setGoals(g.data.goals || []);
      setStats(s.data.stats || {});
      setUsers(u.data.users || []);
    } catch {
      toast.error('Failed');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const progressFor = (goal) => {
    if (!goal.subGoals?.length) return 0;
    return Math.round(
      (goal.subGoals.filter((item) => item.completed).length / goal.subGoals.length) * 100
    );
  };

  const filteredGoals = goals.filter((goal) => !timeframeFilter || goal.timeframe === timeframeFilter);

  const handleSave = async (data, isEdit, goalId) => {
    try {
      if (isEdit && goalId) {
        await api.put(`/goals/${goalId}`, data);
        toast.success('Goal updated');
      } else {
        await api.post('/goals', data);
        toast.success('Goal created');
      }
      fetchAll();
      setFormGoal(null);
      setViewGoal(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      toast.success('Deleted');
      fetchAll();
      setViewGoal(null);
    } catch {
      toast.error('Failed');
    }
  };

  const addComment = async (id, content) => {
    try {
      await api.post(`/goals/${id}/comment`, { content });
      toast.success('Comment added');
      fetchAll();
      setViewGoal(null);
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Goals"
        actions={
          hasRole('team-lead', 'executive', 'admin') ? (
            <button className="btn-primary rounded-full" onClick={() => setFormGoal({})}>
              <Plus className="h-4 w-4" />
              New Goal
            </button>
          ) : null
        }
        aside={
          <SegmentedTabs
            items={[
              { label: 'Grid', value: 'board' },
              { label: 'List', value: 'list' },
            ]}
            value={view}
            onChange={setView}
          />
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total', value: stats.total || 0, tone: 'var(--brand-primary)' },
          { label: 'Active', value: stats.active || 0, tone: 'var(--brand-secondary)' },
          { label: 'Completed', value: stats.completed || 0, tone: 'var(--c-success)' },
          { label: 'Avg Progress', value: `${stats.avgProgress || 0}%`, tone: 'var(--c-warning)' },
        ].map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} icon={Target} tone={item.tone} />
        ))}
      </div>

      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search goals" icon={Search} />
          <div className="flex flex-wrap gap-2">
            {['', 'daily', 'weekly', 'monthly', 'quarterly'].map((item) => (
              <FilterChip key={item || 'all'} active={timeframeFilter === item} onClick={() => setTimeframeFilter(item)}>
                {item || 'All'}
              </FilterChip>
            ))}
          </div>
        </div>
      </Panel>

      {loading ? (
        <LoadingScreen height="18rem" />
      ) : filteredGoals.length === 0 ? (
        <EmptyState icon={Target} title="No goals found" description="Create a goal or change the filters." />
      ) : (
        <div className={view === 'board' ? 'grid gap-4 md:grid-cols-2 2xl:grid-cols-3' : 'space-y-3'}>
          {filteredGoals.map((goal) => {
            const progress = progressFor(goal);
            const owner = goal.owner ? `${goal.owner.firstName} ${goal.owner.lastName}` : 'Unassigned';

            return (
              <div
                key={goal._id}
                className={`surface-card surface-card-hover text-left cursor-pointer ${
                  view === 'board' ? 'rounded-[1.6rem] p-5' : 'w-full rounded-[1.4rem] p-4'
                }`}
                role="button"
                tabIndex={0}
                onClick={() => setViewGoal(goal)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setViewGoal(goal);
                  }
                }}
              >
                <div
                  className={`flex items-start justify-between gap-3 ${
                    view === 'board' ? 'mb-3' : 'mb-4 flex-col md:flex-row md:items-center'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge capitalize" style={{ background: 'var(--c-primary-soft)', color: 'var(--brand-primary)' }}>
                        {goal.timeframe}
                      </span>
                      <span className="badge capitalize" style={{ background: 'var(--c-surface-3)', color: 'var(--c-text-soft)' }}>
                        {goal.type}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-black" style={{ color: 'var(--c-text)' }}>
                      {goal.title}
                    </h3>
                  </div>

                  {/* Inner Edit button - now allowed */}
                  {hasRole('team-lead', 'executive', 'admin') && (
                    <button
                      type="button"
                      className="btn-secondary h-10 w-10 rounded-2xl p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormGoal(goal);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className={`grid gap-3 ${view === 'board' ? '' : 'md:grid-cols-[1fr_auto]'}`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {owner}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarRange className="h-4 w-4" />
                        {goal.startDate ? format(new Date(goal.startDate), 'MMM d') : 'No start'}
                        {goal.endDate ? ` - ${format(new Date(goal.endDate), 'MMM d')}` : ''}
                      </span>
                    </div>

                    <div className="mb-2 mt-4 flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--c-text-soft)' }}>Progress</span>
                      <span
                        className="font-black"
                        style={{ color: progress === 100 ? 'var(--c-success)' : 'var(--brand-primary)' }}
                      >
                        {progress}%
                      </span>
                    </div>
                    <ProgressBar value={progress} tone={progress === 100 ? 'var(--c-success)' : 'var(--brand-primary)'} />
                  </div>

                  {view === 'list' ? (
                    <div
                      className="rounded-[1.2rem] border px-4 py-3 text-sm"
                      style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)', color: 'var(--c-text-soft)' }}
                    >
                      {goal.subGoals?.filter((item) => item.completed).length || 0}/{goal.subGoals?.length || 0} items done
                    </div>
                  ) : null}
                </div>

                {view === 'board' ? (
                  <p className="mt-3 text-sm" style={{ color: 'var(--c-text-soft)' }}>
                    {goal.subGoals?.filter((item) => item.completed).length || 0}/{goal.subGoals?.length || 0} items done
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <GoalFormModal
        open={formGoal !== null}
        goal={formGoal?._id ? formGoal : null}
        users={users}
        onClose={() => setFormGoal(null)}
        onSave={handleSave}
      />
      <GoalDetailModal
        open={!!viewGoal}
        goal={viewGoal}
        canEdit={hasRole('team-lead', 'executive', 'admin')}
        onClose={() => setViewGoal(null)}
        onComment={addComment}
        onEdit={(goal) => {
          setViewGoal(null);
          setFormGoal(goal);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
};

/* ====================== GOAL FORM MODAL ====================== */
const GoalFormModal = ({ open, goal, users, onClose, onSave }) => {
  const isEdit = !!goal;
  const [form, setForm] = useState({
    title: '',
    ownerId: '',
    timeframe: 'weekly',
    type: 'personal',
    startDate: '',
    endDate: '',
    subGoals: [],
  });
  const [subGoal, setSubGoal] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: goal?.title || '',
      ownerId: goal?.owner?._id || goal?.owner || '',
      timeframe: goal?.timeframe || 'weekly',
      type: goal?.type || 'personal',
      startDate: goal?.startDate ? new Date(goal.startDate).toISOString().split('T')[0] : '',
      endDate: goal?.endDate ? new Date(goal.endDate).toISOString().split('T')[0] : '',
      subGoals: goal?.subGoals?.map((item) => ({ title: item.title, completed: item.completed })) || [],
    });
  }, [goal, open]);

  const addSubGoal = () => {
    if (!subGoal.trim()) return;
    setForm((prev) => ({
      ...prev,
      subGoals: [...prev.subGoals, { title: subGoal.trim(), completed: false }],
    }));
    setSubGoal('');
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    if (!isEdit && !form.ownerId) return toast.error('Select assignee');
    if (!form.subGoals.length) return toast.error('Add at least one goal item');
    setSaving(true);
    await onSave(
      {
        title: form.title,
        type: form.type,
        timeframe: form.timeframe,
        subGoals: form.subGoals,
        startDate: form.startDate || new Date().toISOString(),
        endDate: form.endDate || new Date(Date.now() + 7 * 864e5).toISOString(),
        ...(form.ownerId ? { ownerId: form.ownerId } : {}),
      },
      isEdit,
      goal?._id
    );
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Goal' : 'Create Goal'} subtitle="Goal details stay tied to the current API." width="max-w-2xl">
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">{isEdit ? 'Reassign To' : 'Assign To *'}</label>
            <select className="input-base" value={form.ownerId} onChange={(e) => setForm((prev) => ({ ...prev, ownerId: e.target.value }))}>
              <option value="">{isEdit ? 'Keep current owner' : 'Select user...'}</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Timeframe</label>
            <select className="input-base" value={form.timeframe} onChange={(e) => setForm((prev) => ({ ...prev, timeframe: e.target.value }))}>
              {['daily', 'weekly', 'monthly', 'quarterly'].map((timeframe) => (
                <option key={timeframe} value={timeframe}>
                  {timeframe}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Title *</label>
          <input className="input-base" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Goal title" />
        </div>

        <div>
          <label className="label">Type</label>
          <select className="input-base" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
            <option value="personal">Personal</option>
            <option value="task">Task</option>
          </select>
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
          <label className="label">Goal Items ({form.subGoals.length})</label>
          <div className="space-y-2">
            {form.subGoals.map((item, index) => (
              <div key={index} className="flex items-center gap-3 rounded-[1.15rem] border px-3 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
                <input type="checkbox" checked={item.completed} onChange={() => setForm((prev) => ({ ...prev, subGoals: prev.subGoals.map((entry, i) => (i === index ? { ...entry, completed: !entry.completed } : entry)) }))} />
                <input className="w-full bg-transparent text-sm outline-none" value={item.title} onChange={(e) => setForm((prev) => ({ ...prev, subGoals: prev.subGoals.map((entry, i) => (i === index ? { ...entry, title: e.target.value } : entry)) }))} />
                <button type="button" className="btn-ghost h-9 w-9 rounded-xl p-0" onClick={() => setForm((prev) => ({ ...prev, subGoals: prev.subGoals.filter((_, i) => i !== index) }))}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input className="input-base" value={subGoal} onChange={(e) => setSubGoal(e.target.value)} placeholder="Add goal item" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubGoal(); } }} />
              <button type="button" className="btn-secondary" onClick={addSubGoal}>Add</button>
            </div>
          </div>
        </div>

        <button type="button" className="btn-primary w-full rounded-full" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Goal'}
        </button>
      </div>
    </Modal>
  );
};

/* ====================== GOAL DETAIL MODAL ====================== */
const GoalDetailModal = ({ open, goal, onClose, onComment, onEdit, onDelete, canEdit }) => {
  const [comment, setComment] = useState('');
  if (!goal) return null;

  const progress = goal.subGoals?.length
    ? Math.round((goal.subGoals.filter((item) => item.completed).length / goal.subGoals.length) * 100)
    : 0;

  const owner = goal.owner ? `${goal.owner.firstName || ''} ${goal.owner.lastName || ''}`.trim() : 'Unassigned';

  return (
    <Modal open={open} onClose={onClose} title="Goal Details" subtitle={goal.title} width="max-w-2xl">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <span className="badge capitalize" style={{ background: 'var(--c-primary-soft)', color: 'var(--brand-primary)' }}>
            {goal.timeframe}
          </span>
          <span className="badge capitalize" style={{ background: 'var(--c-surface-3)', color: 'var(--c-text-soft)' }}>
            {goal.type}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.35rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <p className="section-title mb-2">Owner</p>
            <p className="text-base font-black" style={{ color: 'var(--c-text)' }}>
              {owner}
            </p>
          </div>
          <div className="rounded-[1.35rem] border p-4" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
            <p className="section-title mb-2">Window</p>
            <p className="text-base font-black" style={{ color: 'var(--c-text)' }}>
              {goal.startDate && goal.endDate
                ? `${format(new Date(goal.startDate), 'MMM d')} to ${format(new Date(goal.endDate), 'MMM d, yyyy')}`
                : 'Not set'}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="section-title">Progress</p>
            <span className="text-sm font-black" style={{ color: 'var(--brand-primary)' }}>
              {progress}%
            </span>
          </div>
          <ProgressBar value={progress} tone={progress === 100 ? 'var(--c-success)' : 'var(--brand-primary)'} />
        </div>

        {goal.subGoals?.length ? (
          <div className="space-y-2">
            {goal.subGoals.map((item, index) => (
              <div
                key={index}
                className="rounded-[1.15rem] border px-4 py-3 text-sm"
                style={{
                  borderColor: 'var(--c-border)',
                  background: 'var(--c-surface-2)',
                  color: item.completed ? 'var(--c-text-faint)' : 'var(--c-text)',
                }}
              >
                {item.title}
              </div>
            ))}
          </div>
        ) : null}

        <div>
          <p className="section-title mb-3">Add Comment</p>
          <div className="flex gap-2">
            <input className="input-base" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a note..." />
            <button
              className="btn-primary"
              onClick={() => {
                if (comment.trim()) {
                  onComment(goal._id, comment.trim());
                  setComment('');
                }
              }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {canEdit && (
            <button className="btn-secondary rounded-full" onClick={() => onEdit(goal)}>
              <Edit2 className="h-4 w-4" /> Edit Goal
            </button>
          )}
          {canEdit && (
            <button className="btn-danger rounded-full" onClick={() => onDelete(goal._id)}>
              <Trash2 className="h-4 w-4" /> Delete Goal
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default Goals;
