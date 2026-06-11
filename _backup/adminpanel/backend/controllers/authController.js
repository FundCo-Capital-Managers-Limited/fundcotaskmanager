import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const TOKEN_EXPIRES = '24h';
const createToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });

// ── Admin Login ───────────────────────────────────────────────────────────────
export const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
    }

    const adminRoles = ['team-lead', 'executive', 'admin'];
    if (!adminRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Admin access denied. You do not have an admin role.' });
    }

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    user.lastLogin = new Date();
    user.lastActive = new Date();
    user.activityLogs.push({ action: 'admin_login', details: `Admin logged in from IP ${req.ip}` });
    await user.save();

    const token = createToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        otherName: user.otherName,
        fullName: user.fullName,
        position: user.position,
        unitSector: user.unitSector,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Get current admin user ────────────────────────────────────────────────────
export const getAdminMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        otherName: req.user.otherName,
        fullName: req.user.fullName,
        position: req.user.position,
        unitSector: req.user.unitSector,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const changeAdminPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password with at least 8 characters are required',
    });
  }

  try {
    const user = await User.findById(req.user._id).select('password isActive lastActive activityLogs');
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, message: 'Admin account not found' });
    }

    const matched = await bcrypt.compare(currentPassword, user.password);
    if (!matched) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);
    if (samePassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from the current password' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.lastActive = new Date();
    user.activityLogs.push({
      action: 'admin_password_change',
      details: `Admin changed password from IP ${req.ip}`,
    });
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Admin password change error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
};
