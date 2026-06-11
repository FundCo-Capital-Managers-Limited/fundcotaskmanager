// backend/controllers/learningController.js
import { LearningCourse, UserProgress } from '../models/learningMaterialModel.js';
import Joi from 'joi';
import { grokQuery } from '../services/grokService.js';

// ─── Validation schemas ───────────────────────────────────────────────────────
const filterSchema = Joi.object({
  level:   Joi.string().optional(),
  assetco: Joi.string().optional(),
  search:  Joi.string().optional(),
});

const querySchema = Joi.object({
  question: Joi.string().required(),
  courseId: Joi.string().hex().length(24).optional(),
  moduleId: Joi.string().hex().length(24).optional(),
});

const moduleProgressSchema = Joi.object({
  courseId:  Joi.string().hex().length(24).required(),
  moduleId:  Joi.string().hex().length(24).required(),
  quizScore: Joi.number().min(0).max(100).optional(),
  timeSpent: Joi.number().min(0).optional(),
});

const examSubmitSchema = Joi.object({
  courseId:  Joi.string().hex().length(24).required(),
  answers:   Joi.array().items(Joi.string().allow('', null)).required(),
  timeSpent: Joi.number().min(0).optional(),
});

// ─── GET /courses — list with filters ────────────────────────────────────────
export const getCourses = async (req, res) => {
  const { error } = filterSchema.validate(req.query);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { level, assetco, search } = req.query;
  try {
    let query = {};

    if (level) {
      const levels = level.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
      if (levels.length) query.level = { $in: levels };
    }
    if (assetco) {
      const assetcos = assetco.split(',').map(a => a.trim()).filter(Boolean);
      if (assetcos.length) query.assetco = { $in: assetcos };
    }
    if (search) {
      query.$or = [
        { title:            { $regex: search, $options: 'i' } },
        { description:      { $regex: search, $options: 'i' } },
        { tags:             { $regex: search, $options: 'i' } },
        { 'modules.title':  { $regex: search, $options: 'i' } },
      ];
    }

    // Return lightweight list — include counts but exclude heavy content/quiz bodies
    const rawCourses = await LearningCourse.find(query, {
      title: 1, description: 1, level: 1, assetco: 1,
      required: 1, tags: 1, passingScore: 1, createdAt: 1,
      'modules._id': 1, 'modules.title': 1, 'modules.order': 1,
      'modules.estimatedMinutes': 1, 'modules.objectives': 1,
      'modules.videoUrl': 1,
      'modules.quiz._id': 1,  // just IDs so we can count
      'exam._id': 1,           // just IDs so we can count
    }).sort({ required: -1, level: 1, title: 1 }).lean();

    // Add computed fields so frontend can show exam/quiz indicators on cards
    const courses = rawCourses.map(c => ({
      ...c,
      examCount: (c.exam || []).length,
      exam:      (c.exam || []).length > 0 ? [{ _placeholder: true }] : [],
      modules: (c.modules || []).map(m => ({
        ...m,
        hasQuiz: Array.isArray(m.quiz) && m.quiz.length > 0,
        quiz:    [],
      })),
    }));

    res.json({ success: true, courses, total: courses.length });
  } catch (err) {
    console.error('getCourses error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /courses/:id — full course detail ────────────────────────────────────
export const getCourseById = async (req, res) => {
  try {
    const course = await LearningCourse.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, course });
  } catch (err) {
    console.error('getCourseById error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /progress — all user progress ───────────────────────────────────────
export const getUserProgress = async (req, res) => {
  try {
    const progress = await UserProgress.find({ userId: req.user.id })
      .populate('courseId', 'title level assetco modules passingScore required')
      .lean();
    res.json({ success: true, progress });
  } catch (err) {
    console.error('getUserProgress error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /progress/:courseId — single course progress ────────────────────────
export const getCourseProgress = async (req, res) => {
  try {
    const progress = await UserProgress.findOne({
      userId:   req.user.id,
      courseId: req.params.courseId,
    }).lean();
    res.json({ success: true, progress: progress || null });
  } catch (err) {
    console.error('getCourseProgress error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /stats — learner summary stats ──────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const allProgress = await UserProgress.find({ userId: req.user.id })
      .populate('courseId', 'title level required')
      .lean();

    const totalCourses     = allProgress.length;
    const completedCourses = allProgress.filter(p => p.progress === 100).length;
    const certifications   = allProgress.filter(p => p.certificationEarned).length;
    const totalTimeSpent   = allProgress.reduce((s, p) => s + (p.totalTimeSpent || 0), 0);
    const avgScore         = allProgress.reduce((s, p) => s + (p.bestExamScore || 0), 0)
                             / (totalCourses || 1);
    const overallProgress  = allProgress.reduce((s, p) => s + (p.progress || 0), 0)
                             / (totalCourses || 1);

    res.json({
      success: true,
      stats: {
        totalCourses,
        completedCourses,
        certifications,
        totalTimeSpent,
        avgScore:        Math.round(avgScore),
        overallProgress: Math.round(overallProgress),
      },
    });
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /enroll — enroll in a course ───────────────────────────────────────
export const enrollCourse = async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ success: false, message: 'courseId required' });

  try {
    // upsert — safe if already enrolled
    const progress = await UserProgress.findOneAndUpdate(
      { userId: req.user.id, courseId },
      { $setOnInsert: { userId: req.user.id, courseId, enrolledAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Enrolled', progress });
  } catch (err) {
    if (err.code === 11000) {
      // Already enrolled — just return existing
      const progress = await UserProgress.findOne({ userId: req.user.id, courseId });
      return res.json({ success: true, message: 'Already enrolled', progress });
    }
    console.error('enrollCourse error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /module-progress — mark module done / record quiz score ─────────────
export const updateModuleProgress = async (req, res) => {
  const { error, value } = moduleProgressSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { courseId, moduleId, quizScore, timeSpent } = value;
  try {
    // Load course to recalculate overall progress
    const course = await LearningCourse.findById(courseId, { modules: 1 }).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Find or create UserProgress
    let prog = await UserProgress.findOne({ userId: req.user.id, courseId });
    if (!prog) {
      prog = new UserProgress({ userId: req.user.id, courseId });
    }

    // Find / create the per-module record
    let modProg = prog.moduleProgress.find(
      mp => mp.moduleId.toString() === moduleId
    );
    if (!modProg) {
      prog.moduleProgress.push({ moduleId, quizAttempts: 0, timeSpent: 0 });
      modProg = prog.moduleProgress[prog.moduleProgress.length - 1];
    }

    // Update quiz score (keep best)
    if (quizScore !== undefined) {
      modProg.quizScore   = Math.max(modProg.quizScore || 0, quizScore);
      modProg.quizAttempts = (modProg.quizAttempts || 0) + 1;
    }

    // Accumulate time
    if (timeSpent) {
      modProg.timeSpent    = (modProg.timeSpent || 0) + timeSpent;
      prog.totalTimeSpent  = (prog.totalTimeSpent || 0) + timeSpent;
    }

    // Mark complete (only once — never un-complete a module)
    if (!modProg.completed) {
      modProg.completed   = true;
      modProg.completedAt = new Date();

      const mid = modProg.moduleId.toString();
      const alreadyIn = prog.completedModules.map(m => m.toString()).includes(mid);
      if (!alreadyIn) prog.completedModules.push(modProg.moduleId);
    }

    // Recalculate overall %
    const total = course.modules.length;
    const done  = prog.completedModules.length;
    prog.progress = total > 0 ? Math.round((done / total) * 100) : 0;

    // Award cert if all modules done AND exam passed
    if (prog.progress === 100 && prog.bestExamScore >= course.passingScore) {
      prog.certificationEarned = true;
      if (!prog.completedAt) prog.completedAt = new Date();
    }

    prog.lastAccessed = new Date();
    await prog.save();

    res.json({ success: true, progress: prog });
  } catch (err) {
    console.error('updateModuleProgress error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Keep legacy alias for backward compatibility
export const updateProgress = updateModuleProgress;

// ─── POST /exam/submit — submit full course exam ──────────────────────────────
export const submitExam = async (req, res) => {
  const { error, value } = examSubmitSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { courseId, answers, timeSpent } = value;
  try {
    const course = await LearningCourse.findById(courseId).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!course.exam || course.exam.length === 0) {
      return res.status(400).json({ success: false, message: 'No exam available for this course' });
    }

    // Grade
    let correct = 0;
    const gradedAnswers = course.exam.map((q, i) => {
      const selected   = answers[i] || '';
      const isCorrect  = selected.trim() === q.answer.trim();
      if (isCorrect) correct++;
      return {
        questionIndex:  i,
        selectedAnswer: selected,
        correctAnswer:  q.answer,
        correct:        isCorrect,
        explanation:    q.explanation || '',
      };
    });

    const total  = course.exam.length;
    const score  = Math.round((correct / total) * 100);
    const passed = score >= (course.passingScore || 70);

    // Save attempt
    let prog = await UserProgress.findOne({ userId: req.user.id, courseId });
    if (!prog) prog = new UserProgress({ userId: req.user.id, courseId });

    prog.examAttempts.push({ score, passed, correct, total, answers: gradedAnswers, timeSpent });
    prog.bestExamScore = Math.max(prog.bestExamScore || 0, score);

    if (prog.progress === 100 && passed) {
      prog.certificationEarned = true;
      if (!prog.completedAt) prog.completedAt = new Date();
    }
    prog.lastAccessed = new Date();
    await prog.save();

    res.json({
      success: true,
      score,
      passed,
      correct,
      total,
      passingScore: course.passingScore,
      answers:      gradedAnswers,
      questions:    course.exam.map(q => ({
        question:    q.question,
        options:     q.options,
        answer:      q.answer,
        explanation: q.explanation || '',
      })),
    });
  } catch (err) {
    console.error('submitExam error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /exam/:courseId — get exam questions (without answers) ───────────────
export const getExam = async (req, res) => {
  try {
    const course = await LearningCourse.findById(req.params.courseId, { exam: 1, passingScore: 1, title: 1 }).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if (!course.exam || course.exam.length === 0) {
      return res.status(404).json({ success: false, message: 'No exam for this course' });
    }

    // Strip answers before sending to client
    const questions = course.exam.map((q, i) => ({
      _id:        q._id,
      index:      i,
      question:   q.question,
      options:    q.options,
      difficulty: q.difficulty,
      moduleRef:  q.moduleRef,
    }));

    res.json({
      success:      true,
      courseTitle:  course.title,
      passingScore: course.passingScore,
      totalQuestions: questions.length,
      questions,
    });
  } catch (err) {
    console.error('getExam error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /ai-query — AI mentor (Grok, restricted to company content) ─────────
export const aiQuery = async (req, res) => {
  const { error } = querySchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { question, courseId, moduleId } = req.body;
  try {
    let content = '';
    if (courseId) {
      const course = await LearningCourse.findById(courseId).lean();
      if (course) {
        if (moduleId) {
          const mod = course.modules.find(m => m._id.toString() === moduleId);
          if (mod) content = mod.content;
        } else {
          content = course.modules.map(m => m.content).join('\n\n');
        }
      }
    }
    const answer = await grokQuery(question, content);
    res.json({ success: true, answer });
  } catch (err) {
    console.error('aiQuery error:', err);
    res.status(500).json({ success: false, message: 'Failed to get AI response' });
  }
};

// ─── GET /quiz/:moduleId — AI-generate a quiz for a module ───────────────────
export const generateQuiz = async (req, res) => {
  const { moduleId } = req.params;
  try {
    const course = await LearningCourse.findOne({ 'modules._id': moduleId }).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Module not found' });
    const mod = course.modules.find(m => m._id.toString() === moduleId);
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    const prompt = `Generate exactly 10 multiple-choice questions with 4 options and 1 correct answer
from this training content. Return ONLY a valid JSON array — no markdown, no preamble.
Each element: { "question": "...", "options": ["A","B","C","D"], "answer": "exact match to one option", "explanation": "why this is correct" }
Content: ${mod.content}`;

    const raw = await grokQuery(prompt, mod.content);
    let quiz;
    try {
      quiz = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      quiz = [];
    }
    res.json({ success: true, quiz });
  } catch (err) {
    console.error('generateQuiz error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};