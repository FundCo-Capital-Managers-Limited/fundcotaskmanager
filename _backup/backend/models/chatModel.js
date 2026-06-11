// models/chatModel.js
import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['individual', 'group'],
            required: [true, 'Chat type is required'],
        },
        name: {
            type: String,
            trim: true,
            required: [
                function () { return this.type === 'group'; },
                'Group name is required',
            ],
        },
        avatar: { type: String, trim: true, default: '' },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
                required: [true, 'Member ID is required'],
                validate: {
                    validator: (v) => mongoose.isValidObjectId(v),
                    message: 'Invalid Member ID',
                },
            },
        ],
        unreadCounts: {
            type: Map,
            of: Number,
            default: new Map(),
        },
        // Pinned message IDs — any member can pin, max 3 (like WhatsApp)
        pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

chatSchema.index({ members: 1, type: 1 });
chatSchema.index({ members: 1, updatedAt: -1 });
chatSchema.index({ type: 1, members: 1 });

const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
export default Chat;