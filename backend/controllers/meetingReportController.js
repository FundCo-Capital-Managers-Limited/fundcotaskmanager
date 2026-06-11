import mongoose from 'mongoose';
import MeetingReport from '../models/meetingReportModel.js';
import AdminTeam from '../models/adminTeamModel.js';
import User from '../models/userModel.js';
import { uploadFileToIPFS } from '../pinning/pinata.js';
import { createNotification } from '../utils/notificationService.js';
import { sendEmail } from '../utils/emailService.js';

const ADMIN_ROLES = new Set(['team-lead', 'executive', 'admin']);
const USER_SELECT = 'firstName lastName otherName fullName email position avatar role';
const FILE_GATEWAY_BASE = String(process.env.FILE_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs').trim().replace(/\/+$/, '');
const ALLOWED_ATTACHMENT_EXTS = new Set(['pdf', 'txt', 'doc', 'docx']);
const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

const isAdminUser = (user) => ADMIN_ROLES.has(String(user?.role || '').trim());
const isSuperAdmin = (user) => String(user?.role || '').trim() === 'admin';
const getUserId = (value) => String(value?._id || value || '');
const getActorName = (user) => user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'A teammate';

const uniqueIds = (values = []) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const normalizeUserArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return uniqueIds(value);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return uniqueIds(parsed);
    } catch {}
    return uniqueIds(value.split(','));
  }
  return [];
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const normalizeActionItems = (value) => {
  if (!value) return [];
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(source)) return [];
  return source
    .map((item) => ({
      text: String(item?.text || item?.title || '').trim(),
      owner: getUserId(item?.owner || item?.ownerId) || null,
      dueDate: item?.dueDate ? new Date(item.dueDate) : null,
      priority: ['Low', 'Medium', 'High'].includes(String(item?.priority || '').trim()) ? String(item.priority).trim() : 'Medium',
      notes: String(item?.notes || '').trim(),
    }))
    .filter((item) => item.text);
};

const extractAttachment = (files) => {
  if (!files) return null;
  if (Array.isArray(files) && files.length) return files[0];
  if (files.file) return Array.isArray(files.file) ? files.file[0] : files.file;
  const firstKey = Object.keys(files)[0];
  if (!firstKey) return null;
  const candidate = files[firstKey];
  return Array.isArray(candidate) ? candidate[0] : candidate;
};

const validateAttachment = (file) => {
  if (!file) return;
  const ext = String(file.name || file.originalname || '')
    .split('.')
    .pop()
    .toLowerCase();
  if (!ALLOWED_ATTACHMENT_EXTS.has(ext)) {
    throw new Error('Only PDF, TXT, DOC, and DOCX files are allowed');
  }
  if (Number(file.size || 0) > MAX_ATTACHMENT_SIZE) {
    throw new Error('Meeting report attachment must be 20 MB or less');
  }
};

const attachmentToPayload = async (file) => {
  if (!file) return null;
  validateAttachment(file);
  const buffer = file.data || file.buffer;
  if (!buffer?.length) throw new Error('Uploaded file is empty');
  const fileName = file.name || file.originalname || 'meeting-report';
  const mimeType = file.mimetype || 'application/octet-stream';
  const cid = await uploadFileToIPFS(buffer, fileName, mimeType);
  return {
    fileName,
    cid,
    type: mimeType,
    size: Number(file.size || buffer.length || 0),
  };
};

const withAttachmentUrl = (report) => {
  if (!report) return report;
  if (report.attachment?.cid) {
    report.attachment = {
      ...report.attachment,
      url: `${FILE_GATEWAY_BASE}/${report.attachment.cid}`,
    };
  }
  return report;
};

const buildAudienceIdsForAdmin = async (user) => {
  if (!isAdminUser(user)) return [getUserId(user)];
  if (isSuperAdmin(user)) return null;

  const team = await AdminTeam.findOne({ admin: user._id }).select('members').lean();
  const ids = new Set([getUserId(user)]);
  for (const memberId of team?.members || []) ids.add(String(memberId));
  return [...ids];
};

