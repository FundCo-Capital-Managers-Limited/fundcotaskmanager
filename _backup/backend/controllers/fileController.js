// backend/controllers/fileController.js
import File   from '../models/fileModel.js';
import Folder from '../models/folderModel.js';
import Task   from '../models/taskModel.js';
import { uploadFileToIPFS } from '../pinning/pinata.js';
import mongoose from 'mongoose';

const ALLOWED_TYPES  = new Set(['pdf','docx','doc','jpg','jpeg','png','mp4','webm','xls','xlsx','ppt','pptx','txt','csv','zip']);
const MAX_FILE_SIZE  = 25  * 1024 * 1024;        // 25 MB per file
const TOTAL_STORAGE  = 2   * 1024 * 1024 * 1024; // 2 GB per user

// ── Storage guard ─────────────────────────────────────────────────────────────
const checkStorage = async (userId, addBytes) => {
  const agg = await File.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId), deleted: false } },
    { $group: { _id: null, total: { $sum: '$size' } } },
  ]);
  const used = agg[0]?.total || 0;
  if (used + addBytes > TOTAL_STORAGE) {
    throw new Error(`Storage limit exceeded. Used: ${(used / 1e9).toFixed(2)} GB / 2 GB`);
  }
  return used;
};

// ── Upload files ──────────────────────────────────────────────────────────────
export const uploadFiles = async (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files provided' });

    const { folderId, taskId, tags } = req.body;
    let tagArray = [];
    try { tagArray = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags).filter(t => t && t.length <= 50) : []; }
    catch { tagArray = []; }

    // Validate folder
    if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, owner: req.user._id });
      if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Validate task
    let taskTitle = null;
    if (taskId) {
      const task = await Task.findOne({ _id: taskId, owner: req.user._id });
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      taskTitle = task.title;
    }

    // Storage check
    const totalSize = req.files.reduce((s, f) => s + f.size, 0);
    await checkStorage(req.user._id, totalSize);

    const results = await Promise.allSettled(req.files.map(async file => {
      const ext = file.originalname.split('.').pop().toLowerCase();
      if (!ALLOWED_TYPES.has(ext))  throw new Error(`Unsupported type: .${ext}`);
      if (file.size > MAX_FILE_SIZE) throw new Error(`${file.originalname} exceeds 25 MB`);

      const cid = await uploadFileToIPFS(file.buffer, file.originalname, file.mimetype);

      const doc = await File.create({
        fileName:  file.originalname,
        cid,
        size:      file.size,
        type:      ext,
        owner:     req.user._id,
        folderId:  folderId || null,
        taskId:    taskId   || null,
        taskTitle,
        tags:      tagArray,
      });

      if (taskId) await Task.findByIdAndUpdate(taskId, { $addToSet: { files: doc._id } });
      return doc;
    }));

    const saved   = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed  = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);

    if (!saved.length) return res.status(400).json({ success: false, message: 'All uploads failed', errors: failed });

    res.status(201).json({ success: true, files: saved, errors: failed.length ? failed : undefined });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get files ─────────────────────────────────────────────────────────────────
