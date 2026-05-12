import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getPlatformActivityReport } from '../controllers/platformActivityController.js';

const router = express.Router();

const superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required' });
  }
  return next();
};

router.get('/report', authMiddleware, superAdminOnly, getPlatformActivityReport);

export default router;
