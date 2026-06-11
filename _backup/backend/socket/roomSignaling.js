import Room from '../models/roomModel.js';
import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

const DISCONNECT_GRACE_MS = 12000;

const normalizeMediaState = (mediaState = {}) => ({
  audioOff: mediaState.audioOff ?? false,
  videoOff: mediaState.videoOff ?? false,
  screen: mediaState.screen ?? false,
});

const leaveKey = (roomId, userId) => `${roomId}:${userId}`;

const clearPendingLeave = (pendingLeaves, roomId, userId) => {
  if (!roomId || !userId) return;
  const key = leaveKey(roomId, userId);
  const timer = pendingLeaves.get(key);
  if (timer) {
    clearTimeout(timer);
    pendingLeaves.delete(key);
  }
};

export const setupRoomSignaling = (io) => {
  const roomNs = io.of('/room');

  roomNs.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Auth token required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;

      const user = await User.findById(decoded.id).select('firstName lastName fullName avatar');
      if (!user) return next(new Error('User not found'));

      socket.user = {
        id: decoded.id,
        _id: decoded.id,
        name: user.fullName?.trim() || `${user.firstName} ${user.lastName}`.trim(),
        avatar: user.avatar || '',
      };

      next();
    } catch (err) {
      console.error('Room socket auth error:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  const roomPeers = new Map();
  const pendingLeaves = new Map();

  const removeDuplicatePeers = (roomId, currentSocketId, userId) => {
    const peers = roomPeers.get(roomId);
    if (!peers) return;

    for (const [socketId, peer] of Array.from(peers.entries())) {
      if (socketId === currentSocketId || String(peer.userId) !== String(userId)) continue;
      peers.delete(socketId);

      const staleSocket = roomNs.sockets.get(socketId);
      if (staleSocket) {
        staleSocket.leave(roomId);
        staleSocket.currentRoom = null;
      }

      roomNs.to(roomId).emit('peerLeft', {
        socketId,
        user: peer.user,
        reconnecting: true,
      });
    }

    if (peers.size === 0) {
      roomPeers.delete(roomId);
    }
  };

  roomNs.on('connection', (socket) => {
    console.log(`Room socket connected: ${socket.id} | User: ${socket.user?.name}`);

    socket.on('joinRoom', async ({ roomId, mediaState }) => {
      if (!roomId) {
        socket.emit('joinError', { message: 'Room ID is required' });
        return;
      }

      try {
        const room = await Room.findOne({ roomId });
        if (!room) {
          socket.emit('joinError', { message: 'Room not found' });
          return;
        }
        if (room.status === 'ended') {
          socket.emit('joinError', { message: 'This meeting has ended' });
          return;
        }
        if (room.isLocked) {
          socket.emit('joinError', { message: 'This room is locked by the host' });
          return;
        }

        clearPendingLeave(pendingLeaves, roomId, socket.userId);

        if (!roomPeers.has(roomId)) {
          roomPeers.set(roomId, new Map());
        }
        removeDuplicatePeers(roomId, socket.id, socket.userId);
        if (!roomPeers.has(roomId)) {
          roomPeers.set(roomId, new Map());
        }

        const peers = roomPeers.get(roomId);
        if (peers.size >= room.maxParticipants) {
          socket.emit('joinError', { message: `Room is full (max ${room.maxParticipants})` });
          return;
        }

        socket.join(roomId);
        socket.currentRoom = roomId;

        const peerInfo = {
          userId: socket.userId,
          socketId: socket.id,
          user: socket.user,
          mediaState: normalizeMediaState(mediaState),
          joinedAt: Date.now(),
        };
        peers.set(socket.id, peerInfo);

        const existingPeers = [];
        peers.forEach((peer, socketId) => {
          if (socketId === socket.id) return;
          existingPeers.push({
            socketId,
            user: peer.user,
            mediaState: peer.mediaState,
          });
        });

        socket.emit('roomJoined', {
          roomId,
          existingPeers,
          room: {
            name: room.name,
            settings: room.settings,
            hostId: room.host.toString(),
            isLocked: room.isLocked,
          },
        });

        socket.to(roomId).emit('peerJoined', {
          socketId: socket.id,
          user: socket.user,
          mediaState: peerInfo.mediaState,
        });

        const existingParticipant = room.participants.find(
          (participant) => participant.userId.toString() === socket.userId,
        );
        if (existingParticipant) {
          existingParticipant.isActive = true;
          existingParticipant.socketId = socket.id;
          existingParticipant.joinedAt = new Date();
          existingParticipant.leftAt = undefined;
        } else {
          room.participants.push({
            userId: socket.userId,
            socketId: socket.id,
            isActive: true,
            role: room.host.toString() === socket.userId ? 'host' : 'participant',
          });
        }

        if (room.status === 'waiting') {
          room.status = 'active';
          room.startedAt = new Date();
        }

        await room.save();

        roomNs.to(roomId).emit('roomChatMessage', {
          type: 'system',
          message: `${socket.user.name} joined`,
          timestamp: new Date().toISOString(),
        });

        console.log(`Joined room ${roomId}: ${socket.user.name} (${peers.size} peers)`);
      } catch (err) {
        console.error('joinRoom error:', err.message);
        socket.emit('joinError', { message: 'Failed to join room. Please try again.' });
      }
    });

    socket.on('offer', ({ targetSocketId, offer, roomId }) => {
      if (!targetSocketId || !offer) return;
      socket.to(targetSocketId).emit('offer', {
        offer,
        fromSocketId: socket.id,
        fromUser: socket.user,
        roomId,
      });
    });

    socket.on('answer', ({ targetSocketId, answer, roomId }) => {
      if (!targetSocketId || !answer) return;
      socket.to(targetSocketId).emit('answer', {
        answer,
        fromSocketId: socket.id,
        roomId,
      });
    });

    socket.on('iceCandidate', ({ targetSocketId, candidate, roomId }) => {
      if (!targetSocketId || !candidate) return;
      socket.to(targetSocketId).emit('iceCandidate', {
        candidate,
        fromSocketId: socket.id,
        roomId,
      });
    });

    socket.on('mediaStateChange', ({ roomId, mediaState }) => {
      const peers = roomPeers.get(roomId);
      if (peers?.has(socket.id)) {
        peers.get(socket.id).mediaState = normalizeMediaState(mediaState);
      }
      socket.to(roomId).emit('peerMediaStateChange', {
        socketId: socket.id,
        mediaState,
      });
    });

    socket.on('roomChat', ({ roomId, message }) => {
      if (!roomId || !message?.trim()) return;

      const chatMsg = {
        sender: socket.userId,
        senderName: socket.user.name,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        type: 'text',
      };

      roomNs.to(roomId).emit('roomChatMessage', chatMsg);

      Room.findOne({ roomId })
        .then((room) => {
          if (!room) return null;
          room.chatMessages.push({ ...chatMsg, timestamp: new Date() });
          if (room.chatMessages.length > 500) {
            room.chatMessages = room.chatMessages.slice(-500);
          }
          return room.save();
        })
        .catch((err) => console.error('Chat persist error:', err.message));
    });

    socket.on('raiseHand', ({ roomId, raised }) => {
      socket.to(roomId).emit('peerHandRaise', {
        socketId: socket.id,
        user: socket.user,
        raised: !!raised,
      });
    });

    socket.on('reaction', ({ roomId, emoji }) => {
      roomNs.to(roomId).emit('peerReaction', {
        socketId: socket.id,
        user: socket.user,
        emoji,
      });
    });

    socket.on('screenShareChange', ({ roomId, isSharing }) => {
      socket.to(roomId).emit('peerScreenShare', {
        socketId: socket.id,
        user: socket.user,
        isSharing: !!isSharing,
      });
    });

    socket.on('muteParticipant', async ({ roomId, targetSocketId }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room || room.host.toString() !== socket.userId) return;
        roomNs.to(targetSocketId).emit('forceMute', { by: socket.user });
      } catch (err) {
        console.error('muteParticipant error:', err.message);
      }
    });

    socket.on('lockRoom', async ({ roomId, locked }) => {
      try {
        const room = await Room.findOne({ roomId });
        if (!room || room.host.toString() !== socket.userId) return;
        room.isLocked = !!locked;
        await room.save();
        roomNs.to(roomId).emit('roomLockChange', { locked: room.isLocked, by: socket.user });
      } catch (err) {
        console.error('lockRoom error:', err.message);
      }
    });

    socket.on('leaveRoom', ({ roomId }) => {
      const activeRoomId = roomId || socket.currentRoom;
      clearPendingLeave(pendingLeaves, activeRoomId, socket.userId);
      if (activeRoomId) {
        handleLeave(socket, activeRoomId, roomPeers, roomNs);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Room socket disconnected: ${socket.id} (${reason})`);
      const activeRoomId = socket.currentRoom;
      if (!activeRoomId) return;

      clearPendingLeave(pendingLeaves, activeRoomId, socket.userId);
      const key = leaveKey(activeRoomId, socket.userId);
      const timer = setTimeout(() => {
        pendingLeaves.delete(key);
        if (socket.currentRoom === activeRoomId) {
          handleLeave(socket, activeRoomId, roomPeers, roomNs);
        }
      }, DISCONNECT_GRACE_MS);

      pendingLeaves.set(key, timer);
    });
  });

  return roomNs;
};

async function handleLeave(socket, roomId, roomPeers, roomNs) {
  if (!roomId) return;

  const peers = roomPeers.get(roomId);
  const peerInfo = peers?.get(socket.id);
  if (peers) {
    peers.delete(socket.id);
    if (peers.size === 0) {
      roomPeers.delete(roomId);
    }
  }

  socket.leave(roomId);
  socket.currentRoom = null;

  if (peerInfo) {
    socket.to(roomId).emit('peerLeft', {
      socketId: socket.id,
      user: peerInfo.user || socket.user,
    });

    socket.to(roomId).emit('roomChatMessage', {
      type: 'system',
      message: `${peerInfo.user?.name || socket.user?.name || 'A participant'} left`,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const room = await Room.findOne({ roomId });
    if (!room) return;

    const participant = room.participants.find(
      (entry) => entry.socketId === socket.id && entry.isActive,
    );
    if (participant) {
      participant.isActive = false;
      participant.leftAt = new Date();
    }

    const remaining = roomPeers.get(roomId);
    if (!remaining || remaining.size === 0) {
      room.status = 'ended';
      room.endedAt = new Date();
    }

    await room.save();
  } catch (err) {
    console.error('handleLeave DB error:', err.message);
  }
}