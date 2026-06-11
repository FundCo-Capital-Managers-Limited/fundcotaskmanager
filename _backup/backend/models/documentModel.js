// backend/models/documentModel.js
import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  originalFileId: { // Reference to fileModel _id (uploaded PDF)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  },
  fullText: { // Raw full text from PDF
    type: String,
    default: '',
  },
  extractedText: { // Meaningful extracted content
    type: String,
    default: '',
  },
  pptJson: { // Generated PPT structure as JSON
    type: Object,
    default: null,
  },
  templateFileId: { // Reference to selected template file
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    default: null,
  },
  grokChatId: { // Link to GrokChat for history (for both raw and meaningful)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GrokChat',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
documentSchema.index({ userId: 1, createdAt: -1 });

const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
export default Document;