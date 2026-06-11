// controllers/reminderController.js
import Reminder from '../models/reminderModel.js';
import Task from '../models/taskModel.js';
import User from '../models/userModel.js';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';

const validateReminderInput = (body) => {
    const { type, targetId, targetModel, message, remindAt, repeatInterval, emailOverride } = body;
    if (!['task_due', 'meeting', 'goal_deadline', 'appraisal_submission', 'manager_feedback', 'custom'].includes(type)) {
        throw new Error('Invalid reminder type');
    }
    if (targetId && !mongoose.isValidObjectId(targetId)) throw new Error('Invalid target ID');
    if (targetId && !['Task', 'Meeting', 'Goal', 'Appraisal', 'Feedback'].includes(targetModel)) {
        throw new Error('Invalid target model');
    }
    if (!message || !validator.isLength(sanitizeHtml(message, { allowedTags: [] }), { min: 1, max: 200 })) {
        throw new Error('Message must be 1-200 characters');
    }
    if (!remindAt || isNaN(new Date(remindAt).getTime())) throw new Error('Invalid reminder time');
    if (repeatInterval && (!Number.isInteger(repeatInterval) || repeatInterval < 5 || repeatInterval > 1440)) {
        throw new Error('Repeat interval must be 5-1440 minutes');
    }
    if (emailOverride && !validator.isEmail(emailOverride)) throw new Error('Invalid email address');
    return true;
};

const buildTaskReminderPayload = ({ taskId, title, dueDate, user }) => {
    const reminderMinutes = user.preferences?.reminders?.defaultReminderTimes?.task_due ?? 60;
    const remindAt = new Date(new Date(dueDate).getTime() - reminderMinutes * 60 * 1000);

    return {
        message: `Task "${String(title || 'Task').trim()}" is due soon`,
        remindAt,
        deliveryChannels: {
            inApp: user.preferences?.reminders?.defaultDeliveryChannels?.inApp ?? true,
            email: user.preferences?.reminders?.defaultDeliveryChannels?.email ?? true,
            push: user.preferences?.reminders?.defaultDeliveryChannels?.push ?? false,
        },
        targetId: taskId,
        targetModel: 'Task',
    };
};

const upsertTaskReminderForUser = async ({ userId, taskId, title, dueDate, createdBy, io }) => {
    if (!userId || !taskId || !dueDate) return null;

    const user = await User.findById(userId);
    if (!user) return null;

    const payload = buildTaskReminderPayload({ taskId, title, dueDate, user });
    let reminder = await Reminder.findOne({ user: userId, targetId: taskId, targetModel: 'Task' });
    const isNew = !reminder;

    if (!reminder) {
        reminder = new Reminder({
            user: userId,
            type: 'task_due',
            targetId: payload.targetId,
            targetModel: payload.targetModel,
            message: payload.message,
            deliveryChannels: payload.deliveryChannels,
            remindAt: payload.remindAt,
            createdBy: createdBy || userId,
            isUserCreated: false,
            repeatInterval: null,
            isActive: true,
        });
    } else {
        reminder.type = 'task_due';
        reminder.message = payload.message;
        reminder.deliveryChannels = payload.deliveryChannels;
        reminder.remindAt = payload.remindAt;
        reminder.status = 'pending';
        reminder.snoozeUntil = null;
        reminder.isActive = true;
        reminder.createdBy = reminder.createdBy || createdBy || userId;
    }

    await reminder.save();
    io?.to(`user:${userId}`).emit(isNew ? 'newReminder' : 'reminderUpdated', reminder);
    return reminder;
};

export const syncTaskReminderInternal = async (req, res) => {
    try {
        const { userId, taskId, title, dueDate, createdBy } = req.body || {};
        if (!userId || !taskId || !title || !dueDate) {
            return res.status(400).json({ success: false, message: 'userId, taskId, title, and dueDate are required' });
        }

        const reminder = await upsertTaskReminderForUser({
            userId,
            taskId,
            title,
            dueDate,
            createdBy,
            io: req.io,
        });

        if (!reminder) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, reminder });
    } catch (error) {
        console.error('syncTaskReminderInternal error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to sync task reminder' });
    }
};

export const deleteTaskReminderInternal = async (req, res) => {
    try {
        const { userId, taskId } = req.body || {};
        if (!userId || !taskId) {
            return res.status(400).json({ success: false, message: 'userId and taskId are required' });
        }

        const reminder = await Reminder.findOneAndDelete({ user: userId, targetId: taskId, targetModel: 'Task' });
        if (reminder) {
            req.io?.to(`user:${userId}`).emit('reminderDeleted', String(reminder._id));
        }

        return res.json({ success: true, deleted: Boolean(reminder) });
    } catch (error) {
        console.error('deleteTaskReminderInternal error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to delete task reminder' });
    }
};

