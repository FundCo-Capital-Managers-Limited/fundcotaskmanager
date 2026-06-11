import mongoose from 'mongoose';
import Project from '../models/projectModel.js';
import Task from '../models/taskModel.js';
import Goal from '../models/goalModel.js';
import { createNotification, createNotifications } from '../utils/notificationService.js';

const USER_FIELDS = 'firstName lastName fullName email avatar position role unitSector';
const MILESTONE_STATUSES = ['planned', 'active', 'blocked', 'completed'];
const RISK_STATUSES = ['open', 'mitigating', 'watching', 'closed'];
const ISSUE_STATUSES = ['open', 'in-progress', 'escalated', 'resolved'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const createHttpError = (status, message) => Object.assign(new Error(message), { status });
const cleanText = (value, maxLength = 1000) => String(value || '').trim().slice(0, maxLength);
const toId = (value) => String(value?._id || value || '').trim();
const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const uniqueIds = (values = []) => [...new Set((values || []).map(toId).filter(Boolean))];
const buildProjectAudience = (project, memberIds = []) => uniqueIds([project?.createdBy, ...(memberIds || [])]);
const isOpenProjectStatus = (status) => ['planning', 'active', 'on-hold'].includes(status);
const daysUntil = (date) => {
  const value = toDate(date);
  if (!value) return null;
  return Math.ceil((value.getTime() - Date.now()) / 86400000);
};

const readClient = (value = {}) => ({
  name: cleanText(value?.name, 160),
  account: cleanText(value?.account, 160),
  contactName: cleanText(value?.contactName, 160),
  contactEmail: cleanText(value?.contactEmail, 160),
});

const readBudget = (value = {}) => ({
  planned: toNumber(value?.planned, 0),
  actual: toNumber(value?.actual, 0),
  revenueTarget: toNumber(value?.revenueTarget, 0),
  currency: cleanText(value?.currency || 'NGN', 12) || 'NGN',
});

const readActivityEntry = ({ kind, message, actor, meta = {} }) => ({
  kind: cleanText(kind, 80),
  message: cleanText(message, 300),
  actor: actor?._id || actor || null,
  actorName: cleanText(actor?.fullName || actor?.email || '', 160),
  meta,
  createdAt: new Date(),
});

const pushProjectActivity = (project, entry) => {
  const existing = Array.isArray(project.activity) ? project.activity : [];
  project.activity = [entry, ...existing].slice(0, 80);
  project.markModified('activity');
};

const assertScopedUserId = (value, teamMemberIds, label) => {
  const id = toId(value);
  if (!id) return null;
  if (teamMemberIds !== null && !uniqueIds(teamMemberIds).includes(id)) {
    throw createHttpError(403, `${label} is outside your team scope`);
  }
  return id;
};

const readMilestonePayload = (payload = {}, teamMemberIds, existing = {}) => {
  const title = payload.title !== undefined ? cleanText(payload.title, 160) : cleanText(existing.title, 160);
  if (!title) throw createHttpError(400, 'Milestone title is required');

  const status = payload.status !== undefined ? String(payload.status) : existing.status || 'planned';
  if (!MILESTONE_STATUSES.includes(status)) throw createHttpError(400, 'Invalid milestone status');

  const owner = payload.owner !== undefined
    ? assertScopedUserId(payload.owner, teamMemberIds, 'Milestone owner')
    : (toId(existing.owner) || null);

  return {
    title,
    description: payload.description !== undefined ? cleanText(payload.description, 1200) : cleanText(existing.description, 1200),
    dueDate: payload.dueDate !== undefined ? toDate(payload.dueDate) : (toDate(existing.dueDate) || null),
    owner,
    status,
    notes: payload.notes !== undefined ? cleanText(payload.notes, 1200) : cleanText(existing.notes, 1200),
    completedAt: status === 'completed' ? (payload.completedAt ? toDate(payload.completedAt) : (toDate(existing.completedAt) || new Date())) : null,
  };
};

const readRiskPayload = (payload = {}, teamMemberIds, existing = {}) => {
  const title = payload.title !== undefined ? cleanText(payload.title, 160) : cleanText(existing.title, 160);
  if (!title) throw createHttpError(400, 'Risk title is required');

  const severity = payload.severity !== undefined ? String(payload.severity) : existing.severity || 'medium';
  const status = payload.status !== undefined ? String(payload.status) : existing.status || 'open';
  if (!SEVERITIES.includes(severity)) throw createHttpError(400, 'Invalid risk severity');
  if (!RISK_STATUSES.includes(status)) throw createHttpError(400, 'Invalid risk status');

  const owner = payload.owner !== undefined
    ? assertScopedUserId(payload.owner, teamMemberIds, 'Risk owner')
    : (toId(existing.owner) || null);

  return {
    title,
    description: payload.description !== undefined ? cleanText(payload.description, 1500) : cleanText(existing.description, 1500),
    severity,
    status,
    owner,
    dueDate: payload.dueDate !== undefined ? toDate(payload.dueDate) : (toDate(existing.dueDate) || null),
    mitigation: payload.mitigation !== undefined ? cleanText(payload.mitigation, 2000) : cleanText(existing.mitigation, 2000),
    impact: payload.impact !== undefined ? cleanText(payload.impact, 1200) : cleanText(existing.impact, 1200),
    closedAt: status === 'closed' ? (payload.closedAt ? toDate(payload.closedAt) : (toDate(existing.closedAt) || new Date())) : null,
  };
};

const readIssuePayload = (payload = {}, teamMemberIds, existing = {}) => {
  const title = payload.title !== undefined ? cleanText(payload.title, 160) : cleanText(existing.title, 160);
  if (!title) throw createHttpError(400, 'Issue title is required');

  const severity = payload.severity !== undefined ? String(payload.severity) : existing.severity || 'medium';
  const status = payload.status !== undefined ? String(payload.status) : existing.status || 'open';
  if (!SEVERITIES.includes(severity)) throw createHttpError(400, 'Invalid issue severity');
  if (!ISSUE_STATUSES.includes(status)) throw createHttpError(400, 'Invalid issue status');

  const owner = payload.owner !== undefined
    ? assertScopedUserId(payload.owner, teamMemberIds, 'Issue owner')
    : (toId(existing.owner) || null);

  return {
    title,
    description: payload.description !== undefined ? cleanText(payload.description, 1500) : cleanText(existing.description, 1500),
    severity,
    status,
    owner,
    dueDate: payload.dueDate !== undefined ? toDate(payload.dueDate) : (toDate(existing.dueDate) || null),
    resolution: payload.resolution !== undefined ? cleanText(payload.resolution, 2000) : cleanText(existing.resolution, 2000),
    resolvedAt: status === 'resolved' ? (payload.resolvedAt ? toDate(payload.resolvedAt) : (toDate(existing.resolvedAt) || new Date())) : null,
  };
};

const ensureValidMembers = (members = [], teamMemberIds = null) => {
  const nextIds = uniqueIds(members);
  if (teamMemberIds === null) return nextIds;
  const allowed = new Set(uniqueIds(teamMemberIds));
  const invalid = nextIds.filter((memberId) => !allowed.has(memberId));
  return { memberIds: nextIds.filter((memberId) => allowed.has(memberId)), invalid };
};

const buildVisibilityQuery = (teamMemberIds) => {
  if (teamMemberIds === null) return {};
  const ids = uniqueIds(teamMemberIds);
  return { $or: [{ createdBy: { $in: ids } }, { members: { $in: ids } }] };
};

const mergeQuery = (base, visibility) => {
  if (!visibility || !Object.keys(visibility).length) return base;
  return { $and: [base, visibility] };
};

const buildProjectListQuery = (req) => {
  const { search, status, memberId } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'client.name': { $regex: search, $options: 'i' } },
      { 'client.account': { $regex: search, $options: 'i' } },
    ];
  }
  if (status) query.status = status;
  if (memberId) query.members = memberId;
  return mergeQuery(query, buildVisibilityQuery(req.teamMemberIds));
};

