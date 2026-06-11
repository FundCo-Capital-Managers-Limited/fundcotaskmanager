// backend/routes/documentRoutes.js
import express from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/auth.js';
import {
  createDocument,
  rawExtract,
  extractText,
  pdfToText,
  uploadPdfDocument,
  quickConvert,
  generatePPT,
  regenerateSlide,
  savePptJson,
  saveFullText,
  getHistory,
  getDocument,
  deleteDocument,
} from '../controllers/documentController.js';

const router = express.Router();
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
});

// Document lifecycle
router.post('/upload-pdf',         authMiddleware, pdfUpload.single('file'), uploadPdfDocument);
router.post('/',                   authMiddleware, createDocument);
router.get('/history',             authMiddleware, getHistory);
router.get('/:id',                 authMiddleware, getDocument);
router.delete('/:id',              authMiddleware, deleteDocument);

// AI pipeline
router.post('/pdf-to-text',        authMiddleware, pdfToText);    // deterministic, no AI
router.post('/raw-extract',        authMiddleware, rawExtract);   // legacy alias
router.post('/extract',            authMiddleware, extractText);
router.post('/quick-convert',      authMiddleware, quickConvert);
router.post('/generate-ppt',       authMiddleware, generatePPT);
router.post('/regenerate-slide',   authMiddleware, regenerateSlide);
router.post('/save-ppt',           authMiddleware, savePptJson);
router.post('/save-text',          authMiddleware, saveFullText);

export default router;



