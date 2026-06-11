import Notification from '../models/notificationModel.js';

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
  io = global.io,
  allowSelf = false,
}) => {
  if (!userId || !type || !title) return null;
  if (!allowSelf && actorId && String(actorId) === String(userId)) return null;

  const notification = await Notification.create({
    user: userId,
    type,
    title: cleanText(title, 200),
    body: cleanText(body, 500),
    actor: actorId || null,
    actorName: cleanText(actorName, 120),
    entityId: entityId ? String(entityId) : '',
    entityType: cleanText(entityType, 120),
    data: normalizeData(data),
  });

  io?.to(`user:${String(userId)}`).emit('notification:new', notification.toObject());
  return notification.toObject();
};

export const createNotifications = async ({ userIds = [], ...payload }) => {
  const targets = [...new Set((userIds || []).map((userId) => String(userId)).filter(Boolean))];
  return Promise.all(targets.map((userId) => createNotification({ ...payload, userId })));
};