const syncTaskOwnersIntoMembers = async (taskIds = [], memberIds = []) => {
  const ownedTasks = await Task.find({ _id: { $in: uniqueIds(taskIds) } }).select('owner').lean();
  const taskOwnerIds = uniqueIds(ownedTasks.map((task) => task.owner));
  const nextMemberIds = uniqueIds([...memberIds, ...taskOwnerIds]);
  return {
    nextMemberIds,
    autoAddedIds: nextMemberIds.filter((memberId) => !memberIds.includes(memberId)),
  };
};

const syncGoalOwnersIntoMembers = async (goalIds = [], memberIds = []) => {
  const ownedGoals = await Goal.find({ _id: { $in: uniqueIds(goalIds) } }).select('owner').lean();
  const goalOwnerIds = uniqueIds(ownedGoals.map((goal) => goal.owner));
  const nextMemberIds = uniqueIds([...memberIds, ...goalOwnerIds]);
  return {
    nextMemberIds,
    autoAddedIds: nextMemberIds.filter((memberId) => !memberIds.includes(memberId)),
  };
};

const syncResponsibilityMembers = async (taskIds = [], goalIds = [], memberIds = []) => {
  const taskSync = await syncTaskOwnersIntoMembers(taskIds, memberIds);
  const goalSync = await syncGoalOwnersIntoMembers(goalIds, taskSync.nextMemberIds);
  return {
    nextMemberIds: goalSync.nextMemberIds,
    autoAddedIds: uniqueIds([...taskSync.autoAddedIds, ...goalSync.autoAddedIds]),
  };
};

const populateProject = (query) => (
  query
    .populate('createdBy', USER_FIELDS)
    .populate('members', USER_FIELDS)
    .populate({
      path: 'tasks',
      select: 'title description completed priority dueDate owner checklist submissionStatus submittedAt reviewedAt reviewedBy createdByAdmin assignedBy createdAt',
      populate: [
        { path: 'owner', select: USER_FIELDS },
        { path: 'assignedBy', select: USER_FIELDS },
        { path: 'reviewedBy', select: USER_FIELDS },
      ],
    })
    .populate({
      path: 'goals',
      select: 'title subGoals timeframe startDate endDate owner',
      populate: { path: 'owner', select: USER_FIELDS },
    })
    .populate('milestones.owner', USER_FIELDS)
    .populate('risks.owner', USER_FIELDS)
    .populate('issues.owner', USER_FIELDS)
    .populate('activity.actor', USER_FIELDS)
);

