import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getRevenueProjectById,
  getRevenueProjects,
} from '../controllers/revenueProjectController.js';

const router = express.Router();

router.get('/', authMiddleware, getRevenueProjects);
router.get('/:id', authMiddleware, getRevenueProjectById);

export default router;



