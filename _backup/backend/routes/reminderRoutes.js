// reminderRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
    createReminder,
    deleteTaskReminderInternal,
    getReminders,
    syncTaskReminderInternal,
    updateReminder,
    deleteReminder,
    snoozeReminder,
    dismissReminder,
    updatePreferences,
} from '../controllers/reminderController.js';

const router = express.Router();
const INTERNAL_TOKEN = String(process.env.INTERNAL_API_TOKEN || process.env.JWT_SECRET || '').trim();
const ADMIN_ROLES = ['team-lead', 'executive', 'admin'];

const internalOnly = (req, res, next) => {
    const token = String(req.headers['x-internal-token'] || '').trim();
    if (!INTERNAL_TOKEN || token !== INTERNAL_TOKEN) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return next();
};

const adminSyncAllowed = (req, res, next) => {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    return next();
};

router.post('/internal/task-sync', internalOnly, syncTaskReminderInternal);
router.post('/internal/task-delete', internalOnly, deleteTaskReminderInternal);
router.post('/admin-sync/task-sync', authMiddleware, adminSyncAllowed, syncTaskReminderInternal);
router.post('/admin-sync/task-delete', authMiddleware, adminSyncAllowed, deleteTaskReminderInternal);

router.post('/', authMiddleware, createReminder);
router.get('/', authMiddleware, getReminders);
router.put('/:id', authMiddleware, updateReminder);
router.delete('/:id', authMiddleware, deleteReminder);
router.put('/:id/snooze', authMiddleware, snoozeReminder);
router.put('/:id/dismiss', authMiddleware, dismissReminder);
router.put('/preferences', authMiddleware, updatePreferences);

export default router;
