import mongoose from 'mongoose';
import Project from '../models/projectModel.js';
import Task from '../models/taskModel.js';
import Goal from '../models/goalModel.js';
import { createNotification, createNotifications } from '../utils/notificationService.js';

const toId = (value) => String(value?._id || value || '').trim();
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const uniqueIds = (values = []) => [...new Set((values || []).map(toId).filter(Boolean))];
const buildProjectAudience = (project, memberIds = []) => uniqueIds([project?.createdBy, ...(memberIds || [])]);

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
  const autoAddedIds = nextMemberIds.filter((memberId) => !memberIds.includes(memberId));
  return { nextMemberIds, autoAddedIds };
};

const syncGoalOwnersIntoMembers = async (goalIds = [], memberIds = []) => {
  const ownedGoals = await Goal.find({ _id: { $in: uniqueIds(goalIds) } }).select('owner').lean();
  const goalOwnerIds = uniqueIds(ownedGoals.map((goal) => goal.owner));
  const nextMemberIds = uniqueIds([...memberIds, ...goalOwnerIds]);
  const autoAddedIds = nextMemberIds.filter((memberId) => !memberIds.includes(memberId));
  return { nextMemberIds, autoAddedIds };
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
);

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

  const summary = changes.join(', ');
  await Promise.all(recipients.map((memberId) => createNotification({
    userId: memberId,
    type: 'project',
    title: `Project updated: ${project.name}`,
    body: `Updated ${summary}.`,
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

export const getProjects = async (req, res) => {
  try {
    const projects = await populateProject(
      Project.find(buildProjectListQuery(req)).sort({ updatedAt: -1, createdAt: -1 })
    ).lean();

    const viewerId = toId(req.user._id);
    const decorated = projects.map((project) => decorateProject(project, viewerId));
    const summary = decorated.reduce((accumulator, project) => {
      accumulator.total += 1;
      accumulator.active += project.status === 'active' ? 1 : 0;
      accumulator.atRisk += project.health === 'at-risk' ? 1 : 0;
      accumulator.overdueTasks += project.metrics.overdueTasks;
      accumulator.members += project.metrics.members;
      return accumulator;
    }, { total: 0, active: 0, atRisk: 0, overdueTasks: 0, members: 0 });

    res.json({ success: true, projects: decorated, total: decorated.length, summary });
  } catch (err) {
    console.error('getProjects error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

export const getProjectById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }

    const project = await populateProject(
      Project.findOne(mergeQuery({ _id: req.params.id }, buildVisibilityQuery(req.teamMemberIds)))
    ).lean();

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project: decorateProject(project, toId(req.user._id)) });
  } catch (err) {
    console.error('getProjectById error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};

export const createProject = async (req, res) => {
  try {
    const { name, description, status, priority, startDate, endDate, members, tags, tasks, goals } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Project name is required' });

    const memberCheck = ensureValidMembers(members || [], req.teamMemberIds);
    if (memberCheck.invalid?.length) {
      return res.status(403).json({ success: false, message: 'One or more selected members are outside your team scope' });
    }

    const project = new Project({
      name: name.trim(),
      description: description || '',
      status: status || 'planning',
      priority: priority || 'Medium',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: req.user._id,
      members: memberCheck.memberIds,
      tags: Array.isArray(tags) ? tags : [],
      tasks: uniqueIds(tasks),
      goals: uniqueIds(goals),
    });

    const manualMemberIds = uniqueIds(project.members);
    const { nextMemberIds, autoAddedIds } = await syncResponsibilityMembers(project.tasks, project.goals, manualMemberIds);
    project.members = nextMemberIds;

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
    res.status(400).json({ success: false, message: err.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findOne(mergeQuery({ _id: req.params.id }, buildVisibilityQuery(req.teamMemberIds)));
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const previous = {
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      endDate: project.endDate ? new Date(project.endDate).toISOString() : '',
      members: uniqueIds(project.members),
      goals: uniqueIds(project.goals),
      tasks: uniqueIds(project.tasks),
    };

    if (req.body.name !== undefined) project.name = String(req.body.name || '').trim();
    if (!project.name) return res.status(400).json({ success: false, message: 'Project name is required' });
    if (req.body.description !== undefined) project.description = String(req.body.description || '');
    if (req.body.status) project.status = req.body.status;
    if (req.body.priority) project.priority = req.body.priority;
    if (req.body.startDate !== undefined) project.startDate = req.body.startDate ? new Date(req.body.startDate) : undefined;
    if (req.body.endDate !== undefined) project.endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;
    if (Array.isArray(req.body.tags)) project.tags = req.body.tags;
    if (Array.isArray(req.body.goals)) project.goals = uniqueIds(req.body.goals);
    if (Array.isArray(req.body.tasks)) project.tasks = uniqueIds(req.body.tasks);

    if (Array.isArray(req.body.members)) {
      const memberCheck = ensureValidMembers(req.body.members, req.teamMemberIds);
      if (memberCheck.invalid?.length) {
        return res.status(403).json({ success: false, message: 'One or more selected members are outside your team scope' });
      }
      project.members = memberCheck.memberIds;
    }

    const { nextMemberIds, autoAddedIds } = await syncResponsibilityMembers(project.tasks, project.goals, uniqueIds(project.members));
    project.members = nextMemberIds;
    await project.save();

    const populated = await populateProject(Project.findById(project._id)).lean();
    const nextMembers = uniqueIds(project.members);
    const manuallyAdded = nextMembers.filter((memberId) => !previous.members.includes(memberId));
    const addedMembers = uniqueIds([...manuallyAdded, ...autoAddedIds]);
    const removedMembers = previous.members.filter((memberId) => !nextMembers.includes(memberId));

    const changes = [];
    if (project.status !== previous.status) changes.push('status');
    if (project.priority !== previous.priority) changes.push('priority');
    if (project.name !== previous.name) changes.push('name');
    if (String(project.description || '') !== String(previous.description || '')) changes.push('description');
    if ((project.endDate ? new Date(project.endDate).toISOString() : '') !== previous.endDate) changes.push('deadline');
    if (uniqueIds(project.goals).join(',') !== previous.goals.join(',')) changes.push('goals');
    if (uniqueIds(project.tasks).join(',') !== previous.tasks.join(',')) changes.push('tasks');

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
    res.status(400).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: 'Failed to delete project' });
  }
};

export const updateProjectMembers = async (req, res) => {
  try {
    const project = await Project.findOne(mergeQuery({ _id: req.params.id }, buildVisibilityQuery(req.teamMemberIds)));
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const memberCheck = ensureValidMembers(req.body.members || [], req.teamMemberIds);
    if (memberCheck.invalid?.length) {
      return res.status(403).json({ success: false, message: 'One or more selected members are outside your team scope' });
    }

    const previousMembers = uniqueIds(project.members);
    const { nextMemberIds, autoAddedIds } = await syncResponsibilityMembers(project.tasks, project.goals, memberCheck.memberIds);
    project.members = nextMemberIds;
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
    res.status(500).json({ success: false, message: 'Failed to update members' });
  }
};

export const addTaskToProject = async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ success: false, message: 'taskId required' });

    const project = await Project.findOne(mergeQuery({ _id: req.params.id }, buildVisibilityQuery(req.teamMemberIds)));
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const task = await Task.findById(taskId).select('owner title');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const currentTaskIds = uniqueIds(project.tasks);
    if (!currentTaskIds.includes(toId(taskId))) currentTaskIds.push(toId(taskId));
    project.tasks = currentTaskIds;

    const { nextMemberIds, autoAddedIds } = await syncResponsibilityMembers(project.tasks, project.goals, uniqueIds(project.members));
    project.members = nextMemberIds;
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
    res.status(500).json({ success: false, message: 'Failed to add task' });
  }
};

export const removeTaskFromProject = async (req, res) => {
  try {
    const project = await Project.findOne(mergeQuery({ _id: req.params.id }, buildVisibilityQuery(req.teamMemberIds)));
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const task = await Task.findById(req.params.taskId).select('title').lean();
    const previousMembers = uniqueIds(project.members);
    project.tasks = uniqueIds(project.tasks).filter((taskId) => taskId !== String(req.params.taskId));
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
    res.status(500).json({ success: false, message: 'Failed to remove task' });
  }
};



