import mongoose from 'mongoose';
import RevenueProject from '../models/revenueProjectModel.js';
import Task from '../models/taskModel.js';
import Reminder from '../models/reminderModel.js';
import User from '../models/userModel.js';
import { createNotification } from '../utils/notificationService.js';
import {
  emitToUserBackend,
  syncTaskReminderInUserBackend,
} from '../utils/userRealtime.js';

const USER_FIELDS = 'firstName lastName fullName email avatar position role unitSector';
const STATUS_OPTIONS = ['planning', 'active', 'blocked', 'completed', 'archived'];

const toId = (value) => String(value?._id || value || '').trim();
const uniqueIds = (values = []) => [...new Set((values || []).map(toId).filter(Boolean))];
const cleanText = (value, max = 2000) => String(value || '').trim().slice(0, max);
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};
const getActorName = (user) => user?.fullName || user?.email || 'Admin';
const getVisibleTeamIds = (req) => (req.teamMemberIds === null ? null : uniqueIds(req.teamMemberIds));

const sortPhases = (phases = []) => (
  [...phases].sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left?.order)) ? Number(left.order) : 0;
    const rightOrder = Number.isFinite(Number(right?.order)) ? Number(right.order) : 0;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left?.title || '').localeCompare(String(right?.title || ''));
  })
);

const buildPhaseMap = (phases = []) => {
  const map = new Map();
  sortPhases(phases).forEach((phase, index) => {
    map.set(toId(phase), {
      ...phase,
      order: Number.isFinite(Number(phase?.order)) ? Number(phase.order) : index,
    });
  });
  return map;
};

const buildTaskReminderDetails = ({ user, task }) => {
  const reminderMinutes = user?.preferences?.reminders?.defaultReminderTimes?.task_due ?? 60;
  const dueAt = new Date(task.dueDate);
  const remindAt = new Date(dueAt.getTime() - reminderMinutes * 60 * 1000);

  return {
    remindAt,
    message: `Task "${String(task.title || 'Task').trim()}" is due soon`,
    deliveryChannels: {
      inApp: user?.preferences?.reminders?.defaultDeliveryChannels?.inApp ?? true,
      email: user?.preferences?.reminders?.defaultDeliveryChannels?.email ?? true,
      push: user?.preferences?.reminders?.defaultDeliveryChannels?.push ?? false,
    },
  };
};

const emitTaskRealtime = async ({ event, userId, payload, io }) => {
  const targetId = toId(userId);
  if (!event || !targetId) return;
  const room = `user:${targetId}`;
  io?.to(room).emit(event, payload);
  await emitToUserBackend({ event, data: payload, room });
};

const createTaskNotification = async ({ task, userId, title, body, actor, io, authHeader = '' }) => {
  const targetId = toId(userId);
  const taskId = toId(task?._id);
  if (!targetId || !taskId) return;

  await createNotification({
    userId: targetId,
    type: 'task',
    title,
    body,
    actorId: actor?._id || null,
    actorName: getActorName(actor),
    entityId: taskId,
    entityType: 'Task',
    data: {
      taskId,
      status: 'assigned',
      revenueProjectId: toId(task?.revenueProject?.projectId),
      revenueProjectPhaseId: toId(task?.revenueProject?.phaseId),
    },
    io,
    authHeader,
  });
};

const createOrUpdateTaskReminder = async ({ task, userId, createdBy, io, authHeader = '' }) => {
  const targetId = toId(userId);
  const taskId = toId(task?._id);
  if (!targetId || !taskId || !task?.dueDate) return null;

  const user = await User.findById(targetId).lean();
  if (!user) return null;

  const { remindAt, message, deliveryChannels } = buildTaskReminderDetails({ user, task });
  let reminder = await Reminder.findOne({ user: targetId, targetId: taskId, targetModel: 'Task' });
  const isNew = !reminder;

  if (!reminder) {
    reminder = new Reminder({
      user: targetId,
      type: 'task_due',
      targetId: taskId,
      targetModel: 'Task',
      message,
      deliveryChannels,
      remindAt,
      createdBy: toId(createdBy) || targetId,
      isUserCreated: false,
      repeatInterval: null,
      isActive: true,
    });
  } else {
    reminder.type = 'task_due';
    reminder.message = message;
    reminder.deliveryChannels = deliveryChannels;
    reminder.remindAt = remindAt;
    reminder.status = 'pending';
    reminder.snoozeUntil = null;
    reminder.isActive = true;
  }

  await reminder.save();
  io?.to(`user:${targetId}`).emit(isNew ? 'newReminder' : 'reminderUpdated', reminder.toObject());
  await syncTaskReminderInUserBackend({
    userId: targetId,
    taskId,
    title: task.title,
    dueDate: task.dueDate,
    createdBy: toId(createdBy) || targetId,
  }, authHeader);
  return reminder;
};

