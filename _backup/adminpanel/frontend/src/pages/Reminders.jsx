import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Bell, Clock, Plus, Trash2, Users } from 'lucide-react';
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
  const [form, setForm] = useState({ userId: '', type: 'custom', message: '', remindAt: '' });
  return (
    <Modal open={open} onClose={onClose} title="New Reminder" subtitle="Reminder create flow stays tied to the current API.">
      <div className="space-y-4">
        <div><label className="label">For User</label><select className="input-base" value={form.userId} onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}><option value="">Select user...</option>{users.map((user) => <option key={user._id} value={user._id}>{user.firstName} {user.lastName}</option>)}</select></div>
        <div><label className="label">Type</label><select className="input-base" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>{['task_due', 'meeting', 'goal_deadline', 'custom'].map((type) => <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>)}</select></div>
        <div><label className="label">Message</label><input className="input-base" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Reminder message" /></div>
        <div><label className="label">Remind At</label><input type="datetime-local" className="input-base" value={form.remindAt} onChange={(e) => setForm((prev) => ({ ...prev, remindAt: e.target.value }))} /></div>
        <button className="btn-primary w-full" onClick={() => { if (!form.userId || !form.message || !form.remindAt) return toast.error('Fill all fields'); onSubmit(form); }}>Create Reminder</button>
      </div>
    </Modal>
  );
};

export default Reminders;
