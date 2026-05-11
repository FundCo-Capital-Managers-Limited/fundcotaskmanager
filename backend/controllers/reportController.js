import Report from '../models/reportModel.js';
import Task from '../models/taskModel.js';
import OpenAI from 'openai';
import { createNotification } from '../utils/notificationService.js';

const openai = process.env.GROK_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    })
  : null;

const emitEvent = (req, event, data) => {
  try {
    req.io?.emit(event, data);
  } catch {
    // best-effort realtime broadcast
  }
};

const callGrokStream = async ({ systemPrompt, userContent }) => {
  if (!openai) return '';
  const stream = await openai.chat.completions.create({
    model: 'grok-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.35,
    max_tokens: 4096,
    stream: true,
  });

  let full = '';
  for await (const chunk of stream) {
    full += chunk.choices[0]?.delta?.content || '';
  }
  return full;
};

const REPORT_SYSTEM = `You are a professional report writer. Rewrite the grounded report draft into clean, natural, first-person progress reporting for a manager. Use clear Markdown formatting with headers, bullet points, and bold text. Preserve the exact employee name, task titles, checklist item wording, dates, and status facts. Never use placeholders such as [Your Name]. Do not invent tasks, checklist items, metrics, or blockers. If the facts are limited, stay concise and honest.`;

const REPORT_POPULATE = [
  { path: 'selectedTasks', select: 'title completed dueDate priority' },
  { path: 'reviewedBy', select: 'firstName lastName email' },
  { path: 'adminNotes.user', select: 'firstName lastName avatar role' },
];

const formatDate = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getUserDisplayName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.fullName || user?.email || 'Unknown user';
};

const normalizeTaskForReport = (task) => ({
  title: String(task?.title || '').trim(),
  description: String(task?.description || '').trim(),
  completed: Boolean(task?.completed),
  dueDate: task?.dueDate || null,
  priority: String(task?.priority || 'Medium').trim() || 'Medium',
  checklist: Array.isArray(task?.checklist)
    ? task.checklist
        .map((item) => ({
          text: String(item?.text || item?.item || '').trim(),
          completed: Boolean(item?.completed),
        }))
        .filter((item) => item.text)
    : [],
});

const buildChecklistMarkdown = (checklist = []) => {
  if (!checklist.length) return ['- No checklist items were attached to this task.'];
  return checklist.map((item) => `- [${item.completed ? 'x' : ' '}] ${item.text}`);
};

const buildExecutiveSummary = ({ tasks, reportType }) => {
  const completedCount = tasks.filter((task) => task.completed).length;
  const openCount = tasks.length - completedCount;
  const focusAreas = tasks
    .map((task) => task.title)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const typeLabel = String(reportType || 'progress').toLowerCase();
  const summaryParts = [
    `During this ${typeLabel} reporting period, I worked on ${tasks.length} selected task${tasks.length === 1 ? '' : 's'}.`,
    `${completedCount} ${completedCount === 1 ? 'task was' : 'tasks were'} completed and ${openCount} ${openCount === 1 ? 'task remains' : 'tasks remain'} in progress.`,
  ];

  if (focusAreas) {
    summaryParts.push(`The main areas of focus were ${focusAreas}.`);
  }

  return summaryParts.join(' ');
};

const buildTaskNarrative = (task) => {
  const description = task.description
    ? task.description
    : 'This task was part of the reporting period and has been tracked inside FundCo AI.';
  const statusSentence = task.completed
    ? 'The work was completed within the reporting period and the task has been marked done.'
    : 'The work is still in progress and remains part of the active execution queue.';
  return `${description} ${statusSentence}`.trim();
};

const buildNextSteps = (tasks) => {
  const openTasks = tasks.filter((task) => !task.completed);
  if (!openTasks.length) {
    return ['- Continue monitoring follow-on actions and prepare the next reporting cycle.'];
  }

  return openTasks
    .slice(0, 4)
    .map((task) => `- Continue progressing **${task.title}** and close the remaining checklist items.`);
};