const buildAccessQuery = async (user, scope = 'all') => {
  const userId = getUserId(user);
  const audienceIds = await buildAudienceIdsForAdmin(user);

  if (isAdminUser(user)) {
    if (scope === 'created') {
      return { createdBy: userId };
    }
    if (scope === 'inbox') {
      if (audienceIds === null) return { recipients: { $exists: true, $ne: [] } };
      return { recipients: { $in: audienceIds } };
    }
    if (audienceIds === null) return {};
    return {
      $or: [
        { createdBy: { $in: audienceIds } },
        { recipients: { $in: audienceIds } },
        { attendees: { $in: audienceIds } },
      ],
    };
  }

  if (scope === 'created') return { createdBy: userId };
  if (scope === 'inbox') {
    return {
      $or: [
        { recipients: userId },
        { attendees: userId },
      ],
    };
  }
  return {
    $or: [
      { createdBy: userId },
      { recipients: userId },
      { attendees: userId },
    ],
  };
};

const canAccessReport = async (user, report) => {
  if (!report) return false;
  const userId = getUserId(user);
  if (!userId) return false;
  if (isSuperAdmin(user)) return true;
  if (String(report.createdBy?._id || report.createdBy) === userId) return true;

  const recipients = (report.recipients || []).map((entry) => String(entry?._id || entry));
  const attendees = (report.attendees || []).map((entry) => String(entry?._id || entry));
  if (recipients.includes(userId) || attendees.includes(userId)) return true;

  if (isAdminUser(user)) {
    const audienceIds = await buildAudienceIdsForAdmin(user);
    return Array.isArray(audienceIds) && audienceIds.some((id) => recipients.includes(id) || attendees.includes(id));
  }

  return false;
};

const validateParticipants = async (userIds = []) => {
  const cleanIds = uniqueIds(userIds);
  if (!cleanIds.length) return [];
  const users = await User.find({ _id: { $in: cleanIds } }).select(USER_SELECT).lean();
  if (users.length !== cleanIds.length) {
    throw new Error('One or more selected users could not be found');
  }
  return users;
};

const buildRecipients = ({ attendees, circulateTo, distributeToParticipants }) => {
  const recipientIds = [
    ...circulateTo,
    ...(distributeToParticipants ? attendees : []),
  ];
  return uniqueIds(recipientIds);
};

const getOversightAdminIds = async (userIds = []) => {
  const scopedUserIds = uniqueIds(userIds);
  if (!scopedUserIds.length) {
    const superAdmins = await User.find({ role: 'admin' }).select('_id').lean();
    return uniqueIds(superAdmins.map((user) => user._id));
  }

  const [teams, superAdmins] = await Promise.all([
    AdminTeam.find({ members: { $in: scopedUserIds } }).select('admin').lean(),
    User.find({ role: 'admin' }).select('_id').lean(),
  ]);

  return uniqueIds([
    ...teams.map((team) => team.admin),
    ...superAdmins.map((user) => user._id),
  ]);
};

const notifyOversightAdmins = async ({ report, actor, io, eventTitle, eventBody, includeCreator = false }) => {
  const oversightUserIds = await getOversightAdminIds([
    report.createdBy,
    ...(report.recipients || []),
    ...(report.attendees || []),
  ]);

  const targets = new Set(oversightUserIds.map(String));
  if (includeCreator && report.createdBy) targets.add(String(report.createdBy?._id || report.createdBy));

  await Promise.all([...targets].map((adminId) => createNotification({
    userId: adminId,
    type: 'report',
    title: eventTitle,
    body: eventBody,
    actorId: actor?._id || actor?.id || null,
    actorName: getActorName(actor),
    entityId: report._id,
    entityType: 'MeetingReport',
    data: {
      reportId: String(report._id),
      kind: 'meeting-report',
      route: '/meeting-reports',
    },
    io,
  })));
};

