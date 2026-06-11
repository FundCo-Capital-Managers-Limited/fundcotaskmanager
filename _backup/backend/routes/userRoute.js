// userRoutes.js
import express from 'express';
import { getCurrentUser, loginUser, registerUser, updatePassword, updateProfile, updatePushToken } from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';
 
const userRouter = express.Router();
 
// PUBLIC LINKS
userRouter.post('/register', registerUser);
userRouter.post('/login', loginUser);
 
// PRIVATE LINKS
userRouter.get('/me', authMiddleware, getCurrentUser);
userRouter.put('/profile', authMiddleware, updateProfile);
userRouter.put('/password', authMiddleware, updatePassword);
userRouter.put('/push-token', authMiddleware, updatePushToken);
 
export default userRouter;