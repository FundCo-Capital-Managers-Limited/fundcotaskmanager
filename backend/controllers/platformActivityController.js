import User from '../models/userModel.js';
import Task from '../models/taskModel.js';
import Goal from '../models/goalModel.js';
import Report from '../models/reportModel.js';
import Project from '../models/projectModel.js';
import Meeting from '../models/meetingModel.js';
import MeetingReport from '../models/meetingReportModel.js';
import Post from '../models/postModel.js';
import Message from '../models/messageModel.js';
import Chat from '../models/chatModel.js';
import File from '../models/fileModel.js';
import Document from '../models/documentModel.js';
import Reminder from '../models/reminderModel.js';
import Notification from '../models/notificationModel.js';
import Feedback from '../models/feedbackModel.js';
import Room from '../models/roomModel.js';
import { LearningCourse, UserProgress } from '../models/learningMaterialModel.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDate = (value, options = {}) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date);
};

const formatDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const startOfDay = (value) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const addDays = (value, days) => new Date(value.getTime() + (days * DAY_MS));

const toObjectIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
};

const getDisplayName = (user) => {
  if (!user) return 'Unknown user';
  return user.fullName
    || [user.firstName, user.lastName, user.otherName].filter(Boolean).join(' ').trim()
    || user.email
    || 'Unknown user';
};