const populateProject = (query) => (
  query
    .populate('createdBy', USER_FIELDS)
    .populate('members', USER_FIELDS)
    .populate({
      path: 'tasks',
      select: 'title description priority dueDate completed checklist submissionStatus submittedAt reviewedAt reviewedBy owner createdByAdmin assignedBy revenueProject createdAt',
      populate: [
        { path: 'owner', select: USER_FIELDS },
        { path: 'assignedBy', select: USER_FIELDS },
        { path: 'reviewedBy', select: USER_FIELDS },
      ],
    })
    .populate('phases.completedBy', USER_FIELDS)
);

const decorateProject = (project, viewerId = '') => {
  const phases = sortPhases(project?.phases || []);
  const phaseMap = buildPhaseMap(phases);
  const tasks = [...(project?.tasks || [])]
    .map((task) => {
      const phase = phaseMap.get(toId(task?.revenueProject?.phaseId));
      return {
        ...task,
        revenueProject: {
          ...(task?.revenueProject || {}),
          phaseTitle: task?.revenueProject?.phaseTitle || phase?.title || '',
          phaseOrder: Number.isFinite(Number(task?.revenueProject?.phaseOrder))
            ? Number(task.revenueProject.phaseOrder)
            : Number(phase?.order || 0),
          phaseCompletionUnlocked: task?.revenueProject?.phaseCompletionUnlocked ?? Boolean(phase?.completed),
        },
      };
    })
    .sort((left, right) => {
      const leftPhaseOrder = Number.isFinite(Number(left?.revenueProject?.phaseOrder)) ? Number(left.revenueProject.phaseOrder) : 0;
      const rightPhaseOrder = Number.isFinite(Number(right?.revenueProject?.phaseOrder)) ? Number(right.revenueProject.phaseOrder) : 0;
      if (leftPhaseOrder !== rightPhaseOrder) return leftPhaseOrder - rightPhaseOrder;
      return new Date(left?.createdAt || 0).getTime() - new Date(right?.createdAt || 0).getTime();
    });

  const completedPhases = phases.filter((phase) => phase?.completed).length;
  const completedTasks = tasks.filter((task) => task?.completed).length;
  const myTasks = viewerId ? tasks.filter((task) => toId(task?.owner) === viewerId) : [];
  const releasedTasks = tasks.filter((task) => task?.revenueProject?.phaseCompletionUnlocked).length;

  return {
    ...project,
    phases,
    tasks,
    metrics: {
      totalPhases: phases.length,
      completedPhases,
      phaseProgress: phases.length ? Math.round((completedPhases / phases.length) * 100) : 0,
      totalTasks: tasks.length,
      completedTasks,
      taskProgress: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
      allPhasesCompleted: phases.length > 0 && completedPhases === phases.length,
      releasedTasks,
      members: Array.isArray(project?.members) ? project.members.length : 0,
      myTasks: myTasks.length,
      myOpenTasks: myTasks.filter((task) => !task?.completed).length,
    },
  };
};

const assertProjectAccess = async (req, id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error('Invalid revenue project ID');
    error.statusCode = 400;
    throw error;
  }

  const project = await populateProject(RevenueProject.findById(id)).lean();
  if (!project) {
    const error = new Error('Revenue project not found');
    error.statusCode = 404;
    throw error;
  }

  const visibleTeamIds = getVisibleTeamIds(req);
  if (
    visibleTeamIds
    && !project.members.some((member) => visibleTeamIds.includes(toId(member)))
    && toId(project.createdBy) !== toId(req.user._id)
  ) {
    const error = new Error('Revenue project is outside your team scope');
    error.statusCode = 403;
    throw error;
  }

  return project;
};

const readPhasePayload = (phase = {}, index = 0) => {
  const title = cleanText(phase?.title, 160);
  if (!title) {
    throw new Error(`Phase ${index + 1} title is required`);
  }

  return {
    _id: phase?._id && mongoose.isValidObjectId(phase._id) ? phase._id : new mongoose.Types.ObjectId(),
    title,
    description: cleanText(phase?.description, 1200),
    order: Number.isFinite(Number(phase?.order)) ? Number(phase.order) : index,
    completed: Boolean(phase?.completed),
    completedAt: phase?.completed ? (toDate(phase?.completedAt) || new Date()) : null,
    completedBy: phase?.completed ? (phase?.completedBy || null) : null,
    notes: cleanText(phase?.notes, 1200),
  };
};

