import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import { getAllReminders, createReminderForUser, deleteReminder } from '../controllers/reminderController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/', getAllReminders);
router.post('/', createReminderForUser);
router.delete('/:id', deleteReminder);

export default router;
