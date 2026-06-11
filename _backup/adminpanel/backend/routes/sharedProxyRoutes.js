import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { createUserBackendProxy } from '../utils/userBackendProxy.js';

const router = express.Router();

router.use(authMiddleware, adminOnly);
router.use(createUserBackendProxy('/api/admin/shared'));

export default router;
