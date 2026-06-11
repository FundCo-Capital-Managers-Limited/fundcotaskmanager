// backend/routes/grokRoutes.js
import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.js';
import {
  grokChat,
  getChatHistory,
  getChatById,
  updateChat,
  deleteChat,
  clearToolHistory,
} from '../controllers/grokController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authMiddleware);

// ── Chat ──────────────────────────────────────────────────────────────────────
// toolId is sent in req.body — no need for 60+ separate routes
router.post('/chat', upload.any(), grokChat);

// ── History ───────────────────────────────────────────────────────────────────
router.get('/history',              getChatHistory);
router.get('/history/:chatId',      getChatById);
router.put('/history/:chatId',      updateChat);
router.delete('/history/:chatId',   deleteChat);
router.delete('/history/tool/:toolId', clearToolHistory);

export default router;