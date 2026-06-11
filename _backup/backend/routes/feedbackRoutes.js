// routes/feedbackRoutes.js
import express from 'express';
import { submitFeedback } from '../controllers/feedbackController.js';
import authMiddleware from '../middleware/auth.js';

const feedbackRouter = express.Router();

feedbackRouter.post('/submit', authMiddleware, submitFeedback);

export default feedbackRouter;