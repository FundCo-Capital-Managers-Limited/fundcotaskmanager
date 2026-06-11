// backend/routes/postRoutes.js
import express from 'express';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';
import Post from '../models/postModel.js';
import authMiddleware from '../middleware/auth.js';
import { uploadFileToIPFS } from '../pinning/pinata.js';
import { createNotification } from '../utils/notificationService.js';

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
const sanitize = (str) => sanitizeHtml(str || '', { allowedTags: [], allowedAttributes: {} }).trim();

const POPULATE_USER = { path: 'user', select: 'firstName lastName otherName _id avatar position role' };
const POPULATE_COMMENTS_USER = { path: 'comments.user', select: 'firstName lastName otherName _id avatar role' };

const ALLOWED_REACTIONS = new Set(['like', 'love', 'haha', 'wow', 'sad', 'fire']);

const getActorName = (user) => {
  if (!user) return 'Someone';
  if (user.fullName) return user.fullName.trim();
  if (user.firstName || user.lastName) return `${user.firstName || ''} ${user.lastName || ''} ${user.otherName || ''}`.trim();
  return user.name || user.email || 'Someone';
};

const cleanText = (value, maxLength = 140) => String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);

const createSocialNotification = async (req, post, title, body) => {
  const ownerId = post?.user?._id || post?.user;
  if (!ownerId || String(ownerId) === String(req.user._id)) return;
  await createNotification({
    userId: ownerId,
    type: 'social',
    title,
    body,
    actorId: req.user._id,
    actorName: getActorName(req.user),
    entityId: post._id,
    entityType: 'Post',
    data: { postId: String(post._id) },
    io: req.io,
  });
};

const formatPost = (post, currentUserId) => {
  const obj = post.toObject ? post.toObject() : post;
  // Aggregate reactions into counts + current user's reaction
  const reactionCounts = {};
  let myReaction = null;
  if (obj.reactions) {
    const entries = obj.reactions instanceof Map
      ? Array.from(obj.reactions.entries())
      : Object.entries(obj.reactions);
    for (const [uid, emoji] of entries) {
      reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
      if (currentUserId && uid.toString() === currentUserId.toString()) {
        myReaction = emoji;
      }
    }
  }
  const isBookmarked = currentUserId && (obj.bookmarkedBy || []).some(
    id => id.toString() === currentUserId.toString()
  );
  return {
    ...obj,
    reactionCounts,
    myReaction,
    totalReactions: Object.values(reactionCounts).reduce((s, n) => s + n, 0),
    commentCount: (obj.comments || []).length,
    isBookmarked: !!isBookmarked,
  };
};

const emitPostEvent = (req, event, data) => {
  try { req.io?.emit(event, data); } catch {}
};

// ── CREATE POST (now accepts announcement fields) ─────────────────────────────
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, fileUrl, contentType, isAnnouncement, announcementScope } = req.body;

    const clean = sanitize(content);
    if (!clean && !fileUrl) {
      return res.status(400).json({ success: false, message: 'Post must have content or a file' });
    }
    if (clean && clean.length > 2000) {
      return res.status(400).json({ success: false, message: 'Content exceeds 2000 characters' });
    }

    const post = new Post({
      user: req.user._id,
      content: clean,
      fileUrl,
      contentType,
      // NEW announcement fields
      isAnnouncement: isAnnouncement === true,
      announcementScope: announcementScope || '',
    });

    await post.save();
    await post.populate([POPULATE_USER, POPULATE_COMMENTS_USER]);

    const formatted = formatPost(post, req.user._id);
    emitPostEvent(req, 'post:new', formatted);

    res.status(201).json({ success: true, post: formatted });
  } catch (err) {
    console.error('Create post error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
});

// ── Get posts (paginated, with optional search & filter) ─────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(20, parseInt(req.query.limit) || 10);
    const search   = sanitize(req.query.search);
    const filter   = req.query.filter; // 'mine' | 'bookmarked' | 'media' | undefined
    const userId   = req.user._id;

    const query = {};
    if (search) query.$text = { $search: search };
    if (filter === 'mine') query.user = userId;
    if (filter === 'bookmarked') query.bookmarkedBy = userId;
    if (filter === 'media') query.fileUrl = { $exists: true, $ne: '' };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate([POPULATE_USER, POPULATE_COMMENTS_USER])
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean({ virtuals: false }),
      Post.countDocuments(query),
    ]);

    // Format each post
    const formatted = posts.map(p => {
      const reactionCounts = {};
      let myReaction = null;
      if (p.reactions) {
        const entries = p.reactions instanceof Map
          ? Array.from(p.reactions.entries())
          : Object.entries(p.reactions);
        for (const [uid, emoji] of entries) {
          reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
          if (uid.toString() === userId.toString()) myReaction = emoji;
        }
      }
      const isBookmarked = (p.bookmarkedBy || []).some(id => id.toString() === userId.toString());
      return {
        ...p,
        reactionCounts,
        myReaction,
        totalReactions: Object.values(reactionCounts).reduce((s, n) => s + n, 0),
        commentCount: (p.comments || []).length,
        isBookmarked,
      };
    });

    res.json({
      success: true,
      posts: formatted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit), hasMore: page * limit < total },
    });
  } catch (err) {
    console.error('Fetch posts error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
});

