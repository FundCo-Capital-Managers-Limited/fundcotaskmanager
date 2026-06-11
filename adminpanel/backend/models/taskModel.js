import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  dueDate: { type: Date },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  completed: { type: Boolean, default: false },
  checklist: [{
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
  }],
  submissionStatus: {
    type: String,
    enum: ['not_submitted', 'submitted', 'approved', 'rejected'],
    default: 'not_submitted',
  },
  submittedAt: {
    type: Date,
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    default: null,
  },
  appealStatus: {
    type: String,
    enum: ['not_appealed', 'accepted', 'rejected'],
    default: 'not_appealed',
  },
  createdByAdmin: { type: Boolean, default: false },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  assignedBySnapshot: {
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: '' },
    capturedAt: { type: Date, default: null },
  },
  createdAt: { type: Date, default: Date.now },
  files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  revenueProject: {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'RevenueProject', default: null },
    name: { type: String, trim: true, default: '' },
    phaseId: { type: mongoose.Schema.Types.ObjectId, default: null },
    phaseTitle: { type: String, trim: true, default: '' },
    phaseOrder: { type: Number, default: 0 },
    priorityLocked: { type: Boolean, default: false },
    completionRequiresPhaseRelease: { type: Boolean, default: false },
    phaseCompletionUnlocked: { type: Boolean, default: false },
  },
  adminComments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  }],
});

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
export default Task;



