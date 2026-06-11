import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  acknowledgeMeetingReport,
  createMeetingReport,
  getMeetingReportById,
  getMeetingReports,
  getMeetingReportStats,
  linkMeetingReportTask,
  resendMeetingReport,
} from '../controllers/meetingReportController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getMeetingReports);
router.get('/stats', getMeetingReportStats);
router.get('/:id', getMeetingReportById);
router.post('/', createMeetingReport);
router.post('/:id/acknowledge', acknowledgeMeetingReport);
router.post('/:id/resend', resendMeetingReport);
router.post('/:id/action-items/:itemId/link-task', linkMeetingReportTask);

export default router;



