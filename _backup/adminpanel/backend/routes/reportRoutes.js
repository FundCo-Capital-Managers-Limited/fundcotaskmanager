import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getAllReports, getReportById, reviewReport, addReportNote, getReportStats,
} from '../controllers/reportController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/', getAllReports);
router.get('/stats', getReportStats);
router.get('/:id', getReportById);
router.post('/:id/review', reviewReport);
router.post('/:id/note', addReportNote);

export default router;
