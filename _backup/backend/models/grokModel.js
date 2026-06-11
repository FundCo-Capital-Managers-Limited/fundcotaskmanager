// backend/models/grokModel.js
import mongoose from 'mongoose';

const grokChatSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  toolId:  { type: String, required: true },
  messages: [{
    role:    { type: String, enum: ['system', 'user', 'assistant'] },
    content: { type: mongoose.Schema.Types.Mixed },
  }],
  taskContext:  { type: mongoose.Schema.Types.Mixed, default: null },
  title:        { type: String, default: 'Untitled Chat' },
  summary:      { type: String, default: '' },
  tags:         [{ type: String }],
  starred:      { type: Boolean, default: false },
  messageCount: { type: Number, default: 0 },
}, { timestamps: true });

grokChatSchema.index({ title: 'text', summary: 'text' });
grokChatSchema.index({ userId: 1, toolId: 1, createdAt: -1 });

// Auto-update messageCount
grokChatSchema.pre('save', function (next) {
  this.messageCount = this.messages.length;
  next();
});

const GrokChat = mongoose.models.GrokChat || mongoose.model('GrokChat', grokChatSchema);
export default GrokChat;