// routes/authRoutes.js
import express from 'express';
import { adminLogin, changeAdminPassword, getAdminMe } from '../controllers/authController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();
router.post('/login', adminLogin);
router.get('/me', authMiddleware, adminOnly, getAdminMe);
router.put('/password', authMiddleware, adminOnly, changeAdminPassword);
export default router;
