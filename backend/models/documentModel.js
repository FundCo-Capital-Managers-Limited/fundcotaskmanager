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
    default: null,
  },
  sourceFileName: {
    type: String,
    default: '',
  },
  sourceMimeType: {
    type: String,
    default: 'application/pdf',
  },
  sourceSize: {
    type: Number,
    default: 0,
  },
  sourcePages: {
    type: Number,
    default: 0,
  },
  sourceWordCount: {
    type: Number,
    default: 0,
  },
  sourceCharCount: {
    type: Number,
    default: 0,
  },
  ingestMode: {
    type: String,
    enum: ['library-file', 'direct-upload'],
    default: 'library-file',
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
  generationStatus: {
    type: String,
    enum: ['idle', 'queued', 'processing', 'ready', 'failed'],
    default: 'idle',
    index: true,
  },
  generationPhase: {
    type: String,
    default: '',
  },
  generationPercent: {
    type: Number,
    default: 0,
  },
  generationRequestedAt: {
    type: Date,
    default: null,
  },
  generationStartedAt: {
    type: Date,
    default: null,
  },
  generationCompletedAt: {
    type: Date,
    default: null,
  },
  generationError: {
    type: String,
    default: '',
  },
  generationMeta: {
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



