import mongoose from 'mongoose';

const projectMilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1200, default: '' },
    dueDate: { type: Date, default: null },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    status: {
      type: String,
      enum: ['planned', 'active', 'blocked', 'completed'],
      default: 'planned',
    },
    completedAt: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 1200, default: '' },
  },
  { _id: true, timestamps: true }
);

const projectRiskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1500, default: '' },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'mitigating', 'watching', 'closed'],
      default: 'open',
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    dueDate: { type: Date, default: null },
    mitigation: { type: String, trim: true, maxlength: 2000, default: '' },
    impact: { type: String, trim: true, maxlength: 1200, default: '' },
    closedAt: { type: Date, default: null },
  },
  { _id: true, timestamps: true }
);

const projectIssueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1500, default: '' },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'escalated', 'resolved'],
      default: 'open',
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    dueDate: { type: Date, default: null },
    resolution: { type: String, trim: true, maxlength: 2000, default: '' },
    resolvedAt: { type: Date, default: null },
  },
  { _id: true, timestamps: true }
);

const projectActivitySchema = new mongoose.Schema(
  {
    kind: { type: String, required: true, trim: true, maxlength: 80 },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    actorName: { type: String, trim: true, maxlength: 160, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'archived'],
      default: 'planning',
    },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    startDate: { type: Date },
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    goals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
    tags: [{ type: String, trim: true }],
    client: {
      name: { type: String, trim: true, maxlength: 160, default: '' },
      account: { type: String, trim: true, maxlength: 160, default: '' },
      contactName: { type: String, trim: true, maxlength: 160, default: '' },
      contactEmail: { type: String, trim: true, maxlength: 160, default: '' },
    },
    budget: {
      planned: { type: Number, default: 0, min: 0 },
      actual: { type: Number, default: 0, min: 0 },
      revenueTarget: { type: Number, default: 0, min: 0 },
      currency: { type: String, trim: true, maxlength: 12, default: 'NGN' },
    },
    milestones: [projectMilestoneSchema],
    risks: [projectRiskSchema],
    issues: [projectIssueSchema],
    activity: [projectActivitySchema],
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', description: 'text' });

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
export default Project;



