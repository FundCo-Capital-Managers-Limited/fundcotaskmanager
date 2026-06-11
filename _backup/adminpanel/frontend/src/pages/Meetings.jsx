import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Check, Clock, Copy, ExternalLink, Hash, Lock, Plus, Search, Users, Video, XCircle } from 'lucide-react';
import api from '../utils/api.js';
import userApi, { USER_FRONTEND_BASE } from '../utils/userApi.js';
import { EmptyState, FilterChip, LoadingScreen, Modal, PageHeader, Panel, SearchInput, StatCard, StatusPill } from '../components/ui.jsx';
import { formatPersonName } from '../utils/adminFormat.js';
import { useNotifications } from '../context/NotificationContext.jsx';

const openRoomWindow = (roomId) => {
  if (!roomId) return;
  const url = `${USER_FRONTEND_BASE}/room/${roomId}`;
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) window.location.assign(url);
};

const copyRoomLink = async (roomId) => {
  await navigator.clipboard.writeText(`${USER_FRONTEND_BASE}/room/${roomId}`);
  toast.success('Meeting link copied');
};

const Meetings = () => {
  const [rooms, setRooms] = useState([]);
  const [userRooms, setUserRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const { markTypeRead } = useNotifications();

  const visibleRooms = useMemo(() => {
    const map = new Map();
    [...userRooms, ...rooms].forEach((room) => {
      const key = room.roomId || room._id;
      if (!key) return;
      map.set(key, { ...map.get(key), ...room });
    });
    return Array.from(map.values()).filter((room) => !filter || room.status === filter);
  }, [rooms, userRooms, filter]);

  const liveRooms = useMemo(
    () => visibleRooms.filter((room) => ['active', 'waiting'].includes(room.status)),
    [visibleRooms],
  );

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const adminParams = {};
      if (filter) adminParams.status = filter;
      const [adminRes, activeRes, myRes, usersRes] = await Promise.all([
        api.get('/meetings', { params: adminParams }).catch(() => ({ data: { rooms: [] } })),
        userApi.get('/api/rooms/active').catch(() => ({ data: { rooms: [] } })),
        userApi.get('/api/rooms').catch(() => ({ data: { rooms: [] } })),
        api.get('/team/available-users').catch(() => ({ data: { users: [] } })),
      ]);

      setRooms(adminRes.data.rooms || []);
      const seen = new Set();
      const mergedUserRooms = [...(activeRes.data.rooms || []), ...(myRes.data.rooms || [])].filter((room) => {
        if (!room?.roomId || seen.has(room.roomId)) return false;
        seen.add(room.roomId);
        return true;
      });
      setUserRooms(mergedUserRooms);
      setUsers(usersRes.data.users || []);
    } catch {
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    markTypeRead?.('meeting');
  }, [markTypeRead]);

  useEffect(() => {
    fetchRooms();
    const timer = setInterval(fetchRooms, 20000);
    return () => clearInterval(timer);
  }, [fetchRooms]);

  const endRoom = async (roomId) => {
    if (!confirm('End this meeting?')) return;
    try {
      await api.post(`/meetings/${roomId}/end`);
      toast.success('Meeting ended');
      fetchRooms();
    } catch {
      toast.error('Failed to end meeting');
    }
  };

  const handleJoinCode = () => {
    const code = joinCode.trim().toLowerCase();
    if (!code) return toast.error('Enter a meeting code');
    openRoomWindow(code);
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Meetings and live rooms"
        actions={
          <>
            <div className="flex min-w-[18rem] items-center gap-2 rounded-full border px-3 py-2" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)' }}>
              <Hash className="h-4 w-4 shrink-0" style={{ color: 'var(--c-text-faint)' }} />
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') handleJoinCode(); }}
                placeholder="meeting-code"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
                style={{ color: 'var(--c-text)' }}
              />
              <button type="button" className="btn-ghost min-h-9 px-3" onClick={handleJoinCode}>Join</button>
            </div>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              Start Meeting
            </button>
          </>
        }
        aside={<StatusPill tone="secondary">Video enabled</StatusPill>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visible Rooms" value={visibleRooms.length} icon={Video} tone="var(--brand-primary)"  />
        <StatCard label="Live Now" value={liveRooms.length} icon={Video} tone="var(--c-success)"  />
        <StatCard label="Waiting" value={visibleRooms.filter((room) => room.status === 'waiting').length} icon={Clock} tone="var(--c-warning)"  />
        <StatCard label="Active People" value={visibleRooms.reduce((sum, room) => sum + (room.participants?.filter((participant) => participant.isActive).length || 0), 0)} icon={Users} tone="var(--brand-secondary)" />
      </div>

      <Panel title="Meeting Controls" subtitle="Launch a new room or filter the room board by lifecycle state">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {['', 'active', 'waiting', 'ended'].map((item) => (
              <FilterChip key={item || 'all'} active={filter === item} onClick={() => setFilter(item)}>
                {item || 'All'}
              </FilterChip>
            ))}
          </div>
          <button className="btn-secondary" onClick={fetchRooms}>Refresh rooms</button>
        </div>
      </Panel>

      {loading ? (
        <LoadingScreen height="18rem" />
      ) : visibleRooms.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No meetings found"
          description="Start a meeting from this admin page or wait for a user-side room to appear."
          action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />Start Meeting</button>}
        />
      ) : (
        <Panel title="Room Feed" subtitle={`${visibleRooms.length} rooms visible`}>
          <div className="grid gap-3 xl:grid-cols-2">
            {visibleRooms.map((room) => {
              const hostName = formatPersonName(room.host);
              const activeCount = room.participants?.filter((participant) => participant.isActive).length || 0;
              const canJoin = ['active', 'waiting'].includes(room.status);

              return (
                <div key={room.roomId || room._id} className="card card-hover p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <StatusPill tone={room.status === 'active' ? 'success' : room.status === 'waiting' ? 'warning' : 'neutral'}>{room.status}</StatusPill>
                          <StatusPill tone="secondary">{room.type || 'instant'}</StatusPill>
                          {room.isLocked ? <StatusPill tone="danger"><Lock className="h-3 w-3" />Locked</StatusPill> : null}
                        </div>
                        <h3 className="truncate text-lg font-black tracking-[-0.03em]" style={{ color: 'var(--c-text)' }}>{room.name}</h3>
                        {room.description ? <p className="mt-2 line-clamp-2 text-sm leading-6" style={{ color: 'var(--c-text-muted)' }}>{room.description}</p> : null}
                      </div>
                      <button type="button" className="btn-ghost h-11 w-11 shrink-0 rounded-full p-0" onClick={() => copyRoomLink(room.roomId)} aria-label="Copy meeting link">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                      <span>Host: {hostName}</span>
                      <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />{activeCount} active</span>
                      {room.createdAt ? <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />{format(new Date(room.createdAt), 'MMM d, h:mm a')}</span> : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {canJoin ? (
                        <button className="btn-primary" onClick={() => openRoomWindow(room.roomId)}>
                          <ExternalLink className="h-4 w-4" />
                          Open room
                        </button>
                      ) : null}
                      {room.status !== 'ended' ? (
                        <button className="btn-danger" onClick={() => endRoom(room.roomId)}>
                          <XCircle className="h-4 w-4" />
                          End meeting
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <CreateMeetingModal
        open={showCreate}
        users={users}
        onClose={() => setShowCreate(false)}
        onCreated={(room) => {
          setShowCreate(false);
          fetchRooms();
          openRoomWindow(room.roomId);
        }}
      />
    </div>
  );
};

const CreateMeetingModal = ({ open, users, onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    maxParticipants: 50,
    muteOnEntry: false,
    waitingRoom: false,
  });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ name: '', description: '', maxParticipants: 50, muteOnEntry: false, waitingRoom: false });
    setQuery('');
    setSelected([]);
  }, [open]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((user) => !q || formatPersonName(user).toLowerCase().includes(q) || user.email?.toLowerCase().includes(q))
      .slice(0, 80);
  }, [query, users]);

  const toggleUser = (id) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const createRoom = async () => {
    if (!form.name.trim()) return toast.error('Meeting name is required');
    setCreating(true);
    try {
      const { data } = await userApi.post('/api/rooms', {
        name: form.name.trim(),
        description: form.description.trim(),
        type: 'instant',
        maxParticipants: Number(form.maxParticipants) || 50,
        invitedUsers: selected,
        settings: {
          muteOnEntry: form.muteOnEntry,
          waitingRoom: form.waitingRoom,
          allowVideo: true,
          allowAudio: true,
          allowScreenShare: true,
          allowChat: true,
        },
      });
      toast.success('Meeting started');
      onCreated(data.room);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start meeting');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Start meeting" subtitle="Create an instant user-side video room from the admin workspace." width="max-w-3xl">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Meeting name</label>
            <input className="input-base" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Weekly leadership room" />
          </div>
          <div>
            <label className="label">Max participants</label>
            <input type="number" min="2" max="200" className="input-base" value={form.maxParticipants} onChange={(event) => setForm((current) => ({ ...current, maxParticipants: event.target.value }))} />
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input-base min-h-28" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Agenda or meeting context" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['muteOnEntry', 'Mute on entry', 'Participants join muted by default'],
            ['waitingRoom', 'Waiting room', 'Host admits people before they enter'],
          ].map(([key, title, description]) => (
            <button
              key={key}
              type="button"
              onClick={() => setForm((current) => ({ ...current, [key]: !current[key] }))}
              className="flex items-center justify-between gap-4 rounded-[1.25rem] border p-4 text-left transition-colors"
              style={{ borderColor: form[key] ? 'var(--brand-primary)' : 'var(--c-border)', background: form[key] ? 'var(--brand-primary-soft)' : 'var(--c-panel-subtle)' }}
            >
              <span>
                <span className="block text-sm font-black" style={{ color: 'var(--c-text)' }}>{title}</span>
                <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--c-text-muted)' }}>{description}</span>
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border" style={form[key] ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#fff' } : { borderColor: 'var(--c-border)' }}>
                {form[key] ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
            </button>
          ))}
        </div>

        <Panel title="Invite teammates" subtitle={`${selected.length} selected`} className="shadow-none" bodyClassName="space-y-3">
          <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users to invite..." icon={Search} />
          <div className="max-h-64 overflow-y-auto rounded-[1.25rem] border" style={{ borderColor: 'var(--c-border)' }}>
            {filteredUsers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--c-text-muted)' }}>No users found</p>
            ) : filteredUsers.map((user) => {
              const active = selected.includes(user._id);
              return (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => toggleUser(user._id)}
                  className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0"
                  style={{ borderColor: 'var(--c-border)', background: active ? 'var(--brand-primary-soft)' : 'transparent' }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] text-xs font-black text-white" style={{ background: active ? 'var(--brand-primary)' : 'var(--brand-secondary)' }}>
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

        <button className="btn-primary w-full" onClick={createRoom} disabled={creating || !form.name.trim()}>
          <Video className="h-4 w-4" />
          {creating ? 'Starting meeting...' : 'Start and open room'}
        </button>
      </div>
    </Modal>
  );
};

export default Meetings;