const buildProjectMetrics = (project, viewerId = '') => {
  const now = new Date();
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const goals = Array.isArray(project.goals) ? project.goals : [];
  const milestones = Array.isArray(project.milestones) ? project.milestones : [];
  const risks = Array.isArray(project.risks) ? project.risks : [];
  const issues = Array.isArray(project.issues) ? project.issues : [];
  const completedTasks = tasks.filter((task) => task?.completed).length;
  const overdueTasks = tasks.filter((task) => !task?.completed && toDate(task?.dueDate) && toDate(task?.dueDate) < now).length;
  const openTasks = Math.max(0, tasks.length - completedTasks);
  const completion = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const myTasks = viewerId ? tasks.filter((task) => toId(task?.owner) === viewerId) : [];
  const completedGoals = goals.filter((goal) => Array.isArray(goal?.subGoals) && goal.subGoals.length > 0 && goal.subGoals.every((item) => item?.completed)).length;
  const completedMilestones = milestones.filter((item) => item?.status === 'completed').length;
  const overdueMilestones = milestones.filter((item) => item?.status !== 'completed' && toDate(item?.dueDate) && toDate(item?.dueDate) < now).length;
  const dueSoonMilestones = milestones.filter((item) => {
    const days = daysUntil(item?.dueDate);
    return item?.status !== 'completed' && days !== null && days >= 0 && days <= 7;
  }).length;
  const openRisks = risks.filter((item) => item?.status !== 'closed').length;
  const criticalRisks = risks.filter((item) => item?.status !== 'closed' && item?.severity === 'critical').length;
  const openIssues = issues.filter((item) => item?.status !== 'resolved').length;
  const escalatedIssues = issues.filter((item) => item?.status === 'escalated').length;
  const budgetPlanned = toNumber(project?.budget?.planned, 0);
  const budgetActual = toNumber(project?.budget?.actual, 0);
  const budgetVariance = budgetActual - budgetPlanned;
  const budgetBurn = budgetPlanned > 0 ? Math.round((budgetActual / budgetPlanned) * 100) : 0;
  const endDate = toDate(project.endDate);
  const startDate = toDate(project.startDate);
  const daysRemaining = endDate ? Math.ceil((endDate.getTime() - Date.now()) / 86400000) : null;

  return {
    totalTasks: tasks.length,
    completedTasks,
    openTasks,
    overdueTasks,
    completion,
    myTasks: myTasks.length,
    myOpenTasks: myTasks.filter((task) => !task?.completed).length,
    members: Array.isArray(project.members) ? project.members.length : 0,
    goals: goals.length,
    completedGoals,
    milestones: milestones.length,
    completedMilestones,
    overdueMilestones,
    dueSoonMilestones,
    openRisks,
    criticalRisks,
    openIssues,
    escalatedIssues,
    budgetPlanned,
    budgetActual,
    budgetVariance,
    budgetBurn,
    startDate,
    endDate,
    daysRemaining,
  };
};

const projectHealth = (project, metrics) => {
  if (project.status === 'completed' || project.status === 'archived') return 'settled';
  if (
    metrics.criticalRisks > 0
    || metrics.escalatedIssues > 0
    || metrics.overdueMilestones > 0
    || metrics.overdueTasks > 0
    || (metrics.daysRemaining !== null && metrics.daysRemaining < 0)
  ) {
    return 'at-risk';
  }
  if (
    metrics.openRisks > 0
    || metrics.openIssues > 0
    || metrics.dueSoonMilestones > 0
    || (metrics.daysRemaining !== null && metrics.daysRemaining <= 10)
    || (metrics.openTasks > 0 && metrics.completion < 40)
  ) {
    return 'watch';
  }
  return 'on-track';
};

const decorateProject = (project, viewerId = '') => {
  const metrics = buildProjectMetrics(project, viewerId);
  const memberIds = uniqueIds(project.members);
  return {
    ...project,
    metrics,
    health: projectHealth(project, metrics),
    membership: {
      isOwner: toId(project.createdBy) === viewerId,
      isMember: memberIds.includes(viewerId),
      hasAssignedTasks: metrics.myTasks > 0,
    },
  };
};

const notifyAddedMembers = async ({ project, memberIds, actor, io, authHeader, reason = 'added' }) => {
  const recipients = uniqueIds(memberIds).filter(Boolean);
  if (!recipients.length) return;
  await Promise.all(recipients.map((memberId) => createNotification({
    userId: memberId,
    type: 'project',
    title: `Added to project: ${project.name}`,
    body: reason === 'linked'
      ? `${actor.fullName || actor.email} linked work you own to this project.`
      : `${actor.fullName || actor.email} added you to this project.`,
    actorId: actor._id,
    actorName: actor.fullName || actor.email || '',
    entityId: project._id,
    entityType: 'project',
    data: { projectId: project._id, projectName: project.name, route: `/projects/${project._id}`, reason },
    io,
    authHeader,
  })));
};

const notifyRemovedMembers = async ({ project, memberIds, actor, io, authHeader }) => {
  const recipients = uniqueIds(memberIds).filter(Boolean);
  if (!recipients.length) return;
  await Promise.all(recipients.map((memberId) => createNotification({
    userId: memberId,
    type: 'project',
    title: `Removed from project: ${project.name}`,
    body: `${actor.fullName || actor.email} removed you from this project.`,
    actorId: actor._id,
    actorName: actor.fullName || actor.email || '',
    entityId: project._id,
    entityType: 'project',
    data: { projectId: project._id, projectName: project.name, route: '/projects', reason: 'removed' },
    io,
    authHeader,
  })));
};

const notifyProjectChanged = async ({ project, memberIds, actor, io, authHeader, changes = [] }) => {
  const recipients = buildProjectAudience(project, memberIds).filter((memberId) => memberId && memberId !== toId(actor._id));
  if (!recipients.length || !changes.length) return;
  await Promise.all(recipients.map((memberId) => createNotification({
    userId: memberId,
    type: 'project',
    title: `Project updated: ${project.name}`,
    body: `Updated ${changes.join(', ')}.`,
    actorId: actor._id,
    actorName: actor.fullName || actor.email || '',
    entityId: project._id,
    entityType: 'project',
    data: { projectId: project._id, projectName: project.name, route: `/projects/${project._id}`, changes },
    io,
    authHeader,
  })));
};

