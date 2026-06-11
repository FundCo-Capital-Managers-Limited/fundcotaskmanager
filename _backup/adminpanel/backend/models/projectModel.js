import mongoose from 'mongoose';

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
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', description: 'text' });

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
export default Project;
