// models/messageModel.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chat',
            required: [true, 'Chat ID is required'],
            validate: { validator: (v) => mongoose.isValidObjectId(v), message: 'Invalid Chat ID' },
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: [true, 'Sender ID is required'],
            validate: { validator: (v) => mongoose.isValidObjectId(v), message: 'Invalid Sender ID' },
        },
        content:     { type: String, trim: true },
        fileUrl:     { type: String, trim: true },
        fileName:    { type: String, trim: true },
        contentType: {
            type: String,
            enum: ['image', 'video', 'audio', 'application', ''],
            default: '',
        },
        isDeleted:  { type: Boolean, default: false },
        isEdited:   { type: Boolean, default: false },
        // Per-user soft delete — message stays in DB, hidden only for this user
        deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
        // Reply-to: stores a snapshot so the preview is always available even if original is deleted
        replyTo: {
            messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
            content:   { type: String },
            sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            senderName: { type: String },
            contentType: { type: String },
            fileUrl:   { type: String },
        },
        // Forwarded-from: tracks original sender for forwarded messages
        forwardedFrom: {
            messageId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
            senderName: { type: String },
            chatName:   { type: String },
        },
        mentions: [{
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
            label: { type: String, trim: true, required: true },
        }],
    },
    { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export default Message;