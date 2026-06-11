import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { buildTeamQuery } from '../middleware/teamFilter.js';

// ── Get all users (team-filtered) ─────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
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

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, users, total: users.length });
  } catch (err) {
    console.error('getAllUsers error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// ── Get user by ID ────────────────────────────────────────────────────────────
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

// ── Create user (Super Admin only) ────────────────────────────────────────────
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
      firstName, lastName,
      otherName: otherName || '',
      position: position || '',
      unitSector: unitSector || '',
      email, password: hashed,
      role: role || 'standard',
    });

    res.status(201).json({
      success: true,
      user: {
        id: user._id, firstName: user.firstName, lastName: user.lastName,
        email: user.email, role: user.role, fullName: user.fullName,
        position: user.position, unitSector: user.unitSector,
      },
    });
  } catch (err) {
    console.error('createUser error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Update user (Super Admin only) ────────────────────────────────────────────
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

    user.activityLogs.push({
      action: 'admin_update',
      details: `Updated by admin ${req.user.fullName || req.user.email}`,
    });

    await user.save();
    const updated = await User.findById(user._id).select('-password').lean();
    res.json({ success: true, user: updated });
  } catch (err) {
    console.error('updateUser error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// ── Reset password (Super Admin only) ─────────────────────────────────────────
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

// ── Delete user (Super Admin only) ────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    // Soft delete: deactivate
    user.isActive = false;
    user.activityLogs.push({ action: 'deactivated_by_admin', details: `Deactivated by ${req.user.email}` });
    await user.save();
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

// ── Get user activity logs ────────────────────────────────────────────────────
export const getUserActivityLogs = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('activityLogs firstName lastName').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, logs: user.activityLogs?.slice(-100).reverse() || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
};
