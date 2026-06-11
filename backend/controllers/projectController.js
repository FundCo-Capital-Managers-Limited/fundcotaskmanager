import mongoose from 'mongoose';
import Project from '../models/projectModel.js';
import Task from '../models/taskModel.js';
import Goal from '../models/goalModel.js';

const USER_FIELDS = 'firstName lastName fullName email avatar position role unitSector';
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
const daysUntil = (date) => {
  const value = toDate(date);
  if (!value) return null;
  return Math.ceil((value.getTime() - Date.now()) / 86400000);
};

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

const getUserProjectQuery = async (userId, { search = '', status = '', focus = '' } = {}) => {
  const ownedTaskIds = (await Task.find({ owner: userId }).select('_id').lean()).map((task) => task._id);
  const ownedGoalIds = (await Goal.find({ owner: userId }).select('_id').lean()).map((goal) => goal._id);
  const query = {
    $or: [
      { createdBy: userId },
      { members: userId },
      { tasks: { $in: ownedTaskIds } },
      { goals: { $in: ownedGoalIds } },
    ],
  };

  if (search) {
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'client.name': { $regex: search, $options: 'i' } },
          { 'client.account': { $regex: search, $options: 'i' } },
        ],
      },
    ];
  }

  if (status) query.$and = [...(query.$and || []), { status }];
  if (focus === 'active') query.$and = [...(query.$and || []), { status: { $in: ['planning', 'active', 'on-hold'] } }];

  return query;
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

export const getProjects = async (req, res) => {
  try {
    const query = await getUserProjectQuery(req.user._id, req.query);
    const projects = await populateProject(Project.find(query).sort({ updatedAt: -1, createdAt: -1 })).lean();

    const viewerId = toId(req.user._id);
    const decorated = projects.map((project) => decorateProject(project, viewerId));
    const totals = decorated.reduce((accumulator, project) => {
      accumulator.total += 1;
      accumulator.active += project.status === 'active' ? 1 : 0;
      accumulator.atRisk += project.health === 'at-risk' ? 1 : 0;
      accumulator.myOpenTasks += project.metrics.myOpenTasks;
      accumulator.overdueMilestones += project.metrics.overdueMilestones;
      accumulator.openRisks += project.metrics.openRisks;
      return accumulator;
    }, { total: 0, active: 0, atRisk: 0, myOpenTasks: 0, overdueMilestones: 0, openRisks: 0 });

    return res.json({ success: true, projects: decorated, total: decorated.length, summary: totals });
  } catch (error) {
    console.error('getProjects error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

export const getProjectById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }

    const query = await getUserProjectQuery(req.user._id);
    const project = await populateProject(Project.findOne({
      _id: req.params.id,
      ...query,
    })).lean();

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    return res.json({ success: true, project: decorateProject(project, toId(req.user._id)) });
  } catch (error) {
    console.error('getProjectById error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};



