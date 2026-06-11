import express from 'express';
import { authMiddleware, adminOnly, superAdminOnly } from '../middleware/auth.js';
import { teamFilter } from '../middleware/teamFilter.js';
import {
  getCourses, getCourseById, createCourse, updateCourse, deleteCourse,
  getAllProgress, getTrainingStats, enrollUser,
} from '../controllers/learningController.js';

const router = express.Router();
router.use(authMiddleware, adminOnly);

router.get('/courses', getCourses);
router.get('/courses/:id', getCourseById);
router.post('/courses', superAdminOnly, createCourse);
router.put('/courses/:id', superAdminOnly, updateCourse);
router.delete('/courses/:id', superAdminOnly, deleteCourse);

router.get('/progress', teamFilter, getAllProgress);
router.get('/stats', teamFilter, getTrainingStats);
router.post('/enroll', enrollUser);

export default router;
