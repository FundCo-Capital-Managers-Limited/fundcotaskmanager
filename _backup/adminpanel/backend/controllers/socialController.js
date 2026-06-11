import Post from '../models/postModel.js';
import sanitizeHtml from 'sanitize-html';

const sanitize = (str) => sanitizeHtml(str || '', { allowedTags: [], allowedAttributes: {} }).trim();

const POPULATE_USER = { path: 'user', select: 'firstName lastName otherName _id avatar position role' };
const POPULATE_COMMENTS = { path: 'comments.user', select: 'firstName lastName otherName _id avatar role' };

const formatPost = (post, currentUserId) => {
  const obj = post?.toObject ? post.toObject() : post;
  const reactionCounts = {};
  let myReaction = null;
  const reactionEntries = obj?.reactions instanceof Map
    ? Array.from(obj.reactions.entries())
    : Object.entries(obj?.reactions || {});

  reactionEntries.forEach(([userId, reaction]) => {
    if (!reaction) return;
    reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1;
    if (currentUserId && String(userId) === String(currentUserId)) {
      myReaction = reaction;
    }
  });

  return {
    ...obj,
    reactionCounts,
    myReaction,
    totalReactions: Object.values(reactionCounts).reduce((sum, value) => sum + value, 0),
    commentCount: Array.isArray(obj?.comments) ? obj.comments.length : 0,
  };
};

export const getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, filter, scope = 'all' } = req.query;
    const query = {};
    const viewScope = scope === 'team' ? 'team' : 'all';

    if (search) query.$text = { $search: search };
    if (filter === 'announcements') query.isAnnouncement = true;
    if (filter === 'media') query.fileUrl = { $exists: true, $ne: '' };

    if (req.teamMemberIds && viewScope === 'team') {
      query.user = { $in: req.teamMemberIds };
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate([POPULATE_USER, POPULATE_COMMENTS])
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Post.countDocuments(query),
    ]);

    res.json({
      success: true,
      posts: posts.map((post) => formatPost(post, req.user._id)),
      total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('getAllPosts error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch posts' });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { content, scope = 'all' } = req.body;
    const clean = sanitize(content);
    if (!clean) return res.status(400).json({ success: false, message: 'Announcement content required' });

    if (req.user.role === 'team-lead' && scope === 'all') {
      return res.status(403).json({ success: false, message: 'Team leads can only post team announcements' });
    }

    const post = new Post({
      user: req.user._id,
      content: clean,
      isAnnouncement: true,
      announcementScope: scope,
    });

    await post.save();
    await post.populate([POPULATE_USER, POPULATE_COMMENTS]);

    const formatted = formatPost(post, req.user._id);
    if (req.io) req.io.emit('post:new', formatted);
    res.status(201).json({ success: true, post: formatted });
  } catch (err) {
    console.error('createAnnouncement error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    if (req.user.role === 'team-lead' && req.teamMemberIds) {
      if (!req.teamMemberIds.map(String).includes(String(post.user))) {
        return res.status(403).json({ success: false, message: 'Can only moderate your team posts' });
      }
    }

    await post.deleteOne();
    if (req.io) req.io.emit('post:deleted', { _id: req.params.id });
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    comment.deleteOne();
    await post.save();
    await post.populate([POPULATE_USER, POPULATE_COMMENTS]);

    const formatted = formatPost(post, req.user._id);
    if (req.io) req.io.emit('post:updated', formatted);
    res.json({ success: true, message: 'Comment deleted', post: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
};
