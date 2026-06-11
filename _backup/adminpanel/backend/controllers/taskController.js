import Task from '../models/taskModel.js';
import Reminder from '../models/reminderModel.js';
import User from '../models/userModel.js';
import { buildTeamQuery } from '../middleware/teamFilter.js';
import { createNotification } from '../utils/notificationService.js';
import {
  deleteTaskReminderInUserBackend,
  emitToUserBackend,
  syncTaskReminderInUserBackend,
} from '../utils/userRealtime.js';

const getActorName = (user) => user?.fullName || user?.email || 'Admin';
const getTaskId = (task) => String(task?._id || task?.id || '');
const getUserId = (value) => String(value?._id || value || '');
const isSelfAssignedTask = (task) => {
  const ownerId = getUserId(task?.owner);
  const assignerId = getUserId(task?.assignedBy);
  return Boolean(ownerId) && (!assignerId || assignerId === ownerId);
};

const getTaskReviewAccess = ({ task, reviewerId, reviewerRole, teamMemberIds }) => {
  if (!task) {
    return { allowed: false, reason: 'Task not found' };
  }

  if (reviewerRole === 'admin') {
    return { allowed: true, reason: '' };
  }

  const ownerId = getUserId(task.owner);
  const assignerId = getUserId(task.assignedBy);
  const reviewerKey = getUserId(reviewerId);

  if (isSelfAssignedTask(task)) {
    const visibleTeamIds = Array.isArray(teamMemberIds) ? teamMemberIds.map(String) : [];
    const allowed = Boolean(ownerId) && visibleTeamIds.includes(ownerId);
    return {
      allowed,
      reason: allowed ? '' : 'Only an admin who manages this self-assigned task owner can review it.',
    };
  }

  const allowed = Boolean(assignerId) && Boolean(reviewerKey) && assignerId === reviewerKey;
  return {
    allowed,
    reason: allowed ? '' : 'Only the admin who assigned this task can approve or reject it.',
  };
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
  const targetId = getUserId(userId);
  if (!event || !targetId) return;

  const room = `user:${targetId}`;
  io?.to(room).emit(event, payload);
  await emitToUserBackend({ event, data: payload, room });
};

const createTaskNotification = async ({ task, userId, title, body, status, actor, io, extraData = {}, authHeader = '' }) => {
  const targetId = getUserId(userId);
  const taskId = getTaskId(task);
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
    data: { taskId, status, ...extraData },
    io,
    authHeader,
  });
};

const createOrUpdateTaskReminder = async ({ task, userId, createdBy, io, authHeader = '' }) => {
  const targetId = getUserId(userId);
  const taskId = getTaskId(task);
  if (!targetId || !taskId) return null;

  if (!task?.dueDate) {
    return deleteTaskReminder({ taskId, userId: targetId, io });
  }

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
      createdBy: getUserId(createdBy) || targetId,
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
    reminder.createdBy = reminder.createdBy || getUserId(createdBy) || targetId;
  }

  await reminder.save();
  const payload = reminder.toObject();
  const event = isNew ? 'newReminder' : 'reminderUpdated';
  const room = `user:${targetId}`;

  io?.to(room).emit(event, payload);

  const mirroredReminder = await syncTaskReminderInUserBackend({
    userId: targetId,
    taskId,
    title: task.title,
    dueDate: task.dueDate,
    createdBy: getUserId(createdBy) || targetId,
  }, authHeader);

  if (!mirroredReminder) {
    await emitToUserBackend({ event, data: payload, room });
  }

  return payload;
};

const deleteTaskReminder = async ({ taskId, userId, io, authHeader = '' }) => {
  const targetId = getUserId(userId);
  if (!targetId || !taskId) return false;

  const reminder = await Reminder.findOneAndDelete({ user: targetId, targetId: taskId, targetModel: 'Task' }).lean();
  const room = `user:${targetId}`;
  if (reminder?._id) {
    io?.to(room).emit('reminderDeleted', String(reminder._id));
  }

  const mirroredDeleted = await deleteTaskReminderInUserBackend({ userId: targetId, taskId: String(taskId) }, authHeader);
  if (!mirroredDeleted && reminder?._id) {
    await emitToUserBackend({ event: 'reminderDeleted', data: String(reminder._id), room });
  }

  return Boolean(reminder || mirroredDeleted);
};

