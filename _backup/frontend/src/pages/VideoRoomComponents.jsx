// src/pages/VideoRoomComponents.jsx
// All logic preserved exactly — only styling converted to CSS variables
import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Pin, PinOff,
  MessageSquare, Users, Send, X, Crown,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const getFullName = (user) => {
  if (!user) return 'Guest';
  if (typeof user === 'string') return user;
  if (user.name) return user.name;
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Guest';
};

// ── Video Tile ────────────────────────────────────────────────────────────────
// KEY: video element is always in DOM; srcObject set imperatively via useEffect.
// This is the correct WebRTC pattern — never conditionally render <video>.
export const VideoTile = React.memo(({
  stream, user, isLocal, mediaState, isPinned, onPin, isLarge, isSpeaking,
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    } else if (!stream) {
      video.srcObject = null;
    }
  }, [stream]);

  const hasVideo = !!stream && !mediaState?.videoOff;
  const isMuted  = mediaState?.audioOff;
  const name     = getFullName(user);

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${isLarge ? 'h-full w-full' : 'w-full aspect-video'}`}
      style={{
        backgroundColor: '#111827',
        outline: isSpeaking ? '2px solid #4ade80' : isPinned ? '2px solid var(--brand-primary)' : 'none',
        outlineOffset: '-2px',
      }}
    >
      {/* Video always in DOM */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${hasVideo ? '' : 'hidden'}`}
        style={{ transform: isLocal ? 'scaleX(-1)' : 'none' }}
      />

      {/* Avatar fallback */}
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ backgroundColor: '#111827' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs" style={{ color: '#9ca3af' }}>{name}</span>
        </div>
      )}

      {/* Pin button (hover) */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-start justify-end p-2">
        <button onClick={() => onPin?.()}
          className="p-1.5 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.85)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)'}>
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white text-xs font-medium truncate">{name}{isLocal ? ' (You)' : ''}</span>
          {isSpeaking && !isMuted && (
            <span className="flex gap-0.5 items-end h-3 flex-shrink-0">
              {[40, 70, 50].map((h, i) => (
                <span key={i} className="w-0.5 bg-green-400 rounded-full animate-bounce"
                  style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }} />
              ))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isMuted && (
            <div className="p-0.5 rounded" style={{ backgroundColor: '#dc2626' }}>
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
          {mediaState?.videoOff && (
            <div className="p-0.5 rounded" style={{ backgroundColor: '#374151' }}>
              <VideoOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
VideoTile.displayName = 'VideoTile';

// ── Floating Reaction ─────────────────────────────────────────────────────────
export const FloatingReaction = ({ emoji, userName, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: [0, 1, 1, 0], y: -120, scale: [0.5, 1.2, 1, 0.8] }}
      transition={{ duration: 3.5 }}
      className="fixed bottom-32 right-8 flex flex-col items-center gap-1 pointer-events-none z-50"
    >
      <span className="text-5xl">{emoji}</span>
      <span className="text-xs text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        {userName}
      </span>
    </motion.div>
  );
};

// ── Chat Panel ────────────────────────────────────────────────────────────────
// Messages live in parent (VideoRoom) — this is purely presentational.
export const ChatPanel = ({ messages, onSend, onClose, currentUser }) => {
  const [msg,    setMsg]    = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const myId      = currentUser?._id || currentUser?.id;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 80); return () => clearTimeout(t); }, []);

  const handleSend = () => {
    const text = msg.trim();
    if (!text) return;
    onSend(text);
    setMsg('');
    inputRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.18 }}
      className="absolute right-0 top-0 bottom-0 w-72 sm:w-80 flex flex-col z-20 border-l"
      style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: '#1f2937' }}>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
          <span className="text-sm font-bold text-white">Meeting Chat</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1f2937'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 overscroll-contain">
        {messages.length === 0 && (
          <p className="text-center text-xs pt-8" style={{ color: '#6b7280' }}>No messages yet. Say hello!</p>
        )}
        {messages.map((m, i) => {
          if (m.type === 'system') return (
            <div key={i} className="flex justify-center my-2">
              <span className="text-[10px] px-3 py-1 rounded-full" style={{ color: '#6b7280', backgroundColor: '#1f2937' }}>{m.message}</span>
            </div>
          );
          const senderId = m.sender?._id || m.sender;
          const isMe     = senderId === myId || senderId?.toString() === myId?.toString();
          return (
            <div key={i} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className="text-[10px] px-1 font-medium" style={{ color: '#9ca3af' }}>{m.senderName}</span>
              )}
              <div className={`max-w-[85%] px-3 py-2 text-sm break-words leading-relaxed rounded-2xl`}
                style={isMe
                  ? { backgroundColor: 'var(--brand-primary)', color: '#fff', borderBottomRightRadius: 4 }
                  : { backgroundColor: '#1f2937', color: '#e5e7eb', borderBottomLeftRadius: 4 }}>
                {m.message}
              </div>
              {m.timestamp && (
                <span className="text-[10px] px-1" style={{ color: '#4b5563' }}>
                  {new Date(m.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} className="h-px" />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t flex-shrink-0" style={{ borderColor: '#1f2937' }}>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: '#1f2937' }}>
          <input
            ref={inputRef}
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message…"
            className="flex-1 bg-transparent text-sm text-white focus:outline-none"
            style={{ '::placeholder': { color: '#6b7280' } }}
            maxLength={1000}
          />
          <button onClick={handleSend} disabled={!msg.trim()}
            className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
            style={{ color: msg.trim() ? 'var(--brand-accent)' : '#4b5563', cursor: msg.trim() ? 'pointer' : 'not-allowed' }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Participants Panel ────────────────────────────────────────────────────────
export const ParticipantsPanel = ({ peers, localUser, localMediaState, hostId, onClose }) => {
  const allPeers = [
    { socketId: 'local', user: localUser, mediaState: localMediaState || {}, isLocal: true },
    ...Object.entries(peers).map(([sid, p]) => ({
      socketId: sid, user: p.user, mediaState: p.mediaState || {}, isLocal: false,
    })),
  ];

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.18 }}
      className="absolute right-0 top-0 bottom-0 w-64 sm:w-72 flex flex-col z-20 border-l"
      style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#1f2937' }}>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: 'var(--brand-accent)' }} />
          <span className="text-sm font-bold text-white">Participants ({allPeers.length})</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1f2937'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {allPeers.map(peer => {
          const uid    = peer.user?._id || peer.user?.id;
          const isHost = uid === hostId || uid?.toString() === hostId?.toString();
          const name   = getFullName(peer.user);
          return (
            <div key={peer.socketId}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1f2937'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: 'var(--brand-primary)' }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate text-white">
                    {name}{peer.isLocal ? ' (You)' : ''}
                  </p>
                  {isHost && <Crown className="w-3 h-3 flex-shrink-0" style={{ color: '#fbbf24' }} />}
                </div>
                <p className="text-[11px]" style={{ color: '#6b7280' }}>
                  {peer.mediaState?.audioOff ? 'Muted' : 'Unmuted'}
                  {peer.mediaState?.screen ? ' · Sharing' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {peer.mediaState?.audioOff && <MicOff className="w-3.5 h-3.5" style={{ color: '#f87171' }} />}
                {peer.mediaState?.videoOff && <VideoOff className="w-3.5 h-3.5" style={{ color: '#9ca3af' }} />}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};