import Reminder from '../models/reminderModel.js';
import { buildTeamQuery } from '../middleware/teamFilter.js';
import { emitToUserBackend } from '../utils/userRealtime.js';

const getRecurrenceLabel = (recurrence = {}) => {
  if (!recurrence?.frequency) return '';
  if (recurrence.frequency === 'daily') {
    return recurrence.interval > 1 ? `Every ${recurrence.interval} days` : 'Every day';
  }
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const labels = (recurrence.weekdays || []).map((day) => weekdayNames[day]).filter(Boolean);
  if (!labels.length) return recurrence.interval > 1 ? `Every ${recurrence.interval} weeks` : 'Every week';
  if (recurrence.interval > 1) return `Every ${recurrence.interval} weeks on ${labels.join(', ')}`;
  return `Every ${labels.join(', ')}`;
};

const normalizeRecipients = (userId, userIds = []) => {
  const combined = Array.isArray(userIds) ? userIds : [];
  return [...new Set([userId, ...combined].map((value) => String(value || '').trim()).filter(Boolean))];
};

const normalizeRecurrenceInput = (recurrence, remindAt) => {
  if (!recurrence || recurrence === 'none') return null;

  const frequency = String(recurrence.frequency || '').trim().toLowerCase();
  if (!frequency) return null;
  if (!['daily', 'weekly'].includes(frequency)) {
    throw new Error('Invalid recurrence frequency');
  }

  const baseDate = new Date(remindAt);
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error('Invalid reminder time');
  }

  const interval = Math.min(52, Math.max(1, Math.round(Number(recurrence.interval) || 1)));
  const normalized = {
    frequency,
    interval,
    weekdays: [],
    timezone: String(recurrence.timezone || 'Africa/Lagos').trim() || 'Africa/Lagos',
  };

  if (frequency === 'weekly') {
    const weekdays = [...new Set(
      (Array.isArray(recurrence.weekdays) ? recurrence.weekdays : [recurrence.weekdays ?? baseDate.getDay()])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    )].sort((left, right) => left - right);

    if (!weekdays.length) {
      throw new Error('Weekly reminders require at least one weekday');
    }
    normalized.weekdays = weekdays;
  }

  return normalized;
};

const buildDeliveryChannels = (deliveryChannels = {}) => ({
  inApp: deliveryChannels?.inApp ?? true,
  email: deliveryChannels?.email ?? true,
  push: deliveryChannels?.push ?? false,
});

// Get all reminders (team-filtered)
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

    res.json({
      success: true,
      reminders: reminders.map((reminder) => ({ ...reminder, recurrenceLabel: getRecurrenceLabel(reminder.recurrence) })),
      total: reminders.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
  }
};

// Create reminder for user
export const createReminderForUser = async (req, res) => {
  try {
    const { userId, userIds, type, message, remindAt, deliveryChannels, repeatInterval, recurrence } = req.body;
    const recipients = normalizeRecipients(userId, userIds);

    if (!recipients.length || !type || !message || !remindAt) {
      return res.status(400).json({ success: false, message: 'At least one user, type, message, and remindAt are required' });
    }

    if (req.teamMemberIds && !recipients.every((targetId) => req.teamMemberIds.map(String).includes(String(targetId)))) {
      return res.status(403).json({ success: false, message: 'One or more selected users are outside your team scope' });
    }

    const normalizedRecurrence = normalizeRecurrenceInput(recurrence, remindAt);
    const created = [];

    for (const targetId of recipients) {
      const reminder = await Reminder.create({
        user: targetId,
        type,
        message,
        remindAt: new Date(remindAt),
        deliveryChannels: buildDeliveryChannels(deliveryChannels),
        createdBy: req.user._id,
        isUserCreated: false,
        repeatInterval: repeatInterval || null,
        recurrence: normalizedRecurrence || undefined,
        isActive: true,
      });

      created.push(reminder);
      if (req.io) req.io.to(`user:${targetId}`).emit('newReminder', reminder.toObject());
      await emitToUserBackend({ event: 'newReminder', data: reminder.toObject(), room: `user:${targetId}` });
    }

    res.status(201).json({
      success: true,
      reminders: created,
      total: created.length,
      reminder: created[0] || null,
    });
  } catch (err) {
    res.status(err.message?.includes('Invalid') ? 400 : 500).json({ success: false, message: err.message || 'Failed to create reminder' });
  }
};

// Delete reminder
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



