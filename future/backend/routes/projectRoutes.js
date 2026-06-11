import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { getProjectById, getProjects } from '../controllers/projectController.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', getProjects);
router.get('/:id', getProjectById);

export default router;



