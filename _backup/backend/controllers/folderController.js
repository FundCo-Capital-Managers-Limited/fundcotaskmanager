// backend/controllers/folderController.js
import Folder from '../models/folderModel.js';
import File   from '../models/fileModel.js';

// ── Recursive delete helper ───────────────────────────────────────────────────
const deleteFolderTree = async (folderId, ownerId) => {
  const children = await Folder.find({ parentId: folderId, owner: ownerId });
  for (const child of children) await deleteFolderTree(child._id, ownerId);
  await File.updateMany({ folderId, owner: ownerId }, { folderId: null }); // orphan files → root
  await Folder.deleteOne({ _id: folderId, owner: ownerId });
};

// ── Create folder ─────────────────────────────────────────────────────────────
export const createFolder = async (req, res) => {
  try {
    const { name, parentId, color } = req.body;

    if (!name?.trim() || name.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid folder name (1–100 chars)' });
    }

    if (parentId) {
      const parent = await Folder.findOne({ _id: parentId, owner: req.user._id });
      if (!parent) return res.status(404).json({ success: false, message: 'Parent folder not found' });
    }

    // Prevent duplicate names in same location
    const exists = await Folder.findOne({
      name: name.trim(), parentId: parentId || null, owner: req.user._id,
    });
    if (exists) return res.status(409).json({ success: false, message: 'A folder with this name already exists here' });

    const folder = await Folder.create({
      name:     name.trim(),
      parentId: parentId || null,
      owner:    req.user._id,
      color:    color || null,
    });

    res.status(201).json({ success: true, folder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get folders ───────────────────────────────────────────────────────────────
// Returns ALL folders for the user (flat list), client builds tree
export const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ owner: req.user._id }).sort({ name: 1 }).lean();
    res.json({ success: true, folders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Rename folder ─────────────────────────────────────────────────────────────
export const renameFolder = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim() || name.trim().length > 100) {
      return res.status(400).json({ success: false, message: 'Invalid folder name' });
    }
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name: name.trim() },
      { new: true }
    );
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    res.json({ success: true, folder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Delete folder ─────────────────────────────────────────────────────────────
// Files inside are moved to root, not permanently deleted
export const deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
    if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    await deleteFolderTree(folder._id, req.user._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get folder file count (for UI badges) ────────────────────────────────────
export const getFolderStats = async (req, res) => {
  try {
    const stats = await File.aggregate([
      { $match: { owner: req.user._id, deleted: false } },
      { $group: { _id: '$folderId', count: { $sum: 1 }, size: { $sum: '$size' } } },
    ]);
    const map = {};
    stats.forEach(s => { map[s._id || 'root'] = { count: s.count, size: s.size }; });
    res.json({ success: true, stats: map });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};