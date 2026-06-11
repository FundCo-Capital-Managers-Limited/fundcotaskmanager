import Reminder from '../models/reminderModel.js';
import { buildTeamQuery } from '../middleware/teamFilter.js';

// ── Get all reminders (team-filtered) ─────────────────────────────────────────
export const getAllReminders = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'user');
    const { status, type } = req.query;
    if (status) query.status = status;
    if (type) query.type = type;
    query.isActive = true;

    const reminders = await Reminder.find(query)
      .populate('user', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName email')
      .sort({ remindAt: -1 })
      .limit(200)
      .lean();

    res.json({ success: true, reminders, total: reminders.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
  }
};

// ── Create reminder for user ──────────────────────────────────────────────────
export const createReminderForUser = async (req, res) => {
  try {
    const { userId, type, message, remindAt, deliveryChannels, repeatInterval } = req.body;
    if (!userId || !type || !message || !remindAt) {
      return res.status(400).json({ success: false, message: 'userId, type, message, and remindAt are required' });
    }

    const reminder = new Reminder({
      user: userId, type, message,
      remindAt: new Date(remindAt),
      deliveryChannels: deliveryChannels || { inApp: true, email: true, push: false },
      createdBy: req.user._id,
      isUserCreated: false,
      repeatInterval: repeatInterval || null,
      isActive: true,
    });

    await reminder.save();
    if (req.io) req.io.to(`user:${userId}`).emit('newReminder', reminder);
    res.status(201).json({ success: true, reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create reminder' });
  }
};

// ── Delete reminder ───────────────────────────────────────────────────────────
export const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndDelete(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    if (req.io) req.io.to(`user:${reminder.user}`).emit('reminderDeleted', req.params.id);
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete reminder' });
  }
};
