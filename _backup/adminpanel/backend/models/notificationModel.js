import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['chat', 'social', 'task', 'reminder', 'meeting', 'report', 'goal', 'file', 'system'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, default: '', maxlength: 500 },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    actorName: { type: String, trim: true, default: '', maxlength: 120 },
    entityId: { type: String, trim: true, default: '' },
    entityType: { type: String, trim: true, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