const buildBlockers = (tasks) => {
  const incompleteWithoutChecklist = tasks.filter((task) => !task.completed && !task.checklist.length);
  if (!incompleteWithoutChecklist.length) {
    return ['- No blockers were explicitly recorded during this reporting period.'];
  }

  return incompleteWithoutChecklist
    .slice(0, 4)
    .map((task) => `- **${task.title}** is still open and needs closer follow-up to confirm any blockers.`);
};

const buildDeterministicReport = ({
  employeeName,
  reportType,
  periodStart,
  periodEnd,
  tasks,
}) => {
  const typeLabel = String(reportType || 'weekly');
  const heading = `${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)} Progress Report`;
  const lines = [
    `# ${heading}`,
    '',
    `**Report Period:** ${formatDate(periodStart)} - ${formatDate(periodEnd)}`,
    `**Submitted By:** ${employeeName}`,
    `**Date Submitted:** ${formatDate(new Date())}`,
    '',
    '## Executive Summary',
    buildExecutiveSummary({ tasks, reportType }),
    '',
    '## Task Details',
    '',
  ];

  tasks.forEach((task) => {
    lines.push(`### ${task.title}`);
    lines.push(`- **Description:** ${task.description || 'No additional description was provided.'}`);
    lines.push(`- **Priority:** ${task.priority}`);
    lines.push(`- **Due Date:** ${formatDate(task.dueDate)}`);
    lines.push(`- **Status:** ${task.completed ? 'Completed' : 'In Progress'}`);
    lines.push(`- **Progress Note:** ${buildTaskNarrative(task)}`);
    lines.push('- **Checklist Progress:**');
    lines.push(...buildChecklistMarkdown(task.checklist));
    lines.push('');
  });

  lines.push('## Next Steps');
  lines.push(...buildNextSteps(tasks));
  lines.push('');
  lines.push('## Blockers');
  lines.push(...buildBlockers(tasks));

  return lines.join('\n').trim();
};

const isGroundedReport = (content, { employeeName, tasks }) => {
  const lower = String(content || '').toLowerCase();
  if (!lower.trim()) return false;
  if (/\[your name\]/i.test(content)) return false;
  if (!lower.includes(String(employeeName || '').toLowerCase())) return false;
  if (!tasks.every((task) => lower.includes(task.title.toLowerCase()))) return false;

  const checklistItems = tasks.flatMap((task) => task.checklist.map((item) => item.text));
  if (!checklistItems.length) return true;
  return checklistItems.every((item) => lower.includes(item.toLowerCase()));
};

const buildAiRewritePrompt = ({
  employeeName,
  reportType,
  periodStart,
  periodEnd,
  tasks,
  draft,
  customPrompt,
}) => [
  `Employee name: ${employeeName}`,
  `Report type: ${reportType}`,
  `Period: ${formatDate(periodStart)} to ${formatDate(periodEnd)}`,
  customPrompt ? `Additional instructions: ${customPrompt}` : '',
  '',
  'Source facts to preserve exactly:',
  JSON.stringify(tasks, null, 2),
  '',
  'Grounded draft to improve:',
  draft,
  '',
  'Rewrite the draft into polished Markdown while keeping every factual detail intact.',
].join('\n');

