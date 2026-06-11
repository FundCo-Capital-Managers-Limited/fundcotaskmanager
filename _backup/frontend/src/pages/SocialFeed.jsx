// src/pages/SocialFeed.jsx
// Complete rebuild — reactions, comments, bookmarks, search, filters, real-time
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import moment from 'moment-timezone';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import {
  Send, Image, Video, FileText, Smile, Edit2, Trash2, X,
  Bookmark, BookmarkCheck, MessageCircle, ChevronDown, ChevronUp,
  Search, Filter, Loader2, MoreHorizontal, Eye, Flame,
  Heart, ThumbsUp, Laugh, AlertCircle, Sparkles, RefreshCw,
  Megaphone, Shield,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext.jsx';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4001';
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ── Helpers ───────────────────────────────────────────────────────────────────
const getFullName = (u) => {
  if (!u) return 'Unknown';
  if (u.fullName) return u.fullName.trim();
  if (u.firstName || u.lastName) return `${u.firstName||''} ${u.lastName||''} ${u.otherName||''}`.trim();
  return u.name?.trim() || 'Unknown';
};
const getInitial = (u) => (u?.firstName || u?.name || 'U').charAt(0).toUpperCase();

const REACTIONS = [
  { key: 'like',  emoji: '👍', label: 'Like',      color: '#312783' },
  { key: 'love',  emoji: '❤️', label: 'Love',      color: '#e11d48' },
  { key: 'haha',  emoji: '😂', label: 'Haha',      color: '#f59e0b' },
  { key: 'wow',   emoji: '😮', label: 'Wow',       color: '#8b5cf6' },
  { key: 'sad',   emoji: '😢', label: 'Sad',       color: '#3b82f6' },
  { key: 'fire',  emoji: '🔥', label: 'Fire',      color: '#f97316' },
];

const REACTION_MAP = Object.fromEntries(REACTIONS.map(r => [r.key, r]));

const FILTERS = [
  { key: '',           label: 'All Posts' },
  { key: 'mine',       label: 'My Posts' },
  { key: 'bookmarked', label: 'Bookmarked' },
  { key: 'media',      label: 'Media Only' },
];

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 9 }) => (
  <div className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}
    style={{ backgroundColor: 'var(--brand-primary)', fontSize: size <= 8 ? 13 : 16 }}>
    {getInitial(user)}
  </div>
);

