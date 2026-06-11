import express from 'express';
import { createNotification } from '../utils/notificationService.js';

const router = express.Router();
const INTERNAL_TOKEN = String(process.env.INTERNAL_API_TOKEN || process.env.JWT_SECRET || '').trim();

const internalOnly = (req, res, next) => {
  const token = String(req.headers['x-internal-token'] || '').trim();
  if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
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
      io: req.io || global.adminIo,
    });

    return res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('createAdminInternalNotification error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
});

export default router;
