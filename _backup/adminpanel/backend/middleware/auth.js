import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

// ── Base auth: verifies token and attaches user to req ────────────────────────
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated' });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ── Admin-only: requires team-lead, executive, or admin role ──────────────────
export const adminOnly = (req, res, next) => {
  const allowed = ['team-lead', 'executive', 'admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// ── Role check middleware factory ─────────────────────────────────────────────
// Usage: requireRole('admin') or requireRole('executive', 'admin')
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required roles: ${roles.join(', ')}`,
    });
  }
  next();
};

// ── Super Admin only ──────────────────────────────────────────────────────────
export const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required' });
  }
  next();
};

// ── Executive or above ────────────────────────────────────────────────────────
export const executiveOrAbove = (req, res, next) => {
  const allowed = ['executive', 'admin'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Executive access or above required' });
  }
  next();
};

export default authMiddleware;
