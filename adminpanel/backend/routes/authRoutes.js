// routes/authRoutes.js
import express from 'express';
import {
  adminLogin,
  adminLogout,
  changeAdminPassword,
  getAdminMe,
  refreshAdminSession,
} from '../controllers/authController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { adminAuthLimiter, adminPasswordLimiter, adminRefreshLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();
router.post('/login', adminAuthLimiter, adminLogin);
router.post('/refresh', adminRefreshLimiter, refreshAdminSession);
router.post('/logout', adminRefreshLimiter, adminLogout);
router.get('/me', authMiddleware, adminOnly, getAdminMe);
router.put('/password', adminPasswordLimiter, authMiddleware, adminOnly, changeAdminPassword);
export default router;



