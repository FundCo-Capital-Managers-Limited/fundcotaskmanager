import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import api, { API_BASE } from '../utils/api.js';
import userApi, { USER_API_BASE } from '../utils/userApi.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

const EMPTY_COUNTS = {
  total: 0,
  chat: 0,
  social: 0,
  tasks: 0,
  reports: 0,
  meetings: 0,
  reminders: 0,
  goals: 0,
  files: 0,
  system: 0,
};

const toCount = (value) => Math.max(0, Number(value) || 0);
const getToken = () => localStorage.getItem('adminToken');

const toneFor = (type) => {
  switch (type) {
    case 'chat': return 'chat';
    case 'social': return 'secondary';
    case 'task': return 'warning';
    case 'report': return 'brand';
    case 'meeting': return 'info';
    case 'reminder': return 'info';
    case 'goal': return 'success';
    case 'file': return 'secondary';
    default: return 'neutral';
  }
};

const routeFor = (notification) => {
  const data = notification?.data || {};
  switch (notification?.type) {
    case 'chat': return '/team-chat';
    case 'social': return '/social';
    case 'task': return '/tasks';
    case 'report': return '/reports';
    case 'meeting': return data.roomId ? '/meetings' : '/meetings';
    case 'reminder': return '/reminders';
    case 'goal': return '/goals';
    case 'file': return '/files';
    default: return '/';
  }
};

const normalizeStoredItem = (notification) => ({
  ...notification,
  id: notification?._id || notification?.id,
  to: routeFor(notification),
  tone: toneFor(notification?.type),
  description: notification?.body || '',
  count: 1,
  synthetic: false,
});

const makeSyntheticItem = ({ id, type, title, description, count, to, priority }) => ({
  id,
  type,
  title,
  description,
  count: toCount(count) || 1,
  to,
  tone: toneFor(type),
  synthetic: true,
  priority: Number(priority) || 0,
  createdAt: new Date().toISOString(),
});