const notifyProjectActivity = async ({
  project,
  memberIds,
  actor,
  io,
  authHeader,
  title,
  body,
  route,
  data = {},
}) => {
  const recipients = buildProjectAudience(project, memberIds).filter((memberId) => memberId && memberId !== toId(actor._id));
  if (!recipients.length || !title) return;
  await createNotifications({
    userIds: recipients,
    type: 'project',
    title,
    body,
    actorId: actor._id,
    actorName: actor.fullName || actor.email || '',
    entityId: project._id,
    entityType: 'project',
    data: {
      projectId: project._id,
      projectName: project.name,
      route: route || `/projects/${project._id}`,
      ...data,
    },
    io,
    authHeader,
  });
};

const getProjectInScope = async (req, projectId) => {
  if (!mongoose.isValidObjectId(projectId)) {
    throw createHttpError(400, 'Invalid project ID');
  }
  const project = await Project.findOne(mergeQuery({ _id: projectId }, buildVisibilityQuery(req.teamMemberIds)));
  if (!project) throw createHttpError(404, 'Project not found');
  return project;
};

const summarizeProjectChanges = (project, previous) => {
  const changes = [];
  if (project.status !== previous.status) changes.push('status');
  if (project.priority !== previous.priority) changes.push('priority');
  if (project.name !== previous.name) changes.push('name');
  if (String(project.description || '') !== String(previous.description || '')) changes.push('description');
  if ((project.endDate ? new Date(project.endDate).toISOString() : '') !== previous.endDate) changes.push('deadline');
  if (uniqueIds(project.goals).join(',') !== previous.goals.join(',')) changes.push('goals');
  if (uniqueIds(project.tasks).join(',') !== previous.tasks.join(',')) changes.push('tasks');
  if (JSON.stringify(readClient(project.client)) !== JSON.stringify(previous.client)) changes.push('client');
  if (JSON.stringify(readBudget(project.budget)) !== JSON.stringify(previous.budget)) changes.push('budget');
  return changes;
};

const sortProjectsForPriority = (projects = []) => (
  [...projects].sort((left, right) => {
    const leftScore = (left.metrics.overdueTasks * 4) + (left.metrics.overdueMilestones * 4) + (left.metrics.criticalRisks * 5) + (left.metrics.escalatedIssues * 5) + (left.health === 'watch' ? 2 : 0);
    const rightScore = (right.metrics.overdueTasks * 4) + (right.metrics.overdueMilestones * 4) + (right.metrics.criticalRisks * 5) + (right.metrics.escalatedIssues * 5) + (right.health === 'watch' ? 2 : 0);
    return rightScore - leftScore;
  })
);