// ── Get single post ───────────────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid post ID' });

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate([POPULATE_USER, POPULATE_COMMENTS_USER]);

    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, post: formatPost(post, req.user._id) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch post' });
  }
});

// ── UPDATE POST (now supports announcement fields) ─────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { content, fileUrl, contentType, isAnnouncement, announcementScope } = req.body;

    const clean = sanitize(content);
    if (clean !== undefined) post.content = clean;
    if (fileUrl !== undefined) {
      post.fileUrl = fileUrl;
      post.contentType = contentType || '';
    }

    // NEW announcement fields (only admins should normally set these)
    if (isAnnouncement !== undefined) post.isAnnouncement = isAnnouncement === true;
    if (announcementScope !== undefined) post.announcementScope = announcementScope || '';

    post.edited = true;
    await post.save();
    await post.populate([POPULATE_USER, POPULATE_COMMENTS_USER]);

    const formatted = formatPost(post, req.user._id);
    emitPostEvent(req, 'post:updated', formatted);

    res.json({ success: true, post: formatted });
  } catch (err) {
    console.error('Update post error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update post' });
  }
});
// ── Delete post ───────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid post ID' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    if (post.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    await post.deleteOne();
    emitPostEvent(req, 'post:deleted', { _id: req.params.id });
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
});

// ── React to post ─────────────────────────────────────────────────────────────
// PUT /api/posts/:id/react  { emoji: 'like'|'love'|'haha'|'wow'|'sad'|'fire' }
// Sending the same emoji again removes it (toggle)
router.put('/:id/react', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid post ID' });

    const { emoji } = req.body;
    if (!ALLOWED_REACTIONS.has(emoji))
      return res.status(400).json({ success: false, message: 'Invalid reaction' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const uid = req.user._id.toString();
    const existing = post.reactions.get(uid);

    if (existing === emoji) {
      post.reactions.delete(uid);          // toggle off
    } else {
      post.reactions.set(uid, emoji);      // set / change
    }
    post.markModified('reactions');
    await post.save();
    await post.populate([POPULATE_USER, POPULATE_COMMENTS_USER]);

    const formatted = formatPost(post, req.user._id);
    if (existing !== emoji) {
      await createSocialNotification(
        req,
        post,
        `${getActorName(req.user)} reacted to your post`,
        cleanText(formatted?.content) || `${getActorName(req.user)} left a ${emoji} reaction on your post.`
      );
    }
    emitPostEvent(req, 'post:updated', formatted);
    res.json({ success: true, post: formatted });
  } catch (err) {
    console.error('React error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to react' });
  }
});

// ── Add comment ───────────────────────────────────────────────────────────────
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid post ID' });

    const content = sanitize(req.body.content);
    if (!content || content.length > 500)
      return res.status(400).json({ success: false, message: 'Comment must be 1-500 characters' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    post.comments.push({ user: req.user._id, content });
    await post.save();
    await post.populate([POPULATE_USER, POPULATE_COMMENTS_USER]);

    const formatted = formatPost(post, req.user._id);
    await createSocialNotification(
      req,
      post,
      `${getActorName(req.user)} commented on your post`,
      cleanText(content)
    );
    emitPostEvent(req, 'post:updated', formatted);
    res.status(201).json({ success: true, post: formatted });
  } catch (err) {
    console.error('Comment error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
});

// ── Delete comment ────────────────────────────────────────────────────────────
router.delete('/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    comment.deleteOne();
    await post.save();
    await post.populate([POPULATE_USER, POPULATE_COMMENTS_USER]);

    const formatted = formatPost(post, req.user._id);
    emitPostEvent(req, 'post:updated', formatted);
    res.json({ success: true, post: formatted });
  } catch (err) {
    console.error('Delete comment error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
});

// ── Bookmark toggle ───────────────────────────────────────────────────────────
router.put('/:id/bookmark', authMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid post ID' });

    const uid = req.user._id;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const idx = post.bookmarkedBy.indexOf(uid);
    if (idx === -1) { post.bookmarkedBy.push(uid); }
    else { post.bookmarkedBy.splice(idx, 1); }
    await post.save();
    await post.populate([POPULATE_USER, POPULATE_COMMENTS_USER]);

    res.json({ success: true, post: formatPost(post, uid), isBookmarked: idx === -1 });
  } catch (err) {
    console.error('Bookmark error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to bookmark' });
  }
});

// ── Upload media ──────────────────────────────────────────────────────────────
router.post('/upload', authMiddleware, async (req, res) => {
  try {
    if (!req.files?.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const file = req.files.file;
    if (file.size > 50 * 1024 * 1024) return res.status(400).json({ success: false, message: 'File exceeds 50 MB' });
    const cid = await uploadFileToIPFS(file.data, file.name, file.mimetype);
    const fileUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const contentType = file.mimetype.startsWith('image/') ? 'image'
      : file.mimetype.startsWith('video/') ? 'video' : 'application';
    res.json({ success: true, fileUrl, contentType });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

export default router;