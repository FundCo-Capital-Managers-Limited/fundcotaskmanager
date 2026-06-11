// reminderModel.js
import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true,
        },
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
        message: {
            type: String,
            trim: true,
            required: true,
            minlength: 1,
            maxlength: 200,
        },
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
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        isUserCreated: { type: Boolean, default: false },
        repeatInterval: { type: Number, default: null, min: 5, max: 1440 }, // minutes
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
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Compound index for scheduler + user queries
reminderSchema.index({ user: 1, remindAt: 1, status: 1, isActive: 1 });
reminderSchema.index({ user: 1, isActive: 1, type: 1 });

const Reminder = mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);
export default Reminder;