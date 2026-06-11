// src/pages/MeetingLobby.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, Plus, Users, Clock,
  ChevronRight, Copy, Check, Search, X, Hash, Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import moment from 'moment-timezone';
import { useNotifications } from '../context/NotificationContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

const getFullName = (user) => {
  if (!user) return 'Unknown';
  if (user.fullName) return user.fullName.trim();
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
};

// ── Camera preview ────────────────────────────────────────────────────────────
const CameraPreview = ({ videoEnabled, audioEnabled, onToggleVideo, onToggleAudio }) => {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      } catch { /* Camera unavailable */ }
    };
    start();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = videoEnabled; }); }, [videoEnabled]);
  useEffect(() => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = audioEnabled; }); }, [audioEnabled]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden" style={{ backgroundColor: '#111827' }}>
      <video ref={videoRef} autoPlay muted playsInline
        className={`w-full h-full object-cover ${videoEnabled ? '' : 'hidden'}`}
        style={{ transform: 'scaleX(-1)' }} />
      {!videoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#111827' }}>
          <VideoOff className="w-8 h-8" style={{ color: '#6b7280' }} />
        </div>
      )}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <button onClick={onToggleAudio}
          className="p-2.5 rounded-full transition-colors"
          style={{ backgroundColor: audioEnabled ? 'rgba(55,65,81,0.9)' : '#dc2626', color: '#fff' }}>
          {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
        <button onClick={onToggleVideo}
          className="p-2.5 rounded-full transition-colors"
          style={{ backgroundColor: videoEnabled ? 'rgba(55,65,81,0.9)' : '#dc2626', color: '#fff' }}>
          {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>
      </div>
      <div className="absolute top-2 right-2">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px]"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <span className={`w-1.5 h-1.5 rounded-full ${audioEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
          Preview
        </span>
      </div>
    </div>
  );
};