// ── Reaction Bar ──────────────────────────────────────────────────────────────
const ReactionBar = ({ post, onReact }) => {
  const [show, setShow] = useState(false);
  const ref = useRef();
  const myReaction = post.myReaction ? REACTION_MAP[post.myReaction] : null;

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseEnter={() => setShow(true)}
        onClick={() => myReaction ? onReact(myReaction.key) : setShow(p => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
        style={{
          backgroundColor: myReaction ? 'var(--brand-light)' : 'var(--bg-subtle)',
          color: myReaction ? myReaction.color : 'var(--text-secondary)',
        }}
        onMouseLeave={() => setTimeout(() => setShow(false), 300)}>
        <span className="text-base leading-none">{myReaction ? myReaction.emoji : '👍'}</span>
        <span style={{ color: myReaction ? myReaction.color : 'var(--text-secondary)' }}>
          {myReaction ? myReaction.label : 'React'}
        </span>
        {post.totalReactions > 0 && (
          <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
            {post.totalReactions}
          </span>
        )}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setTimeout(() => setShow(false), 200)}
            className="absolute bottom-full mb-2 left-0 flex items-center gap-1 px-3 py-2 rounded-2xl border shadow-xl z-20"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            {REACTIONS.map(r => (
              <button key={r.key} onClick={() => { onReact(r.key); setShow(false); }}
                className="flex flex-col items-center gap-0.5 group px-1"
                title={r.label}>
                <span className="text-2xl group-hover:scale-125 transition-transform leading-none">{r.emoji}</span>
                <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>{r.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Reaction Summary ──────────────────────────────────────────────────────────
const ReactionSummary = ({ counts }) => {
  const entries = Object.entries(counts).filter(([, n]) => n > 0).sort(([, a], [, b]) => b - a);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, n]) => s + n, 0);
  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
      <div className="flex -space-x-0.5">
        {entries.slice(0, 3).map(([key]) => (
          <span key={key} className="text-sm leading-none">{REACTION_MAP[key]?.emoji}</span>
        ))}
      </div>
      <span>{total}</span>
    </div>
  );
};

// ── Comment section ───────────────────────────────────────────────────────────
const CommentSection = ({ post, currentUser, onAddComment, onDeleteComment }) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await onAddComment(post._id, text.trim());
    setText('');
    setSubmitting(false);
  };
  return (
    <div className="mt-4 space-y-3">
      {/* Existing comments */}
      {(post.comments || []).map(c => (
        <div key={c._id} className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            {getInitial(c.user)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-block rounded-xl rounded-tl-none px-3 py-2 max-w-full"
              style={{ backgroundColor: 'var(--bg-subtle)' }}>
              <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {getFullName(c.user)}
              </p>
              <p className="text-sm break-words" style={{ color: 'var(--text-primary)' }}>{c.content}</p>
            </div>
            <p className="text-[10px] mt-1 ml-1" style={{ color: 'var(--text-muted)' }}>
              {moment(c.createdAt).fromNow()}
            </p>
          </div>
          {c.user?._id?.toString() === (currentUser?._id || currentUser?.id)?.toString() && (
            <button onClick={() => onDeleteComment(post._id, c._id)}
              className="p-1 rounded-lg flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 hover:opacity-100"
              style={{ color: '#dc2626' }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      {/* New comment input */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: 'var(--brand-primary)' }}>
          {getInitial(currentUser)}
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder="Write a comment…"
            maxLength={500}
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text-primary)' }} />
          <button onClick={submit} disabled={!text.trim() || submitting}
            className="flex-shrink-0 disabled:opacity-40"
            style={{ color: 'var(--brand-primary)' }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Post Card ─────────────────────────────────────────────────────────────────
const PostCard = ({ post, currentUser, onReact, onEdit, onDelete, onBookmark, onAddComment, onDeleteComment }) => {
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const menuRef = useRef();
  const isOwn = post.user?._id?.toString() === (currentUser?._id || currentUser?.id)?.toString();
  const isAnnouncement = post.isAnnouncement;
  const authorRole = post.user?.position || '';
  const isAdminAuthor = ['team-lead', 'executive', 'admin'].includes(post.user?.role);

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: isAnnouncement ? 'rgba(37,99,235,0.3)' : 'var(--border-color)',
        borderWidth: isAnnouncement ? '2px' : '1px',
      }}>

      {/* NEW: Announcement banner */}
      {isAnnouncement && (
        <div className="px-5 py-2 flex items-center gap-2"
          style={{ backgroundColor: 'rgba(37,99,235,0.06)', borderBottom: '1px solid rgba(37,99,235,0.15)' }}>
          <Megaphone className="w-4 h-4" style={{ color: '#2563eb' }} />
          <span className="text-xs font-bold" style={{ color: '#2563eb' }}>
            {post.announcementScope === 'team' ? 'Team Announcement' : 'Organization Announcement'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`}
            style={{ backgroundColor: isAdminAuthor ? '#1e3a5f' : 'var(--brand-primary)', fontSize: 16 }}>
            {(post.user?.firstName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{getFullName(post.user)}</p>
              {/* NEW: Admin role badge */}
              {isAdminAuthor && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(30,58,95,0.1)', color: '#1e3a5f' }}>
                  <Shield className="w-2.5 h-2.5" />
                  {post.user?.role === 'admin' ? 'Admin' : post.user?.role === 'executive' ? 'Exec' : 'Lead'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{moment(post.createdAt).fromNow()}</span>
              {post.edited && <span className="italic">· edited</span>}
              {post.views > 0 && <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {post.views}</span>}
            </div>
          </div>
        </div>
        <div ref={menuRef} className="relative flex-shrink-0">
          <button onClick={() => setShowMenu(p => !p)} className="p-1.5 rounded-xl" style={{ color: 'var(--text-muted)' }}>
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="absolute right-0 top-full mt-1 w-44 rounded-xl border shadow-xl z-20 overflow-hidden"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
                <button onClick={() => { onBookmark(post._id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {post.isBookmarked
                    ? <><BookmarkCheck className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} /> Saved</>
                    : <><Bookmark className="w-4 h-4" /> Save post</>}
                </button>
                {isOwn && <>
                  <div className="h-px mx-3" style={{ backgroundColor: 'var(--border-color)' }} />
                  <button onClick={() => { onEdit(post); setShowMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Edit2 className="w-4 h-4" /> Edit post
                  </button>
                  <button onClick={() => { onDelete(post._id); setShowMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm" style={{ color: '#dc2626' }}>
                    <Trash2 className="w-4 h-4" /> Delete post
                  </button>
                </>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-5 pb-4 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text-primary)', fontWeight: isAnnouncement ? 500 : 400 }}>
          {post.content}
        </p>
      )}

      {/* Media */}
      {post.fileUrl && (
        <div className="mb-3">
          {post.contentType === 'image' && (
            <>
              <img src={post.fileUrl} alt="Post media" loading="lazy"
                className="w-full max-h-96 object-cover cursor-pointer hover:opacity-95"
                onClick={() => setLightbox(true)} />
              <AnimatePresence>
                {lightbox && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,.9)' }} onClick={() => setLightbox(false)}>
                    <img src={post.fileUrl} alt="Full" className="max-w-full max-h-full rounded-xl object-contain" />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
          {post.contentType === 'video' && <video src={post.fileUrl} controls className="w-full max-h-96 bg-black" />}
          {post.contentType === 'application' && (
            <div className="mx-5 mb-4 flex items-center gap-3 p-4 rounded-xl border"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              <FileText className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>Document attached</p>
              </div>
              <a href={post.fileUrl} target="_blank" rel="noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}>Open</a>
            </div>
          )}
        </div>
      )}

      {/* Reaction summary + comment count */}
      {(post.totalReactions > 0 || post.commentCount > 0) && (
        <div className="flex items-center justify-between px-5 py-2 border-t border-b"
          style={{ borderColor: 'var(--border-color)' }}>
          <ReactionSummary counts={post.reactionCounts || {}} />
          {post.commentCount > 0 && (
            <button onClick={() => setShowComments(p => !p)}
              className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 px-4 py-3">
        <ReactionBar post={post} onReact={(emoji) => onReact(post._id, emoji)} />
        <button onClick={() => setShowComments(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: showComments ? 'var(--brand-light)' : 'var(--bg-subtle)', color: showComments ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
          <MessageCircle className="w-4 h-4" /> Comment
        </button>
        <button onClick={() => onBookmark(post._id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: post.isBookmarked ? 'var(--brand-light)' : 'var(--bg-subtle)', color: post.isBookmarked ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>
          {post.isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>

      {/* Comments */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-5 pb-4">
            <CommentSection post={post} currentUser={currentUser}
              onAddComment={onAddComment} onDeleteComment={onDeleteComment} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Create/Edit Post Composer ──────────────────────────────────────────────────
const PostComposer = ({ user, editPost = null, onSubmit, onCancel, uploading, posting }) => {
  const [content, setContent]     = useState(editPost?.content || '');
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef   = useRef();
  const emojiRef  = useRef();
  const isEdit    = !!editPost;

  useEffect(() => {
    const h = e => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { toast.error('File exceeds 50 MB'); return; }
    setFile(f);
    if (f.type.startsWith('image/') || f.type.startsWith('video/')) setPreview(URL.createObjectURL(f));
    else setPreview(null);
    e.target.value = '';
  };

  const submit = () => {
    if (!content.trim() && !file && !editPost?.fileUrl) return;
    onSubmit({ content, file, existingFileUrl: editPost?.fileUrl, existingContentType: editPost?.contentType });
  };

  const canSubmit = (content.trim() || file || (isEdit && editPost.fileUrl)) && !posting && !uploading;

  const inp = {
    backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)', borderRadius: 12,
  };

  return (
    <div className="rounded-2xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-start gap-3">
        <Avatar user={user} size={10} />
        <div className="flex-1 space-y-3">
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder={isEdit ? 'Edit your post…' : "What's on your mind?"}
            rows={3} maxLength={2000}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
            style={inp}
            onFocus={e => e.target.style.borderColor = 'var(--brand-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />

          {/* File preview */}
          {(file || (isEdit && editPost.fileUrl)) && (
            <div className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              {preview && file?.type.startsWith('image/') && (
                <img src={preview} alt="preview" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              )}
              {preview && file?.type.startsWith('video/') && (
                <video src={preview} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
              )}
              {!preview && (
                <FileText className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
              )}
              <span className="text-xs truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                {file?.name || 'Attached file'}
              </span>
              <button onClick={() => { setFile(null); setPreview(null); }} style={{ color: '#dc2626' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Emoji */}
              <div ref={emojiRef} className="relative">
                <button onClick={() => setShowEmoji(p => !p)}
                  className="p-2 rounded-xl transition-colors"
                  style={{ color: 'var(--brand-accent)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <Smile className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {showEmoji && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="absolute left-0 bottom-full mb-2 z-30">
                      <EmojiPicker onEmojiClick={e => { setContent(p => p + e.emoji); setShowEmoji(false); }}
                        theme="auto" emojiStyle="native" skinTonesDisabled
                        style={{ borderColor: 'var(--border-color)' }} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Attach */}
              <button onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--brand-accent)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Image className="w-5 h-5" />
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--brand-accent)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <Video className="w-5 h-5" />
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--brand-accent)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                <FileText className="w-5 h-5" />
              </button>
              <input ref={fileRef} type="file" className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={handleFile} />
              <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                {content.length}/2000
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isEdit && (
                <button onClick={onCancel}
                  className="px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  Cancel
                </button>
              )}
              <button onClick={submit} disabled={!canSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--brand-primary)' }}>
                {(posting || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isEdit ? 'Save' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
const SocialFeed = () => {
  const { user } = useOutletContext();
  const { markTypeRead } = useNotifications();
  const [posts, setPosts]             = useState([]);
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [posting, setPosting]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [filter, setFilter]           = useState('');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editPost, setEditPost]       = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [newCount, setNewCount]       = useState(0);
  const socketRef = useRef(null);
  const loaderRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    markTypeRead?.('social');
  }, [markTypeRead]);

  // ── Socket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(API, { auth: { token: localStorage.getItem('token') } });
    socketRef.current = socket;

    socket.on('post:new', (post) => {
      const isOwn = post.user?._id?.toString() === (user?._id || user?.id)?.toString();
      setPosts(prev => {
        if (prev.find(p => p._id === post._id)) return prev;
        return [post, ...prev];
      });
      if (!isOwn) {
        setNewCount(p => p + 1);
        toast.custom(t => (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg cursor-pointer max-w-sm"
            style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}
            onClick={() => { toast.dismiss(t.id); window.scrollTo({top:0,behavior:'smooth'}); setNewCount(0); }}>
            <Avatar user={post.user} size={8} />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color:'var(--text-primary)' }}>{getFullName(post.user)}</p>
              <p className="text-xs truncate" style={{ color:'var(--text-muted)' }}>
                {post.content ? post.content.slice(0,50)+'…' : '📎 Shared a file'}
              </p>
            </div>
          </motion.div>
        ), { duration:5000, position:'bottom-right' });
      }
    });

    socket.on('post:updated', (updated) => {
      setPosts(prev => prev.map(p => p._id === updated._id ? updated : p));
    });

    socket.on('post:deleted', ({ _id }) => {
      setPosts(prev => prev.filter(p => p._id !== _id));
    });

    return () => { socket.disconnect(); };
  }, [user]);

  // ── Fetch posts ──────────────────────────────────────────────────────────
  const fetchPosts = useCallback(async (pg = 1, reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: 10 });
      if (filter) params.set('filter', filter);
      if (search) params.set('search', search);
      const r = await axios.get(`${API}/api/posts?${params}`, { headers: headers() });
      const data = r.data;
      setPosts(prev => reset || pg === 1 ? data.posts : [...prev, ...data.posts.filter(np => !prev.find(p => p._id === np._id))]);
      setPagination(data.pagination);
      setPage(pg);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load posts');
    } finally { setLoading(false); }
  }, [filter, search]);

  useEffect(() => { fetchPosts(1, true); }, [filter, search]);

  // ── Infinite scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination?.hasMore && !loading) {
        fetchPosts(page + 1);
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [pagination, loading, page, fetchPosts]);

  // ── Search debounce ──────────────────────────────────────────────────────
  const handleSearchInput = e => {
    setSearchInput(e.target.value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(e.target.value), 500);
  };

  // ── Upload helper ────────────────────────────────────────────────────────
  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await axios.post(`${API}/api/posts/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data', ...headers() },
      });
      return r.data;
    } finally { setUploading(false); }
  };

  // ── Create post ──────────────────────────────────────────────────────────
  const handleCreate = async ({ content, file }) => {
    setPosting(true);
    try {
      let fileUrl = '', contentType = '';
      if (file) { const u = await uploadFile(file); fileUrl = u.fileUrl; contentType = u.contentType; }
      await axios.post(`${API}/api/posts`, { content, fileUrl, contentType }, { headers: headers() });
      toast.success('Posted!');
      setNewCount(0);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to post');
    } finally { setPosting(false); }
  };

  // ── Edit post ────────────────────────────────────────────────────────────
  const handleEdit = async ({ content, file, existingFileUrl, existingContentType }) => {
    if (!editPost) return;
    setPosting(true);
    try {
      let fileUrl = existingFileUrl || '', contentType = existingContentType || '';
      if (file) { const u = await uploadFile(file); fileUrl = u.fileUrl; contentType = u.contentType; }
      await axios.put(`${API}/api/posts/${editPost._id}`, { content, fileUrl, contentType }, { headers: headers() });
      setEditPost(null);
      toast.success('Updated!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update');
    } finally { setPosting(false); }
  };

  // ── Delete post ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${API}/api/posts/${deleteId}`, { headers: headers() });
      setDeleteId(null);
      toast.success('Deleted');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  // ── React ────────────────────────────────────────────────────────────────
  const handleReact = async (postId, emoji) => {
    try {
      await axios.put(`${API}/api/posts/${postId}/react`, { emoji }, { headers: headers() });
    } catch { toast.error('Failed to react'); }
  };

  // ── Bookmark ─────────────────────────────────────────────────────────────
  const handleBookmark = async (postId) => {
    try {
      const r = await axios.put(`${API}/api/posts/${postId}/bookmark`, {}, { headers: headers() });
      toast.success(r.data.isBookmarked ? 'Saved!' : 'Removed from saved');
    } catch { toast.error('Failed'); }
  };

  // ── Comment ──────────────────────────────────────────────────────────────
  const handleAddComment = async (postId, content) => {
    try {
      await axios.post(`${API}/api/posts/${postId}/comments`, { content }, { headers: headers() });
    } catch { toast.error('Failed to comment'); }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await axios.delete(`${API}/api/posts/${postId}/comments/${commentId}`, { headers: headers() });
    } catch { toast.error('Failed to delete comment'); }
  };

  return (
    <div className="space-y-5 py-4 max-w-2xl mx-auto">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
             Social Connect
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Share updates</p>
        </div>
        <button onClick={() => fetchPosts(1, true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input value={searchInput} onChange={handleSearchInput}
            placeholder="Search posts…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text-primary)' }} />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }} style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-subtle)' }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={filter === f.key
                ? { backgroundColor: 'var(--brand-primary)', color: '#fff' }
                : { color: 'var(--text-secondary)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* New posts banner */}
      <AnimatePresence>
        {newCount > 0 && (
          <motion.button initial={{ opacity:0,y:-12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-12 }}
            onClick={() => { window.scrollTo({top:0,behavior:'smooth'}); setNewCount(0); }}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--brand-primary)' }}>
            <Flame className="w-4 h-4" />
            {newCount} new {newCount === 1 ? 'post' : 'posts'} — tap to view
          </motion.button>
        )}
      </AnimatePresence>

      {/* Composer or edit */}
      {editPost ? (
        <PostComposer user={user} editPost={editPost}
          onSubmit={handleEdit} onCancel={() => setEditPost(null)}
          uploading={uploading} posting={posting} />
      ) : (
        <PostComposer user={user} onSubmit={handleCreate}
          uploading={uploading} posting={posting} />
      )}

      {/* Feed */}
      <div className="space-y-4">
        {posts.length === 0 && !loading && (
          <div className="text-center py-16 rounded-2xl border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
            <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
              {search || filter ? 'No posts match your search' : 'No posts yet'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {!search && !filter && 'Be the first to share something!'}
            </p>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {posts.map(post => (
            <PostCard key={post._id} post={post} currentUser={user}
              onReact={handleReact}
              onEdit={setEditPost}
              onDelete={setDeleteId}
              onBookmark={handleBookmark}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
            />
          ))}
        </AnimatePresence>

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="h-4" />
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-primary)' }} />
          </div>
        )}
        {!loading && pagination && !pagination.hasMore && posts.length > 0 && (
          <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>
            You're all caught up ✓
          </p>
        )}
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              className="fixed inset-0 z-40" style={{ backgroundColor:'rgba(0,0,0,.5)' }}
              onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity:0,scale:.95 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0,scale:.95 }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
              style={{ backgroundColor:'var(--bg-surface)', borderColor:'var(--border-color)' }}>
              <h3 className="font-bold text-base mb-2" style={{ color:'var(--text-primary)' }}>Delete Post?</h3>
              <p className="text-sm mb-5" style={{ color:'var(--text-secondary)' }}>This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                  style={{ borderColor:'var(--border-color)', color:'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor:'#dc2626' }}>
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialFeed;