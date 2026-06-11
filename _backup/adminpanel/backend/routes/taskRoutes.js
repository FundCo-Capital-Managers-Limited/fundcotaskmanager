import express from 'express';
import { authMiddleware, adminOnly, superAdminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getAllTasks, getTaskById, createTaskForUser, updateTask, deleteTask,
  reviewTask, addTaskComment, bulkAction, getTaskStats,
} from '../controllers/taskController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/', getAllTasks);
router.get('/stats', getTaskStats);
router.get('/:id', getTaskById);
router.post('/', createTaskForUser);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/review', reviewTask);
router.post('/:id/comment', addTaskComment);
router.post('/bulk', bulkAction);

export default router;