const buildOperationsOverview = (projects = []) => {
  const summary = {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status === 'active').length,
    openProjects: projects.filter((project) => isOpenProjectStatus(project.status)).length,
    atRiskProjects: projects.filter((project) => project.health === 'at-risk').length,
    watchProjects: projects.filter((project) => project.health === 'watch').length,
    overdueTasks: projects.reduce((sum, project) => sum + (project.metrics.overdueTasks || 0), 0),
    overdueMilestones: projects.reduce((sum, project) => sum + (project.metrics.overdueMilestones || 0), 0),
    openRisks: projects.reduce((sum, project) => sum + (project.metrics.openRisks || 0), 0),
    openIssues: projects.reduce((sum, project) => sum + (project.metrics.openIssues || 0), 0),
    escalatedIssues: projects.reduce((sum, project) => sum + (project.metrics.escalatedIssues || 0), 0),
    budgetAtRisk: projects.filter((project) => (project.metrics.budgetPlanned || 0) > 0 && (project.metrics.budgetActual || 0) > (project.metrics.budgetPlanned || 0)).length,
  };

  const portfolio = {
    byStatus: ['planning', 'active', 'on-hold', 'completed', 'archived'].map((status) => ({
      status,
      count: projects.filter((project) => project.status === status).length,
    })),
    byHealth: ['on-track', 'watch', 'at-risk', 'settled'].map((health) => ({
      health,
      count: projects.filter((project) => project.health === health).length,
    })),
    topPriority: sortProjectsForPriority(projects)
      .filter((project) => project.health !== 'settled')
      .slice(0, 6)
      .map((project) => ({
        _id: project._id,
        name: project.name,
        health: project.health,
        status: project.status,
        metrics: project.metrics,
      })),
  };

  const workloadMap = new Map();
  projects.forEach((project) => {
    (project.tasks || []).forEach((task) => {
      const owner = task?.owner;
      const ownerId = toId(owner);
      if (!ownerId) return;
      if (!workloadMap.has(ownerId)) {
        workloadMap.set(ownerId, {
          member: owner,
          open: 0,
          review: 0,
          overdue: 0,
          completed: 0,
          highPriority: 0,
          projects: new Set(),
        });
      }
      const entry = workloadMap.get(ownerId);
      entry.projects.add(String(project._id));
      if (task.completed || task.submissionStatus === 'approved') entry.completed += 1;
      else entry.open += 1;
      if (task.submissionStatus === 'submitted') entry.review += 1;
      if (!task.completed && toDate(task.dueDate) && toDate(task.dueDate) < new Date()) entry.overdue += 1;
      if (!task.completed && task.priority === 'High') entry.highPriority += 1;
    });
  });

  const workload = [...workloadMap.values()]
    .map((entry) => ({
      member: entry.member,
      open: entry.open,
      review: entry.review,
      overdue: entry.overdue,
      completed: entry.completed,
      highPriority: entry.highPriority,
      projects: entry.projects.size,
    }))
    .sort((left, right) => (right.open + right.review + right.overdue) - (left.open + left.review + left.overdue))
    .slice(0, 8);

  const now = new Date();
  const weeklyReview = {
    priorities: sortProjectsForPriority(projects)
      .filter((project) => project.health === 'at-risk' || project.health === 'watch')
      .slice(0, 6)
      .map((project) => ({
        projectId: project._id,
        projectName: project.name,
        health: project.health,
        overdueTasks: project.metrics.overdueTasks,
        overdueMilestones: project.metrics.overdueMilestones,
        openRisks: project.metrics.openRisks,
        openIssues: project.metrics.openIssues,
      })),
    approvalsBacklog: projects.flatMap((project) => (project.tasks || [])
      .filter((task) => task.submissionStatus === 'submitted')
      .map((task) => ({
        projectId: project._id,
        projectName: project.name,
        taskId: task._id,
        taskTitle: task.title,
        owner: task.owner,
        submittedAt: task.submittedAt,
      }))).sort((left, right) => new Date(left.submittedAt || 0) - new Date(right.submittedAt || 0)).slice(0, 8),
    dueMilestones: projects.flatMap((project) => (project.milestones || [])
      .filter((milestone) => milestone.status !== 'completed')
      .map((milestone) => ({
        projectId: project._id,
        projectName: project.name,
        milestoneId: milestone._id,
        title: milestone.title,
        dueDate: milestone.dueDate,
        owner: milestone.owner,
      })))
      .filter((item) => {
        const date = toDate(item.dueDate);
        return date && date >= now && daysUntil(date) <= 7;
      })
      .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
      .slice(0, 8),
    wins: projects.filter((project) => project.metrics.completedMilestones > 0 || project.metrics.completion >= 70)
      .sort((left, right) => (right.metrics.completedMilestones + right.metrics.completion) - (left.metrics.completedMilestones + left.metrics.completion))
      .slice(0, 6)
      .map((project) => ({
        projectId: project._id,
        projectName: project.name,
        completedMilestones: project.metrics.completedMilestones,
        completion: project.metrics.completion,
      })),
  };

  const escalations = [];
  projects.forEach((project) => {
    (project.issues || []).forEach((issue) => {
      if (issue.status === 'escalated') {
        escalations.push({
          type: 'issue',
          severity: issue.severity,
          title: issue.title,
          detail: issue.description || issue.resolution || 'Escalated issue',
          dueDate: issue.dueDate || null,
          owner: issue.owner || null,
          projectId: project._id,
          projectName: project.name,
          route: `/projects/${project._id}`,
        });
      }
    });
    (project.risks || []).forEach((risk) => {
      if (risk.status !== 'closed' && (risk.severity === 'critical' || risk.severity === 'high')) {
        escalations.push({
          type: 'risk',
          severity: risk.severity,
          title: risk.title,
          detail: risk.mitigation || risk.description || 'High attention risk',
          dueDate: risk.dueDate || null,
          owner: risk.owner || null,
          projectId: project._id,
          projectName: project.name,
          route: `/projects/${project._id}`,
        });
      }
    });
    (project.milestones || []).forEach((milestone) => {
      if (milestone.status !== 'completed' && toDate(milestone.dueDate) && toDate(milestone.dueDate) < now) {
        escalations.push({
          type: 'milestone',
          severity: 'high',
          title: milestone.title,
          detail: 'Milestone is overdue',
          dueDate: milestone.dueDate,
          owner: milestone.owner || null,
          projectId: project._id,
          projectName: project.name,
          route: `/projects/${project._id}`,
        });
      }
    });
  });

  return {
    scorecard: summary,
    portfolio,
    weeklyReview,
    workload,
    escalations: escalations
      .sort((left, right) => {
        const priority = { critical: 4, high: 3, medium: 2, low: 1 };
        return (priority[right.severity] || 0) - (priority[left.severity] || 0);
      })
      .slice(0, 16),
  };
};

