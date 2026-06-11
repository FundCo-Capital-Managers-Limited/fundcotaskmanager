import Report from '../models/reportModel.js';
import { buildTeamQuery } from '../middleware/teamFilter.js';
import { createNotification } from '../utils/notificationService.js';

// ── Get all reports (team-filtered, only submitted+) ──────────────────────────
export const getAllReports = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'user');
    // Hide drafts from admin view
    query.status = { $ne: 'draft' };

    const { status, type, search, page = 1, limit = 20 } = req.query;
    if (status && status !== 'all') query.status = status;
    if (type) query.reportType = type;
    if (search) query.$text = { $search: search };

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('user', 'firstName lastName otherName email position unitSector avatar')
        .populate('selectedTasks', 'title completed priority')
        .populate('reviewedBy', 'firstName lastName email')
        .populate('adminNotes.user', 'firstName lastName avatar')
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true, reports, total,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('getAllReports error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

// ── Get single report ─────────────────────────────────────────────────────────
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('user', 'firstName lastName otherName email position unitSector avatar')
      .populate('selectedTasks', 'title completed dueDate priority description checklist')
      .populate('reviewedBy', 'firstName lastName email')
      .populate('adminNotes.user', 'firstName lastName avatar')
      .lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

// ── Approve or reject report ──────────────────────────────────────────────────
export const reviewReport = async (req, res) => {
  try {
    const { action, feedback } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approved or rejected' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'submitted') {
      return res.status(400).json({ success: false, message: 'Only submitted reports can be reviewed' });
    }

    report.status = action;
    report.reviewedBy = req.user._id;
    if (feedback) report.feedback = feedback;
    await report.save();

    const populated = await Report.findById(report._id)
      .populate('user', 'firstName lastName email avatar')
      .populate('reviewedBy', 'firstName lastName email')
      .lean();

    if (req.io) {
      req.io.to(`user:${report.user}`).emit('reportReviewed', {
        reportId: report._id, title: report.title, status: action,
        feedback: feedback || '', reviewedBy: req.user.fullName,
      });
    }

    await createNotification({
      userId: report.user,
      type: 'report',
      title: `Report ${action}: ${report.title}`,
      body: feedback || `Reviewed by ${req.user.fullName || req.user.email}`,
      actorId: req.user._id,
      actorName: req.user.fullName || req.user.email,
      entityId: report._id,
      entityType: 'Report',
      data: { reportId: String(report._id), status: action },
      io: req.io,
    });

    res.json({ success: true, report: populated });
  } catch (err) {
    console.error('reviewReport error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to review report' });
  }
};

// ── Add admin note to report ──────────────────────────────────────────────────
export const addReportNote = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Note content required' });

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    report.adminNotes.push({ user: req.user._id, content: content.trim() });
    await report.save();

    const populated = await Report.findById(report._id)
      .populate('user', 'firstName lastName email avatar')
      .populate('adminNotes.user', 'firstName lastName avatar')
      .lean();

    await createNotification({
      userId: report.user,
      type: 'report',
      title: `New admin note on ${report.title}`,
      body: content.trim(),
      actorId: req.user._id,
      actorName: req.user.fullName || req.user.email,
      entityId: report._id,
      entityType: 'Report',
      data: { reportId: String(report._id), status: 'commented' },
      io: req.io,
    });

    res.json({ success: true, report: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add note' });
  }
};

// ── Report stats ──────────────────────────────────────────────────────────────
export const getReportStats = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'user');
    query.status = { $ne: 'draft' };

    const [total, submitted, approved, rejected] = await Promise.all([
      Report.countDocuments(query),
      Report.countDocuments({ ...query, status: 'submitted' }),
      Report.countDocuments({ ...query, status: 'approved' }),
      Report.countDocuments({ ...query, status: 'rejected' }),
    ]);

    res.json({ success: true, stats: { total, submitted, approved, rejected, pendingReview: submitted } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch report stats' });
  }
};
