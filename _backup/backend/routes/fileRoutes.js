// backend/routes/fileRoutes.js
// CRITICAL: specific routes MUST come before /:id param routes to avoid Express shadowing
import express        from 'express';
import multer         from 'multer';
import authMiddleware from '../middleware/auth.js';
import {
  uploadFiles,
  getFiles,
  deleteFile,
  permanentDeleteFile,
  restoreFile,
  clearTrash,
  toggleStar,
  renameFile,
  moveFiles,
  shareFile,
  updateTags,
  associateTask,
  getStorageUsage,
} from '../controllers/fileController.js';
import {
  createFolder,
  getFolders,
  renameFolder,
  deleteFolder,
  getFolderStats,
} from '../controllers/folderController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
});

const router = express.Router();
router.use(authMiddleware);

// ── Static / specific routes first ───────────────────────────────────────────
router.get( '/storage',          getStorageUsage);   // GET /api/files/storage
router.post('/upload',           upload.array('files'), uploadFiles); // POST /api/files/upload
router.get( '/',                 getFiles);          // GET /api/files
router.post('/move',             moveFiles);         // POST /api/files/move
router.delete('/trash/clear',    clearTrash);        // DELETE /api/files/trash/clear

// ── Folder routes ─────────────────────────────────────────────────────────────
router.get(   '/folders',        getFolders);
router.post(  '/folders',        createFolder);
router.get(   '/folders/stats',  getFolderStats);
router.patch( '/folders/:id',    renameFolder);
router.delete('/folders/:id',    deleteFolder);

// ── Param routes last ─────────────────────────────────────────────────────────
router.patch( '/:id/soft-delete',  deleteFile);        // soft delete → trash
router.patch( '/:id/restore',      restoreFile);
router.patch( '/:id/star',         toggleStar);
router.patch( '/:id/rename',       renameFile);
router.patch( '/:id/tags',         updateTags);
router.patch( '/:id/task',         associateTask);
router.post(  '/:id/share',        shareFile);
router.delete('/:id',              permanentDeleteFile);

export default router;