import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import User from '../models/userModel.js';
import Task from '../models/taskModel.js';
import Goal from '../models/goalModel.js';
import Report from '../models/reportModel.js';
import Reminder from '../models/reminderModel.js';
import Project from '../models/projectModel.js';
import Post from '../models/postModel.js';
import Notification from '../models/notificationModel.js';
import RefreshToken from '../models/refreshTokenModel.js';
import Room from '../models/roomModel.js';
import AdminTeam from '../models/adminTeamModel.js';

const USER_EXPORT_FIELDS = [
  'firstName',
  'lastName',
  'otherName',
  'fullName',
  'email',
  'role',
  'position',
  'unitSector',
  'isActive',
  'points',
  'createdAt',
  'lastLogin',
  'lastActive',
];

const cleanCell = (value) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return `"${text}"`;
};

const buildUserQuery = (req) => {
  const query = req.teamMemberIds ? { _id: { $in: req.teamMemberIds } } : {};
  const { search, role, isActive } = req.query;

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { position: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  return query;
};

const logActivity = (user, action, details) => {
  user.activityLogs.push({ action, details });
};

const safeCollectionOp = async (collectionName, handler) => {
  const db = mongoose.connection?.db;
  if (!db) return;
  const exists = await db.listCollections({ name: collectionName }).hasNext();
  if (!exists) return;
  await handler(db.collection(collectionName));
};

const runCleanupStep = async (warnings, label, handler, fallback = 0) => {
  try {
    const result = await handler();
    return result ?? fallback;
  } catch (err) {
    console.error(`purgeUser cleanup step failed [${label}]:`, err.message);
    warnings.push({ step: label, message: err.message });
    return fallback;
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find(buildUserQuery(req))
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, users, total: users.length });
  } catch (err) {
    console.error('getAllUsers error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const exportUsers = async (req, res) => {
  try {
    const users = await User.find(buildUserQuery(req))
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const rows = [
      USER_EXPORT_FIELDS.join(','),
      ...users.map((user) => USER_EXPORT_FIELDS.map((field) => cleanCell(user[field])).join(',')),
    ];

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="fundco-users-${stamp}.csv"`);
    res.status(200).send(rows.join('\n'));
  } catch (err) {
    console.error('exportUsers error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to export users' });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

export const createUser = async (req, res) => {
  const { firstName, lastName, otherName, position, unitSector, email, password, role } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ success: false, message: 'First name, last name, email, and password are required' });
  }
  if (!validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
  if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

  try {
    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      otherName: otherName || '',
      position: position || '',
      unitSector: unitSector || '',
      email,
      password: hashed,
      role: role || 'standard',
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        position: user.position,
        unitSector: user.unitSector,
      },
    });
  } catch (err) {
    console.error('createUser error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateUser = async (req, res) => {
  const { firstName, lastName, otherName, position, unitSector, email, role, isActive } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (otherName !== undefined) user.otherName = otherName;
    if (position !== undefined) user.position = position;
    if (unitSector !== undefined) user.unitSector = unitSector;
    if (email && validator.isEmail(email)) user.email = email;
    if (role && ['standard', 'team-lead', 'executive', 'admin'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    logActivity(user, 'admin_update', `Updated by admin ${req.user.fullName || req.user.email}`);
    await user.save();

    const updated = await User.findById(user._id).select('-password').lean();
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('updateUser error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

export const resetUserPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.params.id, {
      $set: { password: hashed },
      $push: { activityLogs: { action: 'password_reset_by_admin', details: `Reset by ${req.user.email}` } },
    });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    user.isActive = false;
    logActivity(user, 'deactivated_by_admin', `Deactivated by ${req.user.email}`);
    await user.save();
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

export const purgeUser = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    const userId = new mongoose.Types.ObjectId(req.params.id);
    const user = await User.findById(userId).select('email fullName');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Cannot permanently delete yourself' });
    }

    const cleanup = {};

    const warnings = [];

    cleanup.ownedTasksDeleted = await runCleanupStep(warnings, 'tasks.deleteOwned', async () => (
      (await Task.deleteMany({ owner: userId })).deletedCount || 0
    ));
    await runCleanupStep(warnings, 'tasks.clearAssignedBy', () => Task.updateMany({ assignedBy: userId }, { $set: { assignedBy: null } }));
    await runCleanupStep(warnings, 'tasks.clearReviewedBy', () => Task.updateMany({ reviewedBy: userId }, { $set: { reviewedBy: null } }));
    await runCleanupStep(warnings, 'tasks.removeAdminComments', () => Task.updateMany({ 'adminComments.user': userId }, { $pull: { adminComments: { user: userId } } }));

    const ownedGoalIds = await runCleanupStep(warnings, 'goals.findOwned', async () => {
      const ownedGoals = await Goal.find({ owner: userId }).select('_id').lean();
      return ownedGoals.map((goal) => goal._id);
    }, []);
    cleanup.ownedGoalsDeleted = await runCleanupStep(warnings, 'goals.deleteOwned', async () => (
      (await Goal.deleteMany({ owner: userId })).deletedCount || 0
    ));
    if (ownedGoalIds.length) {
      await runCleanupStep(warnings, 'goals.clearParentGoalRefs', () => Goal.updateMany({ parentGoal: { $in: ownedGoalIds } }, { $set: { parentGoal: null } }));
    }
    await runCleanupStep(warnings, 'goals.clearCreatedBy', () => Goal.updateMany({ createdBy: userId }, { $set: { createdBy: null } }));
    await runCleanupStep(warnings, 'goals.removeAdminComments', () => Goal.updateMany({ 'adminComments.user': userId }, { $pull: { adminComments: { user: userId } } }));

    cleanup.ownedReportsDeleted = await runCleanupStep(warnings, 'reports.deleteOwned', async () => (
      (await Report.deleteMany({ user: userId })).deletedCount || 0
    ));
    await runCleanupStep(warnings, 'reports.clearReviewedBy', () => Report.updateMany({ reviewedBy: userId }, { $set: { reviewedBy: null } }));
    await runCleanupStep(warnings, 'reports.removeAdminNotes', () => Report.updateMany({ 'adminNotes.user': userId }, { $pull: { adminNotes: { user: userId } } }));

    cleanup.remindersDeleted = await runCleanupStep(warnings, 'reminders.delete', async () => (
      (await Reminder.deleteMany({ $or: [{ user: userId }, { createdBy: userId }] })).deletedCount || 0
    ));

    await runCleanupStep(warnings, 'projects.reassignCreatedBy', () => Project.updateMany({ createdBy: userId }, { $set: { createdBy: req.user._id } }));
    await runCleanupStep(warnings, 'projects.removeMember', () => Project.updateMany({ members: userId }, { $pull: { members: userId } }));
    await runCleanupStep(warnings, 'projects.clearMilestoneOwner', () => Project.updateMany({ 'milestones.owner': userId }, { $set: { 'milestones.$[item].owner': null } }, { arrayFilters: [{ 'item.owner': userId }] }));
    await runCleanupStep(warnings, 'projects.clearRiskOwner', () => Project.updateMany({ 'risks.owner': userId }, { $set: { 'risks.$[item].owner': null } }, { arrayFilters: [{ 'item.owner': userId }] }));
    await runCleanupStep(warnings, 'projects.clearIssueOwner', () => Project.updateMany({ 'issues.owner': userId }, { $set: { 'issues.$[item].owner': null } }, { arrayFilters: [{ 'item.owner': userId }] }));
    await runCleanupStep(warnings, 'projects.clearActivityActor', () => Project.updateMany({ 'activity.actor': userId }, { $set: { 'activity.$[item].actor': null } }, { arrayFilters: [{ 'item.actor': userId }] }));

    cleanup.postsDeleted = await runCleanupStep(warnings, 'posts.deleteOwned', async () => (
      (await Post.deleteMany({ user: userId })).deletedCount || 0
    ));
    await runCleanupStep(warnings, 'posts.removeComments', () => Post.updateMany({ 'comments.user': userId }, { $pull: { comments: { user: userId } } }));
    await runCleanupStep(warnings, 'posts.removeBookmarks', () => Post.updateMany({ bookmarkedBy: userId }, { $pull: { bookmarkedBy: userId } }));

    cleanup.roomsDeleted = await runCleanupStep(warnings, 'rooms.deleteHosted', async () => (
      (await Room.deleteMany({ host: userId })).deletedCount || 0
    ));
    await runCleanupStep(warnings, 'rooms.removeParticipants', () => Room.updateMany({ 'participants.userId': userId }, { $pull: { participants: { userId } } }));
    await runCleanupStep(warnings, 'rooms.removeInvites', () => Room.updateMany({ invitedUsers: userId }, { $pull: { invitedUsers: userId } }));
    await runCleanupStep(warnings, 'rooms.removeChatMessages', () => Room.updateMany({ 'chatMessages.sender': userId }, { $pull: { chatMessages: { sender: userId } } }));

    cleanup.adminTeamsDeleted = await runCleanupStep(warnings, 'adminTeams.deleteOwned', async () => (
      (await AdminTeam.deleteMany({ admin: userId })).deletedCount || 0
    ));
    await runCleanupStep(warnings, 'adminTeams.removeMember', () => AdminTeam.updateMany({ members: userId }, { $pull: { members: userId } }));

    cleanup.notificationsDeleted = await runCleanupStep(warnings, 'notifications.delete', async () => (
      (await Notification.deleteMany({ $or: [{ user: userId }, { actor: userId }] })).deletedCount || 0
    ));
    cleanup.refreshTokensDeleted = await runCleanupStep(warnings, 'refreshTokens.delete', async () => (
      (await RefreshToken.deleteMany({ userId })).deletedCount || 0
    ));

    await runCleanupStep(warnings, 'meetings.cleanup', async () => {
      await safeCollectionOp('meetings', async (collection) => {
        await collection.deleteMany({ creator: userId });
        await collection.updateMany({ participants: userId }, { $pull: { participants: userId } });
        await collection.updateMany({ 'actions.owner': userId }, { $set: { 'actions.$[item].owner': null } }, { arrayFilters: [{ 'item.owner': userId }] });
        await collection.updateMany({ 'actions.createdBy': userId }, { $set: { 'actions.$[item].createdBy': req.user._id } }, { arrayFilters: [{ 'item.createdBy': userId }] });
        await collection.updateMany({ 'actions.updatedBy': userId }, { $set: { 'actions.$[item].updatedBy': null } }, { arrayFilters: [{ 'item.updatedBy': userId }] });
        await collection.updateMany({ 'decisions.owner': userId }, { $set: { 'decisions.$[item].owner': null } }, { arrayFilters: [{ 'item.owner': userId }] });
        await collection.updateMany({ 'decisions.recordedBy': userId }, { $set: { 'decisions.$[item].recordedBy': req.user._id } }, { arrayFilters: [{ 'item.recordedBy': userId }] });
      });
      return true;
    }, false);

    await runCleanupStep(warnings, 'messages.cleanup', async () => {
      await safeCollectionOp('messages', async (collection) => {
        await collection.deleteMany({ sender: userId });
        await collection.updateMany({ readBy: userId }, { $pull: { readBy: userId } });
        await collection.updateMany({ deletedFor: userId }, { $pull: { deletedFor: userId } });
        await collection.updateMany({ forwardedBy: userId }, { $set: { forwardedBy: null } });
      });
      return true;
    }, false);

    await runCleanupStep(warnings, 'chats.cleanup', async () => {
      await safeCollectionOp('chats', async (collection) => {
        await collection.updateMany({ participants: userId }, { $pull: { participants: userId } });
        await collection.updateMany({ admins: userId }, { $pull: { admins: userId } });
        await collection.updateMany({ mutedUsers: userId }, { $pull: { mutedUsers: userId } });
        await collection.updateMany({ archivedBy: userId }, { $pull: { archivedBy: userId } });
        await collection.updateMany({ clearedBy: userId }, { $pull: { clearedBy: userId } });
        await collection.updateMany({ leftMembers: userId }, { $pull: { leftMembers: userId } });
        await collection.deleteMany({ participants: { $size: 0 } });
      });
      return true;
    }, false);

    await runCleanupStep(warnings, 'botchats.delete', async () => {
      await safeCollectionOp('botchats', async (collection) => {
        await collection.deleteMany({ user: userId });
      });
      return true;
    }, false);

    await runCleanupStep(warnings, 'feedbacks.delete', async () => {
      await safeCollectionOp('feedbacks', async (collection) => {
        await collection.deleteMany({ user: userId });
      });
      return true;
    }, false);

    cleanup.userDeleted = await runCleanupStep(warnings, 'users.delete', async () => (
      (await User.deleteOne({ _id: userId })).deletedCount || 0
    ));

    if (!cleanup.userDeleted) {
      return res.status(500).json({ success: false, message: 'Failed to permanently delete user' });
    }

    res.json({
      success: true,
      message: warnings.length
        ? `User ${user.fullName || user.email} permanently deleted with ${warnings.length} cleanup warning${warnings.length === 1 ? '' : 's'}`
        : `User ${user.fullName || user.email} permanently deleted`,
      cleanup,
      warnings,
    });
  } catch (err) {
    console.error('purgeUser error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to permanently delete user' });
  }
};

export const getUserActivityLogs = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('activityLogs firstName lastName').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, logs: user.activityLogs?.slice(-100).reverse() || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
};
