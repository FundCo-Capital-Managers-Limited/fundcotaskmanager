import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  createRevenueProject,
  createRevenueProjectTask,
  getRevenueProjectMembers,
  getRevenueProjectById,
  getRevenueProjects,
  toggleRevenueProjectPhase,
  updateRevenueProject,
} from '../controllers/revenueProjectController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly);

router.get('/members', getRevenueProjectMembers);

router.use(teamFilter);

router.get('/', getRevenueProjects);
router.post('/', createRevenueProject);
router.get('/:id', getRevenueProjectById);
router.put('/:id', updateRevenueProject);
router.post('/:id/tasks', createRevenueProjectTask);
router.post('/:id/phases/:phaseId/toggle', toggleRevenueProjectPhase);

export default router;
