// backend/controllers/reportController.js — UPDATED: populates adminNotes
import Report from '../models/reportModel.js';
import Task   from '../models/taskModel.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey:  process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const emitEvent = (req, event, data) => {
  try { req.io?.emit(event, data); } catch {}
};

const callGrokStream = async ({ systemPrompt, userContent }) => {
  const stream = await openai.chat.completions.create({
    model: 'grok-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent  },
    ],
    temperature: 0.4,
    max_tokens:  4096,
    stream: true,
  });
  let full = '';
  for await (const chunk of stream) {
    full += chunk.choices[0]?.delta?.content || '';
  }
  return full;
};

const REPORT_SYSTEM = `You are a professional report writer. Write natural, honest, first-person progress reports for employees reporting to their managers. Use clear Markdown formatting with headers, bullet points, and bold text. Be truthful — only use the tasks provided. Do not invent tasks or metrics.`;

// UPDATED: populate helper for admin fields
const REPORT_POPULATE = [
    { path: 'selectedTasks', select: 'title completed dueDate priority' },
    { path: 'reviewedBy', select: 'firstName lastName email' },
    { path: 'adminNotes.user', select: 'firstName lastName avatar role' },
];

// Create manual report
export const createManualReport = async (req, res) => {
  try {
    const { title, reportType, periodStart, periodEnd, content, selectedTaskIds = [] } = req.body;

    if (!title?.trim())   return res.status(400).json({ success: false, message: 'Title is required' });
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content is required' });

    const report = new Report({
      user:          req.user._id,
      title:         title.trim(),
      reportType,
      periodStart:   new Date(periodStart),
      periodEnd:     new Date(periodEnd),
      content,
      selectedTasks: Array.isArray(selectedTaskIds) ? selectedTaskIds : [],
      aiGenerated:   false,
    });

    await report.save();
    emitEvent(req, 'report:new', { _id: report._id, title: report.title, status: report.status });
    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error('Create manual report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// AI Generate Report
export const generateAIReport = async (req, res) => {
  try {
    const {
      reportType = 'weekly',
      periodStart,
      periodEnd,
      selectedTaskIds = [],
      customPrompt = '',
    } = req.body;

    if (!selectedTaskIds.length)
      return res.status(400).json({ success: false, message: 'Select at least one task' });

    const tasks = await Task.find({
      _id:   { $in: selectedTaskIds },
      owner: req.user._id,
    }).select('title description completed checklist dueDate priority createdAt');

    if (!tasks.length)
      return res.status(400).json({ success: false, message: 'No matching tasks found' });

    const taskData = tasks.map(t => ({
      title:       t.title,
      description: t.description,
      completed:   t.completed,
      checklist:   (t.checklist || []).map(c => ({ item: c.item, completed: c.completed })),
      dueDate:     t.dueDate,
      priority:    t.priority,
    }));

    const userContent = `
Report type: ${reportType}
Period: ${periodStart || 'N/A'} to ${periodEnd || 'N/A'}
${customPrompt ? `Special instructions: ${customPrompt}` : ''}

Tasks to cover:
${JSON.stringify(taskData, null, 2)}

Write a complete ${reportType} progress report in Markdown. Start with an executive summary, then cover each task truthfully, including checklist completion. End with next steps or blockers.
    `.trim();

    const content = await callGrokStream({ systemPrompt: REPORT_SYSTEM, userContent });
    if (!content?.trim()) throw new Error('AI returned empty content');

    res.json({ success: true, content });
  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ success: false, message: err.message || 'AI generation failed' });
  }
};

// Save AI-generated report
export const saveAIReport = async (req, res) => {
  try {
    const { title, reportType, periodStart, periodEnd, content, selectedTaskIds = [] } = req.body;

    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content required' });

    const report = new Report({
      user:          req.user._id,
      title:         title || `${reportType?.charAt(0).toUpperCase() + reportType?.slice(1)} AI Report`,
      reportType:    reportType || 'weekly',
      periodStart:   new Date(periodStart || Date.now()),
      periodEnd:     new Date(periodEnd   || Date.now()),
      content,
      selectedTasks: Array.isArray(selectedTaskIds) ? selectedTaskIds : [],
      aiGenerated:   true,
    });

    await report.save();
    emitEvent(req, 'report:new', { _id: report._id, title: report.title, aiGenerated: true });
    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error('Save AI report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get user's reports — UPDATED: populate adminNotes
export const getMyReports = async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const query = { user: req.user._id };

    if (status) query.status     = status;
    if (type)   query.reportType = type;
    if (search) query.$text      = { $search: search };

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate(REPORT_POPULATE)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        page: Number(page), limit: Number(limit), total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single report — UPDATED: populate adminNotes
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id })
      .populate(REPORT_POPULATE);

    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update report (drafts only)
export const updateReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'draft')
      return res.status(400).json({ success: false, message: 'Only draft reports can be edited' });

    report.versions.push({
      content:          report.content,
      metricsSnapshot:  report.metricsSnapshot,
      selectedTasks:    report.selectedTasks,
      updatedAt:        new Date(),
      updatedBy:        req.user.email,
    });

    if (req.body.title)           report.title         = req.body.title.trim();
    if (req.body.content)         report.content       = req.body.content;
    if (req.body.reportType)      report.reportType    = req.body.reportType;
    if (req.body.periodStart)     report.periodStart   = new Date(req.body.periodStart);
    if (req.body.periodEnd)       report.periodEnd     = new Date(req.body.periodEnd);
    if (req.body.selectedTaskIds) report.selectedTasks = req.body.selectedTaskIds;

    await report.save();
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Submit report
export const submitReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'draft')
      return res.status(400).json({ success: false, message: 'Report already submitted' });

    report.status      = 'submitted';
    report.submittedAt = new Date();
    await report.save();

    emitEvent(req, 'report:submitted', { _id: report._id, title: report.title, userId: req.user._id });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Delete report (drafts only)
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'draft')
      return res.status(400).json({ success: false, message: 'Only draft reports can be deleted' });

    await report.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
