import Room from '../models/roomModel.js';
import { buildTeamQuery } from '../middleware/teamFilter.js';
import { createNotification } from '../utils/notificationService.js';

// ── Get all rooms (team-filtered) ─────────────────────────────────────────────
export const getAllRooms = async (req, res) => {
  try {
    const query = {};
    if (req.teamMemberIds) {
      query.$or = [
        { host: { $in: req.teamMemberIds } },
        { 'participants.userId': { $in: req.teamMemberIds } },
      ];
    }

    const { status } = req.query;
    if (status) query.status = status;

    const rooms = await Room.find(query)
      .populate('host', 'firstName lastName fullName avatar email')
      .populate('participants.userId', 'firstName lastName fullName avatar')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, rooms, total: rooms.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch rooms' });
  }
};

// ── Get room by ID ────────────────────────────────────────────────────────────
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId })
      .populate('host', 'firstName lastName fullName avatar email')
      .populate('participants.userId', 'firstName lastName fullName avatar')
      .populate('invitedUsers', 'firstName lastName fullName avatar')
      .lean();
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch room' });
  }
};

// ── End room (admin override) ─────────────────────────────────────────────────
export const endRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

    room.status = 'ended';
    room.endedAt = new Date();
    room.participants.forEach(p => { if (p.isActive) { p.isActive = false; p.leftAt = new Date(); } });
    await room.save();

    const recipients = [...new Set([
      String(room.host),
      ...room.participants.map((participant) => String(participant.userId)),
    ])].filter((userId) => userId !== String(req.user._id));

    await Promise.all(recipients.map((userId) => createNotification({
      userId,
      type: 'meeting',
      title: `Meeting ended: ${room.name}`,
      body: `Closed by ${req.user.fullName || req.user.email}`,
      actorId: req.user._id,
      actorName: req.user.fullName || req.user.email,
      entityId: req.params.roomId,
      entityType: 'Room',
      data: { roomId: req.params.roomId, roomName: room.name, status: 'ended' },
      io: req.io,
    })));

    if (req.io) req.io.to(req.params.roomId).emit('roomEnded', { roomId: req.params.roomId, endedBy: req.user._id });
    res.json({ success: true, message: 'Room ended' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to end room' });
  }
};
