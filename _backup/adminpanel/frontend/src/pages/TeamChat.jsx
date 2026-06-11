import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import {
  Check,
  Copy,
  Edit2,
  FileText,
  Forward,
  Image,
  MessageSquare,
  Paperclip,
  Pin,
  PinOff,
  Plus,
  Reply,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import userApi, { USER_API_BASE } from '../utils/userApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import { EmptyState, FilterChip, LoadingScreen, Modal, PageHeader, SearchInput, StatusPill } from '../components/ui.jsx';
import { formatPersonName, getInitials } from '../utils/adminFormat.js';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'MMM d, h:mm a');
};

const formatLastSeen = (value) => {
  if (!value) return 'Last seen unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Last seen unavailable';
  return `Last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
};

const EMPTY_MENTION_STATE = { query: '', start: -1, end: -1, activeIndex: 0 };

const escapeMentionPattern = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findMentionMatch = (value, caretIndex) => {
  const nextValue = String(value || '');
  const safeCaret = Number.isFinite(caretIndex) ? caretIndex : nextValue.length;
  const beforeCaret = nextValue.slice(0, safeCaret);
  const match = /(^|\s)@([^\s@]*)$/.exec(beforeCaret);
  if (!match) return null;
  const query = match[2] || '';
  const start = beforeCaret.lastIndexOf(`@${query}`);
  if (start < 0) return null;
  return { query, start, end: safeCaret, activeIndex: 0 };
};

const normalizeDraftMentions = (value, mentions = []) => {
  const text = String(value || '');
  const seen = new Set();
  return (Array.isArray(mentions) ? mentions : []).reduce((accumulator, item) => {
    const userId = item?.userId || item?.user?._id || item?._id || item?.id;
    const label = String(item?.label || item?.name || item?.fullName || '').trim();
    if (!userId || !label || !text.includes(`@${label}`)) return accumulator;
    const key = String(userId);
    if (seen.has(key)) return accumulator;
    seen.add(key);
    accumulator.push({ userId: key, label });
    return accumulator;
  }, []);
};

const renderMentionContent = (message, own) => {
  const text = String(message?.content || '');
  const mentions = Array.isArray(message?.mentions) ? message.mentions.filter((item) => item?.label) : [];
  if (!mentions.length) {
    return <p className="whitespace-pre-wrap text-sm leading-6">{text}</p>;
  }

  const tokens = [...new Set(mentions.map((item) => `@${item.label}`))]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  if (!tokens.length) {
    return <p className="whitespace-pre-wrap text-sm leading-6">{text}</p>;
  }

  const pattern = new RegExp(`(${tokens.map(escapeMentionPattern).join('|')})`, 'g');
  const parts = text.split(pattern).filter(Boolean);

  return (
    <p className="whitespace-pre-wrap text-sm leading-6">
      {parts.map((part, index) => {
        const matched = mentions.find((item) => part.toLowerCase() === `@${String(item.label).toLowerCase()}`);
        if (!matched) return <React.Fragment key={index}>{part}</React.Fragment>;
        return (
          <span
            key={index}
            className="rounded px-1 py-0.5 font-semibold"
            style={{
              background: own ? 'rgba(255,255,255,0.16)' : 'var(--brand-primary-soft)',
              color: own ? '#ffffff' : 'var(--brand-primary)',
            }}
          >
            {part}
          </span>
        );
      })}
    </p>
  );
};

const getPresenceLabel = (person) => {
  if (!person) return 'Direct message';
  if (person.online) return 'Online';
  return formatLastSeen(person.lastActive);
};

const getMessageText = (message) => {
  if (!message) return 'No messages yet';
  if (message.isDeleted) return 'This message was deleted';
  if (message.content) return message.content;
  if (message.fileUrl) return message.fileName || 'Attachment';
  return 'Message';
};

const Avatar = ({ user, tone = 'var(--brand-primary)' }) => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.8rem] text-xs font-black text-white" style={{ background: tone }}>
    {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : getInitials(user)}
  </div>
);

const TeamChat = () => {
  const { user } = useAuth();
  const { counts, refresh: refreshNotifications, markTypeRead } = useNotifications();
  const currentUserId = user?._id || user?.id;
  const [mode, setMode] = useState('individual');
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userChatMap, setUserChatMap] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [timestamps, setTimestamps] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draftMentions, setDraftMentions] = useState([]);
  const [mentionState, setMentionState] = useState(EMPTY_MENTION_STATE);
  const [groupModal, setGroupModal] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await userApi.get('/api/chats/init');
      setUsers((data.users || []).filter((item) => String(item._id) !== String(currentUserId)));
      setGroups(data.groups || []);
      setUserChatMap(data.userChatMap || {});
      setLastMessages(data.lastMessages || {});
      setTimestamps(data.timestamps || {});
      setUnreadCounts(data.unreadCounts || {});
      refreshNotifications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load team chat');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, refreshNotifications]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const markRead = useCallback(async (chatId) => {
    if (!chatId) return;
    const hadUnread = Number(unreadCounts[chatId]) > 0;
    setUnreadCounts((current) => {
      const copy = { ...current };
      delete copy[chatId];
      return copy;
    });
    try {
      await userApi.post(`/api/chats/${chatId}/read`);
    } catch {
    } finally {
      if (hadUnread) refreshNotifications();
    }
  }, [refreshNotifications, unreadCounts]);

  const fetchMessages = useCallback(async (chatId, silent = false) => {
    if (!chatId) return;
    if (!silent) setMessageLoading(true);
    try {
      const { data } = await userApi.get(`/api/chats/${chatId}/messages`, { params: { limit: 80, page: 1 } });
      const nextMessages = data.messages || [];
      setMessages(nextMessages);
      const newest = nextMessages[nextMessages.length - 1];
      if (newest) {
        setLastMessages((current) => ({ ...current, [chatId]: newest }));
        setTimestamps((current) => ({ ...current, [chatId]: newest.createdAt }));
      }
      await markRead(chatId);
    } catch (error) {
      if (!silent) toast.error(error.response?.data?.message || 'Failed to load messages');
    } finally {
      if (!silent) setMessageLoading(false);
    }
  }, [markRead]);

  const fetchPinned = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const { data } = await userApi.get(`/api/chats/${chatId}/pinned`);
      setPinnedMessages(data.pinnedMessages || []);
    } catch {
      setPinnedMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedChat?._id) return undefined;
    fetchMessages(selectedChat._id);
    fetchPinned(selectedChat._id);
    const timer = setInterval(() => fetchMessages(selectedChat._id, true), 5000);
    return () => clearInterval(timer);
  }, [selectedChat?._id, fetchMessages, fetchPinned]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedChat?._id]);

  useEffect(() => {
    if (selectedChat?._id) {
      markTypeRead?.('chat');
    }
  }, [markTypeRead, selectedChat?._id]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return undefined;

    const socket = io(USER_API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    const applyPresence = ({ userId, online, lastActive }) => {
      const updatePerson = (person) => (
        String(person?._id) === String(userId) ? { ...person, online, lastActive } : person
      );

      setUsers((current) => current.map(updatePerson));
      setGroups((current) => current.map((group) => ({
        ...group,
        members: (group.members || []).map(updatePerson),
      })));
      setSelectedChat((current) => {
        if (!current) return current;
        if (current.type === 'individual' && String(current.recipient?._id) === String(userId)) {
          return { ...current, recipient: updatePerson(current.recipient) };
        }
        if (current.type === 'group') {
          return { ...current, members: (current.members || []).map(updatePerson) };
        }
        return current;
      });
    };

    socket.on('presence:update', applyPresence);
    return () => {
      socket.off('presence:update', applyPresence);
      socket.disconnect();
    };
  }, []);

  const selectIndividual = async (recipient) => {
    try {
      setMessageLoading(true);
      const knownChatId = userChatMap[recipient._id];
      if (knownChatId) setSelectedChat({ _id: knownChatId, type: 'individual', recipient, members: [recipient] });
      const { data } = await userApi.post('/api/chats/individual', { recipientId: recipient._id });
      const chat = data.chat;
      const other = chat.members?.find((member) => String(member._id) !== String(currentUserId)) || recipient;
      setUserChatMap((current) => ({ ...current, [recipient._id]: chat._id }));
      setSelectedChat({ ...chat, type: 'individual', recipient: other });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open chat');
    } finally {
      setMessageLoading(false);
    }
  };

  const selectGroup = (group) => {
    setSelectedChat({ ...group, type: 'group' });
  };

  const mentionCandidates = useMemo(() => {
    if (selectedChat?.type !== 'group') return [];
    return (selectedChat.members || [])
      .filter((member) => String(member?._id) !== String(currentUserId))
      .map((member) => ({ userId: member._id, label: formatPersonName(member) }))
      .filter((member) => member.userId && member.label);
  }, [currentUserId, selectedChat]);

  const visibleMentionOptions = useMemo(() => {
    if (mentionState.start < 0) return [];
    const query = mentionState.query.trim().toLowerCase();
    return mentionCandidates
      .filter((member) => !query || member.label.toLowerCase().includes(query))
      .slice(0, 6);
  }, [mentionCandidates, mentionState]);

  const chooseMention = useCallback((option) => {
    if (!option) return;
    const token = `@${option.label}`;
    const nextValue = `${draft.slice(0, mentionState.start)}${token} ${draft.slice(mentionState.end)}`;
    setDraft(nextValue);
    setDraftMentions((current) => normalizeDraftMentions(nextValue, [...current, option]));
    setMentionState(EMPTY_MENTION_STATE);
  }, [draft, mentionState]);

  const uploadFile = async () => {
    if (!file) return {};
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await userApi.post('/api/chats/upload', form);
      return data;
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedChat?._id) return;
    const content = draft.trim();
    if (!content && !file && !editing) return;

    const resolvedMentions = normalizeDraftMentions(draft, draftMentions);

    try {
      if (editing) {
        await userApi.put(`/api/chats/messages/${editing._id}`, { content });
        setEditing(null);
      } else {
        const upload = await uploadFile();
        await userApi.post(`/api/chats/${selectedChat._id}/messages`, {
          content,
          fileUrl: upload.fileUrl || '',
          contentType: upload.contentType || '',
          fileName: upload.fileName || file?.name || '',
          replyTo: replyTo?._id || null,
          mentions: resolvedMentions,
        });
        setReplyTo(null);
      }
      setDraft('');
      setDraftMentions([]);
      setMentionState(EMPTY_MENTION_STATE);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await fetchMessages(selectedChat._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  const createGroup = async ({ name, members }) => {
    if (!members.length) return toast.error('Select at least one member');
    try {
      const { data } = await userApi.post('/api/chats/groups', { name: name.trim() || 'Unnamed Group', members });
      setGroups((current) => (current.some((group) => group._id === data.group?._id) ? current : [...current, data.group]));
      setGroupModal(null);
      toast.success('Group created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };

  const addMembers = async ({ members }) => {
    if (!selectedChat?._id || !members.length) return toast.error('Select at least one member');
    try {
      const { data } = await userApi.put(`/api/chats/groups/${selectedChat._id}/members`, { members });
      if (data.group) {
        setGroups((current) => current.map((group) => (group._id === data.group._id ? data.group : group)));
        setSelectedChat((current) => ({ ...current, ...data.group, type: 'group' }));
      }
      setGroupModal(null);
      toast.success('Members added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add members');
    }
  };

  const deleteMessage = async (message) => {
    const own = String(message.sender?._id || message.sender) === String(currentUserId);
    const everyone = own && confirm('Delete for everyone? Choose Cancel to delete only for you.');
    try {
      if (everyone) await userApi.delete(`/api/chats/messages/${message._id}`, { data: { deleteScope: 'everyone' } });
      else await userApi.post(`/api/chats/messages/${message._id}/delete`, { deleteScope: 'me' });
      await fetchMessages(selectedChat._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const togglePin = async (message) => {
    const isPinned = pinnedMessages.some((item) => item._id === message._id);
    try {
      if (isPinned) await userApi.delete(`/api/chats/messages/${message._id}/pin`);
      else await userApi.post(`/api/chats/messages/${message._id}/pin`);
      await fetchPinned(selectedChat._id);
      toast.success(isPinned ? 'Message unpinned' : 'Message pinned');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update pin');
    }
  };

  const forwardToChats = async (targetChatIds) => {
    if (!forwardMessage || !targetChatIds.length) return;
    try {
      await userApi.post(`/api/chats/messages/${forwardMessage._id}/forward`, { targetChatIds });
      toast.success('Message forwarded');
      setForwardMessage(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to forward message');
    }
  };

  const sortedUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...users]
      .filter((item) => !q || formatPersonName(item).toLowerCase().includes(q) || item.email?.toLowerCase().includes(q))
      .sort((a, b) => {
        const aChat = userChatMap[a._id];
        const bChat = userChatMap[b._id];
        const aTime = timestamps[aChat] || lastMessages[aChat]?.createdAt;
        const bTime = timestamps[bChat] || lastMessages[bChat]?.createdAt;
        if (aTime && bTime) return new Date(bTime) - new Date(aTime);
        if (aTime) return -1;
        if (bTime) return 1;
        return formatPersonName(a).localeCompare(formatPersonName(b));
      });
  }, [users, search, userChatMap, timestamps, lastMessages]);

  const sortedGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...groups]
      .filter((item) => !q || item.name?.toLowerCase().includes(q))
      .sort((a, b) => {
        const aTime = timestamps[a._id] || lastMessages[a._id]?.createdAt;
        const bTime = timestamps[b._id] || lastMessages[b._id]?.createdAt;
        if (aTime && bTime) return new Date(bTime) - new Date(aTime);
        if (aTime) return -1;
        if (bTime) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [groups, search, timestamps, lastMessages]);

  const filteredMessages = useMemo(() => {
    const q = messageSearch.trim().toLowerCase();
    return messages.filter((message) => !q || getMessageText(message).toLowerCase().includes(q));
  }, [messages, messageSearch]);

  const localUnread = useMemo(() => Object.values(unreadCounts).reduce((sum, count) => sum + (Number(count) || 0), 0), [unreadCounts]);
  const totalUnread = counts.chat || localUnread;

  if (loading) return <LoadingScreen />;

  return (
    <div className="page-shell">
      <PageHeader
        title="Team Communication"
        actions={
          <>
            <button className="btn-secondary" onClick={fetchInitial}>Refresh</button>
            <button className="btn-primary" onClick={() => setGroupModal({ type: 'create' })}>
              <Plus className="h-4 w-4" />
              New Group
            </button>
          </>
        }
        aside={<StatusPill tone="secondary">{totalUnread} unread</StatusPill>}
      />

      <section className="surface-panel overflow-hidden">
        <div className="grid min-h-[calc(100vh-14rem)] lg:grid-cols-[21rem_1fr]">
          <aside className="border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--c-border)' }}>
            <div className="space-y-4 p-4">
              <div className="flex gap-2">
                <FilterChip active={mode === 'individual'} onClick={() => setMode('individual')}>Chats</FilterChip>
                <FilterChip active={mode === 'group'} onClick={() => setMode('group')}>Groups</FilterChip>
              </div>
              <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={mode === 'group' ? 'Search groups...' : 'Search people...'} icon={Search} />
            </div>
            <div className="max-h-[44rem] overflow-y-auto px-3 pb-4">
              {(mode === 'individual' ? sortedUsers : sortedGroups).length === 0 ? (
                <p className="px-4 py-10 text-center text-sm" style={{ color: 'var(--c-text-muted)' }}>No conversations found</p>
              ) : mode === 'individual' ? sortedUsers.map((person) => {
                const chatId = userChatMap[person._id];
                const last = lastMessages[chatId];
                const unread = unreadCounts[chatId] || 0;
                const active = selectedChat?.type === 'individual' && selectedChat?.recipient?._id === person._id;
                return (
                  <ChatListItem
                    key={person._id}
                    title={formatPersonName(person)}
                    subtitle={getMessageText(last)}
                    time={formatTime(timestamps[chatId] || last?.createdAt)}
                    unread={unread}
                    active={active}
                    avatar={<Avatar user={person} />}
                    presence={getPresenceLabel(person)}
                    online={person.online}
                    onClick={() => selectIndividual(person)}
                  />
                );
              }) : sortedGroups.map((group) => {
                const last = lastMessages[group._id];
                const unread = unreadCounts[group._id] || 0;
                const active = selectedChat?._id === group._id;
                return (
                  <ChatListItem
                    key={group._id}
                    title={group.name || 'Unnamed Group'}
                    subtitle={getMessageText(last)}
                    time={formatTime(timestamps[group._id] || last?.createdAt)}
                    unread={unread}
                    active={active}
                    avatar={<Avatar user={{ firstName: group.name || 'G' }} tone="var(--brand-secondary)" />}
                    presence={`${group.members?.length || 0} members`}
                    online={false}
                    onClick={() => selectGroup(group)}
                  />
                );
              })}
            </div>
          </aside>

          <main className="flex min-h-[38rem] flex-col">
            {selectedChat ? (
              <>
                <div className="flex flex-col gap-4 border-b p-4 xl:flex-row xl:items-center xl:justify-between" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel-muted)' }}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar user={selectedChat.type === 'group' ? { firstName: selectedChat.name || 'G' } : selectedChat.recipient} tone={selectedChat.type === 'group' ? 'var(--brand-secondary)' : 'var(--brand-primary)'} />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black" style={{ color: 'var(--c-text)' }}>{selectedChat.type === 'group' ? selectedChat.name : formatPersonName(selectedChat.recipient)}</h2>
                      <p className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--c-text-muted)' }}>
                        {selectedChat.type === 'group' ? `${selectedChat.members?.length || 0} members` : (
                          <>
                            <span className="h-2 w-2 rounded-full" style={{ background: selectedChat.recipient?.online ? 'var(--c-success)' : 'var(--c-text-faint)' }} />
                            <span>{getPresenceLabel(selectedChat.recipient)}</span>
                            {selectedChat.recipient?.position ? <span>- {selectedChat.recipient.position}</span> : null}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-full min-w-[16rem] xl:w-80">
                      <SearchInput value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search messages..." icon={Search} />
                    </div>
                    {selectedChat.type === 'group' ? <button className="btn-secondary" onClick={() => setGroupModal({ type: 'add' })}><Plus className="h-4 w-4" />Add</button> : null}
                  </div>
                </div>

                {pinnedMessages.length ? (
                  <div className="border-b px-4 py-3" style={{ borderColor: 'var(--c-border)', background: 'var(--brand-primary-soft)' }}>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold" style={{ color: 'var(--brand-primary)' }}>
                      <Pin className="h-4 w-4" />
                      {pinnedMessages.slice(-3).map((message) => (
                        <button key={message._id} className="rounded-full bg-white/55 px-3 py-1" onClick={() => togglePin(message)}>
                          {getMessageText(message).slice(0, 42)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--c-bg)' }}>
                  {messageLoading && messages.length === 0 ? (
                    <LoadingScreen height="20rem" />
                  ) : filteredMessages.length === 0 ? (
                    <EmptyState icon={MessageSquare} title="No messages yet" description="Start the conversation from the composer below." />
                  ) : (
                    <div className="space-y-3">
                      {filteredMessages.map((message) => (
                        <MessageRow
                          key={message._id}
                          message={message}
                          own={String(message.sender?._id || message.sender) === String(currentUserId)}
                          isPinned={pinnedMessages.some((item) => item._id === message._id)}
                          onReply={() => { setReplyTo(message); setEditing(null); setMentionState(EMPTY_MENTION_STATE); }}
                          onEdit={() => { setEditing(message); setDraft(message.content || ''); setDraftMentions((message.mentions || []).map((item) => ({ userId: item.user?._id || item.userId || item._id, label: item.label || formatPersonName(item.user) }))); setReplyTo(null); setMentionState(EMPTY_MENTION_STATE); }}
                          onDelete={() => deleteMessage(message)}
                          onPin={() => togglePin(message)}
                          onForward={() => setForwardMessage(message)}
                        />
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>

                <div className="border-t p-4" style={{ borderColor: 'var(--c-border)' }}>
                  {replyTo ? <ComposerNotice label={`Replying to ${formatPersonName(replyTo.sender)}`} text={getMessageText(replyTo)} onClear={() => setReplyTo(null)} /> : null}
                  {editing ? <ComposerNotice label="Editing message" text={editing.content} onClear={() => { setEditing(null); setDraft(''); setDraftMentions([]); setMentionState(EMPTY_MENTION_STATE); }} /> : null}
                  {file ? <ComposerNotice label="Attachment ready" text={`${file.name} (${Math.round(file.size / 1024)} KB)`} onClear={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} /> : null}
                  <div className="relative flex items-end gap-2">
                    <button className="btn-secondary h-12 w-12 rounded-full p-0" onClick={() => fileRef.current?.click()} aria-label="Attach file">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input ref={fileRef} type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                    <textarea
                      className="input-base min-h-12 flex-1 resize-none"
                      rows={1}
                      value={draft}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setDraft(nextValue);
                        setDraftMentions((current) => normalizeDraftMentions(nextValue, current));
                        if (selectedChat?.type === 'group') {
                          const nextMatch = findMentionMatch(nextValue, event.target.selectionStart ?? nextValue.length);
                          setMentionState(nextMatch ? { ...nextMatch, activeIndex: 0 } : EMPTY_MENTION_STATE);
                        } else {
                          setMentionState(EMPTY_MENTION_STATE);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (visibleMentionOptions.length) {
                          if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setMentionState((current) => ({ ...current, activeIndex: (current.activeIndex + 1) % visibleMentionOptions.length }));
                            return;
                          }
                          if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            setMentionState((current) => ({ ...current, activeIndex: current.activeIndex <= 0 ? visibleMentionOptions.length - 1 : current.activeIndex - 1 }));
                            return;
                          }
                          if (event.key === 'Enter' || event.key === 'Tab') {
                            event.preventDefault();
                            chooseMention(visibleMentionOptions[Math.min(mentionState.activeIndex, visibleMentionOptions.length - 1)]);
                            return;
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setMentionState(EMPTY_MENTION_STATE);
                            return;
                          }
                        }
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={editing ? 'Edit your message...' : selectedChat?.type === 'group' ? 'Type a message... Use @ to mention someone' : 'Type a message...'}
                    />
                    {visibleMentionOptions.length ? (
                      <div className="absolute bottom-full left-14 right-14 mb-2 overflow-hidden rounded-[0.9rem] border" style={{ borderColor: 'var(--c-border)', background: 'var(--c-panel)', boxShadow: 'var(--shadow-md)' }}>
                        {visibleMentionOptions.map((option, index) => (
                          <button
                            key={option.userId}
                            type="button"
                            onClick={() => chooseMention(option)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
                            style={index === mentionState.activeIndex ? { background: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' } : { color: 'var(--c-text)' }}
                          >
                            <Avatar user={{ firstName: option.label }} tone="var(--brand-secondary)" />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button className="btn-primary h-12 w-12 rounded-full p-0" onClick={sendMessage} disabled={uploading || (!draft.trim() && !file)}>
                      {uploading ? '...' : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState icon={MessageSquare} title="Choose a conversation" description="Open a direct chat or group to begin messaging from the admin workspace." />
              </div>
            )}
          </main>
        </div>
      </section>

      <GroupModal
        open={!!groupModal}
        mode={groupModal?.type}
        users={users}
        existingMembers={groupModal?.type === 'add' ? selectedChat?.members || [] : []}
        onClose={() => setGroupModal(null)}
        onSubmit={groupModal?.type === 'add' ? addMembers : createGroup}
      />
      <ForwardModal
        open={!!forwardMessage}
        message={forwardMessage}
        users={users}
        groups={groups}
        userChatMap={userChatMap}
        onClose={() => setForwardMessage(null)}
        onSubmit={forwardToChats}
      />
    </div>
  );
};

const ChatListItem = ({ title, subtitle, time, unread, active, avatar, onClick, presence, online }) => (
  <button
    type="button"
    onClick={onClick}
    className="mb-2 flex w-full items-center gap-3 rounded-[0.85rem] border p-2.5 text-left transition-colors"
    style={{ borderColor: active ? 'var(--brand-primary)' : 'var(--c-border)', background: active ? 'var(--brand-primary-soft)' : 'var(--c-panel)' }}
  >
    {avatar}
    <span className="min-w-0 flex-1">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{title}</span>
        {time ? <span className="shrink-0 text-[11px]" style={{ color: 'var(--c-text-faint)' }}>{time}</span> : null}
      </span>
      <span className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs" style={{ color: 'var(--c-text-muted)' }}>{subtitle}</span>
        {unread ? <span className="badge" style={{ minHeight: 20, background: 'var(--c-success)', color: '#fff' }}>{unread > 99 ? '99+' : unread}</span> : null}
      </span>
      {presence ? (
        <span className="mt-1 flex items-center gap-1.5 truncate text-[11px]" style={{ color: online ? 'var(--c-success)' : 'var(--c-text-faint)' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: online ? 'var(--c-success)' : 'var(--c-text-faint)' }} />
          {presence}
        </span>
      ) : null}
    </span>
  </button>
);

const MessageRow = ({ message, own, isPinned, onReply, onEdit, onDelete, onPin, onForward }) => (
  <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[78%] rounded-[1.25rem] border p-3 shadow-sm ${own ? 'rounded-tr-sm' : 'rounded-tl-sm'}`} style={{ borderColor: 'var(--c-border)', background: own ? 'var(--brand-primary)' : 'var(--c-panel)', color: own ? '#fff' : 'var(--c-text)' }}>
      {!own ? <p className="mb-1 text-xs font-black" style={{ color: 'var(--brand-secondary)' }}>{formatPersonName(message.sender)}</p> : null}
      {message.replyTo ? (
        <div className="mb-2 rounded-[0.9rem] border-l-4 px-3 py-2 text-xs" style={{ borderColor: 'var(--brand-secondary)', background: own ? 'rgba(255,255,255,0.12)' : 'var(--c-panel-subtle)' }}>
          <p className="font-black">{formatPersonName(message.replyTo.sender)}</p>
          <p className="mt-1 opacity-80">{message.replyTo.content || 'Attachment'}</p>
        </div>
      ) : null}
      {message.isDeleted ? (
        <p className="text-sm italic opacity-70">This message was deleted</p>
      ) : (
        <>
          {message.content ? renderMentionContent(message, own) : null}
          {message.fileUrl ? <AttachmentPreview message={message} own={own} /> : null}
        </>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-[11px]" style={{ color: own ? 'rgba(255,255,255,0.72)' : 'var(--c-text-faint)' }}>
        {message.isEdited ? <span>edited</span> : null}
        <span>{formatTime(message.createdAt)}</span>
        {isPinned ? <Pin className="h-3 w-3" /> : null}
      </div>
      {!message.isDeleted ? (
        <div className="mt-3 flex flex-wrap justify-end gap-1">
          <MiniAction title="Reply" icon={Reply} onClick={onReply} own={own} />
          {own ? <MiniAction title="Edit" icon={Edit2} onClick={onEdit} own={own} /> : null}
          <MiniAction title={isPinned ? 'Unpin' : 'Pin'} icon={isPinned ? PinOff : Pin} onClick={onPin} own={own} />
          <MiniAction title="Forward" icon={Forward} onClick={onForward} own={own} />
          {message.content ? <MiniAction title="Copy" icon={Copy} onClick={() => { navigator.clipboard.writeText(message.content); toast.success('Copied'); }} own={own} /> : null}
          <MiniAction title="Delete" icon={Trash2} onClick={onDelete} own={own} danger />
        </div>
      ) : null}
    </div>
  </div>
);

const AttachmentPreview = ({ message, own }) => {
  const label = message.fileName || 'Attachment';
  if (message.contentType === 'image') {
    return <a href={message.fileUrl} target="_blank" rel="noreferrer"><img src={message.fileUrl} alt={label} className="mt-2 max-h-80 rounded-[1rem] object-contain" /></a>;
  }
  if (message.contentType === 'video') {
    return <video src={message.fileUrl} controls className="mt-2 max-h-80 rounded-[1rem] bg-black" />;
  }
  return (
    <a href={message.fileUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-[1rem] border px-3 py-3 text-sm font-bold" style={{ borderColor: own ? 'rgba(255,255,255,0.28)' : 'var(--c-border)', background: own ? 'rgba(255,255,255,0.12)' : 'var(--c-panel-subtle)' }}>
      {message.contentType === 'image' ? <Image className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      <span className="truncate">{label}</span>
    </a>
  );
};

const MiniAction = ({ title, icon: Icon, onClick, own, danger }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
    style={{ background: own ? 'rgba(255,255,255,0.13)' : 'var(--c-panel-subtle)', color: danger ? 'var(--c-danger)' : own ? '#fff' : 'var(--c-text-soft)' }}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);

const ComposerNotice = ({ label, text, onClear }) => (
  <div className="mb-3 flex items-center gap-3 rounded-[1rem] border-l-4 px-4 py-3" style={{ borderColor: 'var(--brand-secondary)', background: 'var(--c-panel-subtle)' }}>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-black" style={{ color: 'var(--brand-secondary)' }}>{label}</p>
      <p className="truncate text-sm" style={{ color: 'var(--c-text-muted)' }}>{text}</p>
    </div>
    <button className="btn-ghost h-8 w-8 rounded-full p-0" onClick={onClear}><X className="h-4 w-4" /></button>
  </div>
);

const GroupModal = ({ open, mode, users, existingMembers, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const existingIds = useMemo(() => new Set(existingMembers.map((member) => member._id || member)), [existingMembers]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setQuery('');
    setSelected([]);
  }, [open]);

  const filtered = users.filter((item) => !existingIds.has(item._id)).filter((item) => {
    const q = query.trim().toLowerCase();
    return !q || formatPersonName(item).toLowerCase().includes(q) || item.email?.toLowerCase().includes(q);
  });

  return (
    <Modal open={open} onClose={onClose} title={mode === 'add' ? 'Add group members' : 'Create group'} width="max-w-2xl">
      <div className="space-y-4">
        {mode !== 'add' ? (
          <div>
            <label className="label">Group name</label>
            <input className="input-base" value={name} onChange={(event) => setName(event.target.value)} placeholder="Leadership updates" />
          </div>
        ) : null}
        <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people..." icon={Search} />
        <SelectableUsers users={filtered} selected={selected} onToggle={(id) => setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))} />
        <button className="btn-primary w-full" onClick={() => onSubmit({ name, members: selected })} disabled={!selected.length}>
          {mode === 'add' ? 'Add members' : 'Create group'}
        </button>
      </div>
    </Modal>
  );
};

const ForwardModal = ({ open, message, users, groups, userChatMap, onClose, onSubmit }) => {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setQuery('');
  }, [open]);

  const chats = useMemo(() => {
    const individual = users.map((item) => ({ id: userChatMap[item._id], title: formatPersonName(item), subtitle: item.email })).filter((item) => item.id);
    const groupChats = groups.map((item) => ({ id: item._id, title: item.name || 'Unnamed Group', subtitle: `${item.members?.length || 0} members` }));
    const q = query.trim().toLowerCase();
    return [...individual, ...groupChats].filter((item) => !q || item.title.toLowerCase().includes(q));
  }, [users, groups, userChatMap, query]);

  return (
    <Modal open={open} onClose={onClose} title="Forward message" subtitle={message ? getMessageText(message).slice(0, 120) : ''} width="max-w-2xl">
      <div className="space-y-4">
        <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats..." icon={Search} />
        <div className="max-h-72 overflow-y-auto rounded-[1.25rem] border" style={{ borderColor: 'var(--c-border)' }}>
          {chats.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--c-text-muted)' }}>No chats available</p>
          ) : chats.map((chat) => {
            const active = selected.includes(chat.id);
            return (
              <button key={chat.id} type="button" className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0" style={{ borderColor: 'var(--c-border)', background: active ? 'var(--brand-primary-soft)' : 'transparent' }} onClick={() => setSelected((current) => (current.includes(chat.id) ? current.filter((item) => item !== chat.id) : [...current, chat.id]))}>
                <span className="flex h-9 w-9 items-center justify-center rounded-[1rem] text-xs font-black text-white" style={{ background: active ? 'var(--brand-primary)' : 'var(--brand-secondary)' }}>{chat.title.slice(0, 1)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{chat.title}</span>
                  <span className="block truncate text-xs" style={{ color: 'var(--c-text-muted)' }}>{chat.subtitle}</span>
                </span>
                {active ? <Check className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} /> : null}
              </button>
            );
          })}
        </div>
        <button className="btn-primary w-full" disabled={!selected.length} onClick={() => onSubmit(selected)}>Forward</button>
      </div>
    </Modal>
  );
};

const SelectableUsers = ({ users, selected, onToggle }) => (
  <div className="max-h-72 overflow-y-auto rounded-[1.25rem] border" style={{ borderColor: 'var(--c-border)' }}>
    {users.length === 0 ? (
      <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--c-text-muted)' }}>No users available</p>
    ) : users.map((item) => {
      const active = selected.includes(item._id);
      return (
        <button key={item._id} type="button" className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0" style={{ borderColor: 'var(--c-border)', background: active ? 'var(--brand-primary-soft)' : 'transparent' }} onClick={() => onToggle(item._id)}>
          <Avatar user={item} tone={active ? 'var(--brand-primary)' : 'var(--brand-secondary)'} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black" style={{ color: 'var(--c-text)' }}>{formatPersonName(item)}</span>
            <span className="block truncate text-xs" style={{ color: 'var(--c-text-muted)' }}>{item.position || item.email}</span>
          </span>
          {active ? <Check className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} /> : null}
        </button>
      );
    })}
  </div>
);

export default TeamChat;

