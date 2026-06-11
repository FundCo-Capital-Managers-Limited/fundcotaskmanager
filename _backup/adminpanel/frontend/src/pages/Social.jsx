import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Heart,
  Image as ImageIcon,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Video,
} from 'lucide-react';
import api from '../utils/api.js';
import userApi from '../utils/userApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { EmptyState, FilterChip, LoadingScreen, PageHeader, Panel, SearchInput, StatusPill } from '../components/ui.jsx';
import { formatPersonName, getInitials } from '../utils/adminFormat.js';

const FILTER_ITEMS = [
  { value: '', label: 'All Content' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'media', label: 'Media' },
];

const Avatar = ({ user }) => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] text-xs font-black text-white" style={{ background: 'var(--brand-primary)' }}>
    {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : getInitials(user)}
  </div>
);

const normalizePost = (post, currentUserId) => {
  const reactionCounts = {};
  const reactions = post?.reactions instanceof Map
    ? Array.from(post.reactions.entries())
    : Object.entries(post?.reactions || {});
  let myReaction = post?.myReaction || null;

  reactions.forEach(([userId, reaction]) => {
    if (!reaction) return;
    reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1;
    if (!myReaction && currentUserId && String(userId) === String(currentUserId)) {
      myReaction = reaction;
    }
  });

  return {
    ...post,
    comments: Array.isArray(post?.comments) ? post.comments : [],
    reactionCounts: Object.keys(post?.reactionCounts || {}).length ? post.reactionCounts : reactionCounts,
    myReaction,
    totalReactions: Number(post?.totalReactions || Object.values(reactionCounts).reduce((sum, value) => sum + value, 0)),
  };
};

const LikeButton = ({ active, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-[0.75rem] border px-3 py-2 text-sm font-bold transition-colors"
    style={active
      ? { background: 'var(--brand-primary-soft)', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }
      : { background: 'var(--c-panel-subtle)', borderColor: 'var(--c-border)', color: 'var(--c-text-soft)' }}
  >
    <Heart className="h-4 w-4" fill={active ? 'currentColor' : 'none'} />
    <span>{count || 0}</span>
  </button>
);

const CommentComposer = ({ value, onChange, onSubmit, busy }) => (
  <div className="flex items-center gap-2 rounded-[0.9rem] border px-3 py-2" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
    <input
      value={value}
      onChange={onChange}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onSubmit();
        }
      }}
      className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
      style={{ color: 'var(--c-text)' }}
      placeholder="Write a comment..."
      maxLength={500}
    />
    <button
      type="button"
      onClick={onSubmit}
      disabled={busy || !value.trim()}
      className="btn-ghost h-9 w-9 rounded-[0.7rem] p-0"
      aria-label="Add comment"
    >
      {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
    </button>
  </div>
);

