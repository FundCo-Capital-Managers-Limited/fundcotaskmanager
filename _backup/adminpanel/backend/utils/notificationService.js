import Notification from '../models/notificationModel.js';
import { createNotificationInUserBackend, emitToUserBackend } from './userRealtime.js';

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

const normalizeData = (value) => {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch {
    return {};
  }
};

export const createNotification = async ({
  userId,
  type,
  title,
  body = '',
  actorId = null,
  actorName = '',
  entityId = '',
  entityType = '',
  data = {},
  io = global.adminIo,
  allowSelf = false,
  authHeader = '',
}) => {
  if (!userId || !type || !title) return null;
  if (!allowSelf && actorId && String(actorId) === String(userId)) return null;

  const normalized = {
    userId: String(userId),
    type: String(type),
    title: cleanText(title, 200),
    body: cleanText(body, 500),
    actorId: actorId || null,
    actorName: cleanText(actorName, 120),
    entityId: entityId ? String(entityId) : '',
    entityType: cleanText(entityType, 120),
    data: normalizeData(data),
    allowSelf,
  };

  const notification = await Notification.create({
    user: normalized.userId,
    type: normalized.type,
    title: normalized.title,
    body: normalized.body,
    actor: normalized.actorId,
    actorName: normalized.actorName,
    entityId: normalized.entityId,
    entityType: normalized.entityType,
    data: normalized.data,
  });

  const payload = notification.toObject();
  const mirroredNotification = await createNotificationInUserBackend(normalized, authHeader);

  io?.to(`admin:${normalized.userId}`).emit('notification:new', payload);
  io?.to(`user:${normalized.userId}`).emit('notification:new', mirroredNotification || payload);

  if (!mirroredNotification) {
    await emitToUserBackend({
      event: 'notification:new',
      data: payload,
      room: `user:${normalized.userId}`,
    });
  }

  return payload;
};

export const createNotifications = async ({ userIds = [], ...payload }) => {
  const targets = [...new Set((userIds || []).map((userId) => String(userId)).filter(Boolean))];
  return Promise.all(targets.map((userId) => createNotification({ ...payload, userId })));
};