export const createManualReport = async (req, res) => {
  try {
    const { title, reportType, periodStart, periodEnd, content, selectedTaskIds = [] } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content is required' });

    const report = new Report({
      user: req.user._id,
      title: title.trim(),
      reportType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      content,
      selectedTasks: Array.isArray(selectedTaskIds) ? selectedTaskIds : [],
      aiGenerated: false,
    });

    await report.save();
    emitEvent(req, 'report:new', { _id: report._id, title: report.title, status: report.status });
    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error('Create manual report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generateAIReport = async (req, res) => {
  try {
    const {
      reportType = 'weekly',
      periodStart,
      periodEnd,
      selectedTaskIds = [],
      customPrompt = '',
    } = req.body;

    if (!selectedTaskIds.length) {
      return res.status(400).json({ success: false, message: 'Select at least one task' });
    }

    const tasks = await Task.find({
      _id: { $in: selectedTaskIds },
      owner: req.user._id,
    }).select('title description completed checklist dueDate priority createdAt');

    if (!tasks.length) {
      return res.status(400).json({ success: false, message: 'No matching tasks found' });
    }

    const normalizedTasks = tasks.map(normalizeTaskForReport);
    const employeeName = getUserDisplayName(req.user);
    const fallbackContent = buildDeterministicReport({
      employeeName,
      reportType,
      periodStart,
      periodEnd,
      tasks: normalizedTasks,
    });

    let content = fallbackContent;
    if (openai) {
      try {
        const aiContent = await callGrokStream({
          systemPrompt: REPORT_SYSTEM,
          userContent: buildAiRewritePrompt({
            employeeName,
            reportType,
            periodStart,
            periodEnd,
            tasks: normalizedTasks,
            draft: fallbackContent,
            customPrompt,
          }),
        });

        if (isGroundedReport(aiContent, { employeeName, tasks: normalizedTasks })) {
          content = aiContent.trim();
        }
      } catch (error) {
        console.error('AI report rewrite fell back to deterministic draft:', error?.message || error);
      }
    }

    await createNotification({
      userId: req.user._id,
      type: 'report',
      title: 'AI report ready',
      body: `${reportType?.charAt(0).toUpperCase() + reportType?.slice(1)} draft is ready to review and save.`,
      entityType: 'report',
      data: {
        route: '/reports',
        kind: 'ai-report-draft',
        reportType,
      },
      allowSelf: true,
    });

    res.json({ success: true, content });
  } catch (err) {
    console.error('AI generate error:', err);
    res.status(500).json({ success: false, message: err.message || 'AI generation failed' });
  }
};

export const saveAIReport = async (req, res) => {
  try {
    const { title, reportType, periodStart, periodEnd, content, selectedTaskIds = [] } = req.body;

    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content required' });

    const report = new Report({
      user: req.user._id,
      title: title || `${reportType?.charAt(0).toUpperCase() + reportType?.slice(1)} AI Report`,
      reportType: reportType || 'weekly',
      periodStart: new Date(periodStart || Date.now()),
      periodEnd: new Date(periodEnd || Date.now()),
      content,
      selectedTasks: Array.isArray(selectedTaskIds) ? selectedTaskIds : [],
      aiGenerated: true,
    });

    await report.save();
    emitEvent(req, 'report:new', { _id: report._id, title: report.title, aiGenerated: true });
    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error('Save AI report error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyReports = async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const query = { user: req.user._id };

    if (status) query.status = status;
    if (type) query.reportType = type;
    if (search) query.$text = { $search: search };

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
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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

export const updateReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft reports can be edited' });
    }

    report.versions.push({
      content: report.content,
      metricsSnapshot: report.metricsSnapshot,
      selectedTasks: report.selectedTasks,
      updatedAt: new Date(),
      updatedBy: req.user.email,
    });

    if (req.body.title) report.title = req.body.title.trim();
    if (req.body.content) report.content = req.body.content;
    if (req.body.reportType) report.reportType = req.body.reportType;
    if (req.body.periodStart) report.periodStart = new Date(req.body.periodStart);
    if (req.body.periodEnd) report.periodEnd = new Date(req.body.periodEnd);
    if (req.body.selectedTaskIds) report.selectedTasks = req.body.selectedTaskIds;

    await report.save();
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const submitReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Report already submitted' });
    }

    report.status = 'submitted';
    report.submittedAt = new Date();
    await report.save();

    emitEvent(req, 'report:submitted', { _id: report._id, title: report.title, userId: req.user._id });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findOne({ _id: req.params.id, user: req.user._id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft reports can be deleted' });
    }

    await report.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