const buildRecipientStatus = (report) => {
  const views = new Map((report.views || []).map((entry) => [String(entry.user?._id || entry.user), entry.at]));
  const acknowledgements = new Map((report.acknowledgements || []).map((entry) => [String(entry.user?._id || entry.user), entry.at]));

  return (report.recipients || []).map((recipient) => {
    const id = String(recipient?._id || recipient);
    return {
      user: recipient,
      viewedAt: views.get(id) || null,
      acknowledgedAt: acknowledgements.get(id) || null,
      viewed: views.has(id),
      acknowledged: acknowledgements.has(id),
    };
  });
};

const serializeReport = (report) => {
  const next = report.toObject ? report.toObject() : { ...report };
  next.recipientStatus = buildRecipientStatus(next);
  return withAttachmentUrl(next);
};

const notifyRecipients = async ({ report, actor, io, sendEmailCopy = false }) => {
  const creatorId = getUserId(actor);
  const actorName = getActorName(actor);

  await Promise.all((report.recipients || []).map(async (recipient) => {
    const recipientId = String(recipient?._id || recipient);
    await createNotification({
      userId: recipientId,
      type: 'report',
      title: `Meeting report shared: ${report.title}`,
      body: `${actorName} circulated a meeting report to you.`,
      actorId: creatorId,
      actorName,
      entityId: report._id,
      entityType: 'MeetingReport',
      data: {
        reportId: String(report._id),
        kind: 'meeting-report',
        route: '/meeting-reports',
      },
      io,
    });

    if (sendEmailCopy && recipient?.email) {
      try {
        await sendEmail({
          to: recipient.email,
          subject: `Meeting Report: ${report.title}`,
          text: `${actorName} shared a meeting report with you.\n\nTitle: ${report.title}\nDate: ${new Date(report.meetingDate).toLocaleString()}\n\nOpen FundCo AI to view and acknowledge it.`,
        });
      } catch (error) {
        console.error('Meeting report email error:', error.message);
      }
    }
  }));
};

const buildListQuery = async (req) => {
  const { scope = 'all', search = '', meetingType = '', acknowledgement = '' } = req.query;
  const query = await buildAccessQuery(req.user, scope);

  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { summaryText: { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (meetingType) {
    query.meetingType = meetingType;
  }

  if (!isAdminUser(req.user) && acknowledgement === 'pending') {
    query.acknowledgements = { $not: { $elemMatch: { user: req.user._id } } };
  }

  return query;
};

export const createMeetingReport = async (req, res) => {
  try {
    const {
      title,
      meetingDate,
      meetingType = 'internal',
      summaryText = '',
      attendees,
      circulateTo,
      distributeToParticipants,
      sendEmailCopy,
      actionItems,
    } = req.body;

    if (!String(title || '').trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const parsedDate = new Date(meetingDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Valid meeting date is required' });
    }

    const attendeeIds = normalizeUserArray(attendees);
    const circulateIds = normalizeUserArray(circulateTo);
    const distribute = normalizeBoolean(distributeToParticipants, true);
    const emailCopy = normalizeBoolean(sendEmailCopy, false);
    const parsedActionItems = normalizeActionItems(actionItems);

    const [attendeeUsers, circulateUsers] = await Promise.all([
      validateParticipants(attendeeIds),
      validateParticipants(circulateIds),
    ]);

    const recipients = buildRecipients({
      attendees: attendeeUsers.map((user) => user._id),
      circulateTo: circulateUsers.map((user) => user._id),
      distributeToParticipants: distribute,
    });

    if (!String(summaryText || '').trim() && !extractAttachment(req.files)) {
      return res.status(400).json({ success: false, message: 'Provide meeting summary text or upload a file' });
    }

    const attachment = await attachmentToPayload(extractAttachment(req.files));

    const report = await MeetingReport.create({
      title: String(title).trim(),
      meetingDate: parsedDate,
      meetingType,
      summaryText: String(summaryText || '').trim(),
      createdBy: req.user._id,
      attendees: attendeeUsers.map((user) => user._id),
      circulateTo: circulateUsers.map((user) => user._id),
      recipients,
      distributeToParticipants: distribute,
      sendEmailCopy: emailCopy,
      attachment,
      actionItems: parsedActionItems,
    });

    const populated = await MeetingReport.findById(report._id)
      .populate('createdBy', USER_SELECT)
      .populate('attendees', USER_SELECT)
      .populate('circulateTo', USER_SELECT)
      .populate('recipients', USER_SELECT)
      .populate('views.user', USER_SELECT)
      .populate('acknowledgements.user', USER_SELECT)
      .populate('actionItems.owner', USER_SELECT);

    await notifyRecipients({
      report: populated,
      actor: req.user,
      io: req.io,
      sendEmailCopy: emailCopy,
    });
    await notifyOversightAdmins({
      report: populated,
      actor: req.user,
      io: req.io,
      eventTitle: `New meeting report: ${populated.title}`,
      eventBody: `${getActorName(req.user)} submitted a meeting report for follow-up and accountability.`,
    });

    return res.status(201).json({ success: true, report: serializeReport(populated) });
  } catch (error) {
    console.error('createMeetingReport error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create meeting report' });
  }
};

export const getMeetingReports = async (req, res) => {
  try {
    const query = await buildListQuery(req);
    const reports = await MeetingReport.find(query)
      .populate('createdBy', USER_SELECT)
      .populate('attendees', USER_SELECT)
      .populate('circulateTo', USER_SELECT)
      .populate('recipients', USER_SELECT)
      .populate('views.user', USER_SELECT)
      .populate('acknowledgements.user', USER_SELECT)
      .populate('actionItems.owner', USER_SELECT)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      reports: reports.map(serializeReport),
      total: reports.length,
    });
  } catch (error) {
    console.error('getMeetingReports error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch meeting reports' });
  }
};

