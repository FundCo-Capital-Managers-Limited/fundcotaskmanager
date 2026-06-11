import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Bell, Check, CheckSquare, Clock, Plus, Search, Trash2, Users } from 'lucide-react';
import api from '../utils/api.js';
import { EmptyState, LoadingScreen, Modal, PageHeader, Panel } from '../components/ui.jsx';

const statusColors = { pending: { c: '#d97706', bg: '#fffbeb' }, sent: { c: '#059669', bg: '#ecfdf5' }, snoozed: { c: '#2563eb', bg: '#eff6ff' }, dismissed: { c: '#6b7494', bg: '#f7f8fb' } };

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, u] = await Promise.all([api.get('/reminders'), api.get('/team/available-users')]);
      setReminders(r.data.reminders || []);
      setUsers(u.data.users || []);
    } catch {
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      toast.success('Deleted');
      fetchAll();
    } catch {
      toast.error('Failed');
    }
  };

  const handleCreate = async (form) => {
    try {
      await api.post('/reminders', form);
      toast.success('Reminder created!');
      setShowCreate(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader title="Reminders" actions={<button className="btn-primary rounded-full" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Create Reminder</button>} />
      {loading ? <LoadingScreen height="18rem" /> : reminders.length === 0 ? <EmptyState icon={Bell} title="No active reminders" description="Create your first reminder to start managing operational follow-ups." /> : (
        <Panel title="Reminder stream" subtitle={`${reminders.length} reminders`}>
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const userName = reminder.user ? `${reminder.user.firstName} ${reminder.user.lastName}` : 'Unknown';
              const sc = statusColors[reminder.status] || statusColors.pending;
              return (
                <div key={reminder._id} className="card p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-base font-bold" style={{ color: 'var(--c-text-0)' }}>{reminder.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm" style={{ color: 'var(--c-text-3)' }}>
                        <span className="badge capitalize" style={{ background: sc.bg, color: sc.c }}>{reminder.status}</span>
                        <span className="badge capitalize" style={{ background: 'var(--c-surface-raised)', color: 'var(--c-text-2)' }}>{reminder.type?.replace(/_/g, ' ')}</span>
                        {reminder.recurrenceLabel ? <span className="badge" style={{ background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}>{reminder.recurrenceLabel}</span> : null}
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{userName}</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{format(new Date(reminder.remindAt), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                    <button className="btn-danger" onClick={() => handleDelete(reminder._id)}><Trash2 className="h-4 w-4" /> Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
      <ReminderModal open={showCreate} users={users} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />
    </div>
  );
};

const ReminderModal = ({ open, users, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    userIds: [],
    type: 'custom',
    message: '',
    remindAt: '',
    deliveryChannels: { inApp: true, email: true, push: false },
    recurrenceMode: 'none',
    recurrenceWeekday: '1',
    recurrenceInterval: '1',
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      userIds: [],
      type: 'custom',
      message: '',
      remindAt: '',
      deliveryChannels: { inApp: true, email: true, push: false },
      recurrenceMode: 'none',
      recurrenceWeekday: '1',
      recurrenceInterval: '1',
    });
    setSearch('');
  }, [open]);

  const filteredUsers = users.filter((user) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(needle)
      || String(user.email || '').toLowerCase().includes(needle);
  });

  const toggleUser = (id) => {
    setForm((current) => ({
      ...current,
      userIds: current.userIds.includes(id)
        ? current.userIds.filter((userId) => userId !== id)
        : [...current.userIds, id],
    }));
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredUsers.map((user) => user._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => form.userIds.includes(id));
    setForm((current) => ({
      ...current,
      userIds: allSelected
        ? current.userIds.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current.userIds, ...visibleIds])],
    }));
  };

  const selectedCount = form.userIds.length;
  const allVisibleSelected = filteredUsers.length > 0 && filteredUsers.every((user) => form.userIds.includes(user._id));

  const submit = () => {
    if (!form.userIds.length || !form.message || !form.remindAt) {
      toast.error('Select users, message, and reminder time');
      return;
    }

    const recurrence = form.recurrenceMode === 'none' ? null : {
      frequency: form.recurrenceMode,
      interval: Number(form.recurrenceInterval) || 1,
      weekdays: form.recurrenceMode === 'weekly' ? [Number(form.recurrenceWeekday)] : [],
      timezone: 'Africa/Lagos',
    };

    onSubmit({
      userIds: form.userIds,
      type: form.type,
      message: form.message,
      remindAt: form.remindAt,
      deliveryChannels: form.deliveryChannels,
      recurrence,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="New Reminder" subtitle="Send one reminder to one person, selected teammates, or everyone visible to you." width="max-w-3xl">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Type</label>
            <select className="input-base" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
              {['task_due', 'meeting', 'goal_deadline', 'custom'].map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Remind At</label>
            <input type="datetime-local" className="input-base" value={form.remindAt} onChange={(e) => setForm((prev) => ({ ...prev, remindAt: e.target.value }))} />
          </div>
        </div>

        <div>
          <label className="label">Message</label>
          <input className="input-base" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Reminder message" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Repeat</label>
            <select className="input-base" value={form.recurrenceMode} onChange={(e) => setForm((prev) => ({ ...prev, recurrenceMode: e.target.value }))}>
              <option value="none">One time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="label">Interval</label>
            <input type="number" min="1" max="52" className="input-base" value={form.recurrenceInterval} onChange={(e) => setForm((prev) => ({ ...prev, recurrenceInterval: e.target.value }))} />
          </div>
        </div>

        {form.recurrenceMode === 'weekly' ? (
          <div>
            <label className="label">Weekday</label>
            <select className="input-base" value={form.recurrenceWeekday} onChange={(e) => setForm((prev) => ({ ...prev, recurrenceWeekday: e.target.value }))}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((label, index) => (
                <option key={label} value={index}>{label}</option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-3">
          {[
            ['inApp', 'In-app'],
            ['email', 'Email'],
            ['push', 'Push'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold" style={{ borderColor: 'var(--c-border)' }}>
              <input
                type="checkbox"
                checked={Boolean(form.deliveryChannels[key])}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  deliveryChannels: { ...prev.deliveryChannels, [key]: e.target.checked },
                }))}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <label className="label">Recipients</label>
              <p className="text-xs" style={{ color: 'var(--c-text-3)' }}>{selectedCount} selected</p>
            </div>
            <div className="flex gap-2">
              <div className="relative min-w-[14rem]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--c-text-faint)' }} />
                <input className="input-base" style={{ paddingLeft: 38 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team members" />
              </div>
              <button type="button" className="btn-secondary" onClick={toggleAllVisible}>
                {allVisibleSelected ? <CheckSquare className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {allVisibleSelected ? 'Clear Visible' : 'Select Visible'}
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-[1rem] border" style={{ borderColor: 'var(--c-border)' }}>
            {filteredUsers.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm" style={{ color: 'var(--c-text-3)' }}>No users found</p>
            ) : filteredUsers.map((user) => {
              const active = form.userIds.includes(user._id);
              return (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => toggleUser(user._id)}
                  className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0"
                  style={{ borderColor: 'var(--c-border)', background: active ? 'var(--brand-primary-soft)' : 'transparent' }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: active ? 'var(--brand-primary)' : 'var(--brand-secondary)' }}>
                    {(user.firstName || 'U')[0].toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{user.firstName} {user.lastName}</span>
                    <span className="block truncate text-xs" style={{ color: 'var(--c-text-3)' }}>{user.position || user.email}</span>
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border" style={active ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#fff' } : { borderColor: 'var(--c-border)' }}>
                    {active ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button className="btn-primary w-full" onClick={submit}>Create Reminder</button>
      </div>
    </Modal>
  );
};

export default Reminders;