const readProjectPayload = (body = {}, req, { requirePhases = false } = {}) => {
  const name = cleanText(body?.name, 200);
  if (!name) throw new Error('Project name is required');

  const memberIds = uniqueIds(body?.memberIds || []);

  if (!memberIds.length) {
    throw new Error('Select at least one project member');
  }

  const expectedStartDate = toDate(body?.expectedStartDate);
  const expectedEndDate = toDate(body?.expectedEndDate);
  if (expectedStartDate && expectedEndDate && expectedEndDate < expectedStartDate) {
    throw new Error('Expected end date cannot be earlier than expected start date');
  }

  const phases = Array.isArray(body?.phases) ? body.phases.map((phase, index) => readPhasePayload(phase, index)) : [];
  if (requirePhases && !phases.length) {
    throw new Error('Add at least one project phase');
  }

  const phaseTitles = phases.map((phase) => phase.title.toLowerCase());
  if (new Set(phaseTitles).size !== phaseTitles.length) {
    throw new Error('Phase titles must be unique within the project');
  }

  return {
    name,
    code: cleanText(body?.code, 80),
    description: cleanText(body?.description, 2000),
    status: STATUS_OPTIONS.includes(body?.status) ? body.status : 'planning',
    clientName: cleanText(body?.clientName, 160),
    assetName: cleanText(body?.assetName, 160),
    location: cleanText(body?.location, 240),
    revenueOutcome: cleanText(body?.revenueOutcome, 240),
    revenueTarget: toNumber(body?.revenueTarget, 0),
    currency: cleanText(body?.currency || 'NGN', 12) || 'NGN',
    expectedStartDate,
    expectedEndDate,
    members: memberIds,
    phases,
    lockedTaskPriority: body?.lockedTaskPriority !== false,
    requirePhaseCompletionBeforeTaskDone: body?.requirePhaseCompletionBeforeTaskDone !== false,
    notes: cleanText(body?.notes, 2000),
  };
};

const assertNoRemovedPhaseWithTasks = (project, nextPhases = []) => {
  const nextPhaseIds = new Set(nextPhases.map((phase) => toId(phase._id)));
  const removedPhaseIds = sortPhases(project?.phases || [])
    .filter((phase) => !nextPhaseIds.has(toId(phase)))
    .map((phase) => ({
      id: toId(phase),
      title: phase.title,
    }));

  if (!removedPhaseIds.length) return;

  const removedLookup = new Map(removedPhaseIds.map((phase) => [phase.id, phase.title]));
  const blockedTask = (project?.tasks || []).find((task) => removedLookup.has(toId(task?.revenueProject?.phaseId)));

  if (blockedTask) {
    const phaseTitle = removedLookup.get(toId(blockedTask?.revenueProject?.phaseId)) || 'selected';
    throw new Error(`Phase "${phaseTitle}" has linked tasks. Move or remove those tasks before deleting the phase.`);
  }
};

const buildRevenueTaskState = ({ project, phase, currentRevenueProject = {} }) => ({
  ...currentRevenueProject,
  projectId: project._id,
  name: project.name,
  phaseId: phase?._id || null,
  phaseTitle: phase?.title || '',
  phaseOrder: Number.isFinite(Number(phase?.order)) ? Number(phase.order) : 0,
  priorityLocked: project.lockedTaskPriority !== false,
  completionRequiresPhaseRelease: project.requirePhaseCompletionBeforeTaskDone !== false,
  phaseCompletionUnlocked: Boolean(phase?.completed),
});

const syncProjectTasks = async (projectId, { io } = {}) => {
  const project = await RevenueProject.findById(projectId).lean();
  if (!project) return false;

  const phaseMap = buildPhaseMap(project.phases || []);
  const tasks = await Task.find({ _id: { $in: project.tasks || [] } })
    .populate('owner', USER_FIELDS)
    .populate('assignedBy', USER_FIELDS)
    .populate('reviewedBy', USER_FIELDS)
    .lean();

  if (!tasks.length) {
    return phaseMap.size > 0 && [...phaseMap.values()].every((phase) => phase.completed);
  }

  const bulkOperations = [];
  const realtimeUpdates = [];

  for (const task of tasks) {
    const phase = phaseMap.get(toId(task?.revenueProject?.phaseId)) || null;
    const nextRevenueProject = buildRevenueTaskState({
      project,
      phase,
      currentRevenueProject: task?.revenueProject || {},
    });

    bulkOperations.push({
      updateOne: {
        filter: { _id: task._id },
        update: { $set: { revenueProject: nextRevenueProject } },
      },
    });

    if (toId(task?.owner)) {
      realtimeUpdates.push({
        userId: task.owner,
        payload: {
          ...task,
          revenueProject: nextRevenueProject,
        },
      });
    }
  }

  if (bulkOperations.length) {
    await Task.bulkWrite(bulkOperations, { ordered: false });
  }

  if (io && realtimeUpdates.length) {
    await Promise.all(
      realtimeUpdates.map(({ userId, payload }) => emitTaskRealtime({
        event: 'updateTask',
        userId,
        payload,
        io,
      }))
    );
  }

  return phaseMap.size > 0 && [...phaseMap.values()].every((phase) => phase.completed);
};

