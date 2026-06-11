import express from 'express';
import { sendChatMessage, getChatHistory, clearChatHistory } from '../controllers/botChatController.js';
import authMiddleware from '../middleware/auth.js';

const chatRouter = express.Router();

chatRouter.post('/chat', authMiddleware, sendChatMessage);
chatRouter.get('/chat/history', authMiddleware, getChatHistory);
chatRouter.delete('/chat', authMiddleware, clearChatHistory);

export default chatRouter;