// backend/controllers/meetingController.js
import Meeting from '../models/meetingModel.js';
import User from '../models/userModel.js';
import Joi from 'joi';
import { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting, getZoomTranscript, getZoomMeetingRecordings, generateSignature } from '../utils/zoomService.js';
import { sendEmail } from '../utils/emailService.js';
import { createNotification } from '../utils/notificationService.js';

const meetingSchema = Joi.object({
  topic: Joi.string().min(3).max(200).required(),
  agenda: Joi.string().max(500).optional(),
  startTime: Joi.string().required(),  // Accept string, parse in controller
  duration: Joi.number().integer().min(1).max(1440).required(),
  participants: Joi.array().items(Joi.string().hex().length(24)).optional(),
});

export const createMeeting = async (req, res) => {
  const { error } = meetingSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { topic, agenda, startTime, duration, participants = [] } = req.body;
  const parsedStartTime = new Date(startTime);
  if (isNaN(parsedStartTime.getTime())) return res.status(400).json({ success: false, message: 'Invalid start time format' });
  if (parsedStartTime <= new Date()) return res.status(400).json({ success: false, message: 'Start time must be in the future' });

  try {
    // Validate participants
    if (participants.length > 0) {
      const validUsers = await User.find({ _id: { $in: participants } }).select('_id email name');
      if (validUsers.length !== participants.length) return res.status(400).json({ success: false, message: 'Invalid participants' });
    }

    const zoomMeeting = await createZoomMeeting(topic, parsedStartTime.toISOString(), duration);

    const meeting = new Meeting({
      creator: req.user.id,
      zoomMeetingId: zoomMeeting.id,
      topic,
      agenda,
      startTime: parsedStartTime,
      duration,
      joinUrl: zoomMeeting.join_url,
      hostUrl: zoomMeeting.start_url,
      password: zoomMeeting.password,
      participants,
    });

    await meeting.save();

    // Send emails and in-app notifications
    const meetingDetails = `Topic: ${topic}\nStart Time: ${parsedStartTime.toLocaleString()}\nJoin URL: ${meeting.joinUrl}`;
    for (const participantId of participants) {
      const participant = await User.findById(participantId);
      if (participant.email) {
        await sendEmail({
          to: participant.email,
          subject: 'Meeting Invitation',
          text: `You've been invited to a meeting.\n\n${meetingDetails}`,
        });
      }
      req.io.to(`user:${participantId}`).emit('newMeetingInvitation', { meeting });
      await createNotification({
        userId: participantId,
        type: 'meeting',
        title: `Meeting invitation: ${meeting.topic}`,
        body: `Starts ${parsedStartTime.toLocaleString()}`,
        actorId: req.user.id,
        actorName: req.user.fullName || req.user.email || 'A teammate',
        entityId: meeting._id,
        entityType: 'Meeting',
        data: { meetingId: String(meeting._id), kind: 'invite' },
        io: req.io,
      });
    }

    // Emit to creator as well
    req.io.to(`user:${req.user.id}`).emit('newMeeting', meeting);

    res.status(201).json({ success: true, meeting });
  } catch (err) {
    console.error('Create meeting error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ creator: req.user.id }).sort({ startTime: -1 }).populate('participants', 'name email');
    res.json({ success: true, meetings });
  } catch (err) {
    console.error('Get meetings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMeeting = async (req, res) => {
  const { error } = meetingSchema.validate(req.body);
  if (error) return res.status(400).json({ success: false, message: error.details[0].message });

  const { topic, agenda, startTime, duration, participants = [] } = req.body;
  const parsedStartTime = new Date(startTime);
  if (isNaN(parsedStartTime.getTime())) return res.status(400).json({ success: false, message: 'Invalid start time format' });
  if (parsedStartTime <= new Date()) return res.status(400).json({ success: false, message: 'Start time must be in the future' });

  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, creator: req.user.id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    // Validate participants
    if (participants.length > 0) {
      const validUsers = await User.find({ _id: { $in: participants } }).select('_id email name');
      if (validUsers.length !== participants.length) return res.status(400).json({ success: false, message: 'Invalid participants' });
    }

    // Update Zoom if needed
    await updateZoomMeeting(meeting.zoomMeetingId, { topic, start_time: parsedStartTime.toISOString(), duration });

    meeting.topic = topic;
    meeting.agenda = agenda;
    meeting.startTime = parsedStartTime;
    meeting.duration = duration;
    meeting.participants = participants;
    await meeting.save();

    // Send update notifications
    const meetingDetails = `Updated Meeting: ${topic}\nStart Time: ${parsedStartTime.toLocaleString()}\nJoin URL: ${meeting.joinUrl}`;
    for (const participantId of meeting.participants) {
      const participant = await User.findById(participantId);
      if (participant.email) {
        await sendEmail({
          to: participant.email,
          subject: 'Meeting Update',
          text: meetingDetails,
        });
      }
      req.io.to(`user:${participantId}`).emit('meetingUpdated', meeting);
      await createNotification({
        userId: participantId,
        type: 'meeting',
        title: `Meeting updated: ${meeting.topic}`,
        body: `Starts ${parsedStartTime.toLocaleString()}`,
        actorId: req.user.id,
        actorName: req.user.fullName || req.user.email || 'A teammate',
        entityId: meeting._id,
        entityType: 'Meeting',
        data: { meetingId: String(meeting._id), kind: 'update' },
        io: req.io,
      });
    }
    req.io.to(`user:${req.user.id}`).emit('meetingUpdated', meeting);

    res.json({ success: true, meeting });
  } catch (err) {
    console.error('Update meeting error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, creator: req.user.id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    await deleteZoomMeeting(meeting.zoomMeetingId);

    // Notify participants
    const message = `Meeting "${meeting.topic}" has been cancelled.`;
    for (const participantId of meeting.participants) {
      const participant = await User.findById(participantId);
      if (participant.email) {
        await sendEmail({
          to: participant.email,
          subject: 'Meeting Cancelled',
          text: message,
        });
      }
      req.io.to(`user:${participantId}`).emit('meetingCancelled', { id: meeting._id, message });
      await createNotification({
        userId: participantId,
        type: 'meeting',
        title: `Meeting cancelled: ${meeting.topic}`,
        body: message,
        actorId: req.user.id,
        actorName: req.user.fullName || req.user.email || 'A teammate',
        entityId: meeting._id,
        entityType: 'Meeting',
        data: { meetingId: String(meeting._id), kind: 'cancelled' },
        io: req.io,
      });
    }

    await meeting.deleteOne();
    req.io.to(`user:${req.user.id}`).emit('meetingDeleted', meeting._id);

    res.json({ success: true, message: 'Meeting deleted' });
  } catch (err) {
    console.error('Delete meeting error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTranscript = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ zoomMeetingId: req.params.meetingId, creator: req.user.id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const transcript = await getZoomTranscript(req.params.meetingId);
    res.json({ success: true, transcript });
  } catch (err) {
    console.error('Get transcript error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRecordings = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ zoomMeetingId: req.params.meetingId, creator: req.user.id });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const recordings = await getZoomMeetingRecordings(req.params.meetingId);
    res.json({ success: true, recordings });
  } catch (err) {
    console.error('Get recordings error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSignature = async (req, res) => {
  const { meetingNumber, role } = req.body;
  if (!meetingNumber || role === undefined) return res.status(400).json({ success: false, message: 'Meeting number and role required' });

  try {
    const signature = generateSignature(meetingNumber, parseInt(role));
    res.json({ success: true, signature });
  } catch (err) {
    console.error('Get signature error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('_id name email');
    res.json({ success: true, users });
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};