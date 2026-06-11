import { LearningCourse, UserProgress } from '../models/learningMaterialModel.js';
import { buildTeamQuery } from '../middleware/teamFilter.js';

// ── Get all courses ───────────────────────────────────────────────────────────
export const getCourses = async (req, res) => {
  try {
    const courses = await LearningCourse.find({})
      .sort({ required: -1, level: 1, title: 1 })
      .lean();
    res.json({ success: true, courses, total: courses.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
};

// ── Get course by ID ──────────────────────────────────────────────────────────
export const getCourseById = async (req, res) => {
  try {
    const course = await LearningCourse.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, course });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch course' });
  }
};

// ── Create course (Super Admin) ───────────────────────────────────────────────
export const createCourse = async (req, res) => {
  try {
    const { title, description, level, assetco, modules, exam, required, tags, passingScore } = req.body;
    if (!title || !level || !assetco) {
      return res.status(400).json({ success: false, message: 'Title, level, and assetco are required' });
    }

    const course = new LearningCourse({
      title, description: description || '', level, assetco,
      modules: modules || [], exam: exam || [], required: required || false,
      tags: tags || [], passingScore: passingScore || 70,
    });
    await course.save();
    res.status(201).json({ success: true, course });
  } catch (err) {
    console.error('createCourse error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Update course (Super Admin) ───────────────────────────────────────────────
export const updateCourse = async (req, res) => {
  try {
    const updated = await LearningCourse.findByIdAndUpdate(req.params.id, {
      ...req.body, updatedAt: new Date(),
    }, { returnDocument: 'after', runValidators: true }).lean();
    if (!updated) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, course: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Delete course (Super Admin) ───────────────────────────────────────────────
export const deleteCourse = async (req, res) => {
  try {
    await LearningCourse.findByIdAndDelete(req.params.id);
    await UserProgress.deleteMany({ courseId: req.params.id });
    res.json({ success: true, message: 'Course and related progress deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete course' });
  }
};

// ── Get all progress (team-filtered) ──────────────────────────────────────────
export const getAllProgress = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'userId');
    const progress = await UserProgress.find(query)
      .populate('userId', 'firstName lastName email position unitSector avatar')
      .populate('courseId', 'title level assetco passingScore required')
      .lean();
    res.json({ success: true, progress, total: progress.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch progress' });
  }
};

// ── Training stats ────────────────────────────────────────────────────────────
export const getTrainingStats = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'userId');
    const allProgress = await UserProgress.find(query).lean();
    const totalCourses = await LearningCourse.countDocuments({});

    const enrolled = allProgress.length;
    const completed = allProgress.filter(p => p.progress === 100).length;
    const certified = allProgress.filter(p => p.certificationEarned).length;
    const avgProgress = enrolled > 0
      ? Math.round(allProgress.reduce((s, p) => s + (p.progress || 0), 0) / enrolled)
      : 0;

    res.json({
      success: true,
      stats: { totalCourses, enrolled, completed, certified, avgProgress },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch training stats' });
  }
};

// ── Enroll user in course ─────────────────────────────────────────────────────
export const enrollUser = async (req, res) => {
  const { userId, courseId } = req.body;
  if (!userId || !courseId) return res.status(400).json({ success: false, message: 'userId and courseId required' });

  try {
    const progress = await UserProgress.findOneAndUpdate(
      { userId, courseId },
      { $setOnInsert: { userId, courseId, enrolledAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, progress });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to enroll user' });
  }
};