export const getProjects = async (req, res) => {
  try {
    const projects = await populateProject(Project.find(buildProjectListQuery(req)).sort({ updatedAt: -1, createdAt: -1 })).lean();
    const viewerId = toId(req.user._id);
    const decorated = projects.map((project) => decorateProject(project, viewerId));
    const summary = decorated.reduce((accumulator, project) => {
      accumulator.total += 1;
      accumulator.active += project.status === 'active' ? 1 : 0;
      accumulator.atRisk += project.health === 'at-risk' ? 1 : 0;
      accumulator.overdueTasks += project.metrics.overdueTasks;
      accumulator.members += project.metrics.members;
      accumulator.openRisks += project.metrics.openRisks;
      accumulator.openIssues += project.metrics.openIssues;
      accumulator.overdueMilestones += project.metrics.overdueMilestones;
      return accumulator;
    }, { total: 0, active: 0, atRisk: 0, overdueTasks: 0, members: 0, openRisks: 0, openIssues: 0, overdueMilestones: 0 });
    res.json({ success: true, projects: decorated, total: decorated.length, summary });
  } catch (err) {
    console.error('getProjects error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

export const getProjectOpsOverview = async (req, res) => {
  try {
    const projects = await populateProject(Project.find(mergeQuery({}, buildVisibilityQuery(req.teamMemberIds))).sort({ updatedAt: -1, createdAt: -1 })).lean();
    const decorated = projects.map((project) => decorateProject(project, toId(req.user._id)));
    res.json({ success: true, overview: buildOperationsOverview(decorated) });
  } catch (err) {
    console.error('getProjectOpsOverview error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to build project operations overview' });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await populateProject(Project.findOne(mergeQuery({ _id: req.params.id }, buildVisibilityQuery(req.teamMemberIds)))).lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project: decorateProject(project, toId(req.user._id)) });
  } catch (err) {
    console.error('getProjectById error:', err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Failed to fetch project' });
  }
};

export const createProject = async (req, res) => {
  try {
    const { name, description, status, priority, startDate, endDate, members, tags, tasks, goals, client, budget } = req.body;
    if (!cleanText(name, 200)) return res.status(400).json({ success: false, message: 'Project name is required' });

    const memberCheck = ensureValidMembers(members || [], req.teamMemberIds);
    if (memberCheck.invalid?.length) {
      return res.status(403).json({ success: false, message: 'One or more selected members are outside your team scope' });
    }

    const project = new Project({
      name: cleanText(name, 200),
      description: cleanText(description, 2000),
      status: status || 'planning',
      priority: priority || 'Medium',
      startDate: toDate(startDate) || undefined,
      endDate: toDate(endDate) || undefined,
      createdBy: req.user._id,
      members: memberCheck.memberIds,
      tags: Array.isArray(tags) ? tags.map((item) => cleanText(item, 50)).filter(Boolean) : [],
      tasks: uniqueIds(tasks),
      goals: uniqueIds(goals),
      client: readClient(client),
      budget: readBudget(budget),
      milestones: [],
      risks: [],
      issues: [],
      activity: [],
    });

    const manualMemberIds = uniqueIds(project.members);
    const { nextMemberIds, autoAddedIds } = await syncResponsibilityMembers(project.tasks, project.goals, manualMemberIds);
    project.members = nextMemberIds;
    pushProjectActivity(project, readActivityEntry({
      kind: 'project-created',
      message: `${req.user.fullName || req.user.email} created the project.`,
      actor: req.user,
      meta: { status: project.status, priority: project.priority },
    }));

    await project.save();
    const populated = await populateProject(Project.findById(project._id)).lean();

    const manualRecipients = manualMemberIds.filter((memberId) => !autoAddedIds.includes(memberId));
    if (manualRecipients.length) {
      await notifyAddedMembers({
        project: project.toObject(),
        memberIds: manualRecipients,
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
      });
    }
    if (autoAddedIds.length) {
      await notifyAddedMembers({
        project: project.toObject(),
        memberIds: autoAddedIds,
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
        reason: 'linked',
      });
    }

    res.status(201).json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('createProject error:', err.message);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const previous = {
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      endDate: project.endDate ? new Date(project.endDate).toISOString() : '',
      members: uniqueIds(project.members),
      goals: uniqueIds(project.goals),
      tasks: uniqueIds(project.tasks),
      client: readClient(project.client),
      budget: readBudget(project.budget),
    };

    if (req.body.name !== undefined) project.name = cleanText(req.body.name, 200);
    if (!project.name) return res.status(400).json({ success: false, message: 'Project name is required' });
    if (req.body.description !== undefined) project.description = cleanText(req.body.description, 2000);
    if (req.body.status) project.status = req.body.status;
    if (req.body.priority) project.priority = req.body.priority;
    if (req.body.startDate !== undefined) project.startDate = toDate(req.body.startDate) || undefined;
    if (req.body.endDate !== undefined) project.endDate = toDate(req.body.endDate) || undefined;
    if (Array.isArray(req.body.tags)) project.tags = req.body.tags.map((item) => cleanText(item, 50)).filter(Boolean);
    if (Array.isArray(req.body.goals)) project.goals = uniqueIds(req.body.goals);
    if (Array.isArray(req.body.tasks)) project.tasks = uniqueIds(req.body.tasks);
    if (req.body.client !== undefined) project.client = readClient(req.body.client);
    if (req.body.budget !== undefined) project.budget = readBudget(req.body.budget);

    if (Array.isArray(req.body.members)) {
      const memberCheck = ensureValidMembers(req.body.members, req.teamMemberIds);
      if (memberCheck.invalid?.length) {
        return res.status(403).json({ success: false, message: 'One or more selected members are outside your team scope' });
      }
      project.members = memberCheck.memberIds;
    }

    const { nextMemberIds, autoAddedIds } = await syncResponsibilityMembers(project.tasks, project.goals, uniqueIds(project.members));
    project.members = nextMemberIds;

    const changes = summarizeProjectChanges(project, previous);
    if (changes.length) {
      pushProjectActivity(project, readActivityEntry({
        kind: 'project-updated',
        message: `${req.user.fullName || req.user.email} updated ${changes.join(', ')}.`,
        actor: req.user,
        meta: { changes },
      }));
    }

    await project.save();

    const populated = await populateProject(Project.findById(project._id)).lean();
    const nextMembers = uniqueIds(project.members);
    const manuallyAdded = nextMembers.filter((memberId) => !previous.members.includes(memberId));
    const addedMembers = uniqueIds([...manuallyAdded, ...autoAddedIds]);
    const removedMembers = previous.members.filter((memberId) => !nextMembers.includes(memberId));

    if (addedMembers.length) {
      await notifyAddedMembers({
        project: project.toObject(),
        memberIds: addedMembers,
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
        reason: autoAddedIds.length ? 'linked' : 'added',
      });
    }
    if (removedMembers.length) {
      await notifyRemovedMembers({
        project: project.toObject(),
        memberIds: removedMembers,
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
      });
    }
    if (changes.length) {
      await notifyProjectChanged({
        project: project.toObject(),
        memberIds: nextMembers,
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
        changes,
      });
    }

    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('updateProject error:', err.message);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const deleted = await Project.findOneAndDelete(mergeQuery({ _id: req.params.id }, buildVisibilityQuery(req.teamMemberIds)));
    if (!deleted) return res.status(404).json({ success: false, message: 'Project not found' });

    const recipients = buildProjectAudience(deleted.toObject(), uniqueIds(deleted.members));
    if (recipients.length) {
      await notifyProjectActivity({
        project: deleted.toObject(),
        memberIds: recipients,
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
        title: `Project deleted: ${deleted.name}`,
        body: `${req.user.fullName || req.user.email} deleted this project.`,
        route: '/projects',
        data: { reason: 'deleted' },
      });
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    console.error('deleteProject error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to delete project' });
  }
};

export const updateProjectMembers = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const memberCheck = ensureValidMembers(req.body.members || [], req.teamMemberIds);
    if (memberCheck.invalid?.length) {
      return res.status(403).json({ success: false, message: 'One or more selected members are outside your team scope' });
    }

    const previousMembers = uniqueIds(project.members);
    const { nextMemberIds, autoAddedIds } = await syncResponsibilityMembers(project.tasks, project.goals, memberCheck.memberIds);
    project.members = nextMemberIds;
    pushProjectActivity(project, readActivityEntry({
      kind: 'members-updated',
      message: `${req.user.fullName || req.user.email} updated project membership.`,
      actor: req.user,
      meta: { added: nextMemberIds.filter((memberId) => !previousMembers.includes(memberId)), removed: previousMembers.filter((memberId) => !nextMemberIds.includes(memberId)) },
    }));
    await project.save();

    const addedMembers = nextMemberIds.filter((memberId) => !previousMembers.includes(memberId));
    const removedMembers = previousMembers.filter((memberId) => !nextMemberIds.includes(memberId));
    if (addedMembers.length || autoAddedIds.length) {
      await notifyAddedMembers({
        project: project.toObject(),
        memberIds: uniqueIds([...addedMembers, ...autoAddedIds]),
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
        reason: autoAddedIds.length ? 'linked' : 'added',
      });
    }
    if (removedMembers.length) {
      await notifyRemovedMembers({
        project: project.toObject(),
        memberIds: removedMembers,
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
      });
    }
    await notifyProjectChanged({
      project: project.toObject(),
      memberIds: nextMemberIds,
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      changes: ['members'],
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('updateProjectMembers error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to update members' });
  }
};

