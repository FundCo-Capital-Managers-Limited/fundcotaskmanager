import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getLeaderboard, getUserDetails, awardBonus, getDashboardAnalytics,
} from '../controllers/performanceController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/leaderboard', getLeaderboard);
router.get('/analytics', getDashboardAnalytics);
router.get('/user/:userId/details', getUserDetails);
router.post('/award', awardBonus);

export default router;
