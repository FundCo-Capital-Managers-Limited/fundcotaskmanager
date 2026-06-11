// models/roomModel.js
import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    socketId: { type: String },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    isActive: { type: Boolean, default: true },
    isMuted: { type: Boolean, default: false },
    isCameraOff: { type: Boolean, default: false },
    isScreenSharing: { type: Boolean, default: false },
    role: { type: String, enum: ['host', 'co-host', 'participant'], default: 'participant' },
});

const roomSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        type: {
            type: String,
            enum: ['instant', 'scheduled', 'personal'],
            default: 'instant',
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        participants: [participantSchema],
        maxParticipants: {
            type: Number,
            default: 50,
        },
        isLocked: {
            type: Boolean,
            default: false,
        },
        password: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ['waiting', 'active', 'ended'],
            default: 'waiting',
        },
        startedAt: { type: Date },
        endedAt: { type: Date },
        scheduledFor: { type: Date },
        duration: { type: Number }, // in minutes
        settings: {
            allowVideo: { type: Boolean, default: true },
            allowAudio: { type: Boolean, default: true },
            allowScreenShare: { type: Boolean, default: true },
            allowChat: { type: Boolean, default: true },
            muteOnEntry: { type: Boolean, default: false },
            waitingRoom: { type: Boolean, default: false },
        },
        invitedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
        chatMessages: [
            {
                sender: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
                senderName: String,
                message: String,
                timestamp: { type: Date, default: Date.now },
                type: { type: String, enum: ['text', 'system'], default: 'text' },
            },
        ],
        recordingUrl: { type: String },
    },
    { timestamps: true }
);

// Auto-expire ended rooms after 24 hours
roomSchema.index({ endedAt: 1 }, { expireAfterSeconds: 86400, sparse: true });

const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
export default Room;