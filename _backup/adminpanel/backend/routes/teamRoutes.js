import express from 'express';
import { authMiddleware, adminOnly } from '../middleware/auth.js';
import {
  getMyTeam, updateMyTeam, addTeamMember, removeTeamMember, getAvailableUsers,
} from '../controllers/teamController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly);

router.get('/', getMyTeam);
router.put('/', updateMyTeam);
router.post('/member', addTeamMember);
router.delete('/member/:userId', removeTeamMember);
router.get('/available-users', getAvailableUsers);

export default router;
