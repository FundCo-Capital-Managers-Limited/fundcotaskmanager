import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import { getAllPosts, createAnnouncement, deletePost, deleteComment } from '../controllers/socialController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/', getAllPosts);
router.post('/announcement', createAnnouncement);
router.delete('/:id', deletePost);
router.delete('/:postId/comments/:commentId', deleteComment);

export default router;
