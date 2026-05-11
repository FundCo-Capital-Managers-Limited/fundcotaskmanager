import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getProjects, getProjectById, createProject, updateProject,
  deleteProject, updateProjectMembers, addTaskToProject, removeTaskFromProject,
  getProjectOpsOverview,
  addProjectMilestone, updateProjectMilestone, deleteProjectMilestone,
  addProjectRisk, updateProjectRisk, deleteProjectRisk,
  addProjectIssue, updateProjectIssue, deleteProjectIssue,
} from '../controllers/projectController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/ops/overview', getProjectOpsOverview);
router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.put('/:id/members', updateProjectMembers);
router.post('/:id/task', addTaskToProject);
router.delete('/:id/task/:taskId', removeTaskFromProject);
router.post('/:id/milestones', addProjectMilestone);
router.put('/:id/milestones/:milestoneId', updateProjectMilestone);
router.delete('/:id/milestones/:milestoneId', deleteProjectMilestone);
router.post('/:id/risks', addProjectRisk);
router.put('/:id/risks/:riskId', updateProjectRisk);
router.delete('/:id/risks/:riskId', deleteProjectRisk);
router.post('/:id/issues', addProjectIssue);
router.put('/:id/issues/:issueId', updateProjectIssue);
router.delete('/:id/issues/:issueId', deleteProjectIssue);

export default router;
