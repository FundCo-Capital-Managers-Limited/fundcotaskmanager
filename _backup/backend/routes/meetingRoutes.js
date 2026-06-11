// backend/routes/meetingRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import { createMeeting, getMeetings, updateMeeting, deleteMeeting, getTranscript, getRecordings, getSignature, getAllUsers } from '../controllers/meetingController.js';

const router = express.Router();

router.post('/', authMiddleware, createMeeting); // Create meeting
router.get('/', authMiddleware, getMeetings); // Get user's meetings
router.put('/:id', authMiddleware, updateMeeting); // Update meeting
router.delete('/:id', authMiddleware, deleteMeeting); // Delete meeting
router.get('/:meetingId/transcript', authMiddleware, getTranscript); // Get transcript
router.get('/:meetingId/recordings', authMiddleware, getRecordings); // Get recordings
router.post('/signature', authMiddleware, getSignature); // Get SDK signature
router.get('/users', authMiddleware, getAllUsers); // Get all users for participants

export default router;