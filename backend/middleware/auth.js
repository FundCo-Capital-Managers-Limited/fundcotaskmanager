import User from '../models/userModel.js';
import { verifyPlatformToken } from '../config/security.js';

const LAST_ACTIVE_TOUCH_WINDOW_MS = 2 * 60 * 1000;

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
};

const touchLastActive = (user) => {
  if (!user?._id || user.__virtualAdmin) return;
  const lastActiveAt = user.lastActive ? new Date(user.lastActive).getTime() : 0;
  if (!lastActiveAt || (Date.now() - lastActiveAt) >= LAST_ACTIVE_TOUCH_WINDOW_MS) {
    User.updateOne({ _id: user._id }, { $set: { lastActive: new Date() } }).catch(() => {});
  }
};

const buildVirtualAdminUser = (payload) => ({
  _id: payload.id,
  firstName: payload.firstName || payload.name || 'Admin',
  lastName: payload.lastName || '',
  name: payload.name || payload.firstName || 'Admin',
  role: payload.role || 'admin',
  isActive: true,
  __virtualAdmin: true,
});

const attachAuthenticatedUser = async (req, res, next, { allowVirtualAdmin = false } = {}) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not Authorized, token missing' });
  }

  try {
    const { payload, tokenType } = verifyPlatformToken(token);
    const user = await User.findById(payload.id).select('-password');

    if (!user && allowVirtualAdmin && tokenType === 'admin') {
      req.user = buildVirtualAdminUser(payload);
      req.platformUserType = 'admin';
      return next();
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = user;
    req.platformUserType = tokenType;
    touchLastActive(user);
    return next();
  } catch (err) {
    console.log('JWT verification failed', err);
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

export default async function authMiddleware(req, res, next) {
  return attachAuthenticatedUser(req, res, next);
}

export const authMiddlewareAllowVirtualAdmin = async (req, res, next) =>
  attachAuthenticatedUser(req, res, next, { allowVirtualAdmin: true });



