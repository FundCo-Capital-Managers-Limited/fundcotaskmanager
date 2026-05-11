import express from 'express';
import { authMiddleware, adminOnly, superAdminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getAllTasks, getTaskById, createTaskForUser, updateTask, deleteTask,
  reviewTask, addTaskComment, bulkAction, getTaskStats,
  getTasksAssignedByMe, getTasksAssignedByMeOverview, getTasksAssignedByMeStats,
} from '../controllers/taskController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/views/assigned-by-me/overview', getTasksAssignedByMeOverview);
router.get('/views/assigned-by-me', getTasksAssignedByMe);
router.get('/views/assigned-by-me/stats', getTasksAssignedByMeStats);
router.get('/assigned-by-me', getTasksAssignedByMe);
router.get('/assigned-by-me/stats', getTasksAssignedByMeStats);
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