const excerpt = (value, length = 120) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trim()}...`;
};

const numberValue = (value) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const inRange = (value, start, end) => {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const rangeQuery = (start, end) => {
  const query = {};
  if (start) query.$gte = start;
  if (end) query.$lte = end;
  return query;
};

const orDateQuery = (fields, start, end) => {
  const range = rangeQuery(start, end);
  if (!Object.keys(range).length) return {};
  return { $or: fields.map((field) => ({ [field]: range })) };
};

const countIf = (items, predicate) => items.reduce((total, item) => (predicate(item) ? total + 1 : total), 0);

const increment = (map, key, amount = 1) => {
  const safeKey = key || 'Unknown';
  map.set(safeKey, (map.get(safeKey) || 0) + amount);
};

const buildPeriod = (query) => {
  const now = new Date();
  const preset = String(query?.preset || 'all').trim().toLowerCase();
  const customFrom = query?.from ? startOfDay(query.from) : null;
  const customTo = query?.to ? endOfDay(query.to) : null;

  let from = null;
  let to = endOfDay(now);
  let label = 'Full history';

  switch (preset) {
    case '7d':
      from = startOfDay(addDays(now, -6));
      label = `Last 7 days (${formatDate(from)} - ${formatDate(to)})`;
      break;
    case '30d':
      from = startOfDay(addDays(now, -29));
      label = `Last 30 days (${formatDate(from)} - ${formatDate(to)})`;
      break;
    case '90d':
      from = startOfDay(addDays(now, -89));
      label = `Last 90 days (${formatDate(from)} - ${formatDate(to)})`;
      break;
    case 'this-month':
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      label = `This month (${formatDate(from)} - ${formatDate(to)})`;
      break;
    case 'quarter-to-date': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      from = startOfDay(new Date(now.getFullYear(), quarterStartMonth, 1));
      label = `Quarter to date (${formatDate(from)} - ${formatDate(to)})`;
      break;
    }
    case 'year-to-date':
      from = startOfDay(new Date(now.getFullYear(), 0, 1));
      label = `Year to date (${formatDate(from)} - ${formatDate(to)})`;
      break;
    case 'custom':
      if (!customFrom && !customTo) {
        throw new Error('Provide a start date, an end date, or both for a custom report');
      }
      from = customFrom;
      to = customTo || endOfDay(now);
      label = `Custom period (${from ? formatDate(from) : 'Start'} - ${formatDate(to)})`;
      break;
    case 'all':
    default:
      from = null;
      to = endOfDay(now);
      label = 'Full history';
      break;
  }

  if (from && to && from > to) {
    throw new Error('Start date cannot be later than end date');
  }

  return {
    preset: preset || 'all',
    from,
    to,
    label,
    fullHistory: !from,
  };
};

const roleLabel = (role) => {
  if (role === 'admin') return 'Super Admin';
  if (role === 'executive') return 'Executive';
  if (role === 'team-lead') return 'Team Lead';
  return 'Standard User';
};

const actionLabel = (value) => String(value || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (match) => match.toUpperCase())
  .trim();

const goalCompleted = (goal) => Array.isArray(goal?.subGoals)
  && goal.subGoals.length > 0
  && goal.subGoals.every((item) => item.completed);

const normalizeTaskPriority = (value) => {
  const lower = String(value || 'medium').trim().toLowerCase();
  if (lower === 'high') return 'High';
  if (lower === 'low') return 'Low';
  return 'Medium';
};

const MODULE_DEFINITIONS = [
  { key: 'people', title: 'People & Access', description: 'User growth, login activity, and management actions.' },
  { key: 'tasks', title: 'Tasks', description: 'Task creation, review flow, delivery pressure, and priority mix.' },
  { key: 'goals', title: 'Goals', description: 'Goal creation, progress pressure, and follow-up activity.' },
  { key: 'reports', title: 'Reports', description: 'Report creation, submission, review, and AI-assisted writing volume.' },
  { key: 'projects', title: 'Projects', description: 'Project records, milestones, issues, and risk handling.' },
  { key: 'meetings', title: 'Meetings', description: 'Meeting scheduling and live room activity.' },
  { key: 'meetingReports', title: 'Meeting Reports', description: 'Meeting report circulation, views, acknowledgements, and action items.' },
  { key: 'social', title: 'Social Feed', description: 'Posts, announcements, and comment activity.' },
  { key: 'chat', title: 'Team Chat', description: 'Messages, stickers, and reaction activity across team conversations.' },
  { key: 'files', title: 'File Storage', description: 'File uploads, deletes, shared files, and starred content.' },
  { key: 'aiDocuments', title: 'AI Documents', description: 'Deck requests, generated outputs, and failed document jobs.' },
  { key: 'training', title: 'Training', description: 'Course publishing, progress, exams, and certifications.' },
  { key: 'reminders', title: 'Reminders', description: 'Reminder scheduling and operational follow-up items.' },
  { key: 'notifications', title: 'Notifications', description: 'Notification generation, reads, and pending follow-up.' },
  { key: 'feedback', title: 'Feedback', description: 'Direct platform feedback from users to management.' },
];

const MODULE_LABEL_TO_KEY = {
  'People & Access': 'people',
  Tasks: 'tasks',
  Goals: 'goals',
  Reports: 'reports',
  Projects: 'projects',
  Meetings: 'meetings',
  'Meeting Reports': 'meetingReports',
  'Social Feed': 'social',
  'Team Chat': 'chat',
  'File Storage': 'files',
  'AI Documents': 'aiDocuments',
  Training: 'training',
  Reminders: 'reminders',
  Notifications: 'notifications',
  Feedback: 'feedback',
};

const MODULE_META_BY_KEY = new Map(MODULE_DEFINITIONS.map((item) => [item.key, item]));
const ALL_MODULE_KEYS = MODULE_DEFINITIONS.map((item) => item.key);

const moduleKeyFromLabel = (label) => MODULE_LABEL_TO_KEY[label] || 'other';

const parseSelectedModules = (value) => {
  const parsed = String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!parsed.length) return new Set(ALL_MODULE_KEYS);

  const valid = parsed.filter((item) => MODULE_META_BY_KEY.has(item));
  return new Set(valid.length ? valid : ALL_MODULE_KEYS);
};

const parseCommaList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const buildHighlightsFromEvents = (events, userLookup) => {
  const actorCounts = new Map();
  const unitCounts = new Map();
  const moduleCounts = new Map();

  for (const event of events) {
    if (event.module) increment(moduleCounts, event.module);
    if (event.actorId) increment(actorCounts, event.actorId);
    if (event.unitSector) increment(unitCounts, event.unitSector);
  }

  const topActors = [...actorCounts.entries()]
    .map(([userId, count]) => {
      const user = userLookup.get(userId);
      return {
        userId,
        name: getDisplayName(user),
        role: roleLabel(user?.role),
        unitSector: user?.unitSector || 'Unassigned',
        count,
      };
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  const topUnits = [...unitCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  const busiestModules = [...moduleCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  return {
    topActors,
    topUnits,
    busiestModules,
  };
};

const pushEvent = (events, actorCounts, unitCounts, moduleCounts, userLookup, {
  at,
  module,
  moduleKey,
  action,
  actorId = '',
  actorName = '',
  subject = '',
  detail = '',
}) => {
  if (!inRange(at, null, null)) return;

  const normalizedActorId = toObjectIdString(actorId);
  const user = normalizedActorId ? userLookup.get(normalizedActorId) : null;
  const resolvedActorName = actorName || getDisplayName(user);
  const resolvedUnit = user?.unitSector || 'Unassigned';
  const resolvedModuleKey = moduleKey || moduleKeyFromLabel(module);
  const item = {
    at: new Date(at).toISOString(),
    moduleKey: resolvedModuleKey,
    module,
    action,
    actorId: normalizedActorId,
    actorName: resolvedActorName,
    unitSector: resolvedUnit,
    subject: subject || '',
    detail: detail || '',
  };

  events.push(item);
  increment(moduleCounts, module);
  if (normalizedActorId) {
    increment(actorCounts, normalizedActorId);
    increment(unitCounts, resolvedUnit);
  }
};

const buildMetric = (label, value, helper = '') => ({
  label,
  value,
  helper,
});

export const getPlatformActivityReport = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Super Admin access required' });
    }

    const period = buildPeriod(req.query || {});
    const generatedAt = new Date();
    const selectedModuleKeys = parseSelectedModules(req.query?.modules);
    const [platformStartUser, users, tasks, goals, reports, projects, meetings, meetingReports, chats, rooms, posts, messages, files, documents, reminders, notifications, feedbacks, courses, progressRecords] = await Promise.all([
      User.findOne({}, 'createdAt').sort({ createdAt: 1 }).lean(),
      User.find({}, 'firstName lastName otherName email role unitSector position createdAt lastLogin lastActive isActive points badges activityLogs').lean(),
      Task.find({}, 'title owner priority dueDate completed submissionStatus submittedAt reviewedAt reviewedBy createdAt adminComments assignedBy checklist').lean(),
      Goal.find({}, 'title owner timeframe startDate endDate createdAt subGoals adminComments').lean(),
      Report.find({}, 'title user reportType status aiGenerated createdAt updatedAt submittedAt reviewedBy adminNotes').lean(),
      Project.find({}, 'name status createdAt activity milestones risks issues createdBy members client budget').lean(),
      Meeting.find({}, 'topic creator startTime status createdAt updatedAt participants').lean(),
      MeetingReport.find({}, 'title meetingDate meetingType createdBy attendees circulateTo recipients distributeToParticipants sendEmailCopy actionItems views acknowledgements lastResentAt createdAt').lean(),
      Chat.find({}, 'type name members createdAt').lean(),
      Room.find(orDateQuery(['createdAt', 'startedAt', 'endedAt'], period.from, period.to), 'name host status createdAt startedAt endedAt participants scheduledFor').lean(),
      Post.find(orDateQuery(['createdAt', 'comments.createdAt'], period.from, period.to), 'user content isAnnouncement announcementScope comments createdAt').lean(),
      Message.find(orDateQuery(['createdAt', 'reactions.timestamp'], period.from, period.to), 'sender content contentType stickerKey fileName reactions createdAt').lean(),
      File.find(orDateQuery(['createdAt', 'deletedAt'], period.from, period.to), 'fileName owner createdAt deletedAt deleted shareLink starred type').lean(),
      Document.find(orDateQuery(['createdAt', 'generationRequestedAt', 'generationCompletedAt'], period.from, period.to), 'userId sourceFileName generationStatus generationRequestedAt generationCompletedAt generationError createdAt').lean(),
      Reminder.find(orDateQuery(['createdAt', 'remindAt'], period.from, period.to), 'user type status createdAt remindAt isActive').lean(),
      Notification.find(orDateQuery(['createdAt', 'readAt'], period.from, period.to), 'user type title actor actorName entityType entityId isRead createdAt readAt').lean(),
      Feedback.find(orDateQuery(['timestamp', 'createdAt'], period.from, period.to), 'userId category feedback timestamp createdAt').lean(),
      LearningCourse.find(orDateQuery(['createdAt'], period.from, period.to), 'title level assetco createdAt modules').lean(),
      UserProgress.find(orDateQuery(['enrolledAt', 'completedAt', 'moduleProgress.completedAt', 'examAttempts.completedAt'], period.from, period.to), 'userId courseId progress certificationEarned enrolledAt completedAt moduleProgress examAttempts totalTimeSpent').lean(),
    ]);

    const platformStartedAt = platformStartUser?.createdAt || null;
    const userLookup = new Map(users.map((item) => [String(item._id), {
      ...item,
      fullName: getDisplayName(item),
    }]));
    const allUserIds = users.map((item) => String(item._id));
    const requestedUserIds = parseCommaList(req.query?.userIds);
    const selectedUserIdList = requestedUserIds.filter((id) => userLookup.has(id));
    const allUsersSelected = !selectedUserIdList.length;
    const selectedUserIds = new Set(allUsersSelected ? allUserIds : selectedUserIdList);
    const selectedUsers = users.filter((item) => selectedUserIds.has(String(item._id)));
    const userAttentionProfiles = new Map(selectedUsers.map((item) => [String(item._id), {
      userId: String(item._id),
      name: getDisplayName(item),
      role: roleLabel(item.role),
      unitSector: item.unitSector || 'Unassigned',
      loginInPeriod: false,
      touchedPeriod: false,
      eventCount: 0,
      workEvidenceCount: 0,
      collaborationCount: 0,
      knowledgeCount: 0,
    }]));

    const includesUser = (value) => selectedUserIds.has(toObjectIdString(value));
    const includesAnyUser = (values = []) => (values || []).some((value) => {
      if (!value) return false;
      if (Array.isArray(value)) return includesAnyUser(value);
      if (typeof value === 'object') {
        return includesUser(value.user)
          || includesUser(value.userId)
          || includesUser(value.owner)
          || includesUser(value.actor)
          || includesUser(value.host)
          || includesUser(value.convertedBy)
          || includesUser(value._id);
      }
      return includesUser(value);
    });

    const events = [];
    const actorCounts = new Map();
    const unitCounts = new Map();
    const moduleCounts = new Map();

    let userLoginsInPeriod = 0;
    let adminActionsInPeriod = 0;
    let newUsersInPeriod = 0;
    let activeUsersInPeriod = 0;

    for (const user of selectedUsers) {
      const profile = userAttentionProfiles.get(String(user._id));
      if (inRange(user.createdAt, period.from, period.to)) {
        newUsersInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: user.createdAt,
          module: 'People & Access',
          action: 'User registered',
          actorId: user._id,
          actorName: getDisplayName(user),
          subject: getDisplayName(user),
          detail: `${roleLabel(user.role)} added to the platform`,
        });
      }

      const touchedPeriod = inRange(user.lastActive, period.from, period.to)
        || inRange(user.lastLogin, period.from, period.to)
        || (user.activityLogs || []).some((log) => inRange(log.timestamp, period.from, period.to));
      if (touchedPeriod) activeUsersInPeriod += 1;
      if (profile) {
        profile.touchedPeriod = touchedPeriod;
        profile.loginInPeriod = inRange(user.lastLogin, period.from, period.to);
      }

      for (const log of user.activityLogs || []) {
        if (!inRange(log.timestamp, period.from, period.to)) continue;

        const label = actionLabel(log.action);
        const lowerAction = String(log.action || '').toLowerCase();
        if (lowerAction.includes('login')) userLoginsInPeriod += 1;
        if (lowerAction.startsWith('admin_') || lowerAction.includes('reset') || lowerAction.includes('deactivate') || lowerAction.includes('activate') || lowerAction.includes('bonus')) {
          adminActionsInPeriod += 1;
        }

        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: log.timestamp,
          module: 'People & Access',
          action: label,
          actorId: user._id,
          actorName: getDisplayName(user),
          subject: getDisplayName(user),
          detail: excerpt(log.details || ''),
        });
      }
    }

    let tasksCreatedInPeriod = 0;
    let tasksSubmittedInPeriod = 0;
    let tasksApprovedInPeriod = 0;
    let tasksRejectedInPeriod = 0;
    let taskCommentsInPeriod = 0;
    let selectedTasksCount = 0;
    let liveOpenTasks = 0;
    let liveCompletedTasks = 0;
    let overdueTasksNow = 0;
    let liveHighPriorityTasks = 0;
    let liveMediumPriorityTasks = 0;
    let liveLowPriorityTasks = 0;
    let createdHighPriorityTasksInPeriod = 0;
    let createdMediumPriorityTasksInPeriod = 0;
    let createdLowPriorityTasksInPeriod = 0;
    const now = new Date();
    const taskPriorityProfiles = new Map();

    const ensureTaskPriorityProfile = (userId) => {
      const key = toObjectIdString(userId);
      if (!key) return null;
      if (!taskPriorityProfiles.has(key)) {
        taskPriorityProfiles.set(key, {
          userId: key,
          total: 0,
          high: 0,
          medium: 0,
          low: 0,
          selfDirectedHigh: 0,
        });
      }
      return taskPriorityProfiles.get(key);
    };

    for (const task of tasks) {
      const taskInScope = includesUser(task.owner) || includesUser(task.assignedBy) || includesUser(task.reviewedBy);
      if (!taskInScope) continue;

      selectedTasksCount += 1;
      const priority = normalizeTaskPriority(task.priority);
      if (task.completed) liveCompletedTasks += 1;
      else liveOpenTasks += 1;
      if (!task.completed && task.dueDate && new Date(task.dueDate) < now) overdueTasksNow += 1;
      if (priority === 'High') liveHighPriorityTasks += 1;
      if (priority === 'Medium') liveMediumPriorityTasks += 1;
      if (priority === 'Low') liveLowPriorityTasks += 1;

      const ownerProfile = ensureTaskPriorityProfile(task.owner);
      if (ownerProfile) {
        ownerProfile.total += 1;
        if (priority === 'High') ownerProfile.high += 1;
        if (priority === 'Medium') ownerProfile.medium += 1;
        if (priority === 'Low') ownerProfile.low += 1;

        const assignedById = toObjectIdString(task.assignedBy || task.owner);
        if (priority === 'High' && assignedById && assignedById === ownerProfile.userId) {
          ownerProfile.selfDirectedHigh += 1;
        }
      }

      if (inRange(task.createdAt, period.from, period.to)) {
        tasksCreatedInPeriod += 1;
        if (priority === 'High') createdHighPriorityTasksInPeriod += 1;
        if (priority === 'Medium') createdMediumPriorityTasksInPeriod += 1;
        if (priority === 'Low') createdLowPriorityTasksInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: task.createdAt,
          module: 'Tasks',
          action: 'Task created',
          actorId: task.assignedBy || task.owner,
          actorName: getDisplayName(userLookup.get(toObjectIdString(task.assignedBy || task.owner))),
          subject: task.title,
          detail: `${priority} priority task assigned to ${getDisplayName(userLookup.get(toObjectIdString(task.owner)))}`,
        });
      }

      if (inRange(task.submittedAt, period.from, period.to)) {
        tasksSubmittedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: task.submittedAt,
          module: 'Tasks',
          action: 'Task submitted',
          actorId: task.owner,
          subject: task.title,
          detail: 'Submitted for review',
        });
      }

      if (inRange(task.reviewedAt, period.from, period.to)) {
        if (task.submissionStatus === 'approved') tasksApprovedInPeriod += 1;
        if (task.submissionStatus === 'rejected') tasksRejectedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: task.reviewedAt,
          module: 'Tasks',
          action: task.submissionStatus === 'approved' ? 'Task approved' : task.submissionStatus === 'rejected' ? 'Task rejected' : 'Task reviewed',
          actorId: task.reviewedBy,
          subject: task.title,
          detail: `Reviewed for ${getDisplayName(userLookup.get(toObjectIdString(task.owner)))}`,
        });
      }

      for (const comment of task.adminComments || []) {
        if (!inRange(comment.createdAt, period.from, period.to)) continue;
        taskCommentsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: comment.createdAt,
          module: 'Tasks',
          action: 'Admin comment added',
          actorId: comment.user,
          subject: task.title,
          detail: excerpt(comment.content),
        });
      }
    }

    let goalsCreatedInPeriod = 0;
    let goalCommentsInPeriod = 0;
    let selectedGoalsCount = 0;
    let liveCompletedGoals = 0;
    let liveActiveGoals = 0;
    let overdueGoalsNow = 0;

    for (const goal of goals) {
      if (!includesUser(goal.owner)) continue;
      selectedGoalsCount += 1;
      const isComplete = goalCompleted(goal);
      if (isComplete) liveCompletedGoals += 1;
      if (!isComplete && goal.endDate && new Date(goal.endDate) >= now) liveActiveGoals += 1;
      if (!isComplete && goal.endDate && new Date(goal.endDate) < now) overdueGoalsNow += 1;

      if (inRange(goal.createdAt, period.from, period.to)) {
        goalsCreatedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: goal.createdAt,
          module: 'Goals',
          action: 'Goal created',
          actorId: goal.owner,
          subject: goal.title,
          detail: `${String(goal.timeframe || 'custom').replace(/^\w/, (m) => m.toUpperCase())} goal`,
        });
      }

      for (const comment of goal.adminComments || []) {
        if (!inRange(comment.createdAt, period.from, period.to)) continue;
        goalCommentsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: comment.createdAt,
          module: 'Goals',
          action: 'Goal comment added',
          actorId: comment.user,
          subject: goal.title,
          detail: excerpt(comment.content),
        });
      }
    }

    let reportsCreatedInPeriod = 0;
    let reportsSubmittedInPeriod = 0;
    let reportsApprovedInPeriod = 0;
    let reportsRejectedInPeriod = 0;
    let reportNotesInPeriod = 0;
    let selectedReportsCount = 0;
    let draftsNow = 0;
    let aiGeneratedReportsInPeriod = 0;

    for (const report of reports) {
      const reportInScope = includesUser(report.user) || includesUser(report.reviewedBy);
      if (!reportInScope) continue;

      selectedReportsCount += 1;
      if (report.status === 'draft') draftsNow += 1;
      if (report.aiGenerated && inRange(report.createdAt, period.from, period.to)) aiGeneratedReportsInPeriod += 1;

      if (inRange(report.createdAt, period.from, period.to)) {
        reportsCreatedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: report.createdAt,
          module: 'Reports',
          action: report.aiGenerated ? 'AI report created' : 'Report created',
          actorId: report.user,
          subject: report.title,
          detail: `${String(report.reportType || 'custom').toUpperCase()} report`,
        });
      }

      if (inRange(report.submittedAt, period.from, period.to)) {
        reportsSubmittedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: report.submittedAt,
          module: 'Reports',
          action: 'Report submitted',
          actorId: report.user,
          subject: report.title,
          detail: 'Submitted for review',
        });
      }

      if (report.reviewedBy && inRange(report.updatedAt, period.from, period.to) && ['approved', 'rejected'].includes(report.status)) {
        if (report.status === 'approved') reportsApprovedInPeriod += 1;
        if (report.status === 'rejected') reportsRejectedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: report.updatedAt,
          module: 'Reports',
          action: report.status === 'approved' ? 'Report approved' : 'Report rejected',
          actorId: report.reviewedBy,
          subject: report.title,
          detail: `Reviewed for ${getDisplayName(userLookup.get(toObjectIdString(report.user)))}`,
        });
      }

      for (const note of report.adminNotes || []) {
        if (!inRange(note.createdAt, period.from, period.to)) continue;
        reportNotesInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: note.createdAt,
          module: 'Reports',
          action: 'Report note added',
          actorId: note.user,
          subject: report.title,
          detail: excerpt(note.content),
        });
      }
    }

    let projectsCreatedInPeriod = 0;
    let selectedProjectsCount = 0;
    let activeProjectsNow = 0;
    let completedProjectsNow = 0;
    let projectActivityEntriesInPeriod = 0;
    let milestonesCreatedInPeriod = 0;
    let milestonesCompletedInPeriod = 0;
    let risksOpenedInPeriod = 0;
    let risksClosedInPeriod = 0;
    let issuesOpenedInPeriod = 0;
    let issuesResolvedInPeriod = 0;

    for (const project of projects) {
      const projectInScope = includesUser(project.createdBy)
        || includesAnyUser(project.members)
        || includesAnyUser((project.activity || []).map((item) => item.actor))
        || includesAnyUser((project.milestones || []).map((item) => item.owner))
        || includesAnyUser((project.risks || []).map((item) => item.owner))
        || includesAnyUser((project.issues || []).map((item) => item.owner));
      if (!projectInScope) continue;

      selectedProjectsCount += 1;
      if (project.status === 'active') activeProjectsNow += 1;
      if (project.status === 'completed') completedProjectsNow += 1;

      if (inRange(project.createdAt, period.from, period.to)) {
        projectsCreatedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: project.createdAt,
          module: 'Projects',
          action: 'Project created',
          actorId: project.createdBy,
          subject: project.name,
          detail: `Status set to ${project.status}`,
        });
      }

      for (const item of project.activity || []) {
        if (!inRange(item.createdAt, period.from, period.to)) continue;
        projectActivityEntriesInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: item.createdAt,
          module: 'Projects',
          action: actionLabel(item.kind || 'project_activity'),
          actorId: item.actor,
          actorName: item.actorName,
          subject: project.name,
          detail: item.message,
        });
      }

      for (const milestone of project.milestones || []) {
        if (inRange(milestone.createdAt, period.from, period.to)) {
          milestonesCreatedInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: milestone.createdAt,
            module: 'Projects',
            action: 'Milestone added',
            actorId: milestone.owner,
            subject: `${project.name} - ${milestone.title}`,
            detail: milestone.description || 'Milestone recorded',
          });
        }
        if (inRange(milestone.completedAt, period.from, period.to)) {
          milestonesCompletedInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: milestone.completedAt,
            module: 'Projects',
            action: 'Milestone completed',
            actorId: milestone.owner,
            subject: `${project.name} - ${milestone.title}`,
            detail: 'Milestone marked complete',
          });
        }
      }

      for (const risk of project.risks || []) {
        if (inRange(risk.createdAt, period.from, period.to)) {
          risksOpenedInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: risk.createdAt,
            module: 'Projects',
            action: 'Risk logged',
            actorId: risk.owner,
            subject: `${project.name} - ${risk.title}`,
            detail: `${String(risk.severity || 'medium').toUpperCase()} severity`,
          });
        }
        if (inRange(risk.closedAt, period.from, period.to)) {
          risksClosedInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: risk.closedAt,
            module: 'Projects',
            action: 'Risk closed',
            actorId: risk.owner,
            subject: `${project.name} - ${risk.title}`,
            detail: 'Risk closed out',
          });
        }
      }

      for (const issue of project.issues || []) {
        if (inRange(issue.createdAt, period.from, period.to)) {
          issuesOpenedInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: issue.createdAt,
            module: 'Projects',
            action: 'Issue logged',
            actorId: issue.owner,
            subject: `${project.name} - ${issue.title}`,
            detail: `${String(issue.severity || 'medium').toUpperCase()} severity`,
          });
        }
        if (inRange(issue.resolvedAt, period.from, period.to)) {
          issuesResolvedInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: issue.resolvedAt,
            module: 'Projects',
            action: 'Issue resolved',
            actorId: issue.owner,
            subject: `${project.name} - ${issue.title}`,
            detail: 'Issue marked resolved',
          });
        }
      }
    }

    let meetingsScheduledInPeriod = 0;
    let meetingsCancelledInPeriod = 0;
    let meetingsOngoingNow = 0;
    let roomSessionsStartedInPeriod = 0;
    let roomSessionsEndedInPeriod = 0;
    let selectedMeetingsCount = 0;

    for (const meeting of meetings) {
      const meetingInScope = includesUser(meeting.creator) || includesAnyUser(meeting.participants);
      if (!meetingInScope) continue;

      selectedMeetingsCount += 1;
      if (meeting.status === 'ongoing') meetingsOngoingNow += 1;
      if (inRange(meeting.createdAt, period.from, period.to)) {
        meetingsScheduledInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: meeting.createdAt,
          module: 'Meetings',
          action: 'Meeting scheduled',
          actorId: meeting.creator,
          subject: meeting.topic,
          detail: `${meeting.participants?.length || 0} participant${meeting.participants?.length === 1 ? '' : 's'}`,
        });
      }
      if (meeting.status === 'cancelled' && inRange(meeting.updatedAt, period.from, period.to)) {
        meetingsCancelledInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: meeting.updatedAt,
          module: 'Meetings',
          action: 'Meeting cancelled',
          actorId: meeting.creator,
          subject: meeting.topic,
          detail: 'Cancelled after scheduling',
        });
      }
    }

    for (const room of rooms) {
      if (!(includesUser(room.host) || includesAnyUser(room.participants))) continue;

      if (inRange(room.startedAt, period.from, period.to)) {
        roomSessionsStartedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: room.startedAt,
          module: 'Meetings',
          action: 'Room session started',
          actorId: room.host,
          subject: room.name,
          detail: `${room.participants?.length || 0} participant record${room.participants?.length === 1 ? '' : 's'}`,
        });
      }
      if (inRange(room.endedAt, period.from, period.to)) {
        roomSessionsEndedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: room.endedAt,
          module: 'Meetings',
          action: 'Room session ended',
          actorId: room.host,
          subject: room.name,
          detail: 'Session finished',
        });
      }
    }

    let meetingReportsCreatedInPeriod = 0;
    let meetingRecipientsInPeriod = 0;
    let meetingViewsInPeriod = 0;
    let meetingAcknowledgementsInPeriod = 0;
    let meetingResendsInPeriod = 0;
    let meetingActionItemsInPeriod = 0;
    let meetingActionItemsConvertedInPeriod = 0;
    let selectedMeetingReportsCount = 0;

    for (const report of meetingReports) {
      const reportInScope = includesUser(report.createdBy)
        || includesAnyUser(report.attendees)
        || includesAnyUser(report.circulateTo)
        || includesAnyUser(report.recipients)
        || includesAnyUser((report.views || []).map((item) => item.user))
        || includesAnyUser((report.acknowledgements || []).map((item) => item.user))
        || includesAnyUser((report.actionItems || []).map((item) => item.convertedBy));
      if (!reportInScope) continue;

      selectedMeetingReportsCount += 1;
      if (inRange(report.createdAt, period.from, period.to)) {
        meetingReportsCreatedInPeriod += 1;
        meetingRecipientsInPeriod += Array.isArray(report.recipients) ? report.recipients.length : 0;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: report.createdAt,
          module: 'Meeting Reports',
          action: 'Meeting report created',
          actorId: report.createdBy,
          subject: report.title,
          detail: `${Array.isArray(report.recipients) ? report.recipients.length : 0} recipient${(report.recipients?.length || 0) === 1 ? '' : 's'}`,
        });
      }

      if (inRange(report.lastResentAt, period.from, period.to)) {
        meetingResendsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: report.lastResentAt,
          module: 'Meeting Reports',
          action: 'Meeting report resent',
          actorId: report.createdBy,
          subject: report.title,
          detail: 'Notifications resent to recipients',
        });
      }

      for (const view of report.views || []) {
        if (!inRange(view.at, period.from, period.to)) continue;
        meetingViewsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: view.at,
          module: 'Meeting Reports',
          action: 'Meeting report viewed',
          actorId: view.user,
          subject: report.title,
          detail: 'Recipient opened the report',
        });
      }

      for (const ack of report.acknowledgements || []) {
        if (!inRange(ack.at, period.from, period.to)) continue;
        meetingAcknowledgementsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: ack.at,
          module: 'Meeting Reports',
          action: 'Meeting report acknowledged',
          actorId: ack.user,
          subject: report.title,
          detail: 'Recipient acknowledged the report',
        });
      }

      for (const item of report.actionItems || []) {
        if (inRange(item.createdAt, period.from, period.to)) {
          meetingActionItemsInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: item.createdAt,
            module: 'Meeting Reports',
            action: 'Action item added',
            actorId: report.createdBy,
            subject: report.title,
            detail: excerpt(item.text),
          });
        }
        if (inRange(item.convertedAt, period.from, period.to)) {
          meetingActionItemsConvertedInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: item.convertedAt,
            module: 'Meeting Reports',
            action: 'Action item converted to task',
            actorId: item.convertedBy,
            subject: report.title,
            detail: excerpt(item.text),
          });
        }
      }
    }

    let postsInPeriod = 0;
    let announcementsInPeriod = 0;
    let postCommentsInPeriod = 0;
    let selectedPostsCount = 0;

    for (const post of posts) {
      const postInScope = includesUser(post.user);
      if (postInScope) selectedPostsCount += 1;

      if (inRange(post.createdAt, period.from, period.to)) {
        if (!postInScope) {
          // skip post-level counts for posts outside the selected user scope
        } else {
        postsInPeriod += 1;
        if (post.isAnnouncement) announcementsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: post.createdAt,
          module: 'Social Feed',
          action: post.isAnnouncement ? 'Announcement posted' : 'Post published',
          actorId: post.user,
          subject: post.isAnnouncement ? 'Company announcement' : 'Social update',
          detail: excerpt(post.content),
        });
        }
      }

      for (const comment of post.comments || []) {
        if (!inRange(comment.createdAt, period.from, period.to)) continue;
        if (!includesUser(comment.user)) continue;
        postCommentsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: comment.createdAt,
          module: 'Social Feed',
          action: 'Post comment added',
          actorId: comment.user,
          subject: post.isAnnouncement ? 'Announcement thread' : 'Social thread',
          detail: excerpt(comment.content),
        });
      }
    }

    let chatMessagesInPeriod = 0;
    let stickerMessagesInPeriod = 0;
    let messageReactionsInPeriod = 0;
    let selectedMessagesCount = 0;

    for (const message of messages) {
      const messageInScope = includesUser(message.sender);
      if (messageInScope) selectedMessagesCount += 1;

      if (inRange(message.createdAt, period.from, period.to)) {
        if (!messageInScope) {
          // message was outside the selected user scope; only reaction activity may still count below
        } else {
        chatMessagesInPeriod += 1;
        if (message.contentType === 'sticker') stickerMessagesInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: message.createdAt,
          module: 'Team Chat',
          action: message.contentType === 'sticker' ? 'Sticker sent' : 'Message sent',
          actorId: message.sender,
          subject: message.contentType === 'sticker' ? (message.stickerKey || 'Sticker') : 'Team conversation',
          detail: message.contentType === 'sticker'
            ? 'Sent a sticker in team chat'
            : excerpt(message.content || message.fileName || 'Shared a chat message'),
        });
        }
      }

      for (const reaction of message.reactions || []) {
        if (!inRange(reaction.timestamp, period.from, period.to)) continue;
        if (!includesUser(reaction.userId)) continue;
        messageReactionsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: reaction.timestamp,
          module: 'Team Chat',
          action: 'Message reaction added',
          actorId: reaction.userId,
          subject: 'Chat reaction',
          detail: `Reacted with ${reaction.emoji}`,
        });
      }
    }

    const liveGroupChats = chats.filter((chat) => chat.type === 'group' && includesAnyUser(chat.members)).length;
    const liveDirectChats = chats.filter((chat) => chat.type === 'individual' && includesAnyUser(chat.members)).length;

    let filesUploadedInPeriod = 0;
    let filesDeletedInPeriod = 0;
    let liveStarredFiles = 0;
    let liveSharedFiles = 0;
    let selectedFilesCount = 0;

    for (const file of files) {
      if (!includesUser(file.owner)) continue;

      selectedFilesCount += 1;
      if (file.starred) liveStarredFiles += 1;
      if (file.shareLink) liveSharedFiles += 1;

      if (inRange(file.createdAt, period.from, period.to)) {
        filesUploadedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: file.createdAt,
          module: 'File Storage',
          action: 'File uploaded',
          actorId: file.owner,
          subject: file.fileName,
          detail: String(file.type || 'File'),
        });
      }

      if (inRange(file.deletedAt, period.from, period.to)) {
        filesDeletedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: file.deletedAt,
          module: 'File Storage',
          action: 'File deleted',
          actorId: file.owner,
          subject: file.fileName,
          detail: 'Removed from file storage',
        });
      }
    }

    let documentsCreatedInPeriod = 0;
    let generationRequestsInPeriod = 0;
    let decksReadyInPeriod = 0;
    let deckFailuresInPeriod = 0;
    let selectedDocumentsCount = 0;

    for (const document of documents) {
      if (!includesUser(document.userId)) continue;

      selectedDocumentsCount += 1;
      if (inRange(document.createdAt, period.from, period.to)) {
        documentsCreatedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: document.createdAt,
          module: 'AI Documents',
          action: 'Document registered',
          actorId: document.userId,
          subject: document.sourceFileName || 'Untitled document',
          detail: 'Prepared for AI processing',
        });
      }

      if (inRange(document.generationRequestedAt, period.from, period.to)) {
        generationRequestsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: document.generationRequestedAt,
          module: 'AI Documents',
          action: 'Deck generation requested',
          actorId: document.userId,
          subject: document.sourceFileName || 'Untitled document',
          detail: 'Queued for presentation generation',
        });
      }

      if (inRange(document.generationCompletedAt, period.from, period.to)) {
        if (document.generationStatus === 'ready') {
          decksReadyInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: document.generationCompletedAt,
            module: 'AI Documents',
            action: 'Deck generated',
            actorId: document.userId,
            subject: document.sourceFileName || 'Untitled document',
            detail: 'Presentation output completed successfully',
          });
        }
        if (document.generationStatus === 'failed') {
          deckFailuresInPeriod += 1;
          pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
            at: document.generationCompletedAt,
            module: 'AI Documents',
            action: 'Deck generation failed',
            actorId: document.userId,
            subject: document.sourceFileName || 'Untitled document',
            detail: excerpt(document.generationError || 'Generation ended in failure'),
          });
        }
      }
    }

    const scopedReminders = reminders.filter((item) => includesUser(item.user));
    const remindersCreatedInPeriod = countIf(scopedReminders, (item) => inRange(item.createdAt, period.from, period.to));
    const reminderSchedulesInPeriod = countIf(scopedReminders, (item) => inRange(item.remindAt, period.from, period.to));
    const remindersPendingNow = countIf(scopedReminders, (item) => item.status === 'pending');
    const remindersSentNow = countIf(scopedReminders, (item) => item.status === 'sent');
    const remindersDismissedNow = countIf(scopedReminders, (item) => item.status === 'dismissed');

    for (const reminder of scopedReminders) {
      if (inRange(reminder.createdAt, period.from, period.to)) {
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: reminder.createdAt,
          module: 'Reminders',
          action: 'Reminder created',
          actorId: reminder.user,
          subject: String(reminder.type || 'Reminder'),
          detail: `Status ${String(reminder.status || 'pending').toLowerCase()}`,
        });
      }

      if (inRange(reminder.remindAt, period.from, period.to)) {
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: reminder.remindAt,
          module: 'Reminders',
          action: 'Reminder scheduled',
          actorId: reminder.user,
          subject: String(reminder.type || 'Reminder'),
          detail: reminder.isActive ? 'Scheduled reminder is active' : 'Scheduled reminder is inactive',
        });
      }
    }

    let notificationsCreatedInPeriod = 0;
    let notificationsReadInPeriod = 0;
    let unreadNotificationsNow = 0;

    for (const notification of notifications) {
      const notificationInScope = includesUser(notification.user) || includesUser(notification.actor);
      if (!notificationInScope) continue;
      if (!notification.isRead) unreadNotificationsNow += 1;
      if (inRange(notification.createdAt, period.from, period.to)) {
        notificationsCreatedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: notification.createdAt,
          module: 'Notifications',
          action: 'Notification created',
          actorId: notification.actor || notification.user,
          actorName: notification.actorName,
          subject: notification.title || String(notification.type || 'Notification'),
          detail: notification.entityType ? `Linked to ${notification.entityType}` : 'Notification issued',
        });
      }
      if (inRange(notification.readAt, period.from, period.to)) {
        notificationsReadInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: notification.readAt,
          module: 'Notifications',
          action: 'Notification read',
          actorId: notification.user,
          subject: notification.title || String(notification.type || 'Notification'),
          detail: 'User opened the notification',
        });
      }
    }

    let coursesPublishedInPeriod = 0;
    let enrollmentsInPeriod = 0;
    let moduleCompletionsInPeriod = 0;
    let courseCompletionsInPeriod = 0;
    let examAttemptsInPeriod = 0;
    let certificationsInPeriod = 0;

    for (const course of courses) {
      if (!allUsersSelected) continue;
      if (inRange(course.createdAt, period.from, period.to)) {
        coursesPublishedInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: course.createdAt,
          module: 'Training',
          action: 'Course published',
          subject: course.title,
          detail: `${String(course.level || 'general').toUpperCase()} level course`,
        });
      }
    }

    let selectedProgressCount = 0;

    for (const record of progressRecords) {
      if (!includesUser(record.userId)) continue;
      selectedProgressCount += 1;
      if (inRange(record.enrolledAt, period.from, period.to)) {
        enrollmentsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: record.enrolledAt,
          module: 'Training',
          action: 'Course enrollment',
          actorId: record.userId,
          subject: 'Training enrollment',
          detail: 'User enrolled in a learning course',
        });
      }

      if (inRange(record.completedAt, period.from, period.to)) {
        courseCompletionsInPeriod += 1;
        if (record.certificationEarned) certificationsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: record.completedAt,
          module: 'Training',
          action: record.certificationEarned ? 'Course completed with certification' : 'Course completed',
          actorId: record.userId,
          subject: 'Training completion',
          detail: `Progress reached ${numberValue(record.progress)}%`,
        });
      }

      for (const moduleProgress of record.moduleProgress || []) {
        if (!inRange(moduleProgress.completedAt, period.from, period.to)) continue;
        moduleCompletionsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: moduleProgress.completedAt,
          module: 'Training',
          action: 'Module completed',
          actorId: record.userId,
          subject: 'Training module',
          detail: `Quiz score ${numberValue(moduleProgress.quizScore)}%`,
        });
      }

      for (const attempt of record.examAttempts || []) {
        if (!inRange(attempt.completedAt, period.from, period.to)) continue;
        examAttemptsInPeriod += 1;
        pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
          at: attempt.completedAt,
          module: 'Training',
          action: attempt.passed ? 'Exam passed' : 'Exam attempted',
          actorId: record.userId,
          subject: 'Course exam',
          detail: `${numberValue(attempt.score)}% score`,
        });
      }
    }

    let feedbackSubmittedInPeriod = 0;
    let bugReportsInPeriod = 0;
    let featureRequestsInPeriod = 0;
    let usabilityIssuesInPeriod = 0;
    let generalFeedbackInPeriod = 0;

    for (const feedback of feedbacks) {
      if (!includesUser(feedback.userId)) continue;
      const timestamp = feedback.timestamp || feedback.createdAt;
      if (!inRange(timestamp, period.from, period.to)) continue;
      feedbackSubmittedInPeriod += 1;
      if (feedback.category === 'Bug Report') bugReportsInPeriod += 1;
      if (feedback.category === 'Feature Request') featureRequestsInPeriod += 1;
      if (feedback.category === 'Usability Issue') usabilityIssuesInPeriod += 1;
      if (feedback.category === 'General Feedback') generalFeedbackInPeriod += 1;

      pushEvent(events, actorCounts, unitCounts, moduleCounts, userLookup, {
        at: timestamp,
        module: 'Feedback',
        action: 'Feedback submitted',
        actorId: feedback.userId,
        subject: feedback.category,
        detail: excerpt(feedback.feedback),
      });
    }

    events.sort((left, right) => new Date(right.at) - new Date(left.at));

    const roleCounts = selectedUsers.reduce((accumulator, item) => {
      accumulator[item.role] = (accumulator[item.role] || 0) + 1;
      return accumulator;
    }, {});

    const tasksAwaitingReviewNow = countIf(tasks, (task) => task.submissionStatus === 'submitted');
    const reportsAwaitingReviewNow = countIf(reports, (report) => report.status === 'submitted');

    const footprintCards = [
      buildMetric('Users in scope', selectedUsers.length, allUsersSelected ? 'Everyone currently on the platform' : 'Selected users included in this report'),
      buildMetric('Tasks in scope', selectedTasksCount, 'Tasks connected to the selected user scope'),
      buildMetric('Goals in scope', selectedGoalsCount, 'Goals owned by the selected user scope'),
      buildMetric('Projects in scope', selectedProjectsCount, 'Projects touched by the selected user scope'),
      buildMetric('Reports in scope', selectedReportsCount, 'Reports connected to the selected user scope'),
      buildMetric('Files in scope', selectedFilesCount, 'Files owned by the selected user scope'),
      buildMetric('Training records in scope', selectedProgressCount, 'Training progress records for the selected user scope'),
      buildMetric('Group chats in scope', liveGroupChats, 'Live collaboration groups involving the selected user scope'),
    ];

    const allModuleSections = [
      {
        key: 'people',
        title: 'People & Access',
        description: 'User growth, role mix, logins, and management actions.',
        metrics: [
          buildMetric('Total users', users.length),
          buildMetric('Super admins', roleCounts.admin || 0),
          buildMetric('Executives', roleCounts.executive || 0),
          buildMetric('Team leads', roleCounts['team-lead'] || 0),
          buildMetric('Standard users', roleCounts.standard || 0),
          buildMetric('Active in period', activeUsersInPeriod),
          buildMetric('New users', newUsersInPeriod),
          buildMetric('Login events', userLoginsInPeriod),
          buildMetric('Admin actions', adminActionsInPeriod),
        ],
      },
      {
        key: 'tasks',
        title: 'Tasks',
        description: 'Task flow, delivery pressure, review queues, and priority mix.',
        metrics: [
          buildMetric('Tasks created', tasksCreatedInPeriod),
          buildMetric('Tasks submitted', tasksSubmittedInPeriod),
          buildMetric('Tasks approved', tasksApprovedInPeriod),
          buildMetric('Tasks rejected', tasksRejectedInPeriod),
          buildMetric('Task comments', taskCommentsInPeriod),
          buildMetric('Open tasks now', liveOpenTasks),
          buildMetric('Completed tasks now', liveCompletedTasks),
          buildMetric('Tasks awaiting review', tasksAwaitingReviewNow),
          buildMetric('Overdue tasks now', overdueTasksNow),
          buildMetric('High priority tasks now', liveHighPriorityTasks),
          buildMetric('Medium priority tasks now', liveMediumPriorityTasks),
          buildMetric('Low priority tasks now', liveLowPriorityTasks),
          buildMetric('High priority created in period', createdHighPriorityTasksInPeriod),
          buildMetric('Medium priority created in period', createdMediumPriorityTasksInPeriod),
          buildMetric('Low priority created in period', createdLowPriorityTasksInPeriod),
        ],
      },
      {
        key: 'goals',
        title: 'Goals',
        description: 'Goal creation, follow-up pressure, and completion position.',
        metrics: [
          buildMetric('Goals created', goalsCreatedInPeriod),
          buildMetric('Goal comments', goalCommentsInPeriod),
          buildMetric('Active goals now', liveActiveGoals),
          buildMetric('Completed goals now', liveCompletedGoals),
          buildMetric('Overdue goals now', overdueGoalsNow),
        ],
      },
      {
        key: 'reports',
        title: 'Reports',
        description: 'Report writing, submission, review, and AI-assisted report output.',
        metrics: [
          buildMetric('Reports created', reportsCreatedInPeriod),
          buildMetric('Reports submitted', reportsSubmittedInPeriod),
          buildMetric('Reports approved', reportsApprovedInPeriod),
          buildMetric('Reports rejected', reportsRejectedInPeriod),
          buildMetric('Report notes', reportNotesInPeriod),
          buildMetric('Draft reports now', draftsNow),
          buildMetric('Reports awaiting review', reportsAwaitingReviewNow),
          buildMetric('AI reports', aiGeneratedReportsInPeriod),
        ],
      },
      {
        key: 'projects',
        title: 'Projects',
        description: 'Project records, milestones, risks, issues, and control activity.',
        metrics: [
          buildMetric('Projects created', projectsCreatedInPeriod),
          buildMetric('Active projects now', activeProjectsNow),
          buildMetric('Completed projects now', completedProjectsNow),
          buildMetric('Project activity entries', projectActivityEntriesInPeriod),
          buildMetric('Milestones added', milestonesCreatedInPeriod),
          buildMetric('Milestones completed', milestonesCompletedInPeriod),
          buildMetric('Risks opened', risksOpenedInPeriod),
          buildMetric('Risks closed', risksClosedInPeriod),
          buildMetric('Issues opened', issuesOpenedInPeriod),
          buildMetric('Issues resolved', issuesResolvedInPeriod),
        ],
      },
      {
        key: 'meetings',
        title: 'Meetings',
        description: 'Meetings scheduled, cancelled, and run through live rooms.',
        metrics: [
          buildMetric('Meetings scheduled', meetingsScheduledInPeriod),
          buildMetric('Meetings cancelled', meetingsCancelledInPeriod),
          buildMetric('Room sessions started', roomSessionsStartedInPeriod),
          buildMetric('Room sessions ended', roomSessionsEndedInPeriod),
          buildMetric('Ongoing meetings now', meetingsOngoingNow),
        ],
      },
      {
        key: 'meetingReports',
        title: 'Meeting Reports',
        description: 'Meeting report distribution, reads, acknowledgements, and action-item follow-through.',
        metrics: [
          buildMetric('Meeting reports created', meetingReportsCreatedInPeriod),
          buildMetric('Recipients reached', meetingRecipientsInPeriod),
          buildMetric('Meeting views', meetingViewsInPeriod),
          buildMetric('Meeting acknowledgements', meetingAcknowledgementsInPeriod),
          buildMetric('Meeting resends', meetingResendsInPeriod),
          buildMetric('Action items logged', meetingActionItemsInPeriod),
          buildMetric('Action items converted', meetingActionItemsConvertedInPeriod),
        ],
      },
      {
        key: 'social',
        title: 'Social Feed',
        description: 'Posts, announcements, and comment activity in the social feed.',
        metrics: [
          buildMetric('Social posts', postsInPeriod),
          buildMetric('Announcements', announcementsInPeriod),
          buildMetric('Post comments', postCommentsInPeriod),
        ],
      },
      {
        key: 'chat',
        title: 'Team Chat',
        description: 'Message volume, sticker usage, reactions, and chat footprint.',
        metrics: [
          buildMetric('Chat messages', chatMessagesInPeriod),
          buildMetric('Sticker messages', stickerMessagesInPeriod),
          buildMetric('Chat reactions', messageReactionsInPeriod),
          buildMetric('Live group chats', liveGroupChats),
          buildMetric('Live direct chats', liveDirectChats),
        ],
      },
      {
        key: 'files',
        title: 'File Storage',
        description: 'File uploads, deletion activity, and current shared-file usage.',
        metrics: [
          buildMetric('Files uploaded', filesUploadedInPeriod),
          buildMetric('Files deleted', filesDeletedInPeriod),
          buildMetric('Starred files now', liveStarredFiles),
          buildMetric('Shared files now', liveSharedFiles),
        ],
      },
      {
        key: 'aiDocuments',
        title: 'AI Documents',
        description: 'Deck requests, completed deck output, and document job failures.',
        metrics: [
          buildMetric('AI documents created', documentsCreatedInPeriod),
          buildMetric('Deck requests', generationRequestsInPeriod),
          buildMetric('Decks ready', decksReadyInPeriod),
          buildMetric('Deck failures', deckFailuresInPeriod),
        ],
      },
      {
        key: 'training',
        title: 'Training',
        description: 'Course publishing, enrollment, completions, exams, and certifications.',
        metrics: [
          buildMetric('Courses published', coursesPublishedInPeriod),
          buildMetric('Enrollments', enrollmentsInPeriod),
          buildMetric('Module completions', moduleCompletionsInPeriod),
          buildMetric('Course completions', courseCompletionsInPeriod),
          buildMetric('Exam attempts', examAttemptsInPeriod),
          buildMetric('Certifications earned', certificationsInPeriod),
        ],
      },
      {
        key: 'reminders',
        title: 'Reminders',
        description: 'Reminder creation, scheduling, and pending follow-up load.',
        metrics: [
          buildMetric('Reminders created', remindersCreatedInPeriod),
          buildMetric('Reminder schedules', reminderSchedulesInPeriod),
          buildMetric('Pending reminders now', remindersPendingNow),
          buildMetric('Sent reminders now', remindersSentNow),
          buildMetric('Dismissed reminders now', remindersDismissedNow),
        ],
      },
      {
        key: 'notifications',
        title: 'Notifications',
        description: 'Notification creation, consumption, and unread operational load.',
        metrics: [
          buildMetric('Notifications created', notificationsCreatedInPeriod),
          buildMetric('Notifications read', notificationsReadInPeriod),
          buildMetric('Unread notifications now', unreadNotificationsNow),
        ],
      },
      {
        key: 'feedback',
        title: 'Feedback',
        description: 'Feedback volume and what users are raising with management.',
        metrics: [
          buildMetric('Feedback submitted', feedbackSubmittedInPeriod),
          buildMetric('Bug reports', bugReportsInPeriod),
          buildMetric('Feature requests', featureRequestsInPeriod),
          buildMetric('Usability issues', usabilityIssuesInPeriod),
          buildMetric('General feedback', generalFeedbackInPeriod),
        ],
      },
    ];

    const selectedModules = MODULE_DEFINITIONS.filter((item) => selectedModuleKeys.has(item.key));
    const moduleSections = allModuleSections.filter((section) => selectedModuleKeys.has(section.key));
    const filteredEvents = events.filter((event) => selectedModuleKeys.has(event.moduleKey));
    const eventSections = selectedModules.map((moduleMeta) => {
      const sectionEvents = filteredEvents.filter((event) => event.moduleKey === moduleMeta.key);
      return {
        key: moduleMeta.key,
        title: moduleMeta.title,
        description: moduleMeta.description,
        count: sectionEvents.length,
        events: sectionEvents,
      };
    });

    const includeAny = (...keys) => keys.some((key) => selectedModuleKeys.has(key));
    const highlights = buildHighlightsFromEvents(filteredEvents, userLookup);
    const workEvidenceModulesSelected = includeAny('tasks', 'goals', 'reports', 'projects', 'meetingReports', 'training', 'aiDocuments');

    for (const event of filteredEvents) {
      const profile = userAttentionProfiles.get(event.actorId);
      if (!profile) continue;

      profile.eventCount += 1;

      if (event.moduleKey === 'chat' || event.moduleKey === 'social' || event.moduleKey === 'meetings') {
        profile.collaborationCount += 1;
      }

      if (event.moduleKey === 'training' || event.moduleKey === 'aiDocuments' || event.moduleKey === 'files') {
        profile.knowledgeCount += 1;
      }

      const workEvidence =
        (event.moduleKey === 'tasks' && ['Task submitted', 'Task approved'].includes(event.action))
        || (event.moduleKey === 'goals' && event.action === 'Goal created')
        || (event.moduleKey === 'reports' && ['Report created', 'AI report created', 'Report submitted', 'Report approved'].includes(event.action))
        || (event.moduleKey === 'projects' && ['Milestone completed', 'Issue resolved', 'Risk closed'].includes(event.action))
        || (event.moduleKey === 'meetingReports' && ['Meeting report acknowledged', 'Action item converted to task'].includes(event.action))
        || (event.moduleKey === 'training' && ['Course completed', 'Course completed with certification', 'Module completed', 'Exam passed'].includes(event.action))
        || (event.moduleKey === 'aiDocuments' && event.action === 'Deck generated');

      if (workEvidence) profile.workEvidenceCount += 1;
    }

    const summaryCards = [];
    if (selectedModuleKeys.has('people')) {
      summaryCards.push({
        label: 'People activity',
        value: activeUsersInPeriod,
        helper: `${userLoginsInPeriod} login events, ${newUsersInPeriod} new users`,
      });
    }
    if (includeAny('tasks', 'goals', 'reports', 'projects')) {
      summaryCards.push({
        label: 'Execution activity',
        value:
          (selectedModuleKeys.has('tasks') ? tasksCreatedInPeriod + tasksSubmittedInPeriod + tasksApprovedInPeriod : 0)
          + (selectedModuleKeys.has('goals') ? goalsCreatedInPeriod + goalCommentsInPeriod : 0)
          + (selectedModuleKeys.has('reports') ? reportsCreatedInPeriod + reportsSubmittedInPeriod : 0)
          + (selectedModuleKeys.has('projects') ? projectActivityEntriesInPeriod + milestonesCompletedInPeriod : 0),
        helper: `${selectedModuleKeys.has('tasks') ? tasksSubmittedInPeriod : 0} task submissions, ${selectedModuleKeys.has('reports') ? reportsSubmittedInPeriod : 0} report submissions`,
      });
    }
    if (selectedModuleKeys.has('projects')) {
      summaryCards.push({
        label: 'Project control',
        value: projectActivityEntriesInPeriod + risksOpenedInPeriod + issuesOpenedInPeriod,
        helper: `${milestonesCompletedInPeriod} milestones completed, ${risksClosedInPeriod} risks closed`,
      });
    }
    if (includeAny('chat', 'social', 'meetings', 'meetingReports')) {
      summaryCards.push({
        label: 'Collaboration volume',
        value:
          (selectedModuleKeys.has('chat') ? chatMessagesInPeriod + messageReactionsInPeriod : 0)
          + (selectedModuleKeys.has('social') ? postsInPeriod + postCommentsInPeriod : 0)
          + (selectedModuleKeys.has('meetings') ? meetingsScheduledInPeriod + roomSessionsStartedInPeriod : 0)
          + (selectedModuleKeys.has('meetingReports') ? meetingReportsCreatedInPeriod + meetingAcknowledgementsInPeriod : 0),
        helper: `${selectedModuleKeys.has('chat') ? messageReactionsInPeriod : 0} chat reactions, ${selectedModuleKeys.has('meetingReports') ? meetingAcknowledgementsInPeriod : 0} meeting acknowledgements`,
      });
    }
    if (includeAny('training', 'files', 'aiDocuments')) {
      summaryCards.push({
        label: 'Knowledge and AI work',
        value:
          (selectedModuleKeys.has('files') ? filesUploadedInPeriod : 0)
          + (selectedModuleKeys.has('aiDocuments') ? decksReadyInPeriod + generationRequestsInPeriod : 0)
          + (selectedModuleKeys.has('training') ? examAttemptsInPeriod + courseCompletionsInPeriod : 0),
        helper: `${selectedModuleKeys.has('aiDocuments') ? documentsCreatedInPeriod : 0} AI documents, ${selectedModuleKeys.has('training') ? courseCompletionsInPeriod : 0} course completions`,
      });
    }
    if (includeAny('reminders', 'notifications', 'feedback')) {
      summaryCards.push({
        label: 'Governance signals',
        value:
          (selectedModuleKeys.has('reminders') ? remindersCreatedInPeriod + reminderSchedulesInPeriod : 0)
          + (selectedModuleKeys.has('notifications') ? notificationsCreatedInPeriod + notificationsReadInPeriod : 0)
          + (selectedModuleKeys.has('feedback') ? feedbackSubmittedInPeriod : 0),
        helper: `${selectedModuleKeys.has('feedback') ? feedbackSubmittedInPeriod : 0} feedback items, ${selectedModuleKeys.has('notifications') ? notificationsReadInPeriod : 0} notifications read`,
      });
    }

    const selectedModulesWithActivity = eventSections.filter((section) => section.count > 0).length;
    const idleSelectedModules = eventSections.filter((section) => section.count === 0).map((section) => section.title);
    const adoptionRate = selectedUsers.length ? activeUsersInPeriod / selectedUsers.length : 0;
    const highPriorityShare = selectedTasksCount ? liveHighPriorityTasks / selectedTasksCount : 0;
    const overdueTaskRate = liveOpenTasks ? overdueTasksNow / liveOpenTasks : 0;
    const meetingAcknowledgementRate = meetingRecipientsInPeriod ? meetingAcknowledgementsInPeriod / meetingRecipientsInPeriod : 0;
    const trainingCompletionRate = enrollmentsInPeriod ? courseCompletionsInPeriod / enrollmentsInPeriod : 0;
    const deckFailureRate = generationRequestsInPeriod ? deckFailuresInPeriod / generationRequestsInPeriod : 0;

    const suspiciousPriorityProfiles = [...taskPriorityProfiles.values()]
      .map((profile) => ({
        ...profile,
        highRatio: profile.total ? profile.high / profile.total : 0,
        name: getDisplayName(userLookup.get(profile.userId)),
        unitSector: userLookup.get(profile.userId)?.unitSector || 'Unassigned',
      }))
      .filter((profile) => profile.total >= 4 && (profile.highRatio >= 0.7 || profile.selfDirectedHigh >= 2))
      .sort((left, right) => (right.highRatio - left.highRatio) || (right.selfDirectedHigh - left.selfDirectedHigh))
      .slice(0, 8);

    const usersNeedingAttention = [...userAttentionProfiles.values()]
      .map((profile) => {
        const reasons = [];
        let tone = 'watch';
        let severity = 1;

        if (!profile.touchedPeriod && profile.eventCount === 0) {
          reasons.push('No recorded platform use in the selected window.');
          tone = 'risk';
          severity = 4;
        } else {
          if (!profile.loginInPeriod) {
            reasons.push('No login recorded in the selected window.');
            severity = Math.max(severity, 2);
          }

          if (profile.eventCount <= 2) {
            reasons.push('Very light activity for the selected window.');
            severity = Math.max(severity, 2);
          }

          if (profile.collaborationCount === 0 && includeAny('chat', 'social', 'meetings')) {
            reasons.push('No visible collaboration activity in the selected collaboration modules.');
            severity = Math.max(severity, 1);
          }

          if (workEvidenceModulesSelected && profile.workEvidenceCount === 0) {
            reasons.push('No notable work evidence in the selected work modules.');
            severity = Math.max(severity, 3);
          }

          if (profile.knowledgeCount === 0 && includeAny('training', 'aiDocuments', 'files')) {
            reasons.push('No visible knowledge, file, or learning activity in the selected support modules.');
            severity = Math.max(severity, 1);
          }

          if (severity >= 3) tone = 'risk';
        }

        return {
          ...profile,
          reasons,
          tone,
          severity,
        };
      })
      .filter((profile) => profile.reasons.length > 0)
      .sort((left, right) => (right.severity - left.severity) || (left.eventCount - right.eventCount) || left.name.localeCompare(right.name))
      .slice(0, 12);

    const reviewFindings = [];

    if (adoptionRate < 0.35) {
      reviewFindings.push({
        tone: 'risk',
        area: 'Platform use',
        detail: `${activeUsersInPeriod} of ${selectedUsers.length} users in scope touched the platform in this window. Usage is weak and leadership should assume some work is happening outside the system.`,
      });
    } else if (adoptionRate < 0.6) {
      reviewFindings.push({
        tone: 'watch',
        area: 'Platform use',
        detail: `${activeUsersInPeriod} of ${selectedUsers.length} users in scope were active in this window. Usage is mixed and adoption is not yet strong across this selected population.`,
      });
    } else {
      reviewFindings.push({
        tone: 'good',
        area: 'Platform use',
        detail: `${activeUsersInPeriod} of ${selectedUsers.length} users in scope were active in this window. Usage is healthy enough to trust the platform as the main operating record.`,
      });
    }

    if (idleSelectedModules.length) {
      reviewFindings.push({
        tone: idleSelectedModules.length >= 3 ? 'risk' : 'watch',
        area: 'Module coverage',
        detail: `The selected report includes ${selectedModules.length} module${selectedModules.length === 1 ? '' : 's'}. ${selectedModulesWithActivity} showed activity. No activity was recorded in ${idleSelectedModules.join(', ')}.`,
      });
    }

    if (usersNeedingAttention.length) {
      const highConcernUsers = usersNeedingAttention.filter((item) => item.tone === 'risk').length;
      reviewFindings.push({
        tone: highConcernUsers >= 3 ? 'risk' : 'watch',
        area: 'User engagement',
        detail: `${usersNeedingAttention.length} user${usersNeedingAttention.length === 1 ? '' : 's'} in scope need attention for weak usage or missing work evidence. ${highConcernUsers} of them look like direct management concerns.`,
      });
    } else {
      reviewFindings.push({
        tone: 'good',
        area: 'User engagement',
        detail: 'The selected users are leaving enough visible platform activity and work evidence for this review window.',
      });
    }

    if (selectedModuleKeys.has('tasks')) {
      if (overdueTaskRate > 0.3) {
        reviewFindings.push({
          tone: 'risk',
          area: 'Task discipline',
          detail: `${overdueTasksNow} of ${liveOpenTasks} open tasks are overdue. Execution pressure is high and follow-up is not tight enough.`,
        });
      } else if (overdueTaskRate > 0.15) {
        reviewFindings.push({
          tone: 'watch',
          area: 'Task discipline',
          detail: `${overdueTasksNow} of ${liveOpenTasks} open tasks are overdue. The backlog is manageable now, but it needs attention.`,
        });
      } else {
        reviewFindings.push({
          tone: 'good',
          area: 'Task discipline',
          detail: `${overdueTasksNow} of ${liveOpenTasks} open tasks are overdue. Delivery pressure is under control at the moment.`,
        });
      }

      if (tasksAwaitingReviewNow > 0) {
        reviewFindings.push({
          tone: tasksAwaitingReviewNow >= 10 ? 'risk' : 'watch',
          area: 'Review queue',
          detail: `${tasksAwaitingReviewNow} submitted task${tasksAwaitingReviewNow === 1 ? ' is' : 's are'} still waiting for review. Approval delay is holding work in the queue.`,
        });
      }

      if (highPriorityShare > 0.45) {
        reviewFindings.push({
          tone: 'watch',
          area: 'Priority discipline',
          detail: `${liveHighPriorityTasks} of ${selectedTasksCount} tasks in scope are marked high priority. The task board is carrying too much urgent work and the priority labels should be reviewed closely.`,
        });
      }
    }

    if (selectedModuleKeys.has('reports')) {
      if (draftsNow > selectedReportsCount * 0.4 && selectedReportsCount > 0) {
        reviewFindings.push({
          tone: 'watch',
          area: 'Report follow-through',
          detail: `${draftsNow} of ${selectedReportsCount} reports in scope are still in draft. Report completion is lagging behind work activity.`,
        });
      }

      if (reportsAwaitingReviewNow > 0) {
        reviewFindings.push({
          tone: reportsAwaitingReviewNow >= 8 ? 'risk' : 'watch',
          area: 'Report review queue',
          detail: `${reportsAwaitingReviewNow} submitted report${reportsAwaitingReviewNow === 1 ? ' is' : 's are'} awaiting review. Management visibility is slowing down at the approval point.`,
        });
      }
    }

    if (selectedModuleKeys.has('meetingReports') && meetingRecipientsInPeriod > 0) {
      if (meetingAcknowledgementRate < 0.5) {
        reviewFindings.push({
          tone: 'risk',
          area: 'Meeting accountability',
          detail: `Only ${meetingAcknowledgementsInPeriod} of ${meetingRecipientsInPeriod} meeting-report recipients acknowledged what was sent. Distribution is happening, but accountability is weak.`,
        });
      } else if (meetingAcknowledgementRate < 0.8) {
        reviewFindings.push({
          tone: 'watch',
          area: 'Meeting accountability',
          detail: `${meetingAcknowledgementsInPeriod} of ${meetingRecipientsInPeriod} recipients acknowledged their meeting reports. Follow-up is decent but not yet tight enough.`,
        });
      } else {
        reviewFindings.push({
          tone: 'good',
          area: 'Meeting accountability',
          detail: `${meetingAcknowledgementsInPeriod} of ${meetingRecipientsInPeriod} recipients acknowledged their meeting reports. Follow-up on circulated meetings is strong.`,
        });
      }
    }

    if (selectedModuleKeys.has('training') && enrollmentsInPeriod > 0) {
      if (trainingCompletionRate < 0.35) {
        reviewFindings.push({
          tone: 'risk',
          area: 'Training follow-through',
          detail: `${courseCompletionsInPeriod} of ${enrollmentsInPeriod} enrollments reached completion. Learning activity is not converting into finished training.`,
        });
      } else if (trainingCompletionRate < 0.6) {
        reviewFindings.push({
          tone: 'watch',
          area: 'Training follow-through',
          detail: `${courseCompletionsInPeriod} of ${enrollmentsInPeriod} enrollments reached completion. Training progress is moving, but completion is still light.`,
        });
      } else {
        reviewFindings.push({
          tone: 'good',
          area: 'Training follow-through',
          detail: `${courseCompletionsInPeriod} of ${enrollmentsInPeriod} enrollments reached completion. Training completion is in a healthy range.`,
        });
      }
    }

    if (selectedModuleKeys.has('aiDocuments') && generationRequestsInPeriod > 0) {
      if (deckFailureRate > 0.25) {
        reviewFindings.push({
          tone: 'risk',
          area: 'AI document output',
          detail: `${deckFailuresInPeriod} of ${generationRequestsInPeriod} deck jobs failed. The document pipeline is not reliable enough for management use yet.`,
        });
      } else if (deckFailureRate > 0.1) {
        reviewFindings.push({
          tone: 'watch',
          area: 'AI document output',
          detail: `${deckFailuresInPeriod} of ${generationRequestsInPeriod} deck jobs failed. The pipeline is usable, but it still needs attention.`,
        });
      } else {
        reviewFindings.push({
          tone: 'good',
          area: 'AI document output',
          detail: `${decksReadyInPeriod} of ${generationRequestsInPeriod} requested deck jobs completed cleanly in this window.`,
        });
      }
    }

    const integrityFlags = [];
    if (selectedModuleKeys.has('tasks') && highPriorityShare > 0.45) {
      integrityFlags.push({
        tone: 'watch',
        subject: 'High priority overuse',
        detail: `${liveHighPriorityTasks} of ${selectedTasksCount} tasks in scope are marked high priority. This can distort performance scoring if managers are not checking the labels closely.`,
      });
    }

    suspiciousPriorityProfiles.forEach((profile) => {
      integrityFlags.push({
        tone: profile.selfDirectedHigh >= 2 ? 'risk' : 'watch',
        subject: profile.name,
        detail: `${profile.high} of ${profile.total} tasks are marked high priority for this user. ${profile.selfDirectedHigh} high-priority task${profile.selfDirectedHigh === 1 ? ' looks' : 's look'} self-directed. This should be checked for inflated urgency.`,
        unitSector: profile.unitSector,
      });
    });

    if (!integrityFlags.length) {
      integrityFlags.push({
        tone: 'good',
        subject: 'Priority and usage checks',
        detail: 'No strong pattern of score inflation or unusual task-priority behaviour stood out in the selected data window.',
      });
    }

    const riskCount = reviewFindings.filter((item) => item.tone === 'risk').length + integrityFlags.filter((item) => item.tone === 'risk').length;
    const watchCount = reviewFindings.filter((item) => item.tone === 'watch').length + integrityFlags.filter((item) => item.tone === 'watch').length;

    let conclusion = 'The platform is moving in the right direction, but management still needs to enforce consistency in the weaker areas listed above.';
    if (riskCount >= 3) {
      conclusion = 'The platform is active, but there are clear control gaps. Management should treat this report as a call for direct intervention, not routine monitoring.';
    } else if (riskCount === 0 && watchCount <= 2) {
      conclusion = 'The platform is being used in a disciplined way overall. Management can treat the system as a credible operating record for the selected modules.';
    }

    const managementReview = {
      title: 'Super management review',
      scope: selectedModules.map((item) => item.title),
      overview: `This review covers ${selectedModules.length} selected module${selectedModules.length === 1 ? '' : 's'} and ${allUsersSelected ? 'all users on the platform' : `${selectedUsers.length} selected user${selectedUsers.length === 1 ? '' : 's'}`}. ${activeUsersInPeriod} user${activeUsersInPeriod === 1 ? '' : 's'} in scope showed activity in the selected window, and ${selectedModulesWithActivity} selected module${selectedModulesWithActivity === 1 ? '' : 's'} produced recorded activity.`,
      findings: reviewFindings,
      integrityFlags,
      usersNeedingAttention,
      conclusion,
    };

    return res.json({
      success: true,
      report: {
        generatedAt: generatedAt.toISOString(),
        platformStartedAt: platformStartedAt ? new Date(platformStartedAt).toISOString() : null,
        period: {
          preset: period.preset,
          from: period.from ? period.from.toISOString() : null,
          to: period.to ? period.to.toISOString() : null,
          label: period.label,
          fullHistory: period.fullHistory,
        },
        availableModules: MODULE_DEFINITIONS,
        availableUsers: users.map((item) => ({
          userId: String(item._id),
          name: getDisplayName(item),
          role: roleLabel(item.role),
          unitSector: item.unitSector || 'Unassigned',
        })),
        allUsersSelected,
        selectedUserIds: Array.from(selectedUserIds),
        selectedModules: selectedModules.map((item) => item.key),
        summaryCards,
        footprintCards,
        moduleSections,
        managementReview,
        highlights,
        eventSections,
        eventsCount: filteredEvents.length,
        notes: [
          `Platform live since ${platformStartedAt ? formatDate(platformStartedAt) : 'the recorded start date'}.`,
          allUsersSelected
            ? 'User scope: All users on the platform.'
            : `User scope: ${selectedUsers.length} selected user${selectedUsers.length === 1 ? '' : 's'}.`,
          `Modules included in this report: ${selectedModules.map((item) => item.title).join(', ')}.`,
          'Platform footprint cards, event sections, and management conclusions all respect the selected report window, selected modules, and selected user scope.',
          'The management review is rules-based and direct. It is meant to surface control gaps, weak adoption, delivery pressure, and possible score inflation patterns without softening the message.',
        ],
      },
    });
  } catch (error) {
    console.error('getPlatformActivityReport error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate platform activity report',
    });
  }
};