export const createReminder = async (req, res) => {
    try {
        validateReminderInput(req.body);
        const { type, targetId, targetModel, message, deliveryChannels, remindAt, repeatInterval, emailOverride } = req.body;

        if (targetId && targetModel === 'Task') {
            const target = await Task.findById(targetId);
            if (!target || target.owner.toString() !== req.user._id.toString()) {
                return res.status(404).json({ success: false, message: 'Target not found or not authorized' });
            }
        }

        const reminder = new Reminder({
            user: req.user._id,
            type,
            targetId: targetId || null,
            targetModel: targetId ? targetModel : null,
            message,
            deliveryChannels: {
                inApp: deliveryChannels?.inApp ?? true,
                email: deliveryChannels?.email ?? true,
                push: deliveryChannels?.push ?? false,
            },
            remindAt: new Date(remindAt),
            createdBy: req.user._id,
            isUserCreated: type === 'custom',
            repeatInterval: repeatInterval || null,
            isActive: true,
            emailOverride: emailOverride || null,
        });

        await reminder.save();
        req.io.to(`user:${req.user._id}`).emit('newReminder', reminder);

        res.status(201).json({ success: true, reminder });
    } catch (error) {
        console.error('Error creating reminder:', error.message);
        const status = error.message.includes('Invalid') ? 400 : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

export const getReminders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const query = { user: req.user._id, isActive: true };
        if (status) query.status = status;

        const reminders = await Reminder.find(query)
            .sort({ remindAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .populate('targetId', 'title dueDate endDate');

        res.json({ success: true, reminders });
    } catch (error) {
        console.error('Error fetching reminders:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch reminders' });
    }
};

export const updateReminder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid reminder ID' });

        validateReminderInput(req.body);

        const { type, targetId, targetModel, message, deliveryChannels, remindAt, repeatInterval, emailOverride } = req.body;

        const reminder = await Reminder.findById(id);
        if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
        if (reminder.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Update fields
        reminder.type = type;
        reminder.targetId = targetId || null;
        reminder.targetModel = targetId ? targetModel : null;
        reminder.message = message;
        reminder.deliveryChannels = { ...reminder.deliveryChannels, ...deliveryChannels };
        reminder.remindAt = new Date(remindAt);
        reminder.repeatInterval = repeatInterval || null;
        reminder.emailOverride = emailOverride || null;
        reminder.isUserCreated = type === 'custom';
        reminder.isActive = true;

        await reminder.save();

        req.io.to(`user:${req.user._id}`).emit('reminderUpdated', reminder);

        res.json({ success: true, reminder });
    } catch (error) {
        console.error('Error updating reminder:', error.message);
        const status = error.message.includes('Invalid') ? 400 : 500;
        res.status(status).json({ success: false, message: error.message || 'Failed to update reminder' });
    }
};

export const deleteReminder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

        const reminder = await Reminder.findById(id);
        if (!reminder || reminder.user.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Reminder not found or not authorized' });
        }

        await Reminder.deleteOne({ _id: id });
        req.io.to(`user:${req.user._id}`).emit('reminderDeleted', id);
        res.json({ success: true, message: 'Reminder deleted' });
    } catch (error) {
        console.error('Error deleting reminder:', error.message);
        res.status(500).json({ success: false, message: 'Failed to delete reminder' });
    }
};

export const snoozeReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { snoozeMinutes } = req.body;
        if (!mongoose.isValidObjectId(id) || !snoozeMinutes || snoozeMinutes < 5 || snoozeMinutes > 1440) {
            return res.status(400).json({ success: false, message: 'Invalid request' });
        }

        const reminder = await Reminder.findById(id);
        if (!reminder || reminder.user.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Reminder not found or not authorized' });
        }

        reminder.status = 'snoozed';
        reminder.snoozeUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);
        reminder.remindAt = reminder.snoozeUntil;
        await reminder.save();

        req.io.to(`user:${req.user._id}`).emit('reminderUpdated', reminder);
        res.json({ success: true, reminder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to snooze' });
    }
};

export const dismissReminder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

        const reminder = await Reminder.findById(id);
        if (!reminder || reminder.user.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Reminder not found or not authorized' });
        }

        reminder.status = 'dismissed';
        reminder.isActive = false;
        await reminder.save();

        req.io.to(`user:${req.user._id}`).emit('reminderUpdated', reminder);
        res.json({ success: true, reminder });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to dismiss' });
    }
};

export const updatePreferences = async (req, res) => {
    try {
        const { defaultDeliveryChannels } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.preferences = user.preferences || {};
        user.preferences.reminders = {
            defaultDeliveryChannels: {
                inApp: defaultDeliveryChannels?.inApp ?? true,
                email: defaultDeliveryChannels?.email ?? true,
                push: defaultDeliveryChannels?.push ?? false,
            },
        };
        await user.save();
        res.json({ success: true, preferences: user.preferences.reminders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update preferences' });
    }
};
