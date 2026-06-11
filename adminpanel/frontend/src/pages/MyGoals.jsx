import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  CheckCircle2,
  PencilLine,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import api from '../utils/api.js';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import {
  EmptyState,
  FilterChip,
  LoadingScreen,
  Modal,
  PageHeader,
  Panel,
  ProgressBar,
  SearchInput,
  StatCard,
} from '../components/ui.jsx';

const MY_GOALS_BATCH = 24;

const emptyForm = {
  title: '',
  type: 'personal',
  timeframe: 'weekly',
  startDate: '',
  endDate: '',
  subGoals: [{ title: '', completed: false }],
};

const emptyStats = { total: 0, completed: 0, active: 0, avgProgress: 0 };

const progressFor = (goal) => {
  const total = goal?.subGoals?.length || 0;
  if (!total) return 0;
  const done = goal.subGoals.filter((item) => item.completed).length;
  return Math.round((done / total) * 100);
};

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const MyGoals = () => {
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [visibleCount, setVisibleCount] = useState(MY_GOALS_BATCH);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const debouncedSearch = useDebouncedValue(search, 320);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (timeframe) params.timeframe = timeframe;

      const { data } = await api.get('/goals/mine/overview', { params });
      setGoals(data.goals || []);
      setStats(data.stats || emptyStats);
    } catch (error) {
      setGoals([]);
      setStats(emptyStats);
      toast.error(error.response?.data?.message || 'Failed to load your goals');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, timeframe]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const openCreate = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    setEditingGoal(null);
    setForm({
      ...emptyForm,
      startDate: toDateInput(today),
      endDate: toDateInput(nextWeek),
    });
    setModalOpen(true);
  };

  const openEdit = (goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title || '',
      type: goal.type || 'personal',
      timeframe: goal.timeframe || 'weekly',
      startDate: toDateInput(goal.startDate),
      endDate: toDateInput(goal.endDate),
      subGoals: goal.subGoals?.length
        ? goal.subGoals.map((item) => ({ title: item.title || '', completed: Boolean(item.completed) }))
        : [{ title: '', completed: false }],
    });
    setModalOpen(true);
  };

  const saveGoal = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error('Goal title is required');
      return;
    }

    const cleanSubGoals = form.subGoals.map((item) => ({
      title: String(item.title || '').trim(),
      completed: Boolean(item.completed),
    })).filter((item) => item.title);

    if (!cleanSubGoals.length) {
      toast.error('Add at least one sub-goal');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        timeframe: form.timeframe,
        startDate: form.startDate,
        endDate: form.endDate,
        subGoals: cleanSubGoals,
      };

      if (editingGoal?._id) {
        await api.put(`/goals/mine/${editingGoal._id}`, payload);
        toast.success('Goal updated');
      } else {
        await api.post('/goals/mine', payload);
        toast.success('Goal created');
      }

      setModalOpen(false);
      await fetchGoals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (goalId) => {
    if (!window.confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/mine/${goalId}`);
      toast.success('Goal deleted');
      fetchGoals();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete goal');
    }
  };

  useEffect(() => {
    setVisibleCount(MY_GOALS_BATCH);
  }, [debouncedSearch, timeframe, goals]);

  const visibleGoals = useMemo(() => goals.filter((goal) => {
    if (!debouncedSearch) return true;
    return String(goal.title || '').toLowerCase().includes(debouncedSearch.toLowerCase());
  }), [debouncedSearch, goals]);

  const renderedGoals = useMemo(
    () => visibleGoals.slice(0, visibleCount),
    [visibleCount, visibleGoals],
  );

  return (
    <div className="page-shell">
      <PageHeader
        title="My Goals"
        actions={(
          <button type="button" className="btn-primary rounded-full" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Goal
          </button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Goals" value={stats.total || 0} icon={Target} tone="var(--brand-primary)" />
        <StatCard label="Completed" value={stats.completed || 0} icon={CheckCircle2} tone="var(--c-success)" />
        <StatCard label="Active" value={stats.active || 0} icon={CalendarDays} tone="var(--brand-secondary)" />
        <StatCard label="Average Progress" value={`${stats.avgProgress || 0}%`} icon={PencilLine} tone="#d97706" />
      </div>

      <Panel>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your goals..." />
          <div className="flex flex-wrap gap-2">
            {['', 'daily', 'weekly', 'monthly', 'quarterly', 'custom'].map((item) => (
              <FilterChip key={item || 'all'} active={timeframe === item} onClick={() => setTimeframe(item)}>
                {item || 'All'}
              </FilterChip>
            ))}
          </div>
        </div>
      </Panel>

      {loading ? (
        <LoadingScreen height="16rem" />
      ) : visibleGoals.length === 0 ? (
        <EmptyState icon={Target} title="No personal goals yet" description="Create a goal here to keep your own delivery targets visible." />
      ) : (
        <Panel title="Goal board" subtitle={`${visibleGoals.length} goal${visibleGoals.length === 1 ? '' : 's'} visible`}>
          <div className="space-y-3">
            {renderedGoals.map((goal) => {
              const progress = progressFor(goal);
              return (
                <div key={goal._id} className="card p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="badge capitalize" style={{ background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>{goal.timeframe}</span>
                        <span className="badge capitalize" style={{ background: progress === 100 ? '#ecfdf5' : '#eff6ff', color: progress === 100 ? '#059669' : '#2563eb' }}>
                          {progress === 100 ? 'Completed' : 'In progress'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold" style={{ color: 'var(--c-text-0)' }}>{goal.title}</h3>
                      <p className="mt-2 text-sm" style={{ color: 'var(--c-text-3)' }}>
                        {goal.startDate ? format(new Date(goal.startDate), 'MMM d, yyyy') : 'No start date'} - {goal.endDate ? format(new Date(goal.endDate), 'MMM d, yyyy') : 'No end date'}
                      </p>
                      <div className="mt-3 space-y-2">
                        {(goal.subGoals || []).slice(0, 3).map((item, index) => (
                          <div key={`${goal._id}-sub-${index}`} className="flex items-center gap-3 text-sm" style={{ color: 'var(--c-text-2)' }}>
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: item.completed ? '#059669' : 'var(--c-border)', color: item.completed ? '#059669' : 'var(--c-text-faint)' }}>
                              {item.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                            </span>
                            <span>{item.title}</span>
                          </div>
                        ))}
                        {(goal.subGoals || []).length > 3 ? (
                          <p className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                            +{goal.subGoals.length - 3} more sub-goals
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="w-full xl:w-72">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--c-text-soft)' }}>Progress</span>
                        <span className="font-bold" style={{ color: progress === 100 ? '#059669' : 'var(--brand-primary)' }}>{progress}%</span>
                      </div>
                      <ProgressBar value={progress} tone={progress === 100 ? '#059669' : 'var(--brand-primary)'} />
                      <div className="mt-4 flex gap-2">
                        <button type="button" className="btn-secondary flex-1" onClick={() => openEdit(goal)}>
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </button>
                        <button type="button" className="btn-danger flex-1" onClick={() => deleteGoal(goal._id)}>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {visibleGoals.length > renderedGoals.length ? (
            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--c-border)' }}>
              <p className="text-sm" style={{ color: 'var(--c-text-3)' }}>
                Showing {renderedGoals.length} of {visibleGoals.length} goals
              </p>
              <button type="button" className="btn-secondary rounded-full" onClick={() => setVisibleCount((current) => current + MY_GOALS_BATCH)}>
                Load more
              </button>
            </div>
          ) : null}
        </Panel>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGoal ? 'Edit Goal' : 'Create Goal'}
        subtitle="Keep your own goals separate from the wider team board."
        width="max-w-3xl"
      >
        <form onSubmit={saveGoal} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label">Goal Title</label>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="input-base"
                placeholder="Q2 delivery oversight"
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="input-base">
                <option value="personal">Personal</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div>
              <label className="label">Timeframe</label>
              <select value={form.timeframe} onChange={(event) => setForm((current) => ({ ...current, timeframe: event.target.value }))} className="input-base">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className="input-base" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} className="input-base" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="section-title">Sub-goals</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setForm((current) => ({ ...current, subGoals: [...current.subGoals, { title: '', completed: false }] }))}
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {form.subGoals.map((item, index) => (
              <div key={`sub-goal-${index}`} className="flex gap-3 rounded-[1rem] border px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => setForm((current) => ({
                    ...current,
                    subGoals: current.subGoals.map((entry, entryIndex) => entryIndex === index ? { ...entry, completed: !entry.completed } : entry),
                  }))}
                />
                <input
                  value={item.title}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    subGoals: current.subGoals.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry),
                  }))}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder={`Sub-goal ${index + 1}`}
                />
                <button
                  type="button"
                  className="btn-ghost h-9 w-9 rounded-xl p-0"
                  onClick={() => setForm((current) => ({
                    ...current,
                    subGoals: current.subGoals.length === 1
                      ? [{ title: '', completed: false }]
                      : current.subGoals.filter((_, entryIndex) => entryIndex !== index),
                  }))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingGoal ? 'Save Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MyGoals;



