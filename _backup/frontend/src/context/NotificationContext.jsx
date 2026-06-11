import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);
const USER_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4002';
const EMPTY_COUNTS = { total: 0, chat: 0, social: 0, tasks: 0, reminders: 0, meetings: 0, reports: 0, goals: 0, files: 0, system: 0 };

const getToken = () => localStorage.getItem('token');
const getHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const toCount = (value) => Math.max(0, Number(value) || 0);
const getTaskId = (value) => String(value?._id || value?.id || value?.taskId || '');
const countKeyForType = (type) => {
  switch (String(type || '').trim()) {
    case 'chat': return 'chat';
    case 'social': return 'social';
    case 'task': return 'tasks';
    case 'reminder': return 'reminders';
    case 'meeting': return 'meetings';
    case 'report': return 'reports';
    case 'goal': return 'goals';
    case 'file': return 'files';
    case 'system': return 'system';
    default: return null;
  }
};

const routeFor = (notification) => {
  const data = notification?.data || {};
  switch (notification?.type) {
    case 'chat': return '/team-chat';
    case 'social': return '/social-feed';
    case 'task': return '/assigned';
    case 'reminder': return '/reminders';
    case 'meeting': return data.roomId ? `/room/${data.roomId}` : '/meeting';
    case 'report': return '/reports';
    case 'goal': return '/goals';
    case 'file': return '/file-storage';
    default: return '/';
  }
};

const toneFor = (type) => {
  switch (type) {
    case 'chat': return 'chat';
    case 'social': return 'secondary';
    case 'task': return 'warning';
    case 'reminder': return 'info';
    case 'meeting': return 'brand';
    case 'report': return 'brand';
    case 'goal': return 'success';
    case 'file': return 'secondary';
    default: return 'neutral';
  }
};

const notificationKey = (notification) => (
  notification?.dedupeKey || [
    notification?.type || '',
    notification?.entityId || notification?.data?.taskId || '',
    notification?.title || '',
    notification?.body || notification?.description || '',
  ].join('|')
);

const normalizeNotification = (notification) => ({
  ...notification,
  id: notification?._id || notification?.id,
  to: routeFor(notification),
  tone: toneFor(notification?.type),
  description: notification?.body || notification?.description || '',
  dedupeKey: notificationKey(notification),
});

const compareIso = (left, right) => {
  const leftValue = left ? new Date(left).toISOString() : '';
  const rightValue = right ? new Date(right).toISOString() : '';
  return leftValue === rightValue;
};

const makeTaskSnapshot = (task) => ({
  title: String(task?.title || ''),
  description: String(task?.description || ''),
  priority: String(task?.priority || ''),
  dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : '',
  submissionStatus: String(task?.submissionStatus || ''),
  adminCommentCount: Array.isArray(task?.adminComments) ? task.adminComments.length : 0,
  checklistSignature: Array.isArray(task?.checklist)
    ? task.checklist.map((item) => `${String(item?.text || '')}:${item?.completed ? '1' : '0'}`).join('|')
    : '',
  createdByAdmin: Boolean(task?.createdByAdmin),
});

