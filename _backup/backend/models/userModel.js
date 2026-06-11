// models/userModel.js — UPDATED: added 'executive' to role enum
import mongoose from 'mongoose';
import validator from 'validator';

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        otherName: {
            type: String,
            trim: true,
        },
        position: {
            type: String,
            trim: true,
        },
        unitSector: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            validate: [validator.isEmail, 'Invalid email address'],
        },
        password: {
            type: String,
            required: true,
        },
        // UPDATED: added 'executive' role
        role: {
            type: String,
            enum: ['standard', 'team-lead', 'executive', 'admin'],
            default: 'standard',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        lastLogin: {
            type: Date,
        },
        lastActive: {
            type: Date,
        },
        avatar: {
            type: String,
            trim: true,
            default: '',
        },
        online: {
            type: Boolean,
            default: false,
        },
        activityLogs: {
            type: [{
                action: { type: String, required: true },
                timestamp: { type: Date, default: Date.now },
                details: { type: String },
            }],
            default: [],
        },
        pushToken: {
            type: String,
            trim: true,
        },
        preferences: {
            reminders: {
                defaultDeliveryChannels: {
                    inApp: { type: Boolean, default: true },
                    email: { type: Boolean, default: true },
                    push: { type: Boolean, default: false },
                },
                defaultReminderTimes: {
                    task_due: { type: Number, default: 60 },
                    meeting: { type: Number, default: 30 },
                    goal_deadline: { type: Number, default: 1440 },
                    appraisal_submission: { type: Number, default: 1440 },
                    manager_feedback: { type: Number, default: 720 },
                    custom: { type: Number, default: 60 },
                },
            },
        },
        points: { type: Number, default: 0 },
        badges: [{ type: String }],
        level: { type: String, default: 'Novice' },
        redemptionHistory: [{
            amount: Number,
            date: { type: Date, default: Date.now },
            status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        }],
    },
    { timestamps: true }
);

userSchema.virtual('fullName').get(function() {
    const parts = [this.firstName, this.lastName];
    if (this.otherName) parts.push(this.otherName);
    return parts.join(' ');
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.models.user || mongoose.model('user', userSchema);
export default User;