const getTaskChangeList = (existingTask, nextTask, rawData = {}) => {
  const changes = [];

  if (rawData.title !== undefined && String(rawData.title || '').trim() !== String(existingTask.title || '').trim()) {
    changes.push('title');
  }
  if (rawData.description !== undefined && String(rawData.description || '') !== String(existingTask.description || '')) {
    changes.push('description');
  }
  if (rawData.priority !== undefined && String(rawData.priority || '') !== String(existingTask.priority || '')) {
    changes.push('priority');
  }
  if (Object.prototype.hasOwnProperty.call(rawData, 'dueDate')) {
    const before = existingTask.dueDate ? new Date(existingTask.dueDate).toISOString() : '';
    const after = nextTask?.dueDate ? new Date(nextTask.dueDate).toISOString() : '';
    if (before !== after) changes.push('due date');
  }
  if (rawData.checklist !== undefined) {
    changes.push('checklist');
  }

  return changes;
};

// ── Get all tasks (team-filtered) ─────────────────────────────────────────────
export const getAllTasks = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'owner');
    const { status, priority, search, ownerId, page = 1, limit = 50 } = req.query;

    if (status === 'completed') query.completed = true;
    else if (status === 'pending') query.completed = false;
    else if (status === 'overdue') {
      query.completed = false;
      query.dueDate = { $lt: new Date() };
    } else if (status === 'submitted') query.submissionStatus = 'submitted';
    else if (status === 'approved') query.submissionStatus = 'approved';
    else if (status === 'rejected') query.submissionStatus = 'rejected';

    if (ownerId) {
      const ownerKey = String(ownerId);
      if (req.teamMemberIds && !req.teamMemberIds.map(String).includes(ownerKey)) {
        return res.json({
          success: true,
          tasks: [],
          total: 0,
          pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 },
        });
      }
      query.owner = ownerKey;
    }

    if (priority) query.priority = priority;
    if (search) {
      const ownerSearchQuery = {
        ...(req.teamMemberIds ? { _id: { $in: req.teamMemberIds } } : {}),
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { otherName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
      const matchedUsers = await User.find(ownerSearchQuery).select('_id').lean();
      const matchedOwnerIds = matchedUsers.map((user) => user._id);

      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        ...(matchedOwnerIds.length ? [{ owner: { $in: matchedOwnerIds } }] : []),
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('owner', 'firstName lastName otherName email position unitSector avatar')
        .populate('assignedBy', 'firstName lastName email')
        .populate('adminComments.user', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Task.countDocuments(query),
    ]);

    res.json({
      success: true, tasks, total,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('getAllTasks error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};

// ── Get single task ───────────────────────────────────────────────────────────
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('owner', 'firstName lastName otherName email position avatar')
      .populate('assignedBy', 'firstName lastName email')
      .populate('adminComments.user', 'firstName lastName avatar')
      .lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch task' });
  }
};

// ── Create task for a user (Team Lead+ can assign) ────────────────────────────
export const createTaskForUser = async (req, res) => {
  try {
    const { title, description, priority, dueDate, checklist = [], ownerId } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!ownerId) return res.status(400).json({ success: false, message: 'Owner user ID is required' });

    if (req.teamMemberIds && !req.teamMemberIds.map(String).includes(String(ownerId))) {
      return res.status(403).json({ success: false, message: 'User is not in your team' });
    }

    let dueDateObj = null;
    if (dueDate) {
      dueDateObj = new Date(dueDate);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      if (dueDateObj < todayStart) {
        return res.status(400).json({ success: false, message: 'Due date cannot be in the past' });
      }
    }

    const task = new Task({
      title: title.trim(),
      description: description || '',
      priority: priority || 'Low',
      dueDate: dueDateObj,
      checklist,
      completed: checklist.length > 0 ? checklist.every(i => i.completed) : false,
      submissionStatus: 'not_submitted',
      appealStatus: 'not_appealed',
      createdByAdmin: true,
      assignedBy: req.user._id,
      owner: ownerId,
    });

    const saved = await task.save();
    const populated = await Task.findById(saved._id)
      .populate('owner', 'firstName lastName email avatar')
      .populate('assignedBy', 'firstName lastName email')
      .lean();

    const actorName = getActorName(req.user);
    await createOrUpdateTaskReminder({
      task: saved,
      userId: ownerId,
      createdBy: req.user._id,
      io: req.io,
      authHeader: req.headers.authorization || '',
    });

    await emitTaskRealtime({ event: 'newTask', userId: ownerId, payload: populated, io: req.io });
    await createTaskNotification({
      task: saved,
      userId: ownerId,
      title: `New task assigned: ${task.title}`,
      body: `Assigned by ${actorName}`,
      status: 'assigned',
      actor: req.user,
      io: req.io,
      authHeader: req.headers.authorization || '',
    });

    res.status(201).json({ success: true, task: populated });
  } catch (err) {
    console.error('createTaskForUser error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};
export const updateTask = async (req, res) => {
  try {
    const existingTask = await Task.findById(req.params.id)
      .populate('owner', 'firstName lastName email avatar')
      .populate('assignedBy', 'firstName lastName email')
      .lean();
    if (!existingTask) return res.status(404).json({ success: false, message: 'Task not found' });

    if (req.teamMemberIds && !req.teamMemberIds.map(String).includes(getUserId(existingTask.owner))) {
      return res.status(403).json({ success: false, message: 'Task owner is not in your team' });
    }

    const data = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    if (data.dueDate === '' || data.dueDate === null) data.dueDate = undefined;

    if (data.ownerId) {
      data.owner = data.ownerId;
      delete data.ownerId;
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true })
      .populate('owner', 'firstName lastName email avatar')
      .populate('assignedBy', 'firstName lastName email')
      .lean();

    const previousOwnerId = getUserId(existingTask.owner);
    const nextOwnerId = getUserId(updated.owner);
    const actorName = getActorName(req.user);

    if (previousOwnerId && previousOwnerId !== nextOwnerId) {
      await deleteTaskReminder({ taskId: req.params.id, userId: previousOwnerId, io: req.io, authHeader: req.headers.authorization || '' });
      await emitTaskRealtime({ event: 'deleteTask', userId: previousOwnerId, payload: req.params.id, io: req.io });
      await createTaskNotification({
        task: existingTask,
        userId: previousOwnerId,
        title: `Task reassigned: ${existingTask.title}`,
        body: `${actorName} reassigned this task to another teammate.`,
        status: 'reassigned_away',
        actor: req.user,
        io: req.io,
        extraData: { nextOwnerId },
        authHeader: req.headers.authorization || '',
      });

      await createOrUpdateTaskReminder({
        task: updated,
        userId: nextOwnerId,
        createdBy: req.user._id,
        io: req.io,
        authHeader: req.headers.authorization || '',
      });
      await emitTaskRealtime({ event: 'newTask', userId: nextOwnerId, payload: updated, io: req.io });
      await createTaskNotification({
        task: updated,
        userId: nextOwnerId,
        title: `Task assigned: ${updated.title}`,
        body: `Assigned by ${actorName}`,
        status: 'assigned',
        actor: req.user,
        io: req.io,
        extraData: { previousOwnerId },
        authHeader: req.headers.authorization || '',
      });
    } else {
      await createOrUpdateTaskReminder({
        task: updated,
        userId: nextOwnerId,
        createdBy: req.user._id,
        io: req.io,
        authHeader: req.headers.authorization || '',
      });
      await emitTaskRealtime({ event: 'updateTask', userId: nextOwnerId, payload: updated, io: req.io });

      const changes = getTaskChangeList(existingTask, updated, req.body || {});
      await createTaskNotification({
        task: updated,
        userId: nextOwnerId,
        title: `Task updated: ${updated.title}`,
        body: changes.length ? `Changed ${changes.join(', ')}.` : `Updated by ${actorName}.`,
        status: 'updated',
        actor: req.user,
        io: req.io,
        extraData: { changes },
        authHeader: req.headers.authorization || '',
      });
    }

    res.json({ success: true, task: updated });
  } catch (err) {
    console.error('updateTask error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    if (req.teamMemberIds && !req.teamMemberIds.map(String).includes(getUserId(task.owner))) {
      return res.status(403).json({ success: false, message: 'Task owner is not in your team' });
    }

    const ownerId = getUserId(task.owner);
    await Task.findByIdAndDelete(req.params.id);
    await deleteTaskReminder({ taskId: req.params.id, userId: ownerId, io: req.io, authHeader: req.headers.authorization || '' });

    await emitTaskRealtime({ event: 'deleteTask', userId: ownerId, payload: req.params.id, io: req.io });
    await createTaskNotification({
      task,
      userId: ownerId,
      title: `Task removed: ${task.title}`,
      body: `Removed by ${getActorName(req.user)}`,
      status: 'deleted',
      actor: req.user,
      io: req.io,
      authHeader: req.headers.authorization || '',
    });

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};
export const reviewTask = async (req, res) => {
  try {
    const { action } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approved or rejected' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.submissionStatus !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Task has not been submitted for review' });
    }

    const reviewAccess = getTaskReviewAccess({
      task,
      reviewerId: req.user._id,
      reviewerRole: req.user.role,
      teamMemberIds: req.teamMemberIds,
    });
    if (!reviewAccess.allowed) {
      return res.status(403).json({ success: false, message: reviewAccess.reason });
    }

    task.submissionStatus = action;
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('owner', 'firstName lastName email avatar')
      .lean();

    await emitTaskRealtime({ event: 'updateTask', userId: task.owner, payload: populated, io: req.io });
    await emitTaskRealtime({
      event: 'taskReviewed',
      userId: task.owner,
      payload: {
        taskId: task._id,
        title: task.title,
        status: action,
        reviewedBy: getActorName(req.user),
      },
      io: req.io,
    });

    await createTaskNotification({
      task,
      userId: task.owner,
      title: `Task ${action}: ${task.title}`,
      body: `Reviewed by ${getActorName(req.user)}`,
      status: action,
      actor: req.user,
      io: req.io,
      authHeader: req.headers.authorization || '',
    });

    res.json({ success: true, task: populated });
  } catch (err) {
    console.error('reviewTask error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to review task' });
  }
};
export const addTaskComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Comment content required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.adminComments.push({ user: req.user._id, content: content.trim() });
    await task.save();

    const populated = await Task.findById(task._id)
      .populate('owner', 'firstName lastName email avatar')
      .populate('adminComments.user', 'firstName lastName avatar')
      .lean();

    await emitTaskRealtime({ event: 'updateTask', userId: task.owner, payload: populated, io: req.io });
    await emitTaskRealtime({
      event: 'taskCommented',
      userId: task.owner,
      payload: {
        taskId: task._id,
        title: task.title,
        content: content.trim(),
        commentedBy: getActorName(req.user),
      },
      io: req.io,
    });
    await createTaskNotification({
      task,
      userId: task.owner,
      title: `New admin comment on ${task.title}`,
      body: content.trim(),
      status: 'commented',
      actor: req.user,
      io: req.io,
      authHeader: req.headers.authorization || '',
    });

    res.json({ success: true, task: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};
export const bulkAction = async (req, res) => {
  try {
    const { taskIds, action, data } = req.body;
    if (!Array.isArray(taskIds) || !taskIds.length) {
      return res.status(400).json({ success: false, message: 'taskIds array required' });
    }

    let result;
    switch (action) {
      case 'approve': {
        const submittedTasks = await Task.find({ _id: { $in: taskIds }, submissionStatus: 'submitted' }).lean();
        const allowedTasks = submittedTasks.filter((task) => getTaskReviewAccess({
          task,
          reviewerId: req.user._id,
          reviewerRole: req.user.role,
          teamMemberIds: req.teamMemberIds,
        }).allowed);

        if (!allowedTasks.length) {
          return res.status(403).json({ success: false, message: 'No submitted tasks are available for you to approve.' });
        }

        const allowedIds = allowedTasks.map((task) => task._id);
        result = await Task.updateMany(
          { _id: { $in: allowedIds } },
          { $set: { submissionStatus: 'approved' } }
        );

        const updatedTasks = await Task.find({ _id: { $in: allowedIds } })
          .populate('owner', 'firstName lastName email avatar')
          .lean();

        await Promise.all(updatedTasks.map(async (task) => {
          await emitTaskRealtime({ event: 'updateTask', userId: task.owner, payload: task, io: req.io });
          await emitTaskRealtime({
            event: 'taskReviewed',
            userId: task.owner,
            payload: {
              taskId: task._id,
              title: task.title,
              status: 'approved',
              reviewedBy: getActorName(req.user),
            },
            io: req.io,
          });
          await createTaskNotification({
            task,
            userId: task.owner,
            title: `Task approved: ${task.title}`,
            body: `Reviewed by ${getActorName(req.user)}`,
            status: 'approved',
            actor: req.user,
            io: req.io,
            authHeader: req.headers.authorization || '',
          });
        }));

        break;
      }
      case 'reject': {
        const submittedTasks = await Task.find({ _id: { $in: taskIds }, submissionStatus: 'submitted' }).lean();
        const allowedTasks = submittedTasks.filter((task) => getTaskReviewAccess({
          task,
          reviewerId: req.user._id,
          reviewerRole: req.user.role,
          teamMemberIds: req.teamMemberIds,
        }).allowed);

        if (!allowedTasks.length) {
          return res.status(403).json({ success: false, message: 'No submitted tasks are available for you to reject.' });
        }

        const allowedIds = allowedTasks.map((task) => task._id);
        result = await Task.updateMany(
          { _id: { $in: allowedIds } },
          { $set: { submissionStatus: 'rejected' } }
        );

        const updatedTasks = await Task.find({ _id: { $in: allowedIds } })
          .populate('owner', 'firstName lastName email avatar')
          .lean();

        await Promise.all(updatedTasks.map(async (task) => {
          await emitTaskRealtime({ event: 'updateTask', userId: task.owner, payload: task, io: req.io });
          await emitTaskRealtime({
            event: 'taskReviewed',
            userId: task.owner,
            payload: {
              taskId: task._id,
              title: task.title,
              status: 'rejected',
              reviewedBy: getActorName(req.user),
            },
            io: req.io,
          });
          await createTaskNotification({
            task,
            userId: task.owner,
            title: `Task rejected: ${task.title}`,
            body: `Reviewed by ${getActorName(req.user)}`,
            status: 'rejected',
            actor: req.user,
            io: req.io,
            authHeader: req.headers.authorization || '',
          });
        }));

        break;
      }
      case 'delete':
        if (req.user.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'Only Super Admin can bulk delete' });
        }
        result = await Task.deleteMany({ _id: { $in: taskIds } });
        break;
      case 'reassign':
        if (!data?.ownerId) return res.status(400).json({ success: false, message: 'ownerId required for reassign' });
        result = await Task.updateMany(
          { _id: { $in: taskIds } },
          { $set: { owner: data.ownerId, assignedBy: req.user._id } }
        );
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    res.json({ success: true, message: `Bulk ${action} completed`, result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Bulk action failed' });
  }
};

// ── Task stats (dashboard) ────────────────────────────────────────────────────
export const getTaskStats = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'owner');
    const { ownerId } = req.query;
    const now = new Date();

    if (ownerId) {
      const ownerKey = String(ownerId);
      if (req.teamMemberIds && !req.teamMemberIds.map(String).includes(ownerKey)) {
        return res.json({
          success: true,
          stats: { total: 0, completed: 0, pending: 0, overdue: 0, submitted: 0, approved: 0, rejected: 0, highPri: 0 },
        });
      }
      query.owner = ownerKey;
    }

    const [total, completed, pending, overdue, submitted, approved, rejected, highPri] = await Promise.all([
      Task.countDocuments(query),
      Task.countDocuments({ ...query, completed: true }),
      Task.countDocuments({ ...query, completed: false }),
      Task.countDocuments({ ...query, completed: false, dueDate: { $lt: now } }),
      Task.countDocuments({ ...query, submissionStatus: 'submitted' }),
      Task.countDocuments({ ...query, submissionStatus: 'approved' }),
      Task.countDocuments({ ...query, submissionStatus: 'rejected' }),
      Task.countDocuments({ ...query, priority: 'High', completed: false }),
    ]);

    res.json({
      success: true,
      stats: { total, completed, pending, overdue, submitted, approved, rejected, highPri },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};
