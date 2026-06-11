// backend/models/fileModel.js
import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  fileName:    { type: String, required: true, trim: true },
  cid:         { type: String, required: true },
  size:        { type: Number, required: true },
  type:        { type: String, required: true },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  folderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  taskId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Task',   default: null },
  taskTitle:   { type: String, default: null },
  tags:        { type: [String], default: [] },
  starred:     { type: Boolean, default: false },
  deleted:     { type: Boolean, default: false },
  deletedAt:   { type: Date,    default: null },
  shareLink:   { type: String,  default: null },
  shareExpires:{ type: Date,    default: null },
}, { timestamps: true });

fileSchema.index({ owner: 1, deleted: 1, createdAt: -1 });
fileSchema.index({ owner: 1, folderId: 1, deleted: 1 });
fileSchema.index({ cid: 1 }, { unique: false });

const File = mongoose.models.File || mongoose.model('File', fileSchema);
export default File;