export const getRevenueProjectMembers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select(USER_FIELDS)
      .sort({ firstName: 1, lastName: 1, email: 1 })
      .lean();

    res.json({ success: true, users });
  } catch (error) {
    console.error('getRevenueProjectMembers error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch project members' });
  }
};

export const getRevenueProjects = async (req, res) => {
  try {
    const visibleTeamIds = getVisibleTeamIds(req);
    const query = {};

    if (visibleTeamIds) {
      query.$or = [
        { createdBy: req.user._id },
        { members: { $in: visibleTeamIds } },
      ];
    }

    if (req.query?.search) {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { name: { $regex: req.query.search, $options: 'i' } },
            { description: { $regex: req.query.search, $options: 'i' } },
            { clientName: { $regex: req.query.search, $options: 'i' } },
            { assetName: { $regex: req.query.search, $options: 'i' } },
            { location: { $regex: req.query.search, $options: 'i' } },
          ],
        },
      ];
    }

    if (req.query?.status) {
      query.status = req.query.status;
    }

    const projects = await populateProject(RevenueProject.find(query).sort({ updatedAt: -1, createdAt: -1 })).lean();
    res.json({
      success: true,
      projects: projects.map((project) => decorateProject(project, toId(req.user._id))),
    });
  } catch (error) {
    console.error('getRevenueProjects error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue projects' });
  }
};

export const getRevenueProjectById = async (req, res) => {
  try {
    const project = await assertProjectAccess(req, req.params.id);
    res.json({ success: true, project: decorateProject(project, toId(req.user._id)) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to fetch revenue project' });
  }
};

export const createRevenueProject = async (req, res) => {
  try {
    const payload = readProjectPayload(req.body, req, { requirePhases: true });
    const activeUsers = await User.find({ _id: { $in: payload.members }, isActive: true }).select('_id').lean();
    if (activeUsers.length !== payload.members.length) {
      return res.status(400).json({ success: false, message: 'One or more selected project members are not active users' });
    }
    const project = await RevenueProject.create({
      ...payload,
      createdBy: req.user._id,
      tasks: [],
    });
    const populated = await populateProject(RevenueProject.findById(project._id)).lean();
    res.status(201).json({ success: true, project: decorateProject(populated, toId(req.user._id)) });
  } catch (error) {
    console.error('createRevenueProject error:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Failed to create revenue project' });
  }
};

export const updateRevenueProject = async (req, res) => {
  try {
    const current = await assertProjectAccess(req, req.params.id);
    const payload = readProjectPayload({ ...current, ...req.body }, req, { requirePhases: true });
    const activeUsers = await User.find({ _id: { $in: payload.members }, isActive: true }).select('_id').lean();
    if (activeUsers.length !== payload.members.length) {
      return res.status(400).json({ success: false, message: 'One or more selected project members are not active users' });
    }

    assertNoRemovedPhaseWithTasks(current, payload.phases);

    await RevenueProject.findByIdAndUpdate(current._id, {
      $set: payload,
    }, { runValidators: true });

    await syncProjectTasks(current._id, { io: req.io });
    const updated = await populateProject(RevenueProject.findById(current._id)).lean();
    res.json({ success: true, project: decorateProject(updated, toId(req.user._id)) });
  } catch (error) {
    console.error('updateRevenueProject error:', error.message);
    res.status(error.statusCode || 400).json({ success: false, message: error.message || 'Failed to update revenue project' });
  }
};

export const toggleRevenueProjectPhase = async (req, res) => {
  try {
    const current = await RevenueProject.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Revenue project not found' });
    }

    const visibleTeamIds = getVisibleTeamIds(req);
    if (
      visibleTeamIds
      && !current.members.map((member) => toId(member)).some((memberId) => visibleTeamIds.includes(memberId))
      && toId(current.createdBy) !== toId(req.user._id)
    ) {
      return res.status(403).json({ success: false, message: 'Revenue project is outside your team scope' });
    }

    const phase = current.phases.id(req.params.phaseId);
    if (!phase) {
      return res.status(404).json({ success: false, message: 'Phase not found' });
    }

    const completed = req.body?.completed !== undefined ? Boolean(req.body.completed) : !phase.completed;
    phase.completed = completed;
    phase.completedAt = completed ? new Date() : null;
    phase.completedBy = completed ? req.user._id : null;
    await current.save();

    await syncProjectTasks(current._id, { io: req.io });
    const updated = await populateProject(RevenueProject.findById(current._id)).lean();
    res.json({ success: true, project: decorateProject(updated, toId(req.user._id)) });
  } catch (error) {
    console.error('toggleRevenueProjectPhase error:', error.message);
    res.status(400).json({ success: false, message: error.message || 'Failed to update phase' });
  }
};

