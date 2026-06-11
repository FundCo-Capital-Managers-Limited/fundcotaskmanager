// userRoutes.js
import express from 'express';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
  updatePassword,
  updateProfile,
  updatePushToken,
} from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';
import { authLimiter, passwordLimiter, pushTokenLimiter, refreshLimiter } from '../middleware/rateLimiters.js';
 
const userRouter = express.Router();
 
// PUBLIC LINKS
userRouter.post('/register', authLimiter, registerUser);
userRouter.post('/login', authLimiter, loginUser);
userRouter.post('/refresh', refreshLimiter, refreshUserSession);
userRouter.post('/logout', refreshLimiter, logoutUser);
 
// PRIVATE LINKS
userRouter.get('/me', authMiddleware, getCurrentUser);
userRouter.put('/profile', authMiddleware, updateProfile);
userRouter.put('/password', passwordLimiter, authMiddleware, updatePassword);
userRouter.put('/push-token', pushTokenLimiter, authMiddleware, updatePushToken);
 
export default userRouter;