const Social = () => {
  const { user, hasRole } = useAuth();
  const { markTypeRead, refresh: refreshNotifications } = useNotifications();
  const canPostOrgWide = hasRole('executive', 'admin');
  const currentUserId = user?._id || user?.id;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [feedScope, setFeedScope] = useState('all');
  const [announcement, setAnnouncement] = useState('');
  const [scope, setScope] = useState(canPostOrgWide ? 'all' : 'team');
  const [posting, setPosting] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [busyCommentId, setBusyCommentId] = useState('');
  const [busyLikeId, setBusyLikeId] = useState('');

  useEffect(() => {
    if (!canPostOrgWide) setScope('team');
  }, [canPostOrgWide]);

  useEffect(() => {
    markTypeRead?.('social');
  }, [markTypeRead]);

  const fetchPosts = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const params = { limit: 50, scope: feedScope };
      if (search) params.search = search;
      if (filter) params.filter = filter;
      const { data } = await api.get('/social', { params });
      setPosts((data.posts || []).map((post) => normalizePost(post, currentUserId)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load posts');
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [currentUserId, feedScope, filter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createAnnouncement = async () => {
    const content = announcement.trim();
    if (!content) {
      toast.error('Announcement content is required');
      return;
    }

    setPosting(true);
    try {
      await api.post('/social/announcement', { content, scope });
      toast.success('Announcement posted');
      setAnnouncement('');
      await fetchPosts(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post announcement');
    } finally {
      setPosting(false);
    }
  };

  const deletePost = async (id) => {
    if (!confirm('Delete this post?')) return;
    try {
      await api.delete('/social/' + id);
      toast.success('Post deleted');
      await fetchPosts(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete post');
    }
  };

  const toggleLike = async (postId) => {
    setBusyLikeId(postId);
    try {
      await userApi.put('/api/posts/' + postId + '/react', { emoji: 'like' });
      await Promise.all([fetchPosts(true), refreshNotifications?.()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update like');
    } finally {
      setBusyLikeId('');
    }
  };

  const addComment = async (postId) => {
    const content = String(commentDrafts[postId] || '').trim();
    if (!content) return;

    setBusyCommentId(postId);
    try {
      await userApi.post('/api/posts/' + postId + '/comments', { content });
      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      await Promise.all([fetchPosts(true), refreshNotifications?.()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setBusyCommentId('');
    }
  };

  const deleteComment = async (postId, commentId) => {
    if (!confirm('Remove this comment?')) return;
    try {
      await api.delete('/social/' + postId + '/comments/' + commentId);
      toast.success('Comment removed');
      await fetchPosts(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove comment');
    }
  };

  const feedScopeLabel = useMemo(
    () => (feedScope === 'team' ? 'Showing updates from your team only.' : 'Showing organization-wide activity.'),
    [feedScope],
  );

  return (
    <div className="page-shell">
      <PageHeader
        title="Social Feed"
        actions={(
          <button type="button" className="btn-secondary" onClick={() => fetchPosts(true)} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </button>
        )}
      />

      <Panel title="Create announcement" subtitle="Broadcast updates to your team or the full organization">
        <div className="space-y-4">
          <textarea
            className="input-base min-h-28"
            value={announcement}
            onChange={(event) => setAnnouncement(event.target.value)}
            placeholder="Write an announcement..."
            maxLength={2000}
          />
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {(canPostOrgWide ? ['all', 'team'] : ['team']).map((item) => (
                <FilterChip key={item} active={scope === item} onClick={() => setScope(item)}>
                  {item === 'all' ? 'Everyone' : 'My Team'}
                </FilterChip>
              ))}
            </div>
            <button className="btn-primary" onClick={createAnnouncement} disabled={posting || !announcement.trim()}>
              <Send className="h-4 w-4" />
              {posting ? 'Posting...' : 'Post announcement'}
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Feed filters" subtitle={feedScopeLabel}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts..." icon={Search} />
          </div>
          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'View All' },
                { value: 'team', label: 'My Team' },
              ].map((item) => (
                <FilterChip key={item.value} active={feedScope === item.value} onClick={() => setFeedScope(item.value)}>
                  {item.label}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTER_ITEMS.map((item) => (
                <FilterChip key={item.label} active={filter === item.value} onClick={() => setFilter(item.value)}>
                  {item.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {loading ? (
        <LoadingScreen height="18rem" />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No posts found"
          description={feedScope === 'team' ? 'Your team has not posted anything yet.' : 'Announcements and social activity will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const likeCount = Number(post.reactionCounts?.like || 0);
            const liked = post.myReaction === 'like';
            const commentText = (post.comments?.length || 0) + ' comment' + (post.comments?.length === 1 ? '' : 's');

            return (
              <section key={post._id} className="surface-panel overflow-hidden">
                <div className="border-b px-4 py-4 lg:px-5" style={{ borderColor: 'var(--c-border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar user={post.user} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>
                            {formatPersonName(post.user)}
                          </p>
                          {post.isAnnouncement ? (
                            <StatusPill tone="brand">
                              <Megaphone className="h-3.5 w-3.5" />
                              {post.announcementScope === 'team' ? 'Team Announcement' : 'Organization Announcement'}
                            </StatusPill>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--c-text-muted)' }}>
                          {post.user?.position || 'Team member'} · {format(new Date(post.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>

                    <button type="button" className="btn-danger h-10 w-10 rounded-[0.75rem] p-0" onClick={() => deletePost(post._id)} aria-label="Delete post">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 px-4 py-4 lg:px-5">
                  {post.content ? (
                    <p className="whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--c-text-soft)' }}>
                      {post.content}
                    </p>
                  ) : null}

                  {post.fileUrl && post.contentType === 'image' ? (
                    <a href={post.fileUrl} target="_blank" rel="noreferrer">
                      <img src={post.fileUrl} alt="" className="max-h-[26rem] w-full rounded-[1rem] object-cover" />
                    </a>
                  ) : null}

                  {post.fileUrl && post.contentType === 'video' ? (
                    <video src={post.fileUrl} controls className="max-h-[26rem] w-full rounded-[1rem] bg-black" />
                  ) : null}

                  {post.fileUrl && !['image', 'video'].includes(post.contentType || '') ? (
                    <a href={post.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-[0.9rem] border px-4 py-3 text-sm font-bold" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text)' }}>
                      <ImageIcon className="h-4 w-4" />
                      <span className="truncate">{post.fileUrl}</span>
                    </a>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <LikeButton
                      active={liked}
                      count={busyLikeId === post._id ? likeCount : likeCount}
                      onClick={() => toggleLike(post._id)}
                    />
                    <div className="inline-flex items-center gap-2 rounded-[0.75rem] border px-3 py-2 text-sm font-bold" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>
                      <MessageSquare className="h-4 w-4" />
                      <span>{commentText}</span>
                    </div>
                    {post.fileUrl && post.contentType === 'image' ? (
                      <div className="inline-flex items-center gap-2 rounded-[0.75rem] border px-3 py-2 text-sm font-bold" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>
                        <ImageIcon className="h-4 w-4" />
                        Media
                      </div>
                    ) : null}
                    {post.fileUrl && post.contentType === 'video' ? (
                      <div className="inline-flex items-center gap-2 rounded-[0.75rem] border px-3 py-2 text-sm font-bold" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)', color: 'var(--c-text-soft)' }}>
                        <Video className="h-4 w-4" />
                        Video
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--c-border)' }}>
                    {(post.comments || []).map((comment) => (
                      <div key={comment._id} className="flex items-start gap-3 rounded-[0.9rem] border px-3 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-subtle)' }}>
                        <Avatar user={comment.user} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black" style={{ color: 'var(--c-text)' }}>
                              {formatPersonName(comment.user)}
                            </p>
                            <span className="text-[0.68rem] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--c-text-faint)' }}>
                              {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6" style={{ color: 'var(--c-text-soft)' }}>
                            {comment.content}
                          </p>
                        </div>
                        <button type="button" className="btn-danger h-9 w-9 rounded-[0.7rem] p-0" onClick={() => deleteComment(post._id, comment._id)} aria-label="Delete comment">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <CommentComposer
                      value={commentDrafts[post._id] || ''}
                      onChange={(event) => setCommentDrafts((current) => ({ ...current, [post._id]: event.target.value }))}
                      onSubmit={() => addComment(post._id)}
                      busy={busyCommentId === post._id}
                    />
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Social;
