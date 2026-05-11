import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getAllGoals, getGoalById, createGoalForUser, updateGoal,
  deleteGoal, addGoalComment, getGoalStats,
  getMyGoals, getMyGoalsOverview, getMyGoalStats, createMyGoal, updateMyGoal, deleteMyGoal,
} from '../controllers/goalController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/mine/overview', getMyGoalsOverview);
router.get('/mine', getMyGoals);
router.get('/mine/stats', getMyGoalStats);
router.post('/mine', createMyGoal);
router.put('/mine/:id', updateMyGoal);
router.delete('/mine/:id', deleteMyGoal);
router.get('/', getAllGoals);
router.get('/stats', getGoalStats);
router.get('/:id', getGoalById);
router.post('/', createGoalForUser);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.post('/:id/comment', addGoalComment);

export default router;