export const getMeetingReportStats = async (req, res) => {
  try {
    const query = await buildAccessQuery(req.user, 'all');
    const reports = await MeetingReport.find(query).select('createdBy recipients attendees views acknowledgements').lean();
    const currentUserId = getUserId(req.user);

    const inboxReports = reports.filter((report) => (
      (report.recipients || []).map(String).includes(currentUserId)
        || (report.attendees || []).map(String).includes(currentUserId)
    ));

    const recipientRows = reports.flatMap((report) => (report.recipients || []).map((recipient) => ({
      reportId: String(report._id),
      recipientId: String(recipient),
      viewed: (report.views || []).some((entry) => String(entry.user) === String(recipient)),
      acknowledged: (report.acknowledgements || []).some((entry) => String(entry.user) === String(recipient)),
    })));

    return res.json({
      success: true,
      stats: {
        total: reports.length,
        createdByMe: reports.filter((report) => String(report.createdBy) === currentUserId).length,
        inbox: inboxReports.length,
        pendingAcknowledgement: inboxReports.filter((report) => !(report.acknowledgements || []).some((entry) => String(entry.user) === currentUserId)).length,
        recipients: recipientRows.length,
        viewedRecipients: recipientRows.filter((row) => row.viewed).length,
        acknowledgedRecipients: recipientRows.filter((row) => row.acknowledged).length,
        pendingViewRecipients: recipientRows.filter((row) => !row.viewed).length,
        pendingAcknowledgementRecipients: recipientRows.filter((row) => !row.acknowledged).length,
      },
    });
  } catch (error) {
    console.error('getMeetingReportStats error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch meeting report stats' });
  }
};

export const getMeetingReportById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid meeting report ID' });
    }

    const report = await MeetingReport.findById(req.params.id)
      .populate('createdBy', USER_SELECT)
      .populate('attendees', USER_SELECT)
      .populate('circulateTo', USER_SELECT)
      .populate('recipients', USER_SELECT)
      .populate('views.user', USER_SELECT)
      .populate('acknowledgements.user', USER_SELECT)
      .populate('actionItems.owner', USER_SELECT);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Meeting report not found' });
    }

    const canAccess = await canAccessReport(req.user, report);
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'You do not have access to this meeting report' });
    }

    const userId = getUserId(req.user);
    const isRecipient = (report.recipients || []).some((entry) => String(entry._id || entry) === userId)
      || (report.attendees || []).some((entry) => String(entry._id || entry) === userId);

    if (isRecipient && !(report.views || []).some((entry) => String(entry.user?._id || entry.user) === userId)) {
      report.views.push({ user: req.user._id, at: new Date() });
      await report.save();
      await report.populate('views.user', USER_SELECT);
    }

    return res.json({ success: true, report: serializeReport(report) });
  } catch (error) {
    console.error('getMeetingReportById error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load meeting report' });
  }
};