export const NotificationProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    if (!user || authLoading) {
      setItems([]);
      setCounts(EMPTY_COUNTS);
      return [];
    }

    setLoading(true);
    try {
      const [storedRes, chatRes, taskRes, reportRes, meetingRes, reminderRes] = await Promise.all([
        userApi.get('/api/notifications').catch(() => ({ data: {} })),
        userApi.get('/api/chats/unread-total').catch(() => ({ data: {} })),
        api.get('/tasks/stats').catch(() => ({ data: {} })),
        api.get('/reports/stats').catch(() => ({ data: {} })),
        api.get('/meetings', { params: { status: 'active' } }).catch(() => ({ data: {} })),
        api.get('/reminders', { params: { status: 'pending' } }).catch(() => ({ data: {} })),
      ]);

      const storedItems = (storedRes.data.notifications || []).map(normalizeStoredItem);
      const unreadByType = storedRes.data.unreadByType || {};
      const hasStoredType = (type) => toCount(unreadByType[type]) > 0;

      const chatUnread = toCount(chatRes.data.unreadTotal ?? chatRes.data.totalUnread ?? chatRes.data.total ?? chatRes.data.count);
      const taskPending = toCount(taskRes.data.stats?.submitted);
      const reportPending = toCount(reportRes.data.stats?.pendingReview || reportRes.data.stats?.submitted);
      const activeMeetings = toCount((meetingRes.data.rooms || []).length);
      const pendingReminders = toCount((reminderRes.data.reminders || []).length);

      const syntheticItems = [];
      if (chatUnread && !hasStoredType('chat')) {
        syntheticItems.push(makeSyntheticItem({
          id: 'summary-chat',
          type: 'chat',
          title: chatUnread + ' unread chat' + (chatUnread === 1 ? '' : 's'),
          description: 'New direct or group messages are waiting.',
          count: chatUnread,
          to: '/team-chat',
          priority: 5,
        }));
      }
      if (taskPending && !hasStoredType('task')) {
        syntheticItems.push(makeSyntheticItem({
          id: 'summary-task',
          type: 'task',
          title: taskPending + ' task' + (taskPending === 1 ? '' : 's') + ' awaiting review',
          description: 'Submitted work is ready for admin approval.',
          count: taskPending,
          to: '/tasks',
          priority: 4,
        }));
      }
      if (reportPending && !hasStoredType('report')) {
        syntheticItems.push(makeSyntheticItem({
          id: 'summary-report',
          type: 'report',
          title: reportPending + ' report' + (reportPending === 1 ? '' : 's') + ' pending review',
          description: 'Submitted reports are waiting for feedback.',
          count: reportPending,
          to: '/reports',
          priority: 3,
        }));
      }
      if (activeMeetings && !hasStoredType('meeting')) {
        syntheticItems.push(makeSyntheticItem({
          id: 'summary-meeting',
          type: 'meeting',
          title: activeMeetings + ' live meeting' + (activeMeetings === 1 ? '' : 's'),
          description: 'Active rooms are available to join or moderate.',
          count: activeMeetings,
          to: '/meetings',
          priority: 2,
        }));
      }
      if (pendingReminders && !hasStoredType('reminder')) {
        syntheticItems.push(makeSyntheticItem({
          id: 'summary-reminder',
          type: 'reminder',
          title: pendingReminders + ' reminder' + (pendingReminders === 1 ? '' : 's') + ' pending',
          description: reminderRes.data.reminders?.[0]?.message || 'Upcoming reminders are scheduled.',
          count: pendingReminders,
          to: '/reminders',
          priority: 1,
        }));
      }

      const nextCounts = {
        chat: Math.max(toCount(unreadByType.chat), chatUnread),
        social: toCount(unreadByType.social),
        tasks: Math.max(toCount(unreadByType.task), taskPending),
        reports: Math.max(toCount(unreadByType.report), reportPending),
        meetings: toCount(unreadByType.meeting),
        reminders: Math.max(toCount(unreadByType.reminder), pendingReminders),
        goals: toCount(unreadByType.goal),
        files: toCount(unreadByType.file),
        system: toCount(unreadByType.system),
      };
      nextCounts.total = Object.values(nextCounts).reduce((sum, value) => sum + value, 0);

      const nextItems = [...storedItems, ...syntheticItems].sort((left, right) => {
        const leftTime = new Date(left.createdAt || 0).getTime();
        const rightTime = new Date(right.createdAt || 0).getTime();
        if (rightTime !== leftTime) return rightTime - leftTime;
        return (right.priority || 0) - (left.priority || 0);
      });

      setItems(nextItems);
      setCounts(nextCounts);
      setLastUpdated(new Date());
      return nextItems;
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    const token = getToken();
    if (!token || !user || authLoading) {
      setItems([]);
      setCounts(EMPTY_COUNTS);
      return undefined;
    }

    refresh();

    const userSocket = io(USER_API_BASE, { auth: { token }, transports: ['websocket', 'polling'] });
    const adminSocket = io(API_BASE, { auth: { token }, transports: ['websocket', 'polling'] });
    const handleIncoming = () => refresh();

    userSocket.on('notification:new', handleIncoming);
    adminSocket.on('notification:new', handleIncoming);

    const timer = setInterval(refresh, 30000);
    return () => {
      clearInterval(timer);
      userSocket.off('notification:new', handleIncoming);
      adminSocket.off('notification:new', handleIncoming);
      userSocket.disconnect();
      adminSocket.disconnect();
    };
  }, [authLoading, refresh, user]);

  const markRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    try {
      await userApi.patch('/api/notifications/' + notificationId + '/read');
      await refresh();
    } catch {}
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    try {
      await userApi.patch('/api/notifications/read-all');
      await refresh();
    } catch {}
  }, [refresh]);

  const markTypeRead = useCallback(async (type) => {
    if (!type) return;
    try {
      await userApi.patch('/api/notifications/context-read', { type });
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
    return {
      items: [],
      counts: EMPTY_COUNTS,
      loading: false,
      lastUpdated: null,
      refresh: async () => [],
      markRead: async () => {},
      markAllRead: async () => {},
      markTypeRead: async () => {},
    };
  }
  return value;
};
