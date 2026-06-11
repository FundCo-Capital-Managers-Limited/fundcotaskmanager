import mongoose from 'mongoose';
import Notification from '../models/notificationModel.js';

const toCounts = (rows) => rows.reduce((accumulator, row) => {
  accumulator[row._id] = row.count;
  return accumulator;
}, {});

export const getNotifications = async (req, res) => {
  try {
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit || '40', 10)));
    const query = { user: req.user._id };
    if (req.query.status === 'unread') query.isRead = false;

    const [notifications, unreadCount, unreadByTypeAgg] = await Promise.all([
      Notification.find(query).sort({ isRead: 1, createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ user: req.user._id, isRead: false }),
      Notification.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(String(req.user._id)), isRead: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
      unreadByType: toCounts(unreadByTypeAgg),
    });
  } catch (error) {
    console.error('getNotifications error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('markNotificationRead error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
};

export const markNotificationsByContext = async (req, res) => {
  try {
    const { type, entityId, dataKey, dataValue } = req.body || {};
    const query = { user: req.user._id, isRead: false };

    if (type) query.type = String(type).trim();
    if (entityId) query.entityId = String(entityId).trim();
    if (dataKey && dataValue !== undefined && dataValue !== null) {
      query[`data.${String(dataKey).trim()}`] = String(dataValue).trim();
    }

    await Notification.updateMany(
      query,
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('markNotificationsByContext error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
};
