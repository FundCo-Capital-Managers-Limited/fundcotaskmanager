import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);
const USER_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const EMPTY_COUNTS = { total: 0, chat: 0, social: 0, tasks: 0, reminders: 0, meetings: 0, reports: 0, meetingReports: 0, goals: 0, projects: 0, files: 0, system: 0 };

const getToken = () => localStorage.getItem('token');
const getHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const toCount = (value) => Math.max(0, Number(value) || 0);
const getTaskId = (value) => String(value?._id || value?.id || value?.taskId || '');
const countKeyForNotification = (notification) => {
  const type = String(notification?.type || '').trim();
  const kind = String(notification?.data?.kind || '').trim();
  if (type === 'report' && kind === 'meeting-report') return 'meetingReports';

  switch (type) {
    case 'chat': return 'chat';
    case 'social': return 'social';
    case 'task': return 'tasks';
    case 'reminder': return 'reminders';
    case 'meeting': return 'meetings';
    case 'report': return 'reports';
    case 'goal': return 'goals';
    case 'project': return 'projects';
    case 'file': return 'files';
    case 'system': return 'system';
    default: return null;
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
    case 'social': return '/social-feed';
    case 'task': return '/assigned';
    case 'reminder': return '/reminders';
    case 'meeting': return data.roomId ? `/room/${data.roomId}` : '/calendar';
    case 'report': return data.kind === 'meeting-report' ? '/meeting-reports' : '/reports';
    case 'goal': return '/goals';
    case 'project': return '/projects';
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
    case 'project': return 'brand';
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
  id: notification?._id || notification?.id || `live-${notification?.type || 'system'}-${notification?.entityId || notification?.data?.taskId || 'item'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
const TOAST_DEDUPE_WINDOW_MS = 20000;

const getToastKey = (notification) => [
  String(notification?.type || ''),
  String(notification?.entityId || notification?.data?.taskId || notification?.data?.meetingId || ''),
  String(notification?.title || ''),
  String(notification?.body || notification?.description || ''),
].join('|');

const queuePopupNotification = (notification, popupCacheRef, setPopupItems) => {
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
  const [storedItems, setStoredItems] = useState([]);
  const [liveItems, setLiveItems] = useState([]);
  const [popupItems, setPopupItems] = useState([]);
  const [popupsExpanded, setPopupsExpanded] = useState(false);
  const [baseCounts, setBaseCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const taskSnapshotRef = useRef(new Map());
  const popupCacheRef = useRef(new Map());
  const refreshRef = useRef(null);
  const queuedRefreshRef = useRef(null);

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
      const key = countKeyForNotification(item);
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

      const storedUnreadCounts = notifications.reduce((accumulator, item) => {
        if (item.isRead) return accumulator;
        const key = countKeyForNotification(item);
        if (key) accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
      }, { ...EMPTY_COUNTS });

      const nextCounts = {
        chat: Math.max(toCount(storedUnreadCounts.chat), unreadChat, toCount(unreadByType.chat)),
        social: Math.max(toCount(storedUnreadCounts.social), toCount(unreadByType.social)),
        tasks: Math.max(toCount(storedUnreadCounts.tasks), toCount(unreadByType.task)),
        reminders: Math.max(toCount(storedUnreadCounts.reminders), toCount(unreadByType.reminder)),
        meetings: Math.max(toCount(storedUnreadCounts.meetings), toCount(unreadByType.meeting)),
        reports: Math.max(toCount(storedUnreadCounts.reports), toCount(unreadByType.report)),
        meetingReports: toCount(storedUnreadCounts.meetingReports),
        goals: Math.max(toCount(storedUnreadCounts.goals), toCount(unreadByType.goal)),
        projects: Math.max(toCount(storedUnreadCounts.projects), toCount(unreadByType.project)),
        files: Math.max(toCount(storedUnreadCounts.files), toCount(unreadByType.file)),
        system: Math.max(toCount(storedUnreadCounts.system), toCount(unreadByType.system)),
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

  const pushLiveNotification = useCallback((notification) => {
    if (!notification?.id || !notification?.dedupeKey) return;

    setLiveItems((current) => [
      notification,
      ...current.filter((item) => item.dedupeKey !== notification.dedupeKey && item.id !== notification.id),
    ].slice(0, 20));
    queuePopupNotification(notification, popupCacheRef, setPopupItems);
    setPopupItems((current) => [
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

    refreshRef.current?.();

    const userSocket = io(USER_API_BASE, {
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    const handleIncoming = (payload) => {
      if (payload?.type && payload?.title) {
        pushLiveNotification(makeLiveNotification(payload));
      }
      scheduleRefresh(400);
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
      const assignedBy = String(task?.assignedBySnapshot?.name || '').trim()
        || String(task?.assignedBySnapshot?.email || '').trim()
        || (task?.assignedBy
          ? `${task.assignedBy.firstName || ''} ${task.assignedBy.lastName || ''}`.trim() || task.assignedBy.email || ''
          : '');

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
    userSocket.on('newTask', handleNewTask);
    userSocket.on('updateTask', handleUpdateTask);
    userSocket.on('taskReviewed', handleTaskReviewed);
    userSocket.on('taskCommented', handleTaskCommented);

    const timer = setInterval(() => refreshRef.current?.(), 30000);
    return () => {
      clearInterval(timer);
      if (queuedRefreshRef.current) {
        window.clearTimeout(queuedRefreshRef.current);
        queuedRefreshRef.current = null;
      }
      userSocket.off('notification:new', handleIncoming);
      userSocket.off('newTask', handleNewTask);
      userSocket.off('updateTask', handleUpdateTask);
      userSocket.off('taskReviewed', handleTaskReviewed);
      userSocket.off('taskCommented', handleTaskCommented);
      userSocket.disconnect();
    };
  }, [pushLiveNotification, pushLiveTaskNotification, scheduleRefresh]);

  useEffect(() => {
    if (popupItems.length === 0) {
      setPopupsExpanded(false);
    }
  }, [popupItems.length]);

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

  const markMeetingReportsRead = useCallback(async () => {
    setLiveItems((current) => current.filter((item) => !(item.type === 'report' && String(item?.data?.kind || '').trim() === 'meeting-report')));

    try {
      await axios.patch(`${USER_API_BASE}/api/notifications/context-read`, { type: 'report', dataKey: 'kind', dataValue: 'meeting-report' }, { headers: getHeaders() });
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