export const acknowledgeMeetingReport = async (req, res) => {
  try {
    const report = await MeetingReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Meeting report not found' });
    }

    const userId = getUserId(req.user);
    const isRecipient = (report.recipients || []).map(String).includes(userId) || (report.attendees || []).map(String).includes(userId);
    if (!isRecipient) {
      return res.status(403).json({ success: false, message: 'Only recipients can acknowledge this report' });
    }

    if (!(report.views || []).some((entry) => String(entry.user) === userId)) {
      report.views.push({ user: req.user._id, at: new Date() });
    }
    if (!(report.acknowledgements || []).some((entry) => String(entry.user) === userId)) {
      report.acknowledgements.push({ user: req.user._id, at: new Date() });
      await report.save();
    }

    const populated = await MeetingReport.findById(report._id)
      .populate('createdBy', USER_SELECT)
      .populate('attendees', USER_SELECT)
      .populate('circulateTo', USER_SELECT)
      .populate('recipients', USER_SELECT)
      .populate('views.user', USER_SELECT)
      .populate('acknowledgements.user', USER_SELECT)
      .populate('actionItems.owner', USER_SELECT);

    await notifyOversightAdmins({
      report: populated,
      actor: req.user,
      io: req.io,
      eventTitle: `Meeting report acknowledged: ${populated.title}`,
      eventBody: `${getActorName(req.user)} acknowledged this meeting report.`,
      includeCreator: true,
    });

    return res.json({ success: true, report: serializeReport(populated) });
  } catch (error) {
    console.error('acknowledgeMeetingReport error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to acknowledge meeting report' });
  }
};

export const resendMeetingReport = async (req, res) => {
  try {
    const report = await MeetingReport.findById(req.params.id)
      .populate('createdBy', USER_SELECT)
      .populate('recipients', USER_SELECT);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Meeting report not found' });
    }

    if (!isAdminUser(req.user) && String(report.createdBy?._id || report.createdBy) !== getUserId(req.user)) {
      return res.status(403).json({ success: false, message: 'Only the author or an admin can resend this report' });
    }

    await notifyRecipients({
      report,
      actor: req.user,
      io: req.io,
      sendEmailCopy: normalizeBoolean(req.body?.sendEmailCopy, false),
    });

    report.lastResentAt = new Date();
    await report.save();

    return res.json({ success: true, message: 'Meeting report notifications resent' });
  } catch (error) {
    console.error('resendMeetingReport error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to resend meeting report notifications' });
  }
};

export const linkMeetingReportTask = async (req, res) => {
  try {
    const { taskId } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.itemId) || !mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ success: false, message: 'Valid report, action item, and task IDs are required' });
    }

    const report = await MeetingReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Meeting report not found' });
    }

    if (!isAdminUser(req.user) && String(report.createdBy) !== getUserId(req.user)) {
      return res.status(403).json({ success: false, message: 'Only the author or an admin can link tasks' });
    }

    const item = report.actionItems.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Action item not found' });
    }

    item.convertedTaskId = taskId;
    item.convertedAt = new Date();
    item.convertedBy = req.user._id;
    await report.save();

    const populated = await MeetingReport.findById(report._id)
      .populate('createdBy', USER_SELECT)
      .populate('attendees', USER_SELECT)
      .populate('circulateTo', USER_SELECT)
      .populate('recipients', USER_SELECT)
      .populate('views.user', USER_SELECT)
      .populate('acknowledgements.user', USER_SELECT)
      .populate('actionItems.owner', USER_SELECT)
      .populate('actionItems.convertedBy', USER_SELECT);

    return res.json({ success: true, report: serializeReport(populated) });
  } catch (error) {
    console.error('linkMeetingReportTask error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to link task to action item' });
  }
};



