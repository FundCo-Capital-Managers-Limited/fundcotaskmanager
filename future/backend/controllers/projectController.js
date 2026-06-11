import mongoose from 'mongoose';
import Project from '../models/projectModel.js';
import Task from '../models/taskModel.js';
import Goal from '../models/goalModel.js';

const toId = (value) => String(value?._id || value || '').trim();
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const uniqueIds = (values = []) => [...new Set((values || []).map(toId).filter(Boolean))];

const buildProjectMetrics = (project, viewerId = '') => {
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  const goals = Array.isArray(project.goals) ? project.goals : [];
  const completedTasks = tasks.filter((task) => task?.completed).length;
  const overdueTasks = tasks.filter((task) => !task?.completed && toDate(task?.dueDate) && toDate(task?.dueDate) < new Date()).length;
  const openTasks = Math.max(0, tasks.length - completedTasks);
  const completion = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const myTasks = viewerId ? tasks.filter((task) => toId(task?.owner) === viewerId) : [];
  const completedGoals = goals.filter((goal) => Array.isArray(goal?.subGoals) && goal.subGoals.length > 0 && goal.subGoals.every((item) => item?.completed)).length;
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
    startDate,
    endDate,
    daysRemaining,
  };
};

const projectHealth = (project, metrics) => {
  if (project.status === 'completed' || project.status === 'archived') return 'settled';
  if (metrics.overdueTasks > 0 || (metrics.daysRemaining !== null && metrics.daysRemaining < 0)) return 'at-risk';
  if ((metrics.daysRemaining !== null && metrics.daysRemaining <= 10) || (metrics.openTasks > 0 && metrics.completion < 40)) return 'watch';
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
      { $or: [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] },
    ];
  }

  if (status) {
    query.$and = [...(query.$and || []), { status }];
  }

  if (focus === 'active') {
    query.$and = [...(query.$and || []), { status: { $in: ['planning', 'active', 'on-hold'] } }];
  }

  return query;
};

export const getProjects = async (req, res) => {
  try {
    const query = await getUserProjectQuery(req.user._id, req.query);
    const projects = await Project.find(query)
      .populate('createdBy', 'firstName lastName fullName email avatar position role')
      .populate('members', 'firstName lastName fullName email avatar position role unitSector')
      .populate({
        path: 'tasks',
        select: 'title completed priority dueDate owner checklist submissionStatus submittedAt reviewedAt reviewedBy createdByAdmin assignedBy',
        populate: [
          { path: 'owner', select: 'firstName lastName fullName email avatar position role' },
          { path: 'assignedBy', select: 'firstName lastName fullName email avatar position role' },
          { path: 'reviewedBy', select: 'firstName lastName fullName email avatar position role' },
        ],
      })
      .populate({
        path: 'goals',
        select: 'title subGoals timeframe startDate endDate owner',
        populate: { path: 'owner', select: 'firstName lastName fullName email avatar position role unitSector' },
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    const viewerId = toId(req.user._id);
    const decorated = projects.map((project) => decorateProject(project, viewerId));
    const totals = decorated.reduce((accumulator, project) => {
      accumulator.total += 1;
      accumulator.active += project.status === 'active' ? 1 : 0;
      accumulator.atRisk += project.health === 'at-risk' ? 1 : 0;
      accumulator.myOpenTasks += project.metrics.myOpenTasks;
      return accumulator;
    }, { total: 0, active: 0, atRisk: 0, myOpenTasks: 0 });

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
    const project = await Project.findOne({
      _id: req.params.id,
      ...query,
    })
      .populate('createdBy', 'firstName lastName fullName email avatar position role')
      .populate('members', 'firstName lastName fullName email avatar position role unitSector')
      .populate({
        path: 'tasks',
        select: 'title description completed priority dueDate owner checklist submissionStatus submittedAt reviewedAt reviewedBy createdByAdmin assignedBy createdAt',
        populate: [
          { path: 'owner', select: 'firstName lastName fullName email avatar position role' },
          { path: 'assignedBy', select: 'firstName lastName fullName email avatar position role' },
          { path: 'reviewedBy', select: 'firstName lastName fullName email avatar position role' },
        ],
      })
      .populate({
        path: 'goals',
        select: 'title subGoals timeframe startDate endDate owner',
        populate: { path: 'owner', select: 'firstName lastName fullName email avatar position role unitSector' },
      })
      .lean();

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    return res.json({ success: true, project: decorateProject(project, toId(req.user._id)) });
  } catch (error) {
    console.error('getProjectById error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};



