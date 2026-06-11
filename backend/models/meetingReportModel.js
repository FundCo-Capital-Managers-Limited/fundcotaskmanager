import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    fileName: { type: String, trim: true, default: '' },
    cid: { type: String, trim: true, default: '' },
    type: { type: String, trim: true, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const actionItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 500 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    dueDate: { type: Date, default: null },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    notes: { type: String, trim: true, default: '' },
    convertedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    convertedAt: { type: Date, default: null },
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
  },
  { timestamps: true }
);

const interactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const meetingReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    meetingDate: { type: Date, required: true },
    meetingType: {
      type: String,
      enum: ['standup', 'internal', 'client', 'board', 'review', 'planning', 'retrospective', 'workshop', 'other'],
      default: 'internal',
    },
    summaryText: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    circulateTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user', index: true }],
    distributeToParticipants: { type: Boolean, default: true },
    sendEmailCopy: { type: Boolean, default: false },
    attachment: { type: attachmentSchema, default: null },
    actionItems: { type: [actionItemSchema], default: [] },
    views: { type: [interactionSchema], default: [] },
    acknowledgements: { type: [interactionSchema], default: [] },
    lastResentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetingReportSchema.index({ createdBy: 1, createdAt: -1 });
meetingReportSchema.index({ recipients: 1, createdAt: -1 });
meetingReportSchema.index({ attendees: 1, createdAt: -1 });
meetingReportSchema.index({ meetingDate: -1 });

const MeetingReport = mongoose.models.MeetingReport || mongoose.model('MeetingReport', meetingReportSchema);
export default MeetingReport;



