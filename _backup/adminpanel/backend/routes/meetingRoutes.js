import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import { getAllRooms, getRoomById, endRoom } from '../controllers/meetingController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly, teamFilter);

router.get('/', getAllRooms);
router.get('/:roomId', getRoomById);
router.post('/:roomId/end', endRoom);

export default router;
