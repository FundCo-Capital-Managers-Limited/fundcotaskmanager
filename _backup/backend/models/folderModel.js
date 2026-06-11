// backend/models/folderModel.js
import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'user',   required: true },
  color:    { type: String, default: null }, // optional folder colour tag
}, { timestamps: true });

folderSchema.index({ owner: 1, parentId: 1, createdAt: -1 });

const Folder = mongoose.models.Folder || mongoose.model('Folder', folderSchema);
export default Folder;