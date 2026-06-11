import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getProjects, getProjectById, createProject, updateProject,
  deleteProject, updateProjectMembers, addTaskToProject, removeTaskFromProject,
} from '../controllers/projectController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.put('/:id/members', updateProjectMembers);
router.post('/:id/task', addTaskToProject);
router.delete('/:id/task/:taskId', removeTaskFromProject);

export default router;
