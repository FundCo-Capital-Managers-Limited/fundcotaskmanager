// routes/performanceRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getLeaderboard,
  getMyPerformance,
  getUserDetails,
  getUserAIAnalysis,   // ← new
  awardBonus,
} from '../controllers/performanceController.js';

const performanceRouter = express.Router();

performanceRouter.get('/leaderboard', authMiddleware, getLeaderboard);
performanceRouter.get('/me', authMiddleware, getMyPerformance);
performanceRouter.get('/user/:userId/details', authMiddleware, getUserDetails);
performanceRouter.get('/user/:userId/ai-note', authMiddleware, getUserAIAnalysis); // ← new async AI route
performanceRouter.post('/award', authMiddleware, awardBonus);

export default performanceRouter;