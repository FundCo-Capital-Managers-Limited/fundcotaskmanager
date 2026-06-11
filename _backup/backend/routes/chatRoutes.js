// routes/chatRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import * as chatController from '../controllers/chatController.js';
const router = express.Router();

// Single-request init
router.get('/init', authMiddleware, chatController.getInitialData);

router.get('/users', authMiddleware, chatController.getUsers);
router.post('/individual', authMiddleware, chatController.createIndividualChat);
router.get('/groups', authMiddleware, chatController.getGroups);
router.post('/groups', authMiddleware, chatController.createGroup);
router.put('/groups/:groupId/members', authMiddleware, chatController.addGroupMembers);

router.get('/unread-counts', authMiddleware, chatController.getAllUnreadCounts);
router.get('/user-chat-map', authMiddleware, chatController.getUserChatMap);
router.post('/:chatId/read', authMiddleware, chatController.markChatRead);

router.get('/:chatId/messages', authMiddleware, chatController.getChatMessages);
router.post('/:chatId/messages', authMiddleware, chatController.sendMessage);
router.get('/:chatId/pinned', authMiddleware, chatController.getPinnedMessages);

router.put('/messages/:messageId', authMiddleware, chatController.editMessage);
// DELETE with body for deleteScope — use POST alias for "delete for me"
router.delete('/messages/:messageId', authMiddleware, chatController.deleteMessage);
router.post('/messages/:messageId/delete', authMiddleware, chatController.deleteMessage);

// Pin / unpin
router.post('/messages/:messageId/pin', authMiddleware, chatController.pinMessage);
router.delete('/messages/:messageId/pin', authMiddleware, chatController.unpinMessage);

// Forward
router.post('/messages/:messageId/forward', authMiddleware, chatController.forwardMessage);

router.post('/upload', authMiddleware, chatController.uploadChatFile);
router.get('/timestamps', authMiddleware, chatController.getChatTimestamps);
router.get('/unread-total', authMiddleware, chatController.getUnreadTotal);

export default router;