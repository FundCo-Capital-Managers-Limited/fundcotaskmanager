// backend/routes/learningRoutes.js
import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getCourses,
  getCourseById,
  getUserProgress,
  getCourseProgress,
  getStats,
  enrollCourse,
  updateModuleProgress,
  updateProgress,
  submitExam,
  getExam,
  aiQuery,
  generateQuiz,
} from '../controllers/learningController.js';

const router = express.Router();

// ── Courses ──────────────────────────────────────────────────────────────────
router.get('/courses',          authMiddleware, getCourses);        // list (lightweight)
router.get('/courses/:id',      authMiddleware, getCourseById);     // full detail

// ── Progress ─────────────────────────────────────────────────────────────────
router.get ('/progress',              authMiddleware, getUserProgress);   // all courses
router.get ('/progress/:courseId',    authMiddleware, getCourseProgress); // single course
router.post('/progress',             authMiddleware, updateProgress);     // legacy alias
router.post('/module-progress',       authMiddleware, updateModuleProgress);

// ── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats',            authMiddleware, getStats);

// ── Enrollment ───────────────────────────────────────────────────────────────
router.post('/enroll',          authMiddleware, enrollCourse);

// ── Exam ─────────────────────────────────────────────────────────────────────
router.get ('/exam/:courseId',  authMiddleware, getExam);           // get questions
router.post('/exam/submit',     authMiddleware, submitExam);        // submit answers

// ── AI & Generated Quiz ──────────────────────────────────────────────────────
router.post('/ai-query',        authMiddleware, aiQuery);
router.get ('/quiz/:moduleId',  authMiddleware, generateQuiz);

export default router;