// backend/models/learningMaterialModel.js
import mongoose from 'mongoose';

// ─── Quiz Question (used in both modules and course exam) ─────────────────────
const quizQuestionSchema = new mongoose.Schema({
  question:    { type: String, required: true },
  options:     [{ type: String, required: true }],
  answer:      { type: String, required: true },
  explanation: { type: String, default: '' },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  moduleRef:   { type: String, default: '' },
});

// ─── Module ───────────────────────────────────────────────────────────────────
const moduleSchema = new mongoose.Schema({
  title:            { type: String, required: true },
  content:          { type: String, required: true },
  videoUrl:         { type: String, default: '' },
  terms:            [{ term: String, definition: String }],
  quiz:             [quizQuestionSchema],
  objectives:       [{ type: String }],
  order:            { type: Number, required: true },
  estimatedMinutes: { type: Number, default: 15 },
});

// ─── Course ───────────────────────────────────────────────────────────────────
const courseSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  description:  { type: String, default: '' },
  level:        { type: String, enum: ['beginner', 'intermediate', 'expert'], required: true },
  assetco:      { type: String, required: true },
  modules:      [moduleSchema],
  exam:         [quizQuestionSchema],   // full course exam 20-40 questions
  required:     { type: Boolean, default: false },
  tags:         [{ type: String }],
  passingScore: { type: Number, default: 70 },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

// ─── Per-module progress ──────────────────────────────────────────────────────
const moduleProgressSchema = new mongoose.Schema({
  moduleId:     { type: mongoose.Schema.Types.ObjectId, required: true },
  completed:    { type: Boolean, default: false },
  completedAt:  { type: Date },
  quizScore:    { type: Number },
  quizAttempts: { type: Number, default: 0 },
  timeSpent:    { type: Number, default: 0 },
});

// ─── Exam attempt ─────────────────────────────────────────────────────────────
const examAttemptSchema = new mongoose.Schema({
  score:   { type: Number, required: true },
  passed:  { type: Boolean, required: true },
  correct: { type: Number, required: true },
  total:   { type: Number, required: true },
  answers: [{
    questionIndex:  Number,
    selectedAnswer: String,
    correctAnswer:  String,
    correct:        Boolean,
    explanation:    String,
  }],
  timeSpent:   { type: Number },
  completedAt: { type: Date, default: Date.now },
});

// ─── User Progress ────────────────────────────────────────────────────────────
const userProgressSchema = new mongoose.Schema({
  userId:              { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  courseId:            { type: mongoose.Schema.Types.ObjectId, ref: 'LearningCourse', required: true },
  moduleProgress:      [moduleProgressSchema],
  completedModules:    [{ type: mongoose.Schema.Types.ObjectId }],
  progress:            { type: Number, default: 0 },
  certificationEarned: { type: Boolean, default: false },
  examAttempts:        [examAttemptSchema],
  bestExamScore:       { type: Number, default: 0 },
  enrolledAt:          { type: Date, default: Date.now },
  lastAccessed:        { type: Date, default: Date.now },
  completedAt:         { type: Date },
  totalTimeSpent:      { type: Number, default: 0 },
});

userProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

const LearningCourse = mongoose.models.LearningCourse
  || mongoose.model('LearningCourse', courseSchema);

const UserProgress = mongoose.models.UserProgress
  || mongoose.model('UserProgress', userProgressSchema);

export { LearningCourse, UserProgress };