export const addTaskToProject = async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ success: false, message: 'taskId required' });

    const project = await getProjectInScope(req, req.params.id);
    const task = await Task.findById(taskId).select('owner title');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const currentTaskIds = uniqueIds(project.tasks);
    if (!currentTaskIds.includes(toId(taskId))) currentTaskIds.push(toId(taskId));
    project.tasks = currentTaskIds;

    const { nextMemberIds, autoAddedIds } = await syncResponsibilityMembers(project.tasks, project.goals, uniqueIds(project.members));
    project.members = nextMemberIds;
    pushProjectActivity(project, readActivityEntry({
      kind: 'task-attached',
      message: `${req.user.fullName || req.user.email} attached "${task.title || 'Task'}".`,
      actor: req.user,
      meta: { taskId: toId(task._id), taskTitle: task.title || '' },
    }));
    await project.save();

    if (autoAddedIds.length) {
      await notifyAddedMembers({
        project: project.toObject(),
        memberIds: autoAddedIds,
        actor: req.user,
        io: req.io || global.adminIo,
        authHeader: req.headers.authorization || '',
        reason: 'linked',
      });
    }

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: nextMemberIds,
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Task added to project: ${project.name}`,
      body: `"${task.title || 'Task'}" is now part of this project.`,
      data: { reason: 'task-added', taskId: toId(task._id), taskTitle: task.title || '' },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('addTaskToProject error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to add task' });
  }
};

export const removeTaskFromProject = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const task = await Task.findById(req.params.taskId).select('title').lean();
    const previousMembers = uniqueIds(project.members);
    project.tasks = uniqueIds(project.tasks).filter((taskId) => taskId !== String(req.params.taskId));
    pushProjectActivity(project, readActivityEntry({
      kind: 'task-removed',
      message: `${req.user.fullName || req.user.email} removed "${task?.title || 'Task'}".`,
      actor: req.user,
      meta: { taskId: String(req.params.taskId), taskTitle: task?.title || '' },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: previousMembers,
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Task removed from project: ${project.name}`,
      body: `"${task?.title || 'Task'}" was removed from this project.`,
      data: { reason: 'task-removed', taskId: String(req.params.taskId), taskTitle: task?.title || '' },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('removeTaskFromProject error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to remove task' });
  }
};

