// src/pages/VideoRoom.jsx
// WebRTC mesh conference room — all logic preserved, styling uses CSS variables
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff,
  MessageSquare, Users, Hand, Smile, Copy, Check,
  Maximize2, Minimize2, LayoutGrid, Columns,
  Send, X, Loader2, AlertCircle, Pin, PinOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io as socketIO } from 'socket.io-client';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { VideoTile, FloatingReaction, ChatPanel, ParticipantsPanel, getFullName } from './VideoRoomComponents';
import { useNotifications } from '../context/NotificationContext.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302'   },
    { urls: 'stun:stun1.l.google.com:19302'  },
    { urls: 'stun:stun2.l.google.com:19302'  },
    { urls: 'stun:stun.cloudflare.com:3478'  },
  ],
  iceCandidatePoolSize: 10,
};

const REACTIONS = ['👍', '❤️', '😂', '🔥', '👏', '😮', '🎉', '💯'];

// ── Local video tile ──────────────────────────────────────────────────────────
const LocalVideoTile = React.memo(({
  localStream, screenStream, isScreenSharing, audioEnabled, videoEnabled,
  user, isPinned, onPin, isLarge,
}) => {
  const cameraRef = useRef(null);
  const screenRef = useRef(null);
  const name      = getFullName(user);

  useEffect(() => {
    if (cameraRef.current && localStream && cameraRef.current.srcObject !== localStream) {
      cameraRef.current.srcObject = localStream;
      cameraRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (screenRef.current && screenStream && screenRef.current.srcObject !== screenStream) {
      screenRef.current.srcObject = screenStream;
      screenRef.current.play().catch(() => {});
    }
  }, [screenStream]);

  const showCamera = videoEnabled && !isScreenSharing && !!localStream;
  const showScreen = isScreenSharing && !!screenStream;
  const showAvatar = !showCamera && !showScreen;

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${isLarge ? 'h-full w-full' : 'w-full aspect-video'}`}
      style={{
        backgroundColor: '#111827',
        outline: isPinned ? '2px solid var(--brand-primary)' : 'none',
        outlineOffset: '-2px',
      }}
    >
      <video ref={cameraRef} autoPlay muted playsInline
        className={`w-full h-full object-cover ${showCamera ? '' : 'hidden'}`}
        style={{ transform: 'scaleX(-1)' }} />
      <video ref={screenRef} autoPlay muted playsInline
        className={`w-full h-full object-contain bg-black ${showScreen ? '' : 'hidden'}`} />

      {showAvatar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ backgroundColor: '#111827' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs" style={{ color: '#9ca3af' }}>{name}</span>
        </div>
      )}

      {/* Pin on hover */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-start justify-end p-2">
        <button onClick={onPin} className="p-1.5 rounded-lg text-white"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <span className="text-white text-xs font-medium truncate">{name} (You)</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!audioEnabled && <div className="p-0.5 rounded" style={{ backgroundColor: '#dc2626' }}><MicOff className="w-3 h-3 text-white" /></div>}
          {!videoEnabled && !isScreenSharing && <div className="p-0.5 rounded" style={{ backgroundColor: '#374151' }}><VideoOff className="w-3 h-3 text-white" /></div>}
          {isScreenSharing && <div className="p-0.5 rounded" style={{ backgroundColor: '#16a34a' }}><Monitor className="w-3 h-3 text-white" /></div>}
        </div>
      </div>
    </div>
  );
});
LocalVideoTile.displayName = 'LocalVideoTile';

// ── Preview screen ────────────────────────────────────────────────────────────
const PreviewScreen = ({ roomInfo, roomId, user, onJoin, onCancel }) => {
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      } catch { setVideoOn(false); }
    };
    start();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = videoOn; }); }, [videoOn]);
  useEffect(() => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = audioOn; }); }, [audioOn]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#030712' }}>
      <Toaster />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl border"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}>
        <div className="text-center mb-5">
          <h1 className="text-xl font-bold text-white">{roomInfo?.name || 'Meeting Room'}</h1>
          <p className="text-sm font-mono mt-1" style={{ color: '#6b7280' }}>{roomId}</p>
        </div>

        {/* Camera preview */}
        <div className="relative aspect-video rounded-xl overflow-hidden mb-5" style={{ backgroundColor: '#1f2937' }}>
          <video ref={videoRef} autoPlay muted playsInline
            className={`w-full h-full object-cover ${videoOn ? '' : 'hidden'}`}
            style={{ transform: 'scaleX(-1)' }} />
          {!videoOn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoOff className="w-10 h-10" style={{ color: '#6b7280' }} />
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
            <button onClick={() => setAudioOn(p => !p)}
              className="p-3 rounded-full transition-colors"
              style={{ backgroundColor: audioOn ? 'rgba(55,65,81,0.9)' : '#dc2626', color: '#fff' }}>
              {audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button onClick={() => setVideoOn(p => !p)}
              className="p-3 rounded-full transition-colors"
              style={{ backgroundColor: videoOn ? 'rgba(55,65,81,0.9)' : '#dc2626', color: '#fff' }}>
              {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <p className="text-center text-sm mb-5" style={{ color: '#9ca3af' }}>
          Joining as <span className="text-white font-semibold">{getFullName(user)}</span>
        </p>

        <button onClick={() => onJoin({ audioOn, videoOn })}
          className="w-full py-3.5 font-bold rounded-xl text-white flex items-center justify-center gap-2 text-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          <Video className="w-5 h-5" /> Join Meeting
        </button>
        <button onClick={onCancel}
          className="w-full py-3 mt-2 rounded-xl text-sm transition-colors"
          style={{ border: '1px solid #1f2937', color: '#9ca3af' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1f2937'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          Cancel
        </button>
      </motion.div>
    </div>
  );
};

// ── Control button ────────────────────────────────────────────────────────────
const CtrlBtn = ({ onClick, active, offIcon, onIcon, label, redWhenOff = false, badge }) => (
  <button onClick={onClick}
    className="relative flex flex-col items-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-colors"
    style={{
      color: !active && redWhenOff ? '#f87171' : active ? '#fff' : '#9ca3af',
      backgroundColor: !active && redWhenOff ? 'rgba(220,38,38,0.2)' : 'transparent',
    }}
    onMouseEnter={e => { if (!(!active && redWhenOff)) e.currentTarget.style.backgroundColor = '#1f2937'; }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = !active && redWhenOff ? 'rgba(220,38,38,0.2)' : 'transparent'; }}>
    {active ? onIcon : offIcon}
    <span className="text-[10px] font-medium hidden sm:block">{label}</span>
    {badge != null && badge > 0 && (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </button>
);

// ── Main VideoRoom ────────────────────────────────────────────────────────────
const VideoRoom = ({ embeddedUser = null, onLogout: onLogoutProp = null }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const user = embeddedUser || outletContext.user || null;
  const token = localStorage.getItem('token');
  const { markTypeRead } = useNotifications();

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase,          setPhase]          = useState('loading');
  const [errorMsg,       setErrorMsg]       = useState('');
  const [roomInfo,       setRoomInfo]       = useState(null);
  const [localStream,    setLocalStream]    = useState(null);
  const [screenStream,   setScreenStream]   = useState(null);
  const [audioEnabled,   setAudioEnabled]   = useState(true);
  const [videoEnabled,   setVideoEnabled]   = useState(true);
  const [isScreenSharing,setIsScreenSharing]= useState(false);
  const [screenShareSupported, setScreenShareSupported] = useState(false);
  const [peers,          setPeers]          = useState({});
  const [layout,         setLayout]         = useState('grid');
  const [pinnedId,       setPinnedId]       = useState(null);
  const [showChat,       setShowChat]       = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReactions,  setShowReactions]  = useState(false);
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const [handRaised,     setHandRaised]     = useState(false);
  const [chatMessages,   setChatMessages]   = useState([]);
  const [unreadChat,     setUnreadChat]     = useState(0);
  const [reactions,      setReactions]      = useState([]);
  const [isSpeaking,     setIsSpeaking]     = useState({});
  const [linkCopied,     setLinkCopied]     = useState(false);
  const [isLeaving,      setIsLeaving]      = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const socketRef          = useRef(null);
  const localStreamRef     = useRef(null);
  const peersRef           = useRef({});
  const containerRef       = useRef(null);
  const iceCandidateQueue  = useRef({});
  const screenStreamRef    = useRef(null);
  const cleanupDoneRef     = useRef(false);
  const shouldBlockNavigation = phase === 'room' && !isLeaving;

  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { peersRef.current = peers; }, [peers]);

  useEffect(() => {
    cleanupDoneRef.current = false;
    setIsLeaving(false);
  }, [roomId]);

  useEffect(() => {
    if (roomId) {
      markTypeRead?.('meeting');
    }
  }, [markTypeRead, roomId]);

  useEffect(() => {
    if (!shouldBlockNavigation) return undefined;

    const handlePopState = () => {
      window.history.pushState({ roomGuard: roomId }, '', window.location.href);
      toast('Use Leave to exit the meeting first.', { duration: 2200, position: 'top-center' });
    };

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.history.pushState({ roomGuard: roomId }, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId, shouldBlockNavigation]);

  const cleanupConnections = useCallback(({ emitLeave = false } = {}) => {
    if (cleanupDoneRef.current) return;
    cleanupDoneRef.current = true;

    const activeSocket = socketRef.current;
    if (emitLeave && activeSocket?.connected && roomId) {
      activeSocket.emit('leaveRoom', { roomId });
    }
    activeSocket?.removeAllListeners();
    activeSocket?.disconnect();
    socketRef.current = null;

    Object.values(peersRef.current).forEach(p => p.connection?.close());
    peersRef.current = {};
    iceCandidateQueue.current = {};
    setPeers({});
    setPinnedId(null);
    setShowChat(false);
    setShowParticipants(false);
    setUnreadChat(0);

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);

    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
  }, [roomId]);

  const exitRoom = useCallback((destination = '/meetroom', options = {}) => {
    const { emitLeave = false, delayMs = 0 } = options;
    setIsLeaving(true);
    cleanupConnections({ emitLeave });

    const go = () => navigate(destination);
    if (delayMs > 0) {
      window.setTimeout(go, delayMs);
      return;
    }
    go();
  }, [cleanupConnections, navigate]);

  // ── Screen share support ───────────────────────────────────────────────────
  useEffect(() => {
    setScreenShareSupported(!!(navigator.mediaDevices?.getDisplayMedia));
  }, []);

  // ── Load room info ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoomInfo(res.data.room);
        setPhase(res.data.room.status === 'ended' ? 'ended' : 'preview');
      } catch (err) {
        setErrorMsg(err.response?.status === 404 ? 'Room not found.' : 'Failed to load room.');
        setPhase('error');
      }
    };
    load();
  }, [roomId, token]);

  // ── Create peer connection ─────────────────────────────────────────────────
  const createPeerConnection = useCallback((targetSocketId, targetUser) => {
    peersRef.current[targetSocketId]?.connection?.close();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (!remoteStream) return;
      setPeers(prev => ({
        ...prev,
        [targetSocketId]: {
          ...prev[targetSocketId],
          stream: remoteStream,
          user: targetUser || prev[targetSocketId]?.user,
          mediaState: prev[targetSocketId]?.mediaState || {},
        },
      }));
      peersRef.current[targetSocketId] = {
        ...peersRef.current[targetSocketId],
        stream: remoteStream,
        connection: pc,
        user: targetUser || peersRef.current[targetSocketId]?.user,
      };
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current?.connected) {
        socketRef.current.emit('iceCandidate', { targetSocketId, candidate, roomId });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') { console.warn(`ICE failed for ${targetSocketId}, restarting`); pc.restartIce(); }
    };

    peersRef.current[targetSocketId] = { ...peersRef.current[targetSocketId], connection: pc, user: targetUser };
    return pc;
  }, [roomId]);

  // ── Drain ICE queue ────────────────────────────────────────────────────────
  const drainIceQueue = useCallback(async (targetSocketId, pc) => {
    const queue = iceCandidateQueue.current[targetSocketId] || [];
    for (const candidate of queue) {
      try { await pc.addIceCandidate(candidate); } catch (e) { console.warn('ICE add error:', e); }
    }
    iceCandidateQueue.current[targetSocketId] = [];
  }, []);

  // ── Join room ──────────────────────────────────────────────────────────────
  const joinRoom = useCallback(async ({ audioOn, videoOn }) => {
    cleanupDoneRef.current = false;
    setIsLeaving(false);
    setPhase('joining');
    setAudioEnabled(audioOn);
    setVideoEnabled(videoOn);

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: videoOn ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setVideoEnabled(false);
      } catch {
        toast.error('Could not access microphone. Check browser permissions.');
        setPhase('preview');
        return;
      }
    }

    stream.getVideoTracks().forEach(t => { t.enabled = videoOn; });
    stream.getAudioTracks().forEach(t => { t.enabled = audioOn; });
    localStreamRef.current = stream;
    setLocalStream(stream);

    const socket = socketIO(`${API_BASE_URL}/room`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinRoom', {
        roomId,
        mediaState: { audioOff: !audioOn, videoOff: !videoOn, screen: false },
      });
    });

    socket.on('roomJoined', async ({ existingPeers, room }) => {
      setRoomInfo(r => ({ ...r, ...room }));
      setPhase('room');

      try {
        const res = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChatMessages(res.data.messages || []);
      } catch {}

      for (const peer of existingPeers) {
        const pc = createPeerConnection(peer.socketId, peer.user);
        setPeers(prev => ({
          ...prev,
          [peer.socketId]: { user: peer.user, stream: null, mediaState: peer.mediaState || {}, connection: pc },
        }));
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);
          socket.emit('offer', { targetSocketId: peer.socketId, offer: pc.localDescription, roomId });
        } catch (err) { console.error('Offer error:', err); }
      }
    });

    socket.on('peerJoined', ({ socketId, user: peerUser, mediaState }) => {
      const pc = createPeerConnection(socketId, peerUser);
      setPeers(prev => ({
        ...prev,
        [socketId]: { user: peerUser, stream: null, mediaState: mediaState || {}, connection: pc },
      }));
      toast.custom(() => (
        <div className="flex items-center gap-3 text-white px-4 py-2.5 rounded-xl text-sm shadow-lg"
          style={{ backgroundColor: '#1f2937' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {getFullName(peerUser).charAt(0)}
          </div>
          <span><strong>{getFullName(peerUser)}</strong> joined</span>
        </div>
      ), { duration: 3000, position: 'top-center' });
    });

    socket.on('offer', async ({ offer, fromSocketId, fromUser }) => {
      let pc = peersRef.current[fromSocketId]?.connection;
      if (!pc || pc.signalingState === 'closed') {
        pc = createPeerConnection(fromSocketId, fromUser);
        setPeers(prev => ({
          ...prev,
          [fromSocketId]: { ...(prev[fromSocketId] || {}), user: fromUser, stream: null, mediaState: prev[fromSocketId]?.mediaState || {}, connection: pc },
        }));
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceQueue(fromSocketId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetSocketId: fromSocketId, answer: pc.localDescription, roomId });
      } catch (err) { console.error('Handle offer error:', err); }
    });

    socket.on('answer', async ({ answer, fromSocketId }) => {
      const pc = peersRef.current[fromSocketId]?.connection;
      if (!pc) return;
      if (pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainIceQueue(fromSocketId, pc);
        } catch (err) { console.error('Handle answer error:', err); }
      }
    });

    socket.on('iceCandidate', async ({ candidate, fromSocketId }) => {
      const pc = peersRef.current[fromSocketId]?.connection;
      const iceCandidate = new RTCIceCandidate(candidate);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try { await pc.addIceCandidate(iceCandidate); } catch (e) { console.warn('ICE add:', e); }
      } else {
        if (!iceCandidateQueue.current[fromSocketId]) iceCandidateQueue.current[fromSocketId] = [];
        iceCandidateQueue.current[fromSocketId].push(iceCandidate);
      }
    });

    socket.on('peerLeft', ({ socketId, user: peerUser }) => {
      peersRef.current[socketId]?.connection?.close();
      delete peersRef.current[socketId];
      delete iceCandidateQueue.current[socketId];
      setPeers(prev => { const n = { ...prev }; delete n[socketId]; return n; });
      setPinnedId(p => p === socketId ? null : p);
      toast.custom(() => (
        <div className="px-4 py-2 rounded-xl text-sm shadow-lg" style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}>
          {getFullName(peerUser)} left
        </div>
      ), { duration: 2000, position: 'top-center' });
    });

    socket.on('peerMediaStateChange', ({ socketId, mediaState }) => {
      setPeers(prev => ({ ...prev, [socketId]: { ...(prev[socketId] || {}), mediaState } }));
      if (peersRef.current[socketId]) peersRef.current[socketId].mediaState = mediaState;
    });

    socket.on('roomChatMessage', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      setShowChat(currentlyShowing => {
        if (!currentlyShowing) setUnreadChat(c => c + 1);
        return currentlyShowing;
      });
    });

    socket.on('peerReaction', ({ user: peerUser, emoji }) => {
      const id = Date.now() + Math.random();
      setReactions(prev => [...prev, { id, emoji, userName: getFullName(peerUser) }]);
    });

    socket.on('peerHandRaise', ({ user: peerUser, raised }) => {
      toast(`✋ ${getFullName(peerUser)} ${raised ? 'raised their hand' : 'lowered their hand'}`,
        { duration: 3000, position: 'top-center' });
    });

    socket.on('roomEnded', () => {
      toast.error('The host ended this meeting');
      exitRoom('/meetroom', { emitLeave: false, delayMs: 1500 });
    });
    socket.on('kicked', ({ message }) => {
      toast.error(message || 'You were removed from the room');
      exitRoom('/meetroom', { emitLeave: false, delayMs: 1500 });
    });
    socket.on('forceMute',  () => { setAudioEnabled(false); localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; }); toast('🔇 You were muted by the host', { duration: 3000 }); });
    socket.on('roomLockChange', ({ locked }) => { setRoomInfo(r => r ? { ...r, isLocked: locked } : r); toast(locked ? '🔒 Room locked' : '🔓 Room unlocked', { duration: 2000 }); });
    socket.on('joinError', ({ message }) => {
      cleanupConnections({ emitLeave: false });
      setErrorMsg(message);
      setPhase('error');
    });

  }, [roomId, token, createPeerConnection, drainIceQueue, exitRoom, cleanupConnections]);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!cleanupDoneRef.current) {
        cleanupConnections({ emitLeave: !isLeaving });
      }
    };
  }, [cleanupConnections, isLeaving]);

  // ── Toggle audio ───────────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = next; });
      socketRef.current?.emit('mediaStateChange', {
        roomId, mediaState: { audioOff: !next, videoOff: !videoEnabled, screen: isScreenSharing },
      });
      return next;
    });
  }, [roomId, videoEnabled, isScreenSharing]);

  // ── Toggle video ───────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    setVideoEnabled(prev => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = next; });
      socketRef.current?.emit('mediaStateChange', {
        roomId, mediaState: { audioOff: !audioEnabled, videoOff: !next, screen: isScreenSharing },
      });
      return next;
    });
  }, [roomId, audioEnabled, isScreenSharing]);

  // ── Screen share ───────────────────────────────────────────────────────────
  const stopScreenShare = useCallback(() => {
    const ss = screenStreamRef.current;
    ss?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    setIsScreenSharing(false);
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraTrack) {
      Object.values(peersRef.current).forEach(({ connection }) => {
        const sender = connection?.getSenders().find(s => s.track?.kind === 'video');
        sender?.replaceTrack(cameraTrack);
      });
    }
    socketRef.current?.emit('screenShareChange', { roomId, isSharing: false });
    socketRef.current?.emit('mediaStateChange', {
      roomId, mediaState: { audioOff: !audioEnabled, videoOff: !videoEnabled, screen: false },
    });
  }, [roomId, audioEnabled, videoEnabled]);

  const startScreenShare = useCallback(async () => {
    if (!screenShareSupported) { toast.error('Screen sharing is not supported on this device/browser'); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15, cursor: 'always' }, audio: false });
      screenStreamRef.current = screen;
      setScreenStream(screen);
      setIsScreenSharing(true);
      const screenTrack = screen.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(({ connection }) => {
        const sender = connection?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack).catch(console.warn);
      });
      screenTrack.onended = stopScreenShare;
      socketRef.current?.emit('screenShareChange', { roomId, isSharing: true });
      socketRef.current?.emit('mediaStateChange', {
        roomId, mediaState: { audioOff: !audioEnabled, videoOff: !videoEnabled, screen: true },
      });
    } catch (err) {
      if (err.name !== 'NotAllowedError') toast.error('Could not start screen sharing. Try on a desktop browser.');
    }
  }, [roomId, audioEnabled, videoEnabled, screenShareSupported, stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) stopScreenShare(); else startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendChat = useCallback((message) => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit('roomChat', { roomId, message: message.trim() });
  }, [roomId]);

  // ── Reactions ──────────────────────────────────────────────────────────────
  const sendReaction = useCallback((emoji) => {
    socketRef.current?.emit('reaction', { roomId, emoji });
    const id = Date.now();
    setReactions(prev => [...prev, { id, emoji, userName: getFullName(user) }]);
    setShowReactions(false);
  }, [roomId, user]);

  // ── Raise hand ─────────────────────────────────────────────────────────────
  const toggleHand = useCallback(() => {
    setHandRaised(p => {
      const raised = !p;
      socketRef.current?.emit('raiseHand', { roomId, raised });
      return raised;
    });
  }, [roomId]);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    exitRoom('/meetroom', { emitLeave: true });
  }, [exitRoom]);

  // ── Copy link ──────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
    setLinkCopied(true);
    toast.success('Link copied!', { duration: 1500 });
    setTimeout(() => setLinkCopied(false), 2500);
  };

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen?.(); setIsFullscreen(true); }
    else { document.exitFullscreen?.(); setIsFullscreen(false); }
  };
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => { if (showChat) setUnreadChat(0); }, [showChat]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const peerList   = useMemo(() => Object.entries(peers), [peers]);
  const totalTiles = peerList.length + 1;

  const gridCols = useMemo(() => {
    if (totalTiles === 1) return 'grid-cols-1';
    if (totalTiles === 2) return 'grid-cols-1 sm:grid-cols-2';
    if (totalTiles <= 4) return 'grid-cols-2';
    if (totalTiles <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  }, [totalTiles]);

  const pinnedPeer = pinnedId && pinnedId !== 'local' ? peers[pinnedId] : null;

  // ── Loading / error / ended ────────────────────────────────────────────────
  const darkScreen = (children) => (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030712' }}>
      {children}
    </div>
  );

  if (phase === 'loading') return darkScreen(
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--brand-accent)' }} />
      <p className="text-sm" style={{ color: '#9ca3af' }}>Loading room…</p>
    </div>
  );

  if (phase === 'error' || phase === 'ended') return darkScreen(
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-8 max-w-sm w-full text-center border"
      style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}>
      <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#f87171' }} />
      <h2 className="text-lg font-bold text-white mb-2">
        {phase === 'ended' ? 'Meeting Ended' : 'Cannot Join'}
      </h2>
      <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
        {phase === 'ended' ? 'This meeting has ended.' : errorMsg}
      </p>
      <button onClick={() => navigate('/meetroom')}
        className="px-6 py-3 rounded-xl font-semibold text-white w-full hover:opacity-90 transition-opacity"
        style={{ backgroundColor: 'var(--brand-primary)' }}>
        Back to Meetings
      </button>
    </motion.div>
  );

  if (phase === 'preview') return (
    <PreviewScreen roomInfo={roomInfo} roomId={roomId} user={user} onJoin={joinRoom} onCancel={() => navigate('/meetroom')} />
  );

  if (phase === 'joining') return darkScreen(
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--brand-accent)' }} />
      <p className="text-white font-semibold">Joining meeting…</p>
      <p className="text-sm" style={{ color: '#6b7280' }}>Connecting peers</p>
    </div>
  );

  // ── Main room ──────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef}
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: '#030712', fontFamily: 'system-ui, sans-serif' }}>
      <Toaster position="top-center" />

      {/* Floating reactions */}
      <AnimatePresence>
        {reactions.map(r => (
          <FloatingReaction key={r.id} emoji={r.emoji} userName={r.userName}
            onDone={() => setReactions(p => p.filter(x => x.id !== r.id))} />
        ))}
      </AnimatePresence>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 z-10"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Video className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h2 className="text-sm font-bold text-white truncate">{roomInfo?.name || 'Meeting'}</h2>
            <p className="text-[11px] font-mono" style={{ color: '#6b7280' }}>{roomId}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ backgroundColor: 'rgba(22,163,74,0.15)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-semibold" style={{ color: '#4ade80' }}>{totalTiles}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: '#1f2937', color: '#d1d5db' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1f2937'}>
            {linkCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:block">{linkCopied ? 'Copied!' : 'Copy link'}</span>
          </button>
          <button onClick={() => setLayout(l => l === 'grid' ? 'spotlight' : 'grid')}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1f2937'}>
            {layout === 'grid' ? <LayoutGrid className="w-4 h-4" /> : <Columns className="w-4 h-4" />}
          </button>
          <button onClick={toggleFullscreen}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1f2937'}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 p-2 sm:p-3 overflow-hidden">
          {layout === 'grid' || !pinnedPeer ? (
            <div className={`grid ${gridCols} gap-2 sm:gap-3 h-full auto-rows-fr`}>
              <LocalVideoTile localStream={localStream} screenStream={screenStream}
                isScreenSharing={isScreenSharing} audioEnabled={audioEnabled}
                videoEnabled={videoEnabled} user={user}
                isPinned={pinnedId === 'local'} onPin={() => setPinnedId(p => p === 'local' ? null : 'local')}
                isLarge={totalTiles === 1} />
              {peerList.map(([socketId, peer]) => (
                <VideoTile key={socketId} stream={peer.stream} user={peer.user} isLocal={false}
                  mediaState={peer.mediaState} isPinned={pinnedId === socketId}
                  onPin={() => setPinnedId(p => p === socketId ? null : socketId)}
                  isLarge={totalTiles === 1} isSpeaking={isSpeaking[socketId]} />
              ))}
            </div>
          ) : (
            <div className="flex h-full gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                {pinnedId === 'local' ? (
                  <LocalVideoTile localStream={localStream} screenStream={screenStream}
                    isScreenSharing={isScreenSharing} audioEnabled={audioEnabled}
                    videoEnabled={videoEnabled} user={user} isPinned
                    onPin={() => setPinnedId(null)} isLarge />
                ) : (
                  <VideoTile stream={pinnedPeer.stream} user={pinnedPeer.user} isLocal={false}
                    mediaState={pinnedPeer.mediaState} isPinned onPin={() => setPinnedId(null)} isLarge />
                )}
              </div>
              <div className="w-36 sm:w-44 flex flex-col gap-2 overflow-y-auto">
                {pinnedId !== 'local' && (
                  <LocalVideoTile localStream={localStream} screenStream={screenStream}
                    isScreenSharing={isScreenSharing} audioEnabled={audioEnabled}
                    videoEnabled={videoEnabled} user={user} isPinned={false}
                    onPin={() => setPinnedId('local')} isLarge={false} />
                )}
                {peerList.filter(([sid]) => sid !== pinnedId).map(([sid, peer]) => (
                  <VideoTile key={sid} stream={peer.stream} user={peer.user} isLocal={false}
                    mediaState={peer.mediaState} isPinned={false} onPin={() => setPinnedId(sid)} isLarge={false} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side panels */}
        <AnimatePresence>
          {showChat && <ChatPanel messages={chatMessages} onSend={sendChat} onClose={() => setShowChat(false)} currentUser={user} />}
          {showParticipants && !showChat && (
            <ParticipantsPanel peers={peers} localUser={user}
              localMediaState={{ audioOff: !audioEnabled, videoOff: !videoEnabled, screen: isScreenSharing }}
              hostId={roomInfo?.hostId} onClose={() => setShowParticipants(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t px-3 sm:px-6 py-3"
        style={{ backgroundColor: '#111827', borderColor: '#1f2937' }}>
        <div className="flex items-center justify-between max-w-3xl mx-auto gap-1 sm:gap-2">
          {/* Left: media */}
          <div className="flex items-center gap-1 sm:gap-2">
            <CtrlBtn onClick={toggleAudio} active={audioEnabled}
              onIcon={<Mic className="w-5 h-5" />} offIcon={<MicOff className="w-5 h-5" />}
              label={audioEnabled ? 'Mute' : 'Unmute'} redWhenOff />
            <CtrlBtn onClick={toggleVideo} active={videoEnabled}
              onIcon={<Video className="w-5 h-5" />} offIcon={<VideoOff className="w-5 h-5" />}
              label={videoEnabled ? 'Stop video' : 'Start video'} redWhenOff />
            <button onClick={toggleScreenShare} disabled={!screenShareSupported}
              title={!screenShareSupported ? 'Screen sharing requires a desktop browser' : isScreenSharing ? 'Stop sharing' : 'Share screen'}
              className="flex flex-col items-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-colors"
              style={!screenShareSupported
                ? { color: '#4b5563', cursor: 'not-allowed' }
                : isScreenSharing
                  ? { backgroundColor: 'rgba(22,163,74,0.2)', color: '#4ade80' }
                  : { color: '#9ca3af' }}>
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              <span className="text-[10px] font-medium hidden sm:block">{isScreenSharing ? 'Stop share' : 'Share'}</span>
            </button>
          </div>

          {/* Center: extras */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={toggleHand}
              className="flex flex-col items-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-colors"
              style={handRaised
                ? { backgroundColor: 'rgba(234,179,8,0.2)', color: '#facc15' }
                : { color: '#9ca3af' }}>
              <Hand className="w-5 h-5" />
              <span className="text-[10px] font-medium hidden sm:block">{handRaised ? 'Lower' : 'Hand'}</span>
            </button>

            <div className="relative">
              <button onClick={() => setShowReactions(p => !p)}
                className="flex flex-col items-center gap-1 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl transition-colors"
                style={{ color: '#9ca3af' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1f2937'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Smile className="w-5 h-5" />
                <span className="text-[10px] font-medium hidden sm:block">React</span>
              </button>
              <AnimatePresence>
                {showReactions && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-2xl p-2 flex gap-1 shadow-2xl z-30 border"
                    style={{ backgroundColor: '#1f2937', borderColor: '#374151' }}>
                    {REACTIONS.map(emoji => (
                      <button key={emoji} onClick={() => sendReaction(emoji)}
                        className="text-xl sm:text-2xl p-1.5 sm:p-2 rounded-xl transition-colors"
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#374151'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: panels + leave */}
          <div className="flex items-center gap-1 sm:gap-2">
            <CtrlBtn onClick={() => { setShowChat(p => !p); setShowParticipants(false); }}
              active={showChat}
              onIcon={<MessageSquare className="w-5 h-5" />} offIcon={<MessageSquare className="w-5 h-5" />}
              label="Chat" badge={showChat ? 0 : unreadChat} />
            <CtrlBtn onClick={() => { setShowParticipants(p => !p); setShowChat(false); }}
              active={showParticipants}
              onIcon={<Users className="w-5 h-5" />} offIcon={<Users className="w-5 h-5" />}
              label="People" />
            <button onClick={leaveRoom}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-semibold text-white transition-colors ml-1"
              style={{ backgroundColor: '#dc2626' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#b91c1c'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dc2626'}>
              <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm">Leave</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoRoom;