import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getGoalById, getGoals, updateGoal, createGoal, deleteGoal } from '../controllers/goalController.js';

const goalRouter = express.Router();

goalRouter.route('/')
    .get(authMiddleware, getGoals)
    .post(authMiddleware, createGoal);

goalRouter.route('/:id')
    .get(authMiddleware, getGoalById)
    .put(authMiddleware, updateGoal)
    .delete(authMiddleware, deleteGoal);

export default goalRouter;