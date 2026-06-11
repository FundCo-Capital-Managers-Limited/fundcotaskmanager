// backend/routes/reportRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createManualReport,
  generateAIReport,
  saveAIReport,
  getMyReports,
  getReportById,
  updateReport,
  submitReport,
  deleteReport,
} from '../controllers/reportController.js';

const router = express.Router();
router.use(authMiddleware);

router.post('/',              createManualReport);  // Create manual draft
router.post('/ai-generate',   generateAIReport);    // AI generate content (no save)
router.post('/ai-save',       saveAIReport);        // Save AI-generated report
router.get('/',               getMyReports);
router.get('/:id',            getReportById);
router.put('/:id',            updateReport);
router.post('/:id/submit',    submitReport);
router.delete('/:id',         deleteReport);

export default router;