export const addProjectMilestone = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const milestone = readMilestonePayload(req.body, req.teamMemberIds);
    project.milestones.push(milestone);
    pushProjectActivity(project, readActivityEntry({
      kind: 'milestone-added',
      message: `${req.user.fullName || req.user.email} added milestone "${milestone.title}".`,
      actor: req.user,
      meta: { title: milestone.title, dueDate: milestone.dueDate },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Milestone added: ${project.name}`,
      body: `"${milestone.title}" was added to this project.`,
      data: { reason: 'milestone-added', milestoneTitle: milestone.title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.status(201).json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('addProjectMilestone error:', err.message);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const updateProjectMilestone = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    const next = readMilestonePayload(req.body, req.teamMemberIds, milestone.toObject());
    Object.assign(milestone, next);
    project.markModified('milestones');
    pushProjectActivity(project, readActivityEntry({
      kind: 'milestone-updated',
      message: `${req.user.fullName || req.user.email} updated milestone "${milestone.title}".`,
      actor: req.user,
      meta: { milestoneId: toId(milestone._id), title: milestone.title, status: milestone.status },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Milestone updated: ${project.name}`,
      body: `"${milestone.title}" was updated.`,
      data: { reason: 'milestone-updated', milestoneId: toId(milestone._id), milestoneTitle: milestone.title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('updateProjectMilestone error:', err.message);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const deleteProjectMilestone = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });
    const title = milestone.title;
    milestone.deleteOne();
    project.markModified('milestones');
    pushProjectActivity(project, readActivityEntry({
      kind: 'milestone-removed',
      message: `${req.user.fullName || req.user.email} removed milestone "${title}".`,
      actor: req.user,
      meta: { milestoneId: req.params.milestoneId, title },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Milestone removed: ${project.name}`,
      body: `"${title}" was removed from this project.`,
      data: { reason: 'milestone-removed', milestoneId: req.params.milestoneId, milestoneTitle: title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('deleteProjectMilestone error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to delete milestone' });
  }
};

export const addProjectRisk = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const risk = readRiskPayload(req.body, req.teamMemberIds);
    project.risks.push(risk);
    pushProjectActivity(project, readActivityEntry({
      kind: 'risk-added',
      message: `${req.user.fullName || req.user.email} logged risk "${risk.title}".`,
      actor: req.user,
      meta: { title: risk.title, severity: risk.severity, dueDate: risk.dueDate },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Risk added: ${project.name}`,
      body: `"${risk.title}" was logged for this project.`,
      data: { reason: 'risk-added', riskTitle: risk.title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.status(201).json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('addProjectRisk error:', err.message);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const updateProjectRisk = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const risk = project.risks.id(req.params.riskId);
    if (!risk) return res.status(404).json({ success: false, message: 'Risk not found' });
    Object.assign(risk, readRiskPayload(req.body, req.teamMemberIds, risk.toObject()));
    project.markModified('risks');
    pushProjectActivity(project, readActivityEntry({
      kind: 'risk-updated',
      message: `${req.user.fullName || req.user.email} updated risk "${risk.title}".`,
      actor: req.user,
      meta: { riskId: toId(risk._id), title: risk.title, severity: risk.severity, status: risk.status },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Risk updated: ${project.name}`,
      body: `"${risk.title}" was updated.`,
      data: { reason: 'risk-updated', riskId: toId(risk._id), riskTitle: risk.title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('updateProjectRisk error:', err.message);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const deleteProjectRisk = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const risk = project.risks.id(req.params.riskId);
    if (!risk) return res.status(404).json({ success: false, message: 'Risk not found' });
    const title = risk.title;
    risk.deleteOne();
    project.markModified('risks');
    pushProjectActivity(project, readActivityEntry({
      kind: 'risk-removed',
      message: `${req.user.fullName || req.user.email} removed risk "${title}".`,
      actor: req.user,
      meta: { riskId: req.params.riskId, title },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Risk removed: ${project.name}`,
      body: `"${title}" was removed from this project.`,
      data: { reason: 'risk-removed', riskId: req.params.riskId, riskTitle: title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('deleteProjectRisk error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to delete risk' });
  }
};

export const addProjectIssue = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const issue = readIssuePayload(req.body, req.teamMemberIds);
    project.issues.push(issue);
    pushProjectActivity(project, readActivityEntry({
      kind: 'issue-added',
      message: `${req.user.fullName || req.user.email} logged issue "${issue.title}".`,
      actor: req.user,
      meta: { title: issue.title, severity: issue.severity, dueDate: issue.dueDate },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Issue added: ${project.name}`,
      body: `"${issue.title}" was added to this project.`,
      data: { reason: 'issue-added', issueTitle: issue.title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.status(201).json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('addProjectIssue error:', err.message);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const updateProjectIssue = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const issue = project.issues.id(req.params.issueId);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    Object.assign(issue, readIssuePayload(req.body, req.teamMemberIds, issue.toObject()));
    project.markModified('issues');
    pushProjectActivity(project, readActivityEntry({
      kind: 'issue-updated',
      message: `${req.user.fullName || req.user.email} updated issue "${issue.title}".`,
      actor: req.user,
      meta: { issueId: toId(issue._id), title: issue.title, severity: issue.severity, status: issue.status },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Issue updated: ${project.name}`,
      body: `"${issue.title}" was updated.`,
      data: { reason: 'issue-updated', issueId: toId(issue._id), issueTitle: issue.title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('updateProjectIssue error:', err.message);
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
};

export const deleteProjectIssue = async (req, res) => {
  try {
    const project = await getProjectInScope(req, req.params.id);
    const issue = project.issues.id(req.params.issueId);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    const title = issue.title;
    issue.deleteOne();
    project.markModified('issues');
    pushProjectActivity(project, readActivityEntry({
      kind: 'issue-removed',
      message: `${req.user.fullName || req.user.email} removed issue "${title}".`,
      actor: req.user,
      meta: { issueId: req.params.issueId, title },
    }));
    await project.save();

    await notifyProjectActivity({
      project: project.toObject(),
      memberIds: uniqueIds(project.members),
      actor: req.user,
      io: req.io || global.adminIo,
      authHeader: req.headers.authorization || '',
      title: `Issue removed: ${project.name}`,
      body: `"${title}" was removed from this project.`,
      data: { reason: 'issue-removed', issueId: req.params.issueId, issueTitle: title },
    });

    const populated = await populateProject(Project.findById(project._id)).lean();
    res.json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (err) {
    console.error('deleteProjectIssue error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Failed to delete issue' });
  }
};



