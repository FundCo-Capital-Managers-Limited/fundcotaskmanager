import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    type: {
      type: String,
      enum: ['task_due', 'meeting', 'goal_deadline', 'appraisal_submission', 'manager_feedback', 'custom'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: false },
    targetModel: {
      type: String,
      enum: ['Task', 'Meeting', 'Goal', 'Appraisal', 'Feedback', null],
      required: false,
    },
    message: { type: String, trim: true, required: true, minlength: 1, maxlength: 200 },
    deliveryChannels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
    },
    remindAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'sent', 'snoozed', 'dismissed'],
      default: 'pending',
    },
    snoozeUntil: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    isUserCreated: { type: Boolean, default: false },
    repeatInterval: { type: Number, default: null, min: 5, max: 1440 },
    recurrence: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', null],
        default: null,
      },
      interval: {
        type: Number,
        default: 1,
        min: 1,
        max: 52,
      },
      weekdays: {
        type: [Number],
        default: [],
        validate: {
          validator: (value) => Array.isArray(value) && value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6),
          message: 'Weekdays must be an array of day indexes between 0 and 6',
        },
      },
      timezone: { type: String, default: 'Africa/Lagos', trim: true },
    },
    isActive: { type: Boolean, default: true, index: true },
    emailOverride: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      validate: {
        validator: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email address',
      },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

reminderSchema.index({ user: 1, remindAt: 1, status: 1, isActive: 1 });
reminderSchema.index({ user: 1, isActive: 1, type: 1 });

const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);
export default Reminder;