// ── Create Room Modal ─────────────────────────────────────────────────────────
const CreateRoomModal = ({ onClose, onCreated, users, token }) => {
  const [name,         setName]         = useState('');
  const [description,  setDescription]  = useState('');
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [search,       setSearch]       = useState('');
  const [muteOnEntry,  setMuteOnEntry]  = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const nameRef = useRef(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const filtered = users.filter(u =>
    getFullName(u).toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = id => setInvitedUsers(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Enter a meeting name'); return; }
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/rooms`, {
        name: name.trim(), description: description.trim(),
        type: 'instant', invitedUsers, settings: { muteOnEntry },
      }, { headers: { Authorization: `Bearer ${token}` } });
      onCreated(res.data.room);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally { setIsLoading(false); }
  };

  const inputStyle = {
    backgroundColor: 'var(--bg-subtle)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-color)',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
        className="rounded-2xl shadow-2xl w-full max-w-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>New Meeting</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Start an instant video room</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Meeting Name *
            </label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Weekly Standup"
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--brand-accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              maxLength={100} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Description (optional)
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What's this meeting about?"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition-colors resize-none"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--brand-accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              maxLength={300} />
          </div>

          {/* Invite */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Invite Teammates ({invitedUsers.length} selected)
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search teammates…"
                className="w-full pl-8 pr-4 py-2 rounded-xl border text-sm focus:outline-none transition-colors"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--brand-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-xl border divide-y"
              style={{ borderColor: 'var(--border-color)', divideColor: 'var(--border-color)' }}>
              {filtered.length === 0 && (
                <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>No teammates found</p>
              )}
              {filtered.map(u => {
                const sel = invitedUsers.includes(u._id);
                return (
                  <div key={u._id} onClick={() => toggleUser(u._id)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
                    style={{ backgroundColor: sel ? 'var(--brand-light)' : 'transparent' }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: 'var(--brand-primary)' }}>
                      {getFullName(u).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{getFullName(u)}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.position || u.email}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                      style={{ backgroundColor: sel ? 'var(--brand-primary)' : 'transparent', borderColor: sel ? 'var(--brand-primary)' : 'var(--border-color)' }}>
                      {sel && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mute toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border cursor-pointer"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}
            onClick={() => setMuteOnEntry(p => !p)}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mute on entry</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Everyone joins muted</p>
            </div>
            <div className="relative flex-shrink-0" style={{ width: 40, height: 22 }}>
              <div className="w-full h-full rounded-full transition-colors"
                style={{ backgroundColor: muteOnEntry ? 'var(--brand-primary)' : 'var(--border-color)' }} />
              <div className="absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform"
                style={{ transform: muteOnEntry ? 'translateX(18px)' : 'translateX(0)' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            Cancel
          </button>
          <button onClick={handleCreate} disabled={isLoading || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Video className="w-4 h-4" />
            {isLoading ? 'Creating…' : 'Start Meeting'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Room Card ─────────────────────────────────────────────────────────────────
const RoomCard = ({ room, onJoin, currentUserId }) => {
  const [copied, setCopied] = useState(false);
  const activePeers = room.participants?.filter(p => p.isActive).length || 0;
  const isHost = room.host?._id === currentUserId || room.host === currentUserId ||
    room.host?._id?.toString() === currentUserId?.toString();
  const isActive = room.status === 'active' || room.status === 'waiting';

  const copyLink = e => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div whileHover={{ y: -1 }}
      onClick={() => onJoin(room.roomId)}
      className="rounded-xl border p-4 cursor-pointer transition-all group"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-color)'; e.currentTarget.style.borderColor = 'var(--brand-accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{room.name}</h3>
            {isHost && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>
                Host
              </span>
            )}
            {room.isLocked && <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
          </div>
          {room.description && (
            <p className="text-xs truncate ml-4" style={{ color: 'var(--text-muted)' }}>{room.description}</p>
          )}
        </div>
        <button onClick={copyLink}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <Users className="w-3.5 h-3.5" />
            {activePeers} {activePeers === 1 ? 'person' : 'people'}
          </span>
          <span className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <Hash className="w-3 h-3" />{room.roomId}
          </span>
        </div>
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
          style={isActive
            ? { backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }
            : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
          {isActive ? 'Join' : 'Ended'} <ChevronRight className="w-3 h-3" />
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          {getFullName(room.host).charAt(0)}
        </div>
        <span className="truncate">{getFullName(room.host)} · {moment(room.createdAt).fromNow()}</span>
      </div>
    </motion.div>
  );
};

// ── Main Lobby ────────────────────────────────────────────────────────────────
const MeetingLobby = () => {
  const { user } = useOutletContext();
  const navigate  = useNavigate();
  const token     = localStorage.getItem('token');
  const { markTypeRead } = useNotifications();

  const [showCreate,    setShowCreate]    = useState(false);
  const [joinCode,      setJoinCode]      = useState('');
  const [rooms,         setRooms]         = useState([]);
  const [allUsers,      setAllUsers]      = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [videoEnabled,  setVideoEnabled]  = useState(true);
  const [audioEnabled,  setAudioEnabled]  = useState(true);
  const [tab,           setTab]           = useState('active');

  useEffect(() => {
    markTypeRead?.('meeting');
  }, [markTypeRead]);

  const fetchRooms = useCallback(async () => {
    try {
      const [activeRes, myRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/rooms/active`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/rooms`,        { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const active = activeRes.data.rooms || [];
      const mine   = myRes.data.rooms     || [];
      const seen   = new Set(active.map(r => r.roomId));
      mine.forEach(r => { if (!seen.has(r.roomId)) active.push(r); });
      setRooms(active);
    } catch {}
    finally { setIsLoading(false); }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/chats/init`, { headers: { Authorization: `Bearer ${token}` } });
      const uid = user?._id || user?.id;
      setAllUsers((res.data.users || []).filter(u => u._id !== uid));
    } catch {}
  }, [token, user]);

  useEffect(() => {
    fetchRooms();
    fetchUsers();
    const interval = setInterval(fetchRooms, 15000);
    return () => clearInterval(interval);
  }, [fetchRooms, fetchUsers]);

  const handleJoin = () => {
    const code = joinCode.trim().toLowerCase();
    if (!code) { toast.error('Enter a meeting code'); return; }
    navigate(`/room/${code}`);
  };

  const handleRoomCreated = room => { setShowCreate(false); navigate(`/room/${room.roomId}`); };

  const activeRooms = rooms.filter(r => r.status === 'active' || r.status === 'waiting');
  const recentRooms = rooms.filter(r => r.status === 'ended').slice(0, 10);
  const uid         = user?._id || user?.id;

  return (
    <div className="space-y-5 py-4">
      <Toaster position="top-right" />

      <AnimatePresence>
        {showCreate && (
          <CreateRoomModal
            onClose={() => setShowCreate(false)}
            onCreated={handleRoomCreated}
            users={allUsers}
            token={token}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>MeetRoom</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Video conferencing</p>
          </div>
        </div>
        {/* Live count badge */}
        {activeRooms.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: 'rgba(22,163,74,.1)', color: '#16a34a' }}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-bold">{activeRooms.length} active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left panel ── */}
        <div className="space-y-4">
          <CameraPreview
            videoEnabled={videoEnabled}
            audioEnabled={audioEnabled}
            onToggleVideo={() => setVideoEnabled(p => !p)}
            onToggleAudio={() => setAudioEnabled(p => !p)}
          />

          {/* New meeting button */}
          <button onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-3 p-4 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">New Meeting</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Start an instant room</p>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto" style={{ opacity: 0.6 }} />
          </button>

          {/* Join by code */}
          <div className="flex gap-2">
            <input value={joinCode} onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Meeting code"
              className="flex-1 px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none font-mono transition-colors"
              style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)' }}
              onFocus={e => e.target.style.borderColor = 'var(--brand-accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--input-border)'} />
            <button onClick={handleJoin}
              className="px-4 py-2.5 rounded-xl border text-sm font-bold transition-colors flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', color: 'var(--brand-primary)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--brand-light)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}>
              Join
            </button>
          </div>

          {/* Stats */}
          <div className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Overview</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <p className="text-2xl font-black" style={{ color: 'var(--brand-primary)' }}>{activeRooms.length}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Active</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                <p className="text-2xl font-black" style={{ color: '#16a34a' }}>
                  {activeRooms.reduce((s, r) => s + (r.participants?.filter(p => p.isActive).length || 0), 0)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>In meetings</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right panel — room list ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
            style={{ backgroundColor: 'var(--bg-subtle)' }}>
            {[
              { key: 'active', label: 'Active Rooms', count: activeRooms.length },
              { key: 'recent', label: 'Recent',       count: recentRooms.length },
            ].map(({ key, label, count }) => (
              <button key={key} onClick={() => setTab(key)}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                style={tab === key
                  ? { backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 3px var(--shadow-color)' }
                  : { color: 'var(--text-secondary)' }}>
                {label}
                {count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={tab === key
                      ? { backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }
                      : { backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Room list */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl border p-4 animate-pulse"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                  <div className="h-4 rounded w-3/4 mb-3" style={{ backgroundColor: 'var(--bg-hover)' }} />
                  <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                </div>
              ))}
            </div>
          ) : tab === 'active' ? (
            activeRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'var(--bg-subtle)' }}>
                  <Video className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                </div>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>No active meetings</h3>
                <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>Start a new one or wait for an invite</p>
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--brand-primary)' }}>
                  <Plus className="w-4 h-4" /> New Meeting
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence>
                  {activeRooms.map((room, i) => (
                    <motion.div key={room.roomId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }}>
                      <RoomCard room={room} onJoin={id => navigate(`/room/${id}`)} currentUserId={uid} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )
          ) : (
            recentRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-xl border"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                <Clock className="w-10 h-10 mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No recent meetings</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentRooms.map((room, i) => (
                  <motion.div key={room.roomId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .04 }}>
                    <RoomCard room={room} onJoin={id => navigate(`/room/${id}`)} currentUserId={uid} />
                  </motion.div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingLobby;