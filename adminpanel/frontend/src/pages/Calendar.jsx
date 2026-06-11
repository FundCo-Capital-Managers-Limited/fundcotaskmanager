import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Copy, Plus, Trash2, Users, Video } from 'lucide-react';
import api from '../utils/api.js';
import userApi from '../utils/userApi.js';
import { EmptyState, LoadingScreen, Modal, PageHeader, Panel, StatCard, StatusPill } from '../components/ui.jsx';
import { formatPersonName } from '../utils/adminFormat.js';
import { useNotifications } from '../context/NotificationContext.jsx';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullWeekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dateKey = (value) => {
  const next = new Date(value);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
};

const sameDay = (left, right) => dateKey(left) === dateKey(right);

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const { markTypeRead } = useNotifications();

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, meetingRes, userRes] = await Promise.all([
        api.get('/tasks', { params: { limit: 500 } }).catch(() => ({ data: { tasks: [] } })),
        userApi.get('/api/meetings').catch(() => ({ data: { meetings: [] } })),
        api.get('/team/available-users').catch(() => ({ data: { users: [] } })),
      ]);

      setTasks(taskRes.data.tasks || []);
      setMeetings(meetingRes.data.meetings || []);
      setUsers(userRes.data.users || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    markTypeRead?.('meeting');
  }, [markTypeRead]);

  useEffect(() => {
    fetchCalendarData();
    const timer = setInterval(fetchCalendarData, 30000);
    return () => clearInterval(timer);
  }, [fetchCalendarData]);

  useEffect(() => {
    setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      if (!task?.dueDate) return;
      const key = dateKey(task.dueDate);
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [tasks]);

  const meetingsByDate = useMemo(() => {
    const map = {};
    meetings.forEach((meeting) => {
      if (!meeting?.startTime) return;
      const key = dateKey(meeting.startTime);
      if (!map[key]) map[key] = [];
      map[key].push(meeting);
    });
    return map;
  }, [meetings]);

  const dailyTasks = useMemo(() => tasksByDate[dateKey(selectedDate)] || [], [selectedDate, tasksByDate]);
  const dailyMeetings = useMemo(() => meetingsByDate[dateKey(selectedDate)] || [], [meetingsByDate, selectedDate]);

  const thisWeekMeetingCount = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return meetings.filter((meeting) => {
      const startTime = new Date(meeting.startTime);
      return startTime >= start && startTime < end;
    }).length;
  }, [meetings, selectedDate]);

  const thisWeekTaskCount = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(selectedDate.getDate() - selectedDate.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return tasks.filter((task) => {
      if (!task?.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= start && dueDate < end;
    }).length;
  }, [tasks, selectedDate]);

  const monthCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendarMonth]);

  const openCreateMeeting = () => {
    setEditingMeeting(null);
    setShowMeetingModal(true);
  };

  const openEditMeeting = (meeting) => {
    setEditingMeeting(meeting);
    setShowMeetingModal(true);
  };

  const handleSubmitMeeting = async (payload) => {
    try {
      if (editingMeeting?._id) {
        await userApi.put(`/api/meetings/${editingMeeting._id}`, payload);
        toast.success('Meeting updated');
      } else {
        await userApi.post('/api/meetings', payload);
        toast.success('Meeting scheduled');
      }
      setShowMeetingModal(false);
      setEditingMeeting(null);
      fetchCalendarData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save meeting');
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm('Delete this scheduled meeting?')) return;
    try {
      await userApi.delete(`/api/meetings/${meetingId}`);
      toast.success('Meeting deleted');
      fetchCalendarData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete meeting');
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Calendar"
        description="Track task deadlines and scheduled meetings together. Tagged meeting participants will see the same meetings in their own calendars."
        actions={(
          <>
            <button className="btn-secondary" onClick={fetchCalendarData}>Refresh</button>
            <button className="btn-primary" onClick={openCreateMeeting}>
              <Plus className="h-4 w-4" />
              Schedule Meeting
            </button>
          </>
        )}
        aside={<StatusPill tone="secondary">{format(selectedDate, 'EEEE, MMM d')}</StatusPill>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tasks Today" value={dailyTasks.length} icon={CalendarDays} tone="var(--brand-primary)" helper="Visible task due dates" />
        <StatCard label="Meetings Today" value={dailyMeetings.length} icon={Video} tone="var(--brand-secondary)" helper="Scheduled calendar meetings" />
        <StatCard label="Tasks This Week" value={thisWeekTaskCount} icon={Clock} tone="var(--c-warning)" helper="Due inside the current week" />
        <StatCard label="Meetings This Week" value={thisWeekMeetingCount} icon={Users} tone="var(--c-success)" helper="Invites and owned meetings" />
      </div>

      {loading ? (
        <LoadingScreen height="20rem" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
          <Panel title="Month" subtitle={format(calendarMonth, 'MMMM yyyy')}>
            <div className="mb-4 flex items-center justify-between">
              <button className="btn-ghost h-10 w-10 rounded-full p-0" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="btn-secondary min-h-9 px-3" onClick={() => setSelectedDate(new Date())}>Today</button>
              <button className="btn-ghost h-10 w-10 rounded-full p-0" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[0.68rem] font-black uppercase" style={{ color: 'var(--c-text-faint)' }}>
              {weekdayLabels.map((label) => <div key={label} className="py-2">{label}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="aspect-square" />;
                const cellDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
                const selected = sameDay(cellDate, selectedDate);
                const key = dateKey(cellDate);
                const taskCount = (tasksByDate[key] || []).length;
                const meetingCount = (meetingsByDate[key] || []).length;
                const isToday = sameDay(cellDate, new Date());

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(cellDate)}
                    className="flex aspect-square flex-col items-center justify-center rounded-[1rem] border transition-colors"
                    style={selected
                      ? { borderColor: 'var(--brand-primary)', background: 'var(--brand-primary)', color: '#fff' }
                      : isToday
                        ? { borderColor: 'var(--brand-primary)', background: 'var(--brand-primary-soft)' }
                        : { borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text)' }}
                  >
                    <span className="text-xs font-black">{day}</span>
                    {(taskCount || meetingCount) ? (
                      <div className="mt-1 flex items-center gap-1 text-[0.6rem] font-black">
                        {taskCount ? <span>{taskCount}T</span> : null}
                        {meetingCount ? <span>{meetingCount}M</span> : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="space-y-4">
            <Panel
              title={format(selectedDate, 'EEEE, MMMM d')}
              subtitle={`${dailyMeetings.length} meetings and ${dailyTasks.length} tasks on this date`}
              action={<button className="btn-primary" onClick={openCreateMeeting}><Plus className="h-4 w-4" />Schedule Meeting</button>}
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Meetings</h3>
                    <StatusPill tone="secondary">{dailyMeetings.length}</StatusPill>
                  </div>
                  {dailyMeetings.length === 0 ? (
                    <EmptyState icon={Video} title="No meetings scheduled" description="Meetings created for this date will appear here and in participant calendars." action={<button className="btn-secondary" onClick={openCreateMeeting}><Plus className="h-4 w-4" />Schedule</button>} />
                  ) : (
                    <div className="space-y-3">
                      {dailyMeetings.map((meeting) => (
                        <div key={meeting._id} className="card p-4">
                          <div className="flex flex-col gap-4">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <StatusPill tone="info">{meeting.status || 'scheduled'}</StatusPill>
                                <StatusPill tone="secondary">{meeting.duration} min</StatusPill>
                              </div>
                              <h3 className="text-base font-black" style={{ color: 'var(--c-text)' }}>{meeting.topic}</h3>
                              {meeting.agenda ? <p className="mt-2 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>{meeting.agenda}</p> : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                              <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{format(new Date(meeting.startTime), 'h:mm a')}</span>
                              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />{meeting.participants?.length || 0} invited</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button className="btn-secondary" onClick={() => openEditMeeting(meeting)}>Edit</button>
                              {meeting.joinUrl ? (
                                <button
                                  className="btn-ghost"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(meeting.joinUrl);
                                    toast.success('Meeting link copied');
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy Link
                                </button>
                              ) : null}
                              <button className="btn-danger" onClick={() => handleDeleteMeeting(meeting._id)}>
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black" style={{ color: 'var(--c-text)' }}>Tasks</h3>
                    <StatusPill tone="secondary">{dailyTasks.length}</StatusPill>
                  </div>
                  {dailyTasks.length === 0 ? (
                    <EmptyState icon={CalendarDays} title="No task deadlines" description="Tasks with due dates on this day will appear here." />
                  ) : (
                    <div className="space-y-3">
                      {dailyTasks.map((task) => (
                        <div key={task._id} className="card p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill tone={task.completed ? 'success' : 'warning'}>{task.completed ? 'Completed' : (task.submissionStatus || 'Pending')}</StatusPill>
                              <StatusPill tone="secondary">{task.priority || 'Low'}</StatusPill>
                            </div>
                            <h3 className="text-base font-black" style={{ color: 'var(--c-text)' }}>{task.title}</h3>
                            {task.description ? <p className="text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>{task.description}</p> : null}
                            <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                              <span>{formatPersonName(task.owner)}</span>
                              {task.dueDate ? <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{format(new Date(task.dueDate), 'h:mm a')}</span> : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </Panel>
          </div>
        </div>
      )}

      <MeetingModal
        open={showMeetingModal}
        users={users}
        meeting={editingMeeting}
        onClose={() => {
          setShowMeetingModal(false);
          setEditingMeeting(null);
        }}
        onSubmit={handleSubmitMeeting}
      />
    </div>
  );
};

const MeetingModal = ({ open, users, meeting, onClose, onSubmit }) => {
  const [form, setForm] = useState({
    topic: '',
    agenda: '',
    startTime: '',
    duration: 60,
    participants: [],
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({
      topic: meeting?.topic || '',
      agenda: meeting?.agenda || '',
      startTime: meeting?.startTime ? format(new Date(meeting.startTime), "yyyy-MM-dd'T'HH:mm") : '',
      duration: meeting?.duration || 60,
      participants: Array.isArray(meeting?.participants)
        ? meeting.participants.map((participant) => String(participant?._id || participant))
        : [],
    });
    setSearch('');
  }, [meeting, open]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => {
      if (!needle) return true;
      return formatPersonName(user).toLowerCase().includes(needle)
        || String(user.email || '').toLowerCase().includes(needle);
    });
  }, [search, users]);

  const toggleParticipant = (id) => {
    setForm((current) => ({
      ...current,
      participants: current.participants.includes(id)
        ? current.participants.filter((item) => item !== id)
        : [...current.participants, id],
    }));
  };

  const submit = () => {
    if (!form.topic.trim() || !form.startTime || !form.duration) {
      toast.error('Topic, time, and duration are required');
      return;
    }

    onSubmit({
      topic: form.topic.trim(),
      agenda: form.agenda.trim(),
      startTime: new Date(form.startTime).toISOString(),
      duration: Number(form.duration) || 60,
      participants: form.participants,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={meeting ? 'Edit Scheduled Meeting' : 'Schedule Meeting'}
      subtitle="Scheduled meetings notify tagged participants and appear on their calendar."
      width="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Topic</label>
            <input className="input-base" value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} placeholder="Weekly operations review" />
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input type="number" min="15" max="240" className="input-base" value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Date and time</label>
            <input type="datetime-local" className="input-base" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
          </div>
          <div>
            <label className="label">Search participants</label>
            <input className="input-base" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name or email" />
          </div>
        </div>

        <div>
          <label className="label">Agenda</label>
          <textarea className="input-base min-h-28" value={form.agenda} onChange={(event) => setForm((current) => ({ ...current, agenda: event.target.value }))} placeholder="Meeting purpose and discussion points" />
        </div>

        <Panel title="Participants" subtitle={`${form.participants.length} selected`} className="shadow-none" bodyClassName="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            {filteredUsers.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>No team members found.</p>
            ) : filteredUsers.map((user) => {
              const active = form.participants.includes(user._id);
              return (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => toggleParticipant(user._id)}
                  className="flex items-center gap-3 rounded-[1rem] border px-4 py-3 text-left"
                  style={active
                    ? { borderColor: 'var(--brand-primary)', background: 'var(--brand-primary-soft)' }
                    : { borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: active ? 'var(--brand-primary)' : 'var(--brand-secondary)' }}>
                    {formatPersonName(user).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{formatPersonName(user)}</span>
                    <span className="block truncate text-xs" style={{ color: 'var(--c-text-muted)' }}>{user.position || user.email}</span>
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border" style={active ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#fff' } : { borderColor: 'var(--c-border)' }}>
                    {active ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        {form.startTime ? (
          <div className="rounded-[1rem] border px-4 py-3 text-sm" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text-muted)' }}>
            This meeting will notify tagged participants and place the event on their calendar for {fullWeekdayLabels[new Date(form.startTime).getDay()]} at {format(new Date(form.startTime), 'h:mm a')}.
          </div>
        ) : null}

        <button className="btn-primary w-full" onClick={submit}>
          <Video className="h-4 w-4" />
          {meeting ? 'Update Meeting' : 'Schedule Meeting'}
        </button>
      </div>
    </Modal>
  );
};

export default CalendarPage;



