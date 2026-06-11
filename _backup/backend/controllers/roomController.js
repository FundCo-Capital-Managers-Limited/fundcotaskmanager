// controllers/roomController.js
import Room from '../models/roomModel.js';
import User from '../models/userModel.js';
import { createNotification } from '../utils/notificationService.js';
import { nanoid } from 'nanoid';

// ─── Generate a unique room ID ───────────────────────────────────────────────
const generateRoomId = () => {
    // Format: xxx-xxxx-xxx (like Google Meet)
    const part1 = nanoid(3).toLowerCase();
    const part2 = nanoid(4).toLowerCase();
    const part3 = nanoid(3).toLowerCase();
    return `${part1}-${part2}-${part3}`;
};

// ─── Create a new room ───────────────────────────────────────────────────────
export const createRoom = async (req, res) => {
    try {
        const { name, description, type = 'instant', scheduledFor, maxParticipants, settings, invitedUsers, password } = req.body;

        if (!name || name.trim().length < 1) {
            return res.status(400).json({ success: false, message: 'Room name is required' });
        }

        let roomId;
        let isUnique = false;
        while (!isUnique) {
            roomId = generateRoomId();
            const existing = await Room.findOne({ roomId });
            if (!existing) isUnique = true;
        }

        const room = new Room({
            roomId,
            name: name.trim(),
            description: description?.trim(),
            type,
            host: req.user.id,
            maxParticipants: maxParticipants || 50,
            password: password || null,
            settings: {
                allowVideo: settings?.allowVideo ?? true,
                allowAudio: settings?.allowAudio ?? true,
                allowScreenShare: settings?.allowScreenShare ?? true,
                allowChat: settings?.allowChat ?? true,
                muteOnEntry: settings?.muteOnEntry ?? false,
                waitingRoom: settings?.waitingRoom ?? false,
            },
            invitedUsers: invitedUsers || [],
            scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        });

        await room.save();
        await room.populate('host', 'firstName lastName fullName avatar');

        // Notify invited users via socket
        if (req.io && invitedUsers?.length) {
            invitedUsers.forEach((userId) => {
                req.io.to(`user:${userId}`).emit('roomInvitation', {
                    room: { roomId: room.roomId, name: room.name },
                    from: { id: req.user.id },
                });
            });
        }

        await Promise.all((invitedUsers || []).map((userId) => createNotification({
            userId,
            type: 'meeting',
            title: `Room invitation: ${room.name}`,
            body: 'A live room is ready for you to join.',
            actorId: req.user.id,
            actorName: req.user.fullName || req.user.email || 'A teammate',
            entityId: room.roomId,
            entityType: 'Room',
            data: { roomId: room.roomId, kind: 'room-invite', roomName: room.name },
            io: req.io,
        })));

        res.status(201).json({ success: true, room });
    } catch (err) {
        console.error('Create room error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Get room by roomId ──────────────────────────────────────────────────────
export const getRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findOne({ roomId })
            .populate('host', 'firstName lastName fullName avatar email')
            .populate('participants.userId', 'firstName lastName fullName avatar')
            .populate('invitedUsers', 'firstName lastName fullName avatar');

        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }

        res.json({ success: true, room });
    } catch (err) {
        console.error('Get room error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Get all rooms for current user ─────────────────────────────────────────
export const getUserRooms = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        const query = {
            $or: [
                { host: userId },
                { 'participants.userId': userId },
                { invitedUsers: userId },
            ],
        };

        if (status) query.status = status;

        const rooms = await Room.find(query)
            .populate('host', 'firstName lastName fullName avatar')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, rooms });
    } catch (err) {
        console.error('Get user rooms error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Get active rooms (rooms user can join) ──────────────────────────────────
export const getActiveRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ status: { $in: ['waiting', 'active'] } })
            .populate('host', 'firstName lastName fullName avatar')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ success: true, rooms });
    } catch (err) {
        console.error('Get active rooms error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Update room settings ────────────────────────────────────────────────────
export const updateRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { name, description, settings, isLocked, password } = req.body;

        const room = await Room.findOne({ roomId });
        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

        if (room.host.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only the host can update room settings' });
        }

        if (name) room.name = name.trim();
        if (description !== undefined) room.description = description?.trim();
        if (settings) room.settings = { ...room.settings, ...settings };
        if (isLocked !== undefined) room.isLocked = isLocked;
        if (password !== undefined) room.password = password;

        await room.save();

        if (req.io) {
            req.io.to(roomId).emit('roomUpdated', { settings: room.settings, isLocked: room.isLocked, name: room.name });
        }

        res.json({ success: true, room });
    } catch (err) {
        console.error('Update room error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── End room ────────────────────────────────────────────────────────────────
export const endRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findOne({ roomId });

        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
        if (room.host.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only the host can end the room' });
        }

        room.status = 'ended';
        room.endedAt = new Date();
        room.participants.forEach((p) => { if (p.isActive) { p.isActive = false; p.leftAt = new Date(); } });
        await room.save();

        if (req.io) {
            req.io.to(roomId).emit('roomEnded', { roomId, endedBy: req.user.id });
        }

        res.json({ success: true, message: 'Room ended successfully' });
    } catch (err) {
        console.error('End room error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Kick participant ────────────────────────────────────────────────────────
export const kickParticipant = async (req, res) => {
    try {
        const { roomId, userId } = req.params;
        const room = await Room.findOne({ roomId });

        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
        if (room.host.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only the host can kick participants' });
        }

        const participant = room.participants.find(p => p.userId.toString() === userId && p.isActive);
        if (!participant) return res.status(404).json({ success: false, message: 'Participant not found' });

        participant.isActive = false;
        participant.leftAt = new Date();
        await room.save();

        if (req.io) {
            req.io.to(roomId).emit('participantKicked', { userId, roomId });
            if (participant.socketId) {
                req.io.to(participant.socketId).emit('kicked', { roomId, message: 'You have been removed from the room by the host' });
            }
        }

        res.json({ success: true, message: 'Participant removed' });
    } catch (err) {
        console.error('Kick participant error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Send chat message in room ───────────────────────────────────────────────
export const sendRoomMessage = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { message } = req.body;

        if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty' });

        const room = await Room.findOne({ roomId, status: { $ne: 'ended' } });
        if (!room) return res.status(404).json({ success: false, message: 'Room not found or has ended' });

        const user = await User.findById(req.user.id).select('firstName lastName fullName');
        const chatMsg = {
            sender: req.user.id,
            senderName: user.fullName || `${user.firstName} ${user.lastName}`,
            message: message.trim(),
            timestamp: new Date(),
            type: 'text',
        };

        room.chatMessages.push(chatMsg);
        // Keep only last 500 messages
        if (room.chatMessages.length > 500) {
            room.chatMessages = room.chatMessages.slice(-500);
        }
        await room.save();

        const msgToEmit = { ...chatMsg, _id: room.chatMessages[room.chatMessages.length - 1]._id };
        if (req.io) {
            req.io.to(roomId).emit('roomChatMessage', msgToEmit);
        }

        res.json({ success: true, message: msgToEmit });
    } catch (err) {
        console.error('Send room message error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Get room chat history ───────────────────────────────────────────────────
export const getRoomChat = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findOne({ roomId }).select('chatMessages').populate('chatMessages.sender', 'firstName lastName fullName avatar');

        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

        res.json({ success: true, messages: room.chatMessages });
    } catch (err) {
        console.error('Get room chat error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ─── Invite users to room ────────────────────────────────────────────────────
export const inviteToRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userIds } = req.body;

        if (!userIds?.length) return res.status(400).json({ success: false, message: 'User IDs required' });

        const room = await Room.findOne({ roomId });
        if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

        const newInvites = userIds.filter(id => !room.invitedUsers.map(u => u.toString()).includes(id));
        room.invitedUsers.push(...newInvites);
        await room.save();

        const inviter = await User.findById(req.user.id).select('firstName lastName fullName');

        if (req.io) {
            newInvites.forEach((userId) => {
                req.io.to(`user:${userId}`).emit('roomInvitation', {
                    room: { roomId: room.roomId, name: room.name },
                    from: { id: req.user.id, name: inviter.fullName },
                });
            });
        }

        await Promise.all(newInvites.map((userId) => createNotification({
            userId,
            type: 'meeting',
            title: `Room invitation: ${room.name}`,
            body: 'A live room invitation was just sent to you.',
            actorId: req.user.id,
            actorName: inviter.fullName || req.user.email || 'A teammate',
            entityId: room.roomId,
            entityType: 'Room',
            data: { roomId: room.roomId, kind: 'room-invite', roomName: room.name },
            io: req.io,
        })));

        res.json({ success: true, message: 'Invitations sent' });
    } catch (err) {
        console.error('Invite to room error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};