export const getFiles = async (req, res) => {
  try {
    const { page = 1, limit = 30, search, type, folderId, trashed, starred, taskId, tags, sort = 'createdAt' } = req.query;
    const query = { owner: req.user._id, deleted: trashed === 'true' };

    if (folderId === 'null' || (!folderId && trashed !== 'true')) query.folderId = null;
    else if (folderId && folderId !== 'null') query.folderId = folderId;

    if (search) query.$or = [
      { fileName: { $regex: search, $options: 'i' } },
      { tags:     { $regex: search, $options: 'i' } },
    ];
    if (type && type !== 'all') {
      const types = type.split(',').map(t => t.trim());
      query.type = { $in: types };
    }
    if (starred === 'true') query.starred = true;
    if (taskId)  query.taskId = taskId;
    if (tags)    query.tags   = { $all: JSON.parse(tags) };

    const sortDir = { createdAt: -1, name: 1, size: -1 }[sort] ?? -1;
    const sortKey = sort === 'name' ? 'fileName' : sort === 'size' ? 'size' : 'createdAt';

    const [files, total] = await Promise.all([
      File.find(query).sort({ [sortKey]: sortDir }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      File.countDocuments(query),
    ]);

    res.json({ success: true, files, total, hasMore: page * limit < total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Soft delete ───────────────────────────────────────────────────────────────
export const deleteFile = async (req, res) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, deleted: false },
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    res.json({ success: true, message: 'Moved to trash' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Permanent delete ──────────────────────────────────────────────────────────
export const permanentDeleteFile = async (req, res) => {
  try {
    const file = await File.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    if (file.taskId) await Task.findByIdAndUpdate(file.taskId, { $pull: { files: file._id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Restore ───────────────────────────────────────────────────────────────────
export const restoreFile = async (req, res) => {
  try {
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id, deleted: true },
      { deleted: false, deletedAt: null },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: 'File not found in trash' });
    res.json({ success: true, file });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Clear trash ───────────────────────────────────────────────────────────────
export const clearTrash = async (req, res) => {
  try {
    const trashed = await File.find({ owner: req.user._id, deleted: true });
    for (const f of trashed) {
      if (f.taskId) await Task.findByIdAndUpdate(f.taskId, { $pull: { files: f._id } });
    }
    await File.deleteMany({ owner: req.user._id, deleted: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Star / unstar ─────────────────────────────────────────────────────────────
export const toggleStar = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    file.starred = !file.starred;
    await file.save();
    res.json({ success: true, starred: file.starred });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Rename ────────────────────────────────────────────────────────────────────
export const renameFile = async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName?.trim()) return res.status(400).json({ success: false, message: 'Name required' });
    const file = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { fileName: fileName.trim() },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    res.json({ success: true, file });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Move files to folder ──────────────────────────────────────────────────────
export const moveFiles = async (req, res) => {
  try {
    const { fileIds, folderId } = req.body;
    if (!Array.isArray(fileIds) || !fileIds.length) return res.status(400).json({ success: false, message: 'No files specified' });

    if (folderId) {
      const folder = await Folder.findOne({ _id: folderId, owner: req.user._id });
      if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    await File.updateMany({ _id: { $in: fileIds }, owner: req.user._id }, { folderId: folderId || null });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Share file ────────────────────────────────────────────────────────────────
export const shareFile = async (req, res) => {
  try {
    const { expiresInDays = 7 } = req.body;
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    const shareLink    = `https://gateway.pinata.cloud/ipfs/${file.cid}`;
    const shareExpires = new Date(Date.now() + expiresInDays * 86400000);
    await File.findByIdAndUpdate(file._id, { shareLink, shareExpires });
    res.json({ success: true, shareLink, shareExpires });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Update tags ───────────────────────────────────────────────────────────────
export const updateTags = async (req, res) => {
  try {
    const { tags } = req.body; // full replacement array
    if (!Array.isArray(tags)) return res.status(400).json({ success: false, message: 'tags must be an array' });
    const clean = tags.filter(t => t && t.length <= 50);
    const file  = await File.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { tags: clean },
      { new: true }
    );
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });
    res.json({ success: true, file });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Associate task ────────────────────────────────────────────────────────────
export const associateTask = async (req, res) => {
  try {
    const { taskId } = req.body;
    let taskTitle = null;
    if (taskId) {
      const task = await Task.findOne({ _id: taskId, owner: req.user._id });
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      taskTitle = task.title;
    }
    const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found' });

    if (file.taskId?.toString() !== taskId) {
      if (file.taskId) await Task.findByIdAndUpdate(file.taskId, { $pull: { files: file._id } });
      if (taskId)      await Task.findByIdAndUpdate(taskId, { $addToSet: { files: file._id } });
    }
    const updatedFile = await File.findByIdAndUpdate(
      file._id,
      { taskId: taskId || null, taskTitle },
      { new: true }
    ).lean();
    res.json({ success: true, file: updatedFile });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ── Storage usage ─────────────────────────────────────────────────────────────
export const getStorageUsage = async (req, res) => {
  try {
    const agg = await File.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(req.user._id), deleted: false } },
      { $group: { _id: null, used: { $sum: '$size' }, count: { $sum: 1 } } },
    ]);
    const used  = agg[0]?.used  || 0;
    const count = agg[0]?.count || 0;
    res.json({ success: true, used, total: TOTAL_STORAGE, count });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