export const createRevenueProjectTask = async (req, res) => {
  try {
    const project = await assertProjectAccess(req, req.params.id);
    const { ownerId, phaseId, title, description, priority, dueDate, checklist = [] } = req.body || {};

    if (!ownerId) {
      return res.status(400).json({ success: false, message: 'Select an assignee' });
    }
    if (!phaseId) {
      return res.status(400).json({ success: false, message: 'Select the project phase for this task' });
    }
    if (!cleanText(title, 200)) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const memberIds = uniqueIds(project.members || []);
    if (!memberIds.includes(String(ownerId))) {
      return res.status(400).json({ success: false, message: 'Assignee must be added as a project member first' });
    }
    const owner = await User.findOne({ _id: ownerId, isActive: true }).select('_id').lean();
    if (!owner) {
      return res.status(400).json({ success: false, message: 'Selected assignee is not an active user' });
    }

    const phase = sortPhases(project.phases || []).find((entry) => toId(entry) === String(phaseId));
    if (!phase) {
      return res.status(400).json({ success: false, message: 'Selected phase was not found on this project' });
    }

    const dueDateValue = dueDate ? toDate(dueDate) : null;
    if (dueDate && !dueDateValue) {
      return res.status(400).json({ success: false, message: 'Invalid due date' });
    }
    if (dueDateValue) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (dueDateValue < todayStart) {
        return res.status(400).json({ success: false, message: 'Due date cannot be in the past' });
      }
    }

    const normalizedChecklist = Array.isArray(checklist)
      ? checklist
          .map((item) => ({ text: cleanText(item?.text, 400), completed: Boolean(item?.completed) }))
          .filter((item) => item.text)
      : [];

    const task = await Task.create({
      title: cleanText(title, 200),
      description: cleanText(description, 2000),
      priority: ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium',
      dueDate: dueDateValue,
      owner: ownerId,
      checklist: normalizedChecklist,
      completed: false,
      submissionStatus: 'not_submitted',
      appealStatus: 'not_appealed',
      createdByAdmin: true,
      assignedBy: req.user._id,
      revenueProject: buildRevenueTaskState({
        project,
        phase,
      }),
    });

    await RevenueProject.findByIdAndUpdate(project._id, {
      $addToSet: {
        tasks: task._id,
        members: ownerId,
      },
    });

    const populatedTask = await Task.findById(task._id)
      .populate('owner', USER_FIELDS)
      .populate('assignedBy', USER_FIELDS)
      .populate('reviewedBy', USER_FIELDS)
      .lean();

    await createOrUpdateTaskReminder({
      task,
      userId: ownerId,
      createdBy: req.user._id,
      io: req.io,
      authHeader: req.headers.authorization || '',
    });

    await emitTaskRealtime({ event: 'newTask', userId: ownerId, payload: populatedTask, io: req.io });
    await createTaskNotification({
      task,
      userId: ownerId,
      title: `New revenue project task: ${task.title}`,
      body: `${getActorName(req.user)} assigned this under ${project.name} - ${phase.title}`,
      actor: req.user,
      io: req.io,
      authHeader: req.headers.authorization || '',
    });

    const refreshed = await populateProject(RevenueProject.findById(project._id)).lean();
    res.status(201).json({
      success: true,
      task: populatedTask,
      project: decorateProject(refreshed, toId(req.user._id)),
    });
  } catch (error) {
    console.error('createRevenueProjectTask error:', error.message);
    res.status(error.statusCode || 400).json({ success: false, message: error.message || 'Failed to create project task' });
  }
};



