import express from 'express';
import { authMiddleware, adminOnly, superAdminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getAllUsers, getUserById, createUser, updateUser,
  resetUserPassword, deleteUser, getUserActivityLogs,
} from '../controllers/userController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly);

router.get('/', teamFilter, getAllUsers);
router.get('/:id', getUserById);
router.get('/:id/logs', getUserActivityLogs);

// Super Admin only
router.post('/', superAdminOnly, createUser);
router.put('/:id', superAdminOnly, updateUser);
router.put('/:id/reset-password', superAdminOnly, resetUserPassword);
router.delete('/:id', superAdminOnly, deleteUser);

export default router;
