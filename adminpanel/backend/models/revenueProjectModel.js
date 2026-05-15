import mongoose from 'mongoose';

const revenueProjectPhaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1200, default: '' },
    order: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    notes: { type: String, trim: true, maxlength: 1200, default: '' },
  },
  { _id: true, timestamps: true }
);

const revenueProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    code: { type: String, trim: true, maxlength: 80, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: {
      type: String,
      enum: ['planning', 'active', 'blocked', 'completed', 'archived'],
      default: 'planning',
    },
    clientName: { type: String, trim: true, maxlength: 160, default: '' },
    assetName: { type: String, trim: true, maxlength: 160, default: '' },
    location: { type: String, trim: true, maxlength: 240, default: '' },
    revenueOutcome: { type: String, trim: true, maxlength: 240, default: '' },
    revenueTarget: { type: Number, default: 0, min: 0 },
    currency: { type: String, trim: true, maxlength: 12, default: 'NGN' },
    expectedStartDate: { type: Date, default: null },
    expectedEndDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    phases: [revenueProjectPhaseSchema],
    lockedTaskPriority: { type: Boolean, default: true },
    requirePhaseCompletionBeforeTaskDone: { type: Boolean, default: true },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

revenueProjectSchema.index({ name: 'text', description: 'text', clientName: 'text', assetName: 'text', location: 'text' });

const RevenueProject = mongoose.models.RevenueProject || mongoose.model('RevenueProject', revenueProjectSchema);
export default RevenueProject;
