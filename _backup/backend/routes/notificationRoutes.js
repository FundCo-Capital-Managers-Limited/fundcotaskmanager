import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { createNotification } from '../utils/notificationService.js';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markNotificationsByContext,
} from '../controllers/notificationController.js';

const router = express.Router();
const INTERNAL_TOKEN = String(process.env.INTERNAL_API_TOKEN || process.env.JWT_SECRET || '').trim();
const ADMIN_ROLES = ['team-lead', 'executive', 'admin'];

const internalOnly = (req, res, next) => {
  const token = String(req.headers['x-internal-token'] || '').trim();
  if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

const adminSyncAllowed = (req, res, next) => {
  if (!ADMIN_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
};

router.post('/internal', internalOnly, async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      body = '',
      actorId = null,
      actorName = '',
      entityId = '',
      entityType = '',
      data = {},
      allowSelf = false,
    } = req.body || {};

    if (!userId || !type || !title) {
      return res.status(400).json({ success: false, message: 'userId, type, and title are required' });
    }

    const notification = await createNotification({
      userId,
      type,
      title,
      body,
      actorId,
      actorName,
      entityId,
      entityType,
      data,
      allowSelf: Boolean(allowSelf),
      io: req.io || global.io,
    });

    return res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('createInternalNotification error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
});

router.post('/admin-sync/task', authMiddleware, adminSyncAllowed, async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      body = '',
      actorId = null,
      actorName = '',
      entityId = '',
      entityType = '',
      data = {},
      allowSelf = false,
    } = req.body || {};

    if (!userId || !type || !title) {
      return res.status(400).json({ success: false, message: 'userId, type, and title are required' });
    }

    const notification = await createNotification({
      userId,
      type,
      title,
      body,
      actorId,
      actorName,
      entityId,
      entityType,
      data,
      allowSelf: Boolean(allowSelf),
      io: req.io || global.io,
    });

    return res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('createAdminSyncNotification error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
});

router.use(authMiddleware);
router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/context-read', markNotificationsByContext);
router.patch('/:id/read', markNotificationRead);

export default router;
