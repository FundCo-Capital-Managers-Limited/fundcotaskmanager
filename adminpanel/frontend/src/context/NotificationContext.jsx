import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
  meetingReports: 0,
  meetings: 0,
  reminders: 0,
  goals: 0,
  projects: 0,
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
    case 'project': return 'brand';
    case 'file': return 'secondary';
    default: return 'neutral';
  }
};

const normalizeRoute = (value) => {
  const route = String(value || '').trim();
  if (!route) return '';
  return route.startsWith('/') ? route : `/${route}`;
};

const routeFor = (notification) => {
  const data = notification?.data || {};
  const explicitRoute = normalizeRoute(data.route);
  if (explicitRoute) return explicitRoute;
  if (data.projectId) return `/projects/${data.projectId}`;
  if (data.kind === 'meeting-report' || notification?.entityType === 'MeetingReport') return '/meeting-reports';
  if (data.kind === 'deckprep' || notification?.entityType === 'document') return '/deck-prep';
  if (data.kind === 'ai-report-draft') return '/reports';
  switch (notification?.type) {
    case 'chat': return '/team-chat';
    case 'social': return '/social';
    case 'task': return '/tasks';
    case 'report': return data.kind === 'meeting-report' ? '/meeting-reports' : '/reports';
    case 'meeting': return data.roomId ? '/meetings' : '/calendar';
    case 'reminder': return '/reminders';
    case 'goal': return '/goals';
    case 'project': return '/projects';
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

const countKeyForNotification = (notification) => {
  const type = String(notification?.type || '').trim();
  const kind = String(notification?.data?.kind || '').trim();
  if (type === 'report' && kind === 'meeting-report') return 'meetingReports';

  switch (type) {
    case 'chat': return 'chat';
    case 'social': return 'social';
    case 'task': return 'tasks';
    case 'report': return 'reports';
    case 'meeting': return 'meetings';
    case 'reminder': return 'reminders';
    case 'goal': return 'goals';
    case 'project': return 'projects';
    case 'file': return 'files';
    case 'system': return 'system';
    default: return null;
  }
};

const normalizePopupItem = (notification) => ({
  ...notification,
  id: notification?._id || notification?.id || `admin-live-${notification?.type || 'system'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  to: routeFor(notification),
  tone: toneFor(notification?.type),
  description: notification?.body || notification?.description || '',
  count: 1,
  synthetic: Boolean(notification?.synthetic),
  createdAt: notification?.createdAt || new Date().toISOString(),
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

const TOAST_DEDUPE_WINDOW_MS = 20000;
const getToastKey = (notification) => [
  String(notification?.type || ''),
  String(notification?.entityId || notification?.data?.taskId || notification?.data?.meetingId || ''),
  String(notification?.title || ''),
  String(notification?.body || notification?.description || ''),
].join('|');

const queuePopupNotification = (notification, popupCacheRef) => {
  if (!notification?.title) return;
  const key = getToastKey(notification);
  const now = Date.now();
  const lastShownAt = popupCacheRef.current.get(key);
  if (lastShownAt && now - lastShownAt < TOAST_DEDUPE_WINDOW_MS) return;

  popupCacheRef.current.set(key, now);
  for (const [cacheKey, timestamp] of popupCacheRef.current.entries()) {
    if (now - timestamp > TOAST_DEDUPE_WINDOW_MS) {
      popupCacheRef.current.delete(cacheKey);
    }
  }
};

export const NotificationProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?._id || user?.id || '';
  const [items, setItems] = useState([]);
  const [popupItems, setPopupItems] = useState([]);
  const [popupsExpanded, setPopupsExpanded] = useState(false);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const popupCacheRef = useRef(new Map());
  const refreshRef = useRef(null);
  const queuedRefreshRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!userId || authLoading) {
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

      const storedUnreadCounts = storedItems.reduce((accumulator, item) => {
        if (item.isRead) return accumulator;
        const key = countKeyForNotification(item);
        if (key) accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
      }, { ...EMPTY_COUNTS });

      const nextCounts = {
        chat: Math.max(toCount(storedUnreadCounts.chat), chatUnread),
        social: toCount(storedUnreadCounts.social),
        tasks: Math.max(toCount(storedUnreadCounts.tasks), taskPending),
        reports: Math.max(toCount(storedUnreadCounts.reports), reportPending),
        meetingReports: toCount(storedUnreadCounts.meetingReports),
        meetings: toCount(storedUnreadCounts.meetings),
        reminders: Math.max(toCount(storedUnreadCounts.reminders), pendingReminders),
        goals: toCount(storedUnreadCounts.goals),
        projects: toCount(storedUnreadCounts.projects),
        files: toCount(storedUnreadCounts.files),
        system: toCount(storedUnreadCounts.system),
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
  }, [authLoading, userId]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const scheduleRefresh = useCallback((delayMs = 250) => {
    if (queuedRefreshRef.current) {
      window.clearTimeout(queuedRefreshRef.current);
    }
    queuedRefreshRef.current = window.setTimeout(() => {
      queuedRefreshRef.current = null;
      refreshRef.current?.();
    }, delayMs);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || !userId || authLoading) {
      setItems([]);
      setCounts(EMPTY_COUNTS);
      return undefined;
    }

    refreshRef.current?.();

    const userSocket = io(USER_API_BASE, {
      auth: (cb) => cb({ token: localStorage.getItem('adminToken') }),
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    const adminSocket = io(API_BASE, {
      auth: (cb) => cb({ token: localStorage.getItem('adminToken') }),
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    const handleIncoming = (payload) => {
      if (payload?.type && payload?.title) {
        const nextPopup = normalizePopupItem(payload);
        queuePopupNotification(nextPopup, popupCacheRef);
        setPopupItems((current) => [
          nextPopup,
          ...current.filter((item) => item.id !== nextPopup.id && getToastKey(item) !== getToastKey(nextPopup)),
        ].slice(0, 20));
      }
      scheduleRefresh(400);
    };

    userSocket.on('notification:new', handleIncoming);
    adminSocket.on('notification:new', handleIncoming);

    const timer = setInterval(() => refreshRef.current?.(), 30000);
    return () => {
      clearInterval(timer);
      if (queuedRefreshRef.current) {
        window.clearTimeout(queuedRefreshRef.current);
        queuedRefreshRef.current = null;
      }
      userSocket.off('notification:new', handleIncoming);
      adminSocket.off('notification:new', handleIncoming);
      userSocket.disconnect();
      adminSocket.disconnect();
    };
  }, [authLoading, scheduleRefresh, userId]);

  useEffect(() => {
    if (popupItems.length === 0) {
      setPopupsExpanded(false);
    }
  }, [popupItems.length]);

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

  const markMeetingReportsRead = useCallback(async () => {
    try {
      await userApi.patch('/api/notifications/context-read', { type: 'report', dataKey: 'kind', dataValue: 'meeting-report' });
      await refresh();
    } catch {}
  }, [refresh]);

  const dismissPopup = useCallback((notificationId) => {
    if (!notificationId) return;
    setPopupItems((current) => current.filter((item) => item.id !== notificationId));
  }, []);

  const clearPopups = useCallback(() => {
    setPopupItems([]);
  }, []);

  const togglePopupsExpanded = useCallback((nextValue) => {
    setPopupsExpanded((current) => (typeof nextValue === 'boolean' ? nextValue : !current));
  }, []);

  const value = useMemo(
    () => ({
      items,
      counts,
      loading,
      lastUpdated,
      refresh,
      markRead,
      markAllRead,
      markTypeRead,
      markMeetingReportsRead,
      popupItems,
      popupsExpanded,
      dismissPopup,
      clearPopups,
      togglePopupsExpanded,
    }),
    [clearPopups, counts, dismissPopup, items, lastUpdated, loading, markAllRead, markMeetingReportsRead, markRead, markTypeRead, popupItems, popupsExpanded, refresh, togglePopupsExpanded],
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
      markMeetingReportsRead: async () => {},
      popupItems: [],
      popupsExpanded: false,
      dismissPopup: () => {},
      clearPopups: () => {},
      togglePopupsExpanded: () => {},
    };
  }
  return value;
};



