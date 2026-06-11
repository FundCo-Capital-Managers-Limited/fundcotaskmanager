// taskRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getTaskById, getTasks, updateTask, createTask, deleteTask, submitTask, appealTask } from '../controllers/taskController.js';

const taskRouter = express.Router();

taskRouter.route('/gp')
    .get(authMiddleware, getTasks)
    .post(authMiddleware, createTask);

taskRouter.route('/:id/gp')
    .get(authMiddleware, getTaskById)
    .put(authMiddleware, updateTask)
    .delete(authMiddleware, deleteTask);

taskRouter.route('/:id/submit')
    .post(authMiddleware, submitTask);

taskRouter.route('/:id/appeal')
    .post(authMiddleware, appealTask);

export default taskRouter;