const makeLiveNotification = (notification = {}) => normalizeNotification({
  ...notification,
  _id: undefined,
  id: notification?.id || `live-${notification?.type || 'system'}-${notification?.entityId || notification?.data?.taskId || 'item'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: notification?.createdAt || new Date().toISOString(),
  isRead: false,
  synthetic: true,
});

const makeLiveTaskNotification = ({ taskId, title, body, status, data = {} }) => makeLiveNotification({
  type: 'task',
  title,
  body,
  entityId: String(taskId || ''),
  data: { taskId: String(taskId || ''), status, ...data },
});

const getLiveTaskChangeList = (previous, current) => {
  if (!previous || !current) return [];

  const changes = [];
  if (current.title !== previous.title) changes.push('title');
  if (current.description !== previous.description) changes.push('description');
  if (current.priority !== previous.priority) changes.push('priority');
  if (!compareIso(current.dueDate, previous.dueDate)) changes.push('due date');
  if (current.checklistSignature !== previous.checklistSignature) changes.push('checklist');
  return changes;
};

const sortNotifications = (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();

export const NotificationProvider = ({ children }) => {
  const [storedItems, setStoredItems] = useState([]);
  const [liveItems, setLiveItems] = useState([]);
  const [baseCounts, setBaseCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const taskSnapshotRef = useRef(new Map());

  const items = useMemo(() => {
    const merged = new Map();
    [...liveItems, ...storedItems].forEach((item) => {
      const key = notificationKey(item) || item.id;
      if (!key || merged.has(key)) return;
      merged.set(key, item);
    });
    return Array.from(merged.values()).sort(sortNotifications);
  }, [liveItems, storedItems]);

  const counts = useMemo(() => {
    const nextCounts = { ...baseCounts };
    const liveCounts = liveItems.reduce((accumulator, item) => {
      const key = countKeyForType(item?.type);
      if (key) accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, { ...EMPTY_COUNTS });

    Object.keys(nextCounts).forEach((key) => {
      if (key === 'total') return;
      nextCounts[key] = Math.max(toCount(baseCounts[key]), toCount(liveCounts[key]));
    });

    nextCounts.total = Object.entries(nextCounts)
      .filter(([key]) => key !== 'total')
      .reduce((sum, [, value]) => sum + toCount(value), 0);
    return nextCounts;
  }, [baseCounts, liveItems]);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setStoredItems([]);
      setLiveItems([]);
      setBaseCounts(EMPTY_COUNTS);
      return [];
    }

    setLoading(true);
    try {
      const [notificationRes, chatRes] = await Promise.all([
        axios.get(`${USER_API_BASE}/api/notifications`, { headers: getHeaders() }),
        axios.get(`${USER_API_BASE}/api/chats/unread-total`, { headers: getHeaders() }).catch(() => ({ data: {} })),
      ]);

      const notifications = (notificationRes.data.notifications || []).map(normalizeNotification);
      const unreadByType = notificationRes.data.unreadByType || {};
      const unreadChat = toCount(chatRes.data.unreadTotal ?? chatRes.data.totalUnread ?? chatRes.data.total ?? chatRes.data.count);

      const nextCounts = {
        chat: Math.max(toCount(unreadByType.chat), unreadChat),
        social: toCount(unreadByType.social),
        tasks: toCount(unreadByType.task),
        reminders: toCount(unreadByType.reminder),
        meetings: toCount(unreadByType.meeting),
        reports: toCount(unreadByType.report),
        goals: toCount(unreadByType.goal),
        files: toCount(unreadByType.file),
        system: toCount(unreadByType.system),
      };
      nextCounts.total = Object.values(nextCounts).reduce((sum, value) => sum + value, 0);

      setStoredItems(notifications);
      setLiveItems((current) => current.filter((item) => !notifications.some((stored) => stored.dedupeKey === item.dedupeKey)));
      setBaseCounts(nextCounts);
      setLastUpdated(new Date());
      return notifications;
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const pushLiveNotification = useCallback((notification) => {
    if (!notification?.id || !notification?.dedupeKey) return;

    setLiveItems((current) => [
      notification,
      ...current.filter((item) => item.dedupeKey !== notification.dedupeKey && item.id !== notification.id),
    ].slice(0, 20));
    setLastUpdated(new Date());
  }, []);

  const pushLiveTaskNotification = useCallback((notification) => {
    pushLiveNotification(notification);
  }, [pushLiveNotification]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStoredItems([]);
      setLiveItems([]);
      setBaseCounts(EMPTY_COUNTS);
      return undefined;
    }

    refresh();

    const userSocket = io(USER_API_BASE, { auth: { token }, transports: ['websocket', 'polling'] });
    const adminSocket = io(ADMIN_API_BASE, { auth: { token }, transports: ['websocket', 'polling'] });
    const handleIncoming = (payload) => {
      if (payload?.type && payload?.title) {
        pushLiveNotification(makeLiveNotification(payload));
      }
      refresh();
    };

    const rememberTask = (task) => {
      const taskId = getTaskId(task);
      if (!taskId) return;
      taskSnapshotRef.current.set(taskId, makeTaskSnapshot(task));
    };

    const handleNewTask = (task) => {
      if (!task?.createdByAdmin) {
        rememberTask(task);
        return;
      }

      const taskId = getTaskId(task);
      const assignedBy = task?.assignedBy
        ? `${task.assignedBy.firstName || ''} ${task.assignedBy.lastName || ''}`.trim() || task.assignedBy.email || ''
        : '';

      pushLiveTaskNotification(makeLiveTaskNotification({
        taskId,
        title: `New task assigned: ${task.title || 'Task'}`,
        body: assignedBy ? `Assigned by ${assignedBy}` : 'A new task was assigned to you.',
        status: 'assigned',
      }));
      rememberTask(task);
    };

    const handleUpdateTask = (task) => {
      const taskId = getTaskId(task);
      if (!taskId) return;

      const previous = taskSnapshotRef.current.get(taskId);
      rememberTask(task);
      if (!task?.createdByAdmin || !previous) return;

      const current = makeTaskSnapshot(task);
      if (current.adminCommentCount > previous.adminCommentCount) {
        const latestComment = Array.isArray(task.adminComments) ? task.adminComments[task.adminComments.length - 1] : null;
        pushLiveTaskNotification(makeLiveTaskNotification({
          taskId,
          title: `New admin comment on ${task.title || 'Task'}`,
          body: latestComment?.content || 'An admin added a comment to this task.',
          status: 'commented',
        }));
        return;
      }

      const changes = getLiveTaskChangeList(previous, current);

      if (changes.length) {
        pushLiveTaskNotification(makeLiveTaskNotification({
          taskId,
          title: `Task updated: ${task.title || 'Task'}`,
          body: `Changed ${changes.join(', ')}.`,
          status: 'updated',
          data: { changes },
        }));
      }
    };

    const handleTaskReviewed = (payload) => {
      const taskId = getTaskId(payload);
      if (!taskId) return;

      pushLiveTaskNotification(makeLiveTaskNotification({
        taskId,
        title: `Task ${payload.status}: ${payload.title || 'Task'}`,
        body: payload.reviewedBy ? `Reviewed by ${payload.reviewedBy}` : 'An admin reviewed your task.',
        status: payload.status,
      }));
    };

    const handleTaskCommented = (payload) => {
      const taskId = getTaskId(payload);
      if (!taskId) return;

      pushLiveTaskNotification(makeLiveTaskNotification({
        taskId,
        title: `New admin comment on ${payload.title || 'Task'}`,
        body: payload.content || (payload.commentedBy ? `${payload.commentedBy} added a comment.` : 'An admin added a comment to this task.'),
        status: 'commented',
      }));
    };

    userSocket.on('notification:new', handleIncoming);
    adminSocket.on('notification:new', handleIncoming);
    userSocket.on('newTask', handleNewTask);
    adminSocket.on('newTask', handleNewTask);
    userSocket.on('updateTask', handleUpdateTask);
    adminSocket.on('updateTask', handleUpdateTask);
    userSocket.on('taskReviewed', handleTaskReviewed);
    adminSocket.on('taskReviewed', handleTaskReviewed);
    userSocket.on('taskCommented', handleTaskCommented);
    adminSocket.on('taskCommented', handleTaskCommented);

    const timer = setInterval(refresh, 30000);
    return () => {
      clearInterval(timer);
      userSocket.off('notification:new', handleIncoming);
      adminSocket.off('notification:new', handleIncoming);
      userSocket.off('newTask', handleNewTask);
      adminSocket.off('newTask', handleNewTask);
      userSocket.off('updateTask', handleUpdateTask);
      adminSocket.off('updateTask', handleUpdateTask);
      userSocket.off('taskReviewed', handleTaskReviewed);
      adminSocket.off('taskReviewed', handleTaskReviewed);
      userSocket.off('taskCommented', handleTaskCommented);
      adminSocket.off('taskCommented', handleTaskCommented);
      userSocket.disconnect();
      adminSocket.disconnect();
    };
  }, [pushLiveNotification, pushLiveTaskNotification, refresh]);

  const markRead = useCallback(async (notificationId) => {
    if (!notificationId) return;

    if (String(notificationId).startsWith('live-')) {
      setLiveItems((current) => current.filter((item) => item.id !== notificationId));
      return;
    }

    try {
      await axios.patch(`${USER_API_BASE}/api/notifications/${notificationId}/read`, {}, { headers: getHeaders() });
      await refresh();
    } catch {}
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setLiveItems([]);
    try {
      await axios.patch(`${USER_API_BASE}/api/notifications/read-all`, {}, { headers: getHeaders() });
      await refresh();
    } catch {}
  }, [refresh]);

  const markTypeRead = useCallback(async (type) => {
    if (!type) return;

    setLiveItems((current) => current.filter((item) => item.type !== type));

    try {
      await axios.patch(`${USER_API_BASE}/api/notifications/context-read`, { type }, { headers: getHeaders() });
      await refresh();
    } catch {}
  }, [refresh]);

  const value = useMemo(
    () => ({ items, counts, loading, lastUpdated, refresh, markRead, markAllRead, markTypeRead }),
    [counts, items, lastUpdated, loading, markAllRead, markRead, markTypeRead, refresh],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const value = useContext(NotificationContext);
  if (!value) {
    return { items: [], counts: EMPTY_COUNTS, loading: false, lastUpdated: null, refresh: async () => [], markRead: async () => {}, markAllRead: async () => {}, markTypeRead: async () => {} };
  }
  return value;
};
