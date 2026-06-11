// backend/routes/documentRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createDocument,
  rawExtract,
  extractText,
  quickConvert,
  generatePPT,
  regenerateSlide,
  savePptJson,
  getHistory,
  getDocument,
  deleteDocument,
} from '../controllers/documentController.js';

const router = express.Router();

// Document lifecycle
router.post('/',                   authMiddleware, createDocument);
router.get('/history',             authMiddleware, getHistory);
router.get('/:id',                 authMiddleware, getDocument);
router.delete('/:id',              authMiddleware, deleteDocument);

// AI pipeline
router.post('/raw-extract',        authMiddleware, rawExtract);
router.post('/extract',            authMiddleware, extractText);
router.post('/quick-convert',      authMiddleware, quickConvert);
router.post('/generate-ppt',       authMiddleware, generatePPT);
router.post('/regenerate-slide',   authMiddleware, regenerateSlide);
router.post('/save-ppt',           authMiddleware, savePptJson);

export default router;