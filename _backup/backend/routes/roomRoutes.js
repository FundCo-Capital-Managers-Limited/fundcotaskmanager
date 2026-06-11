// routes/roomRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
    createRoom,
    getRoom,
    getUserRooms,
    getActiveRooms,
    updateRoom,
    endRoom,
    kickParticipant,
    sendRoomMessage,
    getRoomChat,
    inviteToRoom,
} from '../controllers/roomController.js';

const roomRouter = express.Router();

// All routes require authentication
roomRouter.use(authMiddleware);

roomRouter.post('/', createRoom);
roomRouter.get('/', getUserRooms);
roomRouter.get('/active', getActiveRooms);
roomRouter.get('/:roomId', getRoom);
roomRouter.put('/:roomId', updateRoom);
roomRouter.delete('/:roomId/end', endRoom);
roomRouter.delete('/:roomId/kick/:userId', kickParticipant);
roomRouter.post('/:roomId/invite', inviteToRoom);
roomRouter.post('/:roomId/chat', sendRoomMessage);
roomRouter.get('/:roomId/chat', getRoomChat);

export default roomRouter;