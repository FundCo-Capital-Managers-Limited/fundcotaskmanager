// src/pages/TeamChat.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    Send, Smile, Paperclip, Users, Plus, X, Search, Edit2, Trash2,
    ArrowLeft, ArrowDown, Check, CheckCheck, CornerUpLeft,
    MoreVertical, FileText as FileIcon, Clock, Pin, PinOff,
    Share2, Forward, ChevronDown, Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import toast, { Toaster } from 'react-hot-toast';
import moment from 'moment-timezone';
import { debounce } from 'lodash';
import { useNotifications } from '../context/NotificationContext.jsx';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';
const SOCKET_URL = API_BASE_URL;
const TZ = 'Africa/Lagos';
// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFullName = (user) => {
    if (!user) return 'Unknown';
    if (user.fullName) return user.fullName.trim();
    if (user.firstName || user.lastName)
        return `${user.firstName || ''} ${user.lastName || ''} ${user.otherName || ''}`.trim();
    return user.name?.trim() || 'Unknown';
};
const getInitials = (user) => {
    if (!user) return '?';
    const fullName = getFullName(user);
    if (!fullName || fullName === 'Unknown') return '?';
    const words = fullName.trim().split(/\s+/);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};
const formatChatTime = (ts) => {
    if (!ts) return '';
    const m = moment(ts).tz(TZ);
    if (!m.isValid()) return '';
    const now = moment().tz(TZ);
    const diffDays = now.clone().startOf('day').diff(m.clone().startOf('day'), 'days');
    if (diffDays === 0) return m.format('h:mm A');
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return m.format('ddd');
    return m.format('DD/MM/YY');
};
const formatMsgTime = (ts) => {
    if (!ts) return '';
    const m = moment(ts).tz(TZ);
    return m.isValid() ? m.format('h:mm A') : '';
};
const formatDateSep = (ts) => {
    if (!ts) return '';
    const m = moment(ts).tz(TZ);
    if (!m.isValid()) return '';
    const diffDays = moment().tz(TZ).startOf('day').diff(m.clone().startOf('day'), 'days');
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return m.format('dddd');
    return m.format('MMMM D, YYYY');
};
const formatLastSeen = (ts) => {
    if (!ts) return 'last seen a long time ago';
    const m = moment(ts).tz(TZ);
    if (!m.isValid()) return 'last seen a long time ago';
    const diffMins = moment().diff(m, 'minutes');
    if (diffMins < 1) return 'online';
    if (diffMins < 60) return `last seen ${diffMins}m ago`;
    const diffHours = moment().diff(m, 'hours');
    if (diffHours < 24) return `last seen today at ${m.format('h:mm A')}`;
    if (diffHours < 48) return `last seen yesterday at ${m.format('h:mm A')}`;
    return `last seen ${m.format('DD/MM/YY')}`;
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

const renderMentionContent = (message, sender) => {
    const text = String(message?.content || '');
    const mentions = Array.isArray(message?.mentions) ? message.mentions.filter((item) => item?.label) : [];
    if (!mentions.length) {
        return <p className="text-[13.5px] leading-[1.5] break-words whitespace-pre-wrap">{text}</p>;
    }

    const tokens = [...new Set(mentions.map((item) => `@${item.label}`))]
        .filter(Boolean)
        .sort((left, right) => right.length - left.length);

    if (!tokens.length) {
        return <p className="text-[13.5px] leading-[1.5] break-words whitespace-pre-wrap">{text}</p>;
    }

    const pattern = new RegExp(`(${tokens.map(escapeMentionPattern).join('|')})`, 'g');
    const parts = text.split(pattern).filter(Boolean);

    return (
        <p className="text-[13.5px] leading-[1.5] break-words whitespace-pre-wrap">
            {parts.map((part, index) => {
                const matched = mentions.find((item) => part.toLowerCase() === `@${String(item.label).toLowerCase()}`);
                if (!matched) return <React.Fragment key={index}>{part}</React.Fragment>;
                return (
                    <span
                        key={index}
                        className="rounded px-1 py-0.5 font-semibold"
                        style={{
                            backgroundColor: sender ? 'rgba(255,255,255,0.16)' : 'var(--brand-light)',
                            color: sender ? '#ffffff' : 'var(--brand-primary)',
                        }}
                    >
                        {part}
                    </span>
                );
            })}
        </p>
    );
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ user, size = 10, showOnline = false }) => {
    const sz = `w-${size} h-${size}`;
    return (
        <div
            className={`relative flex-shrink-0 ${sz} rounded-2xl flex items-center justify-center text-white font-semibold shadow-sm overflow-hidden`}
            style={{
                backgroundColor: 'var(--brand-primary)',
                fontSize: size <= 8 ? '0.7rem' : '0.85rem',
            }}
        >
            {user?.avatar ? (
                <img src={user.avatar} alt="" className={`${sz} object-cover`} />
            ) : (
                getInitials(user)
            )}
            {showOnline && user?.online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--bg-surface)]" />
            )}
        </div>
    );
};
// ─── Date separator ───────────────────────────────────────────────────────────
const DateSeparator = ({ date }) => (
    <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
        <span
            className="text-[11px] font-medium px-2 flex-shrink-0"
            style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }}
        >
            {formatDateSep(date)}
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-color)' }} />
    </div>
);
// ─── Typing bubble ────────────────────────────────────────────────────────────
const TypingBubble = ({ name }) => (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="flex items-end gap-2 my-1">
        <div
            className="px-4 py-3 rounded-2xl rounded-tl-[4px] shadow-sm flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--bg-surface)' }}
        >
            {[0, 1, 2].map((i) => (
                <motion.span key={i} className="w-1.5 h-1.5 rounded-full block"
                    style={{ backgroundColor: 'var(--text-muted)' }}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
            ))}
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{name}</span>
    </motion.div>
);
// ─── WhatsApp-style Message Context Menu ─────────────────────────────────────
const MessageContextMenu = ({ msg, isSender, isPinned, position, onClose, onReply, onForward, onPin, onEdit, onCopy, onDeleteForMe, onDeleteForEveryone }) => {
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        };
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);
    const style = useMemo(() => {
        const menuW = 192, menuH = 280;
        let { x, y } = position;
        if (x + menuW > window.innerWidth - 12) x = window.innerWidth - menuW - 12;
        if (y + menuH > window.innerHeight - 12) y = y - menuH;
        if (x < 8) x = 8;
        if (y < 8) y = 8;
        return { position: 'fixed', top: y, left: x, zIndex: 60 };
    }, [position]);
    const Item = ({ icon, label, onClick, danger = false }) => (
        <button
            onClick={() => { onClick(); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors ${
                danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
        >
            <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{icon}</span>
            {label}
        </button>
    );
    const canEdit = isSender && !msg.isDeleted &&
        (new Date() - new Date(msg.createdAt)) < 5 * 60 * 1000;
    return (
        <motion.div
             ref={menuRef}
            style={style}
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.12 }}
            className="bg-white dark:bg-[#2A2D33] rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 py-1.5 w-52 overflow-hidden">
            {!msg.isDeleted && <Item icon={<CornerUpLeft className="w-4 h-4" />} label="Reply" onClick={onReply} />}
            {!msg.isDeleted && msg.content && (
                <Item icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                } label="Copy text" onClick={onCopy} />
            )}
            {!msg.isDeleted && <Item icon={<ChevronDown className="w-4 h-4 rotate-[-90deg]" />} label="Forward" onClick={onForward} />}
            {!msg.isDeleted && <Item icon={isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />} label={isPinned ? 'Unpin' : 'Pin'} onClick={onPin} />}
            {canEdit && <Item icon={<Edit2 className="w-4 h-4" />} label="Edit" onClick={onEdit} />}
            {!msg.isDeleted && <div className="h-px my-1" style={{ backgroundColor: 'var(--border-color)' }} />}
            <Item icon={<Trash2 className="w-4 h-4" />} label="Delete for me" onClick={onDeleteForMe} danger />
            {isSender && !msg.isDeleted && <Item icon={<Trash2 className="w-4 h-4" />} label="Delete for everyone" onClick={onDeleteForEveryone} danger />}
        </motion.div>
    );
};
// ─── Delete confirmation modal ────────────────────────────────────────────────
const DeleteConfirmModal = ({ msg, isSender, onDeleteForMe, onDeleteForEveryone, onCancel }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        onClick={onCancel}
    >
        <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            className="rounded-2xl shadow-2xl border w-full max-w-sm overflow-hidden"
            style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="px-6 pt-6 pb-4">
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Delete message?</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {isSender
                        ? 'You can delete this message for yourself, or for everyone in this chat.'
                        : 'This will remove the message from your view only.'}
                </p>
            </div>
            <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                {isSender && !msg.isDeleted && (
                    <button
                        onClick={onDeleteForEveryone}
                        className="w-full px-6 py-4 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors border-b"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        Delete for everyone
                    </button>
                )}
                <button
                    onClick={onDeleteForMe}
                    className="w-full px-6 py-4 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors border-b"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    Delete for me
                </button>
                <button
                    onClick={onCancel}
                    className="w-full px-6 py-4 text-sm font-medium transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Cancel
                </button>
            </div>
        </motion.div>
    </motion.div>
);
// ─── Forward Message Modal ─────────────────────────────────────────────────────
const ForwardModal = ({ msg, allUsers, groups, userChatMap, currentUserId, onForward, onClose }) => {
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState('');
    const toggle = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : p.length < 5 ? [...p, id] : p);
    const chats = useMemo(() => {
        const list = [];
        allUsers.forEach((u) => {
            const cid = userChatMap[u._id];
            if (cid) list.push({ id: cid, name: getFullName(u), isGroup: false, user: u });
        });
        groups.forEach((g) => list.push({ id: g._id, name: g.name || 'Unnamed Group', isGroup: true, group: g }));
        const q = search.trim().toLowerCase();
        return q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
    }, [allUsers, groups, userChatMap, search]);
    const preview = msg.isDeleted ? '🚫 Deleted'
        : msg.content ? msg.content.slice(0, 80) + (msg.content.length > 80 ? '…' : '')
        : msg.fileUrl ? '📎 Attachment' : '';
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={onClose}
        >
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                className="rounded-2xl shadow-2xl border w-full max-w-md flex flex-col max-h-[90vh]"
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div>
                        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Forward message</h3>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Select up to 5 chats</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-muted)' }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="mx-5 mt-4 px-3 py-2.5 rounded-xl border-l-4" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: '#16a34a' }}>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{preview}</p>
                </div>
                <div className="px-5 pt-3 pb-2">
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search chats…"
                            className="flex-1 bg-transparent text-sm focus:outline-none"
                            style={{ color: 'var(--text-primary)' }}
                        />
                        {search && <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} /></button>}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 pb-2">
                    {chats.length === 0 ? (
                        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No chats found</p>
                    ) : (
                        chats.map((c) => {
                            const sel = selected.includes(c.id);
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => toggle(c.id)}
                                    className={`flex items-center gap-3 py-2.5 px-2 rounded-xl cursor-pointer transition-colors ${
                                        sel ? 'bg-[var(--brand-light)]' : 'hover:bg-[var(--bg-hover)]'
                                    }`}
                                >
                                    <Avatar user={c.isGroup ? c.group : c.user} size={9} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.isGroup ? 'Group' : 'Chat'}</p>
                                    </div>
                                    <div
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                            sel ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-[var(--border-color)]'
                                        }`}
                                    >
                                        {sel && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="px-5 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.length}/5 selected</p>
                    <button
                        onClick={() => { if (selected.length) onForward(selected); }}
                        disabled={!selected.length}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all ${
                            selected.length ? 'bg-[var(--brand-accent)] hover:opacity-90' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
                        }`}
                    >
                        <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                        Forward
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};
// ─── Group Modal ──────────────────────────────────────────────────────────────
const GroupModal = ({ isAddMode, selectedChat, users, onClose, onCreateGroup, onAddMembers }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [modalSearch, setModalSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const searchRef = useRef(null);
    useEffect(() => { setTimeout(() => searchRef.current?.focus(), 80); }, []);
    const existingMemberIds = useMemo(() => {
        if (isAddMode && selectedChat?.members) return new Set(selectedChat.members.map((m) => m._id));
        return new Set();
    }, [isAddMode, selectedChat]);
    const filteredUsers = useMemo(() => {
        const q = modalSearch.trim().toLowerCase();
        return users
            .filter((u) => !existingMemberIds.has(u._id))
            .filter((u) => !q || getFullName(u).toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
            .sort((a, b) => getFullName(a).localeCompare(getFullName(b)));
    }, [users, existingMemberIds, modalSearch]);
    const toggleUser = (id) =>
        setSelectedUsers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    const handleSubmit = async () => {
        if (!selectedUsers.length) { toast.error('Select at least one member.'); return; }
        setIsSubmitting(true);
        try {
            if (isAddMode) await onAddMembers(selectedChat._id, selectedUsers);
            else await onCreateGroup(groupName, selectedUsers);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Operation failed.');
        } finally { setIsSubmitting(false); }
    };
    const selectedNames = useMemo(() => users.filter((u) => selectedUsers.includes(u._id)), [users, selectedUsers]);
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            onClick={onClose}
        >
            <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                className="rounded-2xl shadow-2xl border w-full max-w-md flex flex-col max-h-[90vh]"
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {isAddMode ? 'Add Members' : 'Create New Group'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-muted)' }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {!isAddMode && (
                        <input
                            type="text"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            placeholder="Group name"
                            maxLength={50}
                            className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors"
                            style={{
                                backgroundColor: 'var(--input-bg)',
                                borderColor: 'var(--input-border)',
                                color: 'var(--text-primary)',
                            }}
                        />
                    )}
                    {selectedNames.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {selectedNames.map((u) => (
                                <span
                                    key={u._id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                                    style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}
                                >
                                    {getFullName(u)}
                                    <button onClick={() => toggleUser(u._id)}><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <input
                            ref={searchRef}
                            type="text"
                            value={modalSearch}
                            onChange={(e) => setModalSearch(e.target.value)}
                            placeholder="Search members…"
                            className="flex-1 bg-transparent text-sm focus:outline-none"
                            style={{ color: 'var(--text-primary)' }}
                        />
                        {modalSearch && <button onClick={() => setModalSearch('')}><X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} /></button>}
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                            {filteredUsers.length} available
                        </p>
                        {filteredUsers.length === 0 ? (
                            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                                {modalSearch ? 'No matches' : 'No users available'}
                            </p>
                        ) : (
                            <div className="space-y-0.5 max-h-60 overflow-y-auto">
                                {filteredUsers.map((u) => {
                                    const sel = selectedUsers.includes(u._id);
                                    return (
                                        <div
                                            key={u._id}
                                            onClick={() => toggleUser(u._id)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                                                sel ? 'bg-[var(--brand-light)]' : 'hover:bg-[var(--bg-hover)]'
                                            }`}
                                        >
                                            <Avatar user={u} size={9} showOnline />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{getFullName(u)}</p>
                                                {u.online && <p className="text-xs" style={{ color: '#16a34a' }}>Online</p>}
                                            </div>
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                                    sel ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-[var(--border-color)]'
                                                }`}
                                            >
                                                {sel && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-5 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedUsers.length} selected</p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedUsers.length || isSubmitting}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all ${
                                selectedUsers.length && !isSubmitting
                                    ? 'bg-[var(--brand-primary)] hover:opacity-90'
                                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-not-allowed'
                            }`}
                        >
                            {isSubmitting ? 'Please wait…' : isAddMode ? 'Add Members' : 'Create Group'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};
// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const TeamChat = () => {
    const { user, onLogout } = useOutletContext();
    const navigate = useNavigate();
    const { markTypeRead } = useNotifications();
    const currentUserId = user?._id || user?.id;
    const [chatMode, setChatMode] = useState(localStorage.getItem('chatMode') || 'individual');
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [editingMessage, setEditingMessage] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [draftMentions, setDraftMentions] = useState([]);
    const [mentionState, setMentionState] = useState(EMPTY_MENTION_STATE);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [typingUsers, setTypingUsers] = useState({});
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [groupModalMode, setGroupModalMode] = useState(null);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [file, setFile] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [chatTimestamps, setChatTimestamps] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [messageSearch, setMessageSearch] = useState('');
    const [mediaViewer, setMediaViewer] = useState(null);
    const [isInitLoading, setIsInitLoading] = useState(true);
    const [isMsgLoading, setIsMsgLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [userChatMap, setUserChatMap] = useState({});
    const [lastMessages, setLastMessages] = useState({});
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [now, setNow] = useState(Date.now());
    // New feature state
    const [forwardModal, setForwardModal] = useState(null);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [showPinnedPanel, setShowPinnedPanel] = useState(false);
    const [highlightedMsgId, setHighlightedMsgId] = useState(null);
    const highlightTimerRef = useRef(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [longPressTimer, setLongPressTimer] = useState(null);
    const socket = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiButtonRef = useRef(null);
    const inputRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;
    const selectedChatRef = useRef(null);
    const savedScrollRef = useRef(null);
    const msgRefsMap = useRef({});
    const isAtBottomRef = useRef(true);
    useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
    useEffect(() => { localStorage.setItem('chatMode', chatMode); }, [chatMode]);
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(id);
    }, []);
    useEffect(() => {
        if (users.length) setOnlineUsers(new Set(users.filter((u) => u.online).map((u) => u._id)));
    }, [users]);
    const scrollToBottom = useCallback((behavior = 'smooth') => {
        const container = messagesContainerRef.current;
        if (!container) return;
        if (behavior === 'instant') container.scrollTop = container.scrollHeight;
        else container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        setShowScrollButton(false);
    }, []);
    const handleScroll = useCallback(() => {
        const c = messagesContainerRef.current;
        if (!c) return;
        setShowScrollButton(c.scrollHeight - c.scrollTop - c.clientHeight > 200);
    }, []);
    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            onLogout?.();
            navigate('/login');
            throw new Error('No auth token');
        }
        return { Authorization: `Bearer ${token}` };
    }, [onLogout, navigate]);
    const fetchUnreadCounts = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/chats/unread-counts`, { headers: getAuthHeaders() });
            if (res.data.success) setUnreadCounts(res.data.counts || {});
        } catch {}
    }, [getAuthHeaders]);
    const markChatAsRead = useCallback(async (chatId) => {
        if (!chatId) return;
        setUnreadCounts((prev) => {
            const n = { ...prev };
            delete n[chatId];
            return n;
        });
        try {
            await axios.post(`${API_BASE_URL}/api/chats/${chatId}/read`, {}, { headers: getAuthHeaders() });
        } catch { fetchUnreadCounts(); }
    }, [getAuthHeaders, fetchUnreadCounts]);
    const fetchInitialChats = useCallback(async () => {
        try {
            setIsInitLoading(true);
            const res = await axios.get(`${API_BASE_URL}/api/chats/init`, { headers: getAuthHeaders() });
            const {
                users: rawUsers = [], groups: rawGroups = [], userChatMap: map = {},
                lastMessages: lastMsgs = {}, timestamps = {}, unreadCounts: serverUnread = {},
            } = res.data;
            setUsers(rawUsers.filter((u) => u._id && u.firstName && u._id !== user?._id));
            setGroups(rawGroups.filter((g) => g._id && g.members?.length > 0));
            setUserChatMap(map);
            const normTs = {};
            Object.entries(timestamps).forEach(([k, v]) => {
                normTs[k] = v instanceof Date ? v.toISOString() : String(v);
            });
            setChatTimestamps(normTs);
            const normMsgs = {};
            Object.entries(lastMsgs).forEach(([k, v]) => {
                normMsgs[k] = v
                    ? { ...v, createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : String(v.createdAt) }
                    : null;
            });
            setLastMessages(normMsgs);
            setUnreadCounts((prev) => ({ ...serverUnread, ...prev }));
        } catch (error) {
            toast.error('Failed to load chats.');
            if (error.response?.status === 401) onLogout?.();
        } finally {
            setIsInitLoading(false);
        }
    }, [user, getAuthHeaders, onLogout]);
    const fetchPinnedMessages = useCallback(async (chatId) => {
        if (!chatId) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/chats/${chatId}/pinned`, { headers: getAuthHeaders() });
            if (res.data.success) setPinnedMessages(res.data.pinnedMessages || []);
        } catch {
            setPinnedMessages([]);
        }
    }, [getAuthHeaders]);
    const fetchPinnedRef = useRef(fetchPinnedMessages);
    useEffect(() => { fetchPinnedRef.current = fetchPinnedMessages; }, [fetchPinnedMessages]);
    const scrollToMessage = useCallback((messageId) => {
        const el = msgRefsMap.current[messageId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMsgId(messageId);
            if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
            highlightTimerRef.current = setTimeout(() => setHighlightedMsgId(null), 1500);
        }
    }, []);
    // ─── Socket ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        socket.current = io(SOCKET_URL, {
            auth: { token: localStorage.getItem('token') },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });
        socket.current.on('connect', () => {
            reconnectAttempts.current = 0;
            socket.current.emit('joinChat', `user:${user._id}`);
            if (selectedChatRef.current?._id) socket.current.emit('joinChat', selectedChatRef.current._id);
        });
        socket.current.on('message', (message) => {
            if (!message?._id || !message?.chatId) return;
            const msg = { ...message, createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt };
            const ts = msg.createdAt || new Date().toISOString();
            setLastMessages((prev) => ({ ...prev, [msg.chatId]: msg }));
            setChatTimestamps((prev) => ({ ...prev, [msg.chatId]: ts }));
            if (msg.chatId === selectedChatRef.current?._id) {
                const container = messagesContainerRef.current;
                const nearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 100) : true;
                setMessages((prev) => {
                    if (msg.chatId !== selectedChatRef.current?._id) return prev;
                    if (prev.some((m) => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
                if (nearBottom) requestAnimationFrame(() => setTimeout(() => scrollToBottom('smooth'), 8));
                else setShowScrollButton(true);
                markChatAsRead(msg.chatId);
            }
        });
        socket.current.on('unreadUpdate', ({ chatId, count, message }) => {
            if (selectedChatRef.current?._id === chatId) return;
            setUnreadCounts((prev) => ({ ...prev, [chatId]: count }));
            if (message?.sender?._id !== user?._id) {
                toast.custom((t) => (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        className="flex items-center gap-3 border shadow-xl rounded-2xl px-4 py-3 max-w-xs cursor-pointer"
                        style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-color)',
                        }}
                        onClick={() => toast.dismiss(t.id)}
                    >
                        <Avatar user={message.sender} size={9} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {getFullName(message.sender)}
                            </p>
                            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                {message.content || (message.fileUrl ? '📎 Attachment' : 'New message')}
                            </p>
                        </div>
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {formatMsgTime(message.createdAt)}
                        </span>
                    </motion.div>
                ), { duration: 4500, position: 'top-right' });
            }
        });
        socket.current.on('messageUpdated', (message) => {
            const msg = { ...message, createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt };
            if (msg.chatId === selectedChatRef.current?._id)
                setMessages((prev) => prev.map((m) => m._id === msg._id ? msg : m));
            setLastMessages((prev) => (prev[msg.chatId]?._id === msg._id ? { ...prev, [msg.chatId]: msg } : prev));
        });
        socket.current.on('messageDeleted', (message) => {
            if (message.chatId === selectedChatRef.current?._id)
                setMessages((prev) => prev.map((m) => m._id === message._id ? { ...m, isDeleted: true, content: 'This message was deleted', fileUrl: null, fileName: null } : m));
        });
        socket.current.on('typing', ({ chatId, userId, isTyping }) => {
            if (chatId && userId && userId !== user?._id)
                setTypingUsers((prev) => ({ ...prev, [chatId]: isTyping ? { id: userId, isTyping: true } : null }));
        });
        socket.current.on('userOnline', ({ userId }) => setOnlineUsers((prev) => new Set([...prev, userId])));
        socket.current.on('userOffline', ({ userId, lastActive }) => {
            setOnlineUsers((prev) => {
                const s = new Set(prev);
                s.delete(userId);
                return s;
            });
            if (lastActive && selectedChatRef.current?.recipient?._id === userId)
                setSelectedChat((prev) => prev ? { ...prev, recipient: { ...prev.recipient, lastActive, online: false } } : prev);
        });
        socket.current.on('groupCreated', ({ success, group }) => {
            if (success && group?._id) {
                setGroups((prev) => prev.some((g) => g._id === group._id) ? prev : [...prev, group]);
                socket.current.emit('joinChat', group._id);
            }
        });
        socket.current.on('groupUpdated', ({ success, group }) => {
            if (success && group?._id) {
                setGroups((prev) => prev.map((g) => g._id === group._id ? group : g));
                if (selectedChatRef.current?._id === group._id)
                    setSelectedChat((prev) => ({ ...prev, ...group, type: 'group' }));
            }
        });
        socket.current.on('messagePinned', ({ chatId }) => {
            if (selectedChatRef.current?._id === chatId) fetchPinnedRef.current(chatId);
        });
        socket.current.on('messageUnpinned', ({ chatId, messageId }) => {
            if (selectedChatRef.current?._id === chatId)
                setPinnedMessages((prev) => prev.filter((m) => m._id !== messageId));
        });
        socket.current.on('connect_error', () => {
            reconnectAttempts.current = Math.min(reconnectAttempts.current + 1, maxReconnectAttempts);
        });
        return () => {
            socket.current?.emit('leaveChat', selectedChatRef.current?._id);
            socket.current?.emit('leaveChat', `user:${user._id}`);
            socket.current?.disconnect();
        };
    }, [user, scrollToBottom, markChatAsRead]);
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchInitialChats();
    }, [user, fetchInitialChats]);
    useEffect(() => {
        const h = (e) => {
            if (showEmojiPicker && emojiButtonRef.current && !emojiButtonRef.current.contains(e.target) && !e.target.closest('.EmojiPickerReact'))
                setShowEmojiPicker(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showEmojiPicker]);
    useEffect(() => {
        const el = messagesContainerRef.current;
        if (!el || !contextMenu) return;
        const handler = () => setContextMenu(null);
        el.addEventListener('scroll', handler, { passive: true });
        return () => el.removeEventListener('scroll', handler);
    }, [contextMenu]);
    const selectIndividualChat = useCallback(async (recipient) => {
        if (!recipient?._id) return;
        if (selectedChatRef.current?.recipient?._id === recipient._id) return;
        setMessages([]);
        setCurrentPage(1);
        isAtBottomRef.current = true;
        const knownChatId = userChatMap[recipient._id];
        if (knownChatId) setSelectedChat({ _id: knownChatId, type: 'individual', recipient: { ...recipient, online: onlineUsers.has(recipient._id) }, members: [], _pending: true });
        try {
            setIsMsgLoading(true);
            const res = await axios.post(`${API_BASE_URL}/api/chats/individual`, { recipientId: recipient._id }, { headers: getAuthHeaders() });
            const chat = res.data.chat;
            if (!chat?._id) throw new Error('Invalid chat');
            const recipientMember = chat.members.find((m) => m._id !== user._id);
            setSelectedChat({ ...chat, type: 'individual', recipient: { ...recipientMember, online: onlineUsers.has(recipientMember?._id) } });
            setUserChatMap((prev) => ({ ...prev, [recipient._id]: chat._id }));
            await markChatAsRead(chat._id);
            socket.current?.emit('joinChat', chat._id);
            fetchPinnedMessages(chat._id);
            if (window.innerWidth < 1024) window.scrollTo(0, 0);
        } catch (error) {
            setSelectedChat(null);
            toast.error(error.response?.data?.message || 'Failed to open chat.');
            if (error.response?.status === 401) onLogout?.();
        } finally {
            setIsMsgLoading(false);
        }
    }, [getAuthHeaders, onLogout, user, markChatAsRead, onlineUsers, userChatMap, fetchPinnedMessages]);
    const selectGroupChat = useCallback((group) => {
        if (!group?._id || selectedChatRef.current?._id === group._id) return;
        setMessages([]);
        setCurrentPage(1);
        setPinnedMessages([]);
        isAtBottomRef.current = true;
        setSelectedChat({ ...group, type: 'group' });
        markChatAsRead(group._id);
        socket.current?.emit('joinChat', group._id);
        fetchPinnedMessages(group._id);
        if (window.innerWidth < 1024) window.scrollTo(0, 0);
    }, [markChatAsRead, fetchPinnedMessages]);
    const mentionCandidates = useMemo(() => {
        if (selectedChat?.type !== 'group') return [];
        return (selectedChat.members || [])
            .filter((member) => String(member?._id) !== String(currentUserId))
            .map((member) => ({ userId: member._id, label: getFullName(member) }))
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
        const nextValue = `${newMessage.slice(0, mentionState.start)}${token} ${newMessage.slice(mentionState.end)}`;
        setNewMessage(nextValue);
        setDraftMentions((current) => normalizeDraftMentions(nextValue, [...current, option]));
        setMentionState(EMPTY_MENTION_STATE);
    }, [mentionState, newMessage]);
    const fetchMessages = useCallback(async () => {
        if (!selectedChat?._id) return;
        const fetchingChatId = selectedChat._id;
        const fetchingPage = currentPage;
        try {
            setIsMsgLoading(true);
            const res = await axios.get(
                `${API_BASE_URL}/api/chats/${fetchingChatId}/messages?limit=50&page=${fetchingPage}`,
                { headers: getAuthHeaders() }
            );
            const { messages: newMsgs, pagination } = res.data;
            if (!Array.isArray(newMsgs)) return;
            if (selectedChatRef.current?._id !== fetchingChatId) return;
            const normed = newMsgs.map((m) => ({
                ...m,
                createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
            }));
            setMessages((prev) => {
                if (fetchingPage === 1) return normed;
                const el = messagesContainerRef.current;
                if (el) savedScrollRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
                const existingIds = new Set(prev.map((m) => m._id));
                return [...normed.filter((m) => !existingIds.has(m._id) && m.chatId === fetchingChatId), ...prev.filter((m) => m.chatId === fetchingChatId)];
            });
            setTotalPages(pagination.totalPages);
            if (fetchingPage === 1) setTimeout(() => scrollToBottom('instant'), 30);
            else if (savedScrollRef.current) {
                requestAnimationFrame(() => {
                    const el = messagesContainerRef.current;
                    if (el && savedScrollRef.current) {
                        el.scrollTop = el.scrollHeight - savedScrollRef.current.scrollHeight + savedScrollRef.current.scrollTop;
                        savedScrollRef.current = null;
                    }
                });
            }
            if (normed.length > 0) {
                const newest = normed[normed.length - 1];
                setChatTimestamps((prev) => ({ ...prev, [fetchingChatId]: newest.createdAt }));
                setLastMessages((prev) => ({ ...prev, [fetchingChatId]: newest }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load messages.');
            if (error.response?.status === 401) onLogout?.();
        } finally {
            setIsMsgLoading(false);
        }
    }, [selectedChat, currentPage, getAuthHeaders, scrollToBottom, onLogout]);
    useEffect(() => {
        if (selectedChat?._id) fetchMessages();
    }, [fetchMessages]);
    useEffect(() => {
        if (selectedChat?._id) {
            markTypeRead?.('chat');
        }
    }, [markTypeRead, selectedChat?._id]);
    const debouncedTyping = useMemo(() => debounce((chatId, userId) => {
        socket.current?.emit('typing', { chatId, userId, isTyping: true });
    }, 400), []);
    useEffect(() => {
        if (!selectedChat || !newMessage) return;
        const t = setTimeout(() => socket.current?.emit('typing', { chatId: selectedChat._id, userId: user?._id, isTyping: false }), 3000);
        return () => clearTimeout(t);
    }, [newMessage, selectedChat, user]);
    useEffect(() => {
        if (!newMessage && selectedChat)
            socket.current?.emit('typing', { chatId: selectedChat._id, userId: user?._id, isTyping: false });
    }, [newMessage, selectedChat, user]);
    const uploadFile = async (f) => {
        setIsUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', f);
            const res = await axios.post(`${API_BASE_URL}/api/chats/upload`, fd, {
                headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        } finally {
            setIsUploading(false);
        }
    };
    const handleSendMessage = useCallback(async () => {
        const text = newMessage.trim();
        if (!text && !file && !editingMessage) return;
        const resolvedMentions = normalizeDraftMentions(newMessage, draftMentions);
        let fileUrl = '', contentType = '', fileName = '';
        if (file) {
            try {
                ({ fileUrl, contentType, fileName } = await uploadFile(file));
            } catch {
                toast.error('Upload failed.');
                setFile(null);
                return;
            }
        }
        try {
            if (editingMessage) {
                if (!text) return;
                await axios.put(`${API_BASE_URL}/api/chats/messages/${editingMessage.id}`, { content: text }, { headers: getAuthHeaders() });
            } else {
                await axios.post(`${API_BASE_URL}/api/chats/${selectedChat._id}/messages`, {
                    content: text,
                    fileUrl,
                    contentType,
                    fileName,
                    replyTo: replyTo?._id || null,
                    mentions: resolvedMentions,
                }, { headers: getAuthHeaders() });
            }
            setNewMessage('');
            setDraftMentions([]);
            setMentionState(EMPTY_MENTION_STATE);
            setFile(null);
            setEditingMessage(null);
            setReplyTo(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setChatTimestamps((prev) => ({ ...prev, [selectedChat._id]: new Date().toISOString() }));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send.');
            if (error.response?.status === 401) onLogout?.();
        }
    }, [selectedChat, newMessage, file, editingMessage, replyTo, getAuthHeaders, onLogout, uploadFile, draftMentions]);
    const openDeleteModal = useCallback((msg) => {
        setContextMenu(null);
        setDeleteModal({ msg });
    }, []);
    const handleDeleteForMe = useCallback(async (msg) => {
        setDeleteModal(null);
        setContextMenu(null);
        setMessages((prev) => prev.filter((m) => m._id !== msg._id));
        try {
            await axios.post(`${API_BASE_URL}/api/chats/messages/${msg._id}/delete`, { deleteScope: 'me' }, { headers: getAuthHeaders() });
        } catch {
            setMessages((prev) => [...prev, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
            toast.error('Failed to delete message.');
        }
    }, [getAuthHeaders]);
    const handleDeleteForEveryone = useCallback(async (msg) => {
        setDeleteModal(null);
        setContextMenu(null);
        setMessages((prev) => prev.map((m) => m._id === msg._id ? { ...m, isDeleted: true, content: 'This message was deleted', fileUrl: null, fileName: null } : m));
        try {
            await axios.delete(`${API_BASE_URL}/api/chats/messages/${msg._id}`, { data: { deleteScope: 'everyone' }, headers: getAuthHeaders() });
        } catch {
            setMessages((prev) => prev.map((m) => m._id === msg._id ? msg : m));
            toast.error('Failed to delete message.');
        }
    }, [getAuthHeaders]);
    const openContextMenu = useCallback((e, msg) => {
        e.preventDefault();
        e.stopPropagation();
        const x = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
        const y = e.clientY ?? (e.touches?.[0]?.clientY ?? 0);
        setContextMenu({ msg, position: { x, y } });
    }, []);
    const handleTouchStart = useCallback((e, msg) => {
        const touch = e.touches[0];
        const timer = setTimeout(() => {
            setContextMenu({ msg, position: { x: touch.clientX, y: touch.clientY } });
        }, 500);
        setLongPressTimer(timer);
    }, []);
    const handleTouchEnd = useCallback(() => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    }, [longPressTimer]);
    const handleCreateGroup = useCallback(async (name, memberIds) => {
        const validIds = memberIds.filter((id) => users.some((u) => u._id === id));
        if (!validIds.length) throw new Error('No valid members');
        const res = await axios.post(`${API_BASE_URL}/api/chats/groups`, { name: name.trim() || 'Unnamed Group', members: validIds }, { headers: getAuthHeaders() });
        if (res.data.success && res.data.group) {
            setGroups((prev) => prev.some((g) => g._id === res.data.group._id) ? prev : [...prev, res.data.group]);
            socket.current?.emit('joinChat', res.data.group._id);
            toast.success('Group created!');
        }
    }, [users, getAuthHeaders]);
    const handleAddMembers = useCallback(async (groupId, memberIds) => {
        const validIds = memberIds.filter((id) => users.some((u) => u._id === id));
        if (!validIds.length) throw new Error('No valid members');
        await axios.put(`${API_BASE_URL}/api/chats/groups/${groupId}/members`, { members: validIds }, { headers: getAuthHeaders() });
        toast.success('Members added!');
    }, [users, getAuthHeaders]);
    const handlePin = useCallback(async (msg) => {
        const isPinned = pinnedMessages.some((p) => p._id === msg._id);
        try {
            if (isPinned) {
                await axios.delete(`${API_BASE_URL}/api/chats/messages/${msg._id}/pin`, { headers: getAuthHeaders() });
                setPinnedMessages((prev) => prev.filter((p) => p._id !== msg._id));
                toast.success('Unpinned');
            } else {
                await axios.post(`${API_BASE_URL}/api/chats/messages/${msg._id}/pin`, {}, { headers: getAuthHeaders() });
                setPinnedMessages((prev) => {
                    const without = prev.filter((p) => p._id !== msg._id);
                    return [...without, msg].slice(-3);
                });
                toast.success('Pinned');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        }
    }, [pinnedMessages, getAuthHeaders]);
    const handleForwardConfirm = useCallback(async (targetChatIds) => {
        const msg = forwardModal?.msg;
        if (!msg || !targetChatIds.length) return;
        setForwardModal(null);
        try {
            await axios.post(`${API_BASE_URL}/api/chats/messages/${msg._id}/forward`, { targetChatIds }, { headers: getAuthHeaders() });
            toast.success(`Forwarded to ${targetChatIds.length} chat${targetChatIds.length > 1 ? 's' : ''}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to forward');
        }
    }, [forwardModal, getAuthHeaders]);
    const handleCloseChat = () => {
        socket.current?.emit('leaveChat', selectedChat?._id);
        if (selectedChat) socket.current?.emit('typing', { chatId: selectedChat._id, userId: user?._id, isTyping: false });
        setSelectedChat(null);
        setMessages([]);
        setCurrentPage(1);
        setEditingMessage(null);
        setNewMessage('');
        setDraftMentions([]);
        setMentionState(EMPTY_MENTION_STATE);
        setReplyTo(null);
        setContextMenu(null);
        setDeleteModal(null);
    };
    const handleChatModeChange = (mode) => {
        if (mode === chatMode) return;
        setChatMode(mode);
        handleCloseChat();
        setSearchQuery('');
    };
    const startEdit = (msg) => {
        setEditingMessage({ id: msg._id, originalContent: msg.content });
        setNewMessage(msg.content || '');
        setDraftMentions((msg.mentions || []).map((item) => ({ userId: item.user?._id || item.userId || item._id, label: item.label || getFullName(item.user) })));
        setMentionState(EMPTY_MENTION_STATE);
        inputRef.current?.focus();
    };
    const startReply = (msg) => {
        setReplyTo(msg);
        setEditingMessage(null);
        setMentionState(EMPTY_MENTION_STATE);
        inputRef.current?.focus();
    };
    const cancelEdit = () => {
        setEditingMessage(null);
        setNewMessage('');
        setDraftMentions([]);
        setMentionState(EMPTY_MENTION_STATE);
    };
    const cancelReply = () => setReplyTo(null);
    const isSender = (msg) => msg.sender?._id === user?._id;
    const sortedUsers = useMemo(() => {
        void now;
        const q = searchQuery.trim().toLowerCase();
        return [...users]
            .filter((u) => !q || getFullName(u).toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
            .sort((a, b) => {
                const cidA = userChatMap[a._id], cidB = userChatMap[b._id];
                const tA = (cidA && lastMessages[cidA]) ? chatTimestamps[cidA] : null;
                const tB = (cidB && lastMessages[cidB]) ? chatTimestamps[cidB] : null;
                if (tA && tB) return new Date(tB) - new Date(tA);
                if (tA) return -1;
                if (tB) return 1;
                return getFullName(a).localeCompare(getFullName(b));
            });
    }, [users, searchQuery, userChatMap, chatTimestamps, lastMessages, now]);
    const sortedGroups = useMemo(() => {
        void now;
        const q = searchQuery.trim().toLowerCase();
        return [...groups]
            .filter((g) => !q || (g.name || '').toLowerCase().includes(q))
            .sort((a, b) => {
                const tA = lastMessages[a._id] ? (chatTimestamps[a._id] || null) : null;
                const tB = lastMessages[b._id] ? (chatTimestamps[b._id] || null) : null;
                if (tA && tB) return new Date(tB) - new Date(tA);
                if (tA) return -1;
                if (tB) return 1;
                return (a.name || '').localeCompare(b.name || '');
            });
    }, [groups, searchQuery, chatTimestamps, lastMessages, now]);
    const filteredMessages = useMemo(() => {
        const chatId = selectedChat?._id;
        return messages
            .filter((m) => !chatId || !m.chatId || m.chatId === chatId)
            .filter((m) => !messageSearch || m.content?.toLowerCase().includes(messageSearch.toLowerCase()));
    }, [messages, messageSearch, selectedChat]);
    const messagesWithSeparators = useMemo(() => {
        const items = [];
        let lastDateKey = null;
        filteredMessages.forEach((msg) => {
            const dateKey = msg.createdAt ? moment(msg.createdAt).tz(TZ).format('YYYY-MM-DD') : null;
            if (dateKey && dateKey !== lastDateKey) {
                items.push({ type: 'separator', date: msg.createdAt, key: `sep-${dateKey}` });
                lastDateKey = dateKey;
            }
            items.push({ type: 'message', msg, key: msg._id });
        });
        return items;
    }, [filteredMessages]);
    const lastSeenText = useMemo(() => {
        void now;
        if (!selectedChat || selectedChat.type !== 'individual') return '';
        const r = selectedChat.recipient;
        if (!r) return '';
        if (onlineUsers.has(r._id) || r.online) return 'Online';
        return formatLastSeen(r._computedLastSeen || r.lastActive);
    }, [selectedChat, onlineUsers, now]);
    const totalUnread = useMemo(() => Object.values(unreadCounts).reduce((s, n) => s + n, 0), [unreadCounts]);
    useEffect(() => {
        document.title = totalUnread > 0 ? `(${totalUnread}) TeamChat` : 'TeamChat';
        return () => { document.title = 'TeamChat'; };
    }, [totalUnread]);
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('chatUnreadUpdate', { detail: { total: totalUnread } }));
    }, [totalUnread]);
    if (!user) return <div className="h-screen flex items-center justify-center"><p className="text-gray-400">Please log in.</p></div>;
    return (
        <div className="flex h-screen h-[100dvh] overflow-hidden" style={{ backgroundColor: 'var(--bg-app)' }}>
            <Toaster toastOptions={{ className: 'text-sm' }} />
            {/* SIDEBAR */}
            <aside
                className={`flex-shrink-0 flex flex-col border-r w-full lg:w-[320px] xl:w-[360px] ${selectedChat ? 'hidden lg:flex' : 'flex'}`}
                style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-color)',
                }}
            >
                <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
                            style={{ backgroundColor: 'var(--brand-primary)' }}
                        >
                            <Users className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold leading-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                TeamChat
                                {totalUnread > 0 && (
                                    <span
                                        className="bg-green-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none tabular-nums"
                                    >
                                        {totalUnread > 99 ? '99+' : totalUnread}
                                    </span>
                                )}
                            </h1>
                            <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>Workspace messaging</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-shrink-0 p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: 'var(--text-muted)' }}
                        title="Back to Dashboard"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-shrink-0 flex px-4 pt-3 pb-2 gap-1.5">
                    {[['individual', 'Chats'], ['group', 'Groups']].map(([mode, label]) => (
                        <button
                            key={mode}
                            onClick={() => handleChatModeChange(mode)}
                            className={`flex-1 py-2 text-[13px] font-semibold rounded-xl transition-all duration-150 ${
                                chatMode === mode
                                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                                    : 'text-[var(--text-secondary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)]'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {chatMode === 'group' && (
                    <div className="flex-shrink-0 px-4 pb-2">
                        <button
                            onClick={() => setGroupModalMode('create')}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-semibold text-white transition-all shadow-sm"
                            style={{ backgroundColor: 'var(--brand-accent)' }}
                        >
                            <Plus className="w-4 h-4" /> New Group
                        </button>
                    </div>
                )}
                <div className="flex-shrink-0 px-4 pb-3">
                    <div
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 ring-1 ring-transparent focus-within:ring-[var(--brand-accent)]/30 focus-within:bg-[var(--bg-surface)] transition-all"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                    >
                        <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={chatMode === 'individual' ? 'Search chats…' : 'Search groups…'}
                            className="flex-1 bg-transparent text-[13px] focus:outline-none placeholder-[var(--text-muted)]"
                            style={{ color: 'var(--text-primary)' }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)]">
                                <X className="w-2.5 h-2.5" style={{ color: 'var(--text-muted)' }} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isInitLoading ? (
                        <div className="flex flex-col gap-2 px-4 pt-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                                    <div className="w-12 h-12 rounded-2xl flex-shrink-0" style={{ backgroundColor: 'var(--bg-hover)' }} />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--bg-hover)' }} />
                                        <div className="h-2.5 rounded w-1/2" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (chatMode === 'individual' ? sortedUsers : sortedGroups).length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-20 px-8 text-center gap-3">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                <Users className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div>
                                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                                    {searchQuery ? 'No results' : chatMode === 'group' ? 'No groups yet' : 'No chats yet'}
                                </p>
                                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    {searchQuery ? 'Try a different name' : chatMode === 'group' ? 'Create one above' : 'Select someone to start'}
                                </p>
                            </div>
                        </div>
                    ) : (chatMode === 'individual' ? sortedUsers : sortedGroups).map((item) => {
                        const isGroup = chatMode === 'group';
                        const chatId = isGroup ? item._id : userChatMap[item._id];
                        const lastMsg = lastMessages[chatId];
                        const ts = chatTimestamps[chatId];
                        const unread = unreadCounts[chatId] || 0;
                        const isActive = isGroup ? selectedChat?._id === item._id : selectedChat?.recipient?._id === item._id;
                        const isItemOnline = !isGroup && (onlineUsers.has(item._id) || item.online);
                        let snippet = 'No messages yet';
                        if (lastMsg) {
                            if (lastMsg.isDeleted) snippet = '🚫 This message was deleted';
                            else if (lastMsg.content) {
                                const isMyMsg = lastMsg.sender?._id === user?._id;
                                const prefix = isGroup ? `${isMyMsg ? 'You' : (lastMsg.sender?.firstName || 'Someone')}: ` : (isMyMsg ? 'You: ' : '');
                                snippet = prefix + lastMsg.content.slice(0, 38) + (lastMsg.content.length > 38 ? '…' : '');
                            } else if (lastMsg.fileUrl) {
                                const icons = { image: '📷 Photo', video: '🎥 Video', audio: '🎵 Audio', application: '📄 Document' };
                                snippet = icons[lastMsg.contentType] || '📎 Attachment';
                            }
                        }
                        return (
                            <div
                                key={item._id}
                                onClick={() => (isGroup ? selectGroupChat(item) : selectIndividualChat(item))}
                                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-100 border-b last:border-0 ${
                                    isActive
                                        ? 'bg-[var(--brand-light)] border-l-2'
                                        : 'hover:bg-[var(--bg-hover)] border-l-2 border-l-transparent'
                                }`}
                                style={{ borderColor: isActive ? 'var(--brand-primary)' : 'var(--border-color)' }}
                            >
                                <div className="relative flex-shrink-0">
                                    <Avatar user={item} size={10} />
                                    {isItemOnline && (
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--bg-surface)]" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <p
                                            className={`text-[13px] leading-snug truncate ${
                                                unread > 0
                                                    ? 'font-bold'
                                                    : 'font-medium'
                                            }`}
                                            style={{ color: unread > 0 ? 'var(--text-primary)' : 'var(--text-primary)' }}
                                        >
                                            {isGroup ? item.name : getFullName(item)}
                                        </p>
                                        {lastMsg && ts && (
                                            <span
                                                className={`text-[11px] flex-shrink-0 tabular-nums ${
                                                    unread > 0 ? 'text-green-600 font-semibold' : ''
                                                }`}
                                                style={{ color: unread > 0 ? '#16a34a' : 'var(--text-muted)' }}
                                            >
                                                {formatChatTime(ts)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p
                                            className={`text-[12px] truncate leading-snug ${
                                                unread > 0 ? 'font-medium' : ''
                                            }`}
                                            style={{ color: unread > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                                        >
                                            {snippet}
                                        </p>
                                        {unread > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="flex-shrink-0 bg-green-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center tabular-nums"
                                            >
                                                {unread > 99 ? '99+' : unread}
                                            </motion.span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>
            {/* CHAT AREA */}
            <section
                className={`flex-1 flex flex-col min-w-0 relative ${selectedChat ? 'flex' : 'hidden lg:flex'}`}
                style={{ backgroundColor: 'var(--bg-app)' }}
            >
                {selectedChat ? (
                    <>
                        {/* Header */}
                        <header
                            className="flex-shrink-0 border-b px-4 py-3 flex items-center gap-3 z-10 shadow-sm"
                            style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-color)',
                            }}
                        >
                            <button
                                onClick={handleCloseChat}
                                className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)] lg:hidden flex-shrink-0"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="relative flex-shrink-0">
                                <Avatar
                                    user={selectedChat.type === 'individual' ? selectedChat.recipient : selectedChat}
                                    size={10}
                                />
                                {selectedChat.type === 'individual' &&
                                    (onlineUsers.has(selectedChat.recipient?._id) || selectedChat.recipient?.online) && (
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[var(--bg-surface)]" />
                                    )}
                            </div>
                            <div
                                className="flex-1 min-w-0 cursor-pointer select-none"
                                onClick={() => setShowMembersModal(true)}
                            >
                                <h2
                                    className="text-[14px] font-bold truncate leading-snug"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {selectedChat.type === 'individual'
                                        ? getFullName(selectedChat.recipient)
                                        : selectedChat.name || 'Unnamed Group'}
                                </h2>
                                <p
                                    className={`text-[12px] truncate leading-snug font-medium ${
                                        lastSeenText === 'Online' ? 'text-green-500' : ''
                                    }`}
                                    style={{ color: lastSeenText === 'Online' ? '#16a34a' : 'var(--text-muted)' }}
                                >
                                    {selectedChat.type === 'group'
                                        ? `${selectedChat.members?.length || 0} member${selectedChat.members?.length !== 1 ? 's' : ''}`
                                        : lastSeenText}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Message search */}
                                <div
                                    className="hidden md:flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 ring-1 ring-transparent focus-within:ring-[var(--brand-accent)]/30 focus-within:bg-[var(--bg-surface)] transition-all mr-1"
                                    style={{ backgroundColor: 'var(--bg-subtle)' }}
                                >
                                    <Search className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        value={messageSearch}
                                        onChange={(e) => setMessageSearch(e.target.value)}
                                        placeholder="Search messages"
                                        className="w-28 lg:w-36 bg-transparent text-[12px] focus:outline-none placeholder-[var(--text-muted)]"
                                        style={{ color: 'var(--text-primary)' }}
                                    />
                                    {messageSearch && (
                                        <button onClick={() => setMessageSearch('')}>
                                            <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                    )}
                                </div>
                                {selectedChat.type === 'group' && (
                                    <button
                                        onClick={() => setGroupModalMode('add')}
                                        title="Add members"
                                        className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                                        style={{ color: 'var(--brand-accent)' }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowMembersModal(true)}
                                    title="Info"
                                    className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    <Users className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleCloseChat}
                                    title="Close"
                                    className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)] hidden lg:flex"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </header>
                        {/* Pinned banner */}
                        <AnimatePresence>
                            {pinnedMessages.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="flex-shrink-0 border-b"
                                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
                                >
                                    <div className="flex items-stretch">
                                        <div className="w-1 bg-green-500 flex-shrink-0" />
                                        <button
                                            className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--bg-hover)] transition-colors min-w-0"
                                            onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1]._id)}
                                        >
                                            <Pin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#16a34a' }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#16a34a' }}>
                                                    {pinnedMessages.length > 1 ? `Pinned · ${pinnedMessages.length}` : 'Pinned message'}
                                                </p>
                                                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                                    {pinnedMessages[pinnedMessages.length - 1]?.content ||
                                                        (pinnedMessages[pinnedMessages.length - 1]?.fileUrl ? '📎 Attachment' : '—')}
                                                </p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => handlePin(pinnedMessages[pinnedMessages.length - 1])}
                                            className="px-3 flex-shrink-0 hover:bg-[var(--bg-hover)]"
                                            style={{ color: 'var(--text-muted)' }}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {/* Messages area */}
                        <div
                            ref={messagesContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 scrollbar-thin"
                            style={{
                                backgroundColor: 'var(--bg-app)',
                                backgroundImage:
                                    'url("data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fill-rule=%27evenodd%27%3E%3Cg fill=%27%23d0c9c0%27 fill-opacity=%270.08%27%3E%3Cpath d=%27M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                            }}
                            onClick={() => setContextMenu(null)}
                        >
                            {currentPage < totalPages && (
                                <div className="flex justify-center my-3">
                                    <button
                                        onClick={() => setCurrentPage((p) => p + 1)}
                                        className="px-4 py-2 text-[12px] font-medium rounded-full shadow-sm hover:bg-[var(--bg-hover)] transition-colors border"
                                        style={{
                                            backgroundColor: 'var(--bg-surface)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        ↑ Load older messages
                                    </button>
                                </div>
                            )}
                            {isMsgLoading && messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                                    <div className="w-7 h-7 border-2 border-[var(--brand-primary)]/30 border-t-[var(--brand-primary)] rounded-full animate-spin" />
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        Loading messages…
                                    </p>
                                </div>
                            )}
                            {!isMsgLoading && messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-center">
                                    <div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md"
                                        style={{ backgroundColor: 'var(--bg-surface)' }}
                                    >
                                        <Send className="w-6 h-6" style={{ color: 'var(--brand-accent)' }} />
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                                            No messages yet
                                        </p>
                                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                            Be the first to say hello! 👋
                                        </p>
                                    </div>
                                </div>
                            )}
                            {!isMsgLoading && filteredMessages.length === 0 && messageSearch && (
                                <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
                                    No messages match "{messageSearch}"
                                </p>
                            )}
                            {messagesWithSeparators.map((item) => {
                                if (item.type === 'separator')
                                    return <DateSeparator key={item.key} date={item.date} />;
                                const msg = item.msg;
                                const sender = isSender(msg);
                                return (
                                    <motion.div
                                        key={item.key}
                                        ref={(el) => {
                                            if (el) msgRefsMap.current[msg._id] = el;
                                        }}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.1 }}
                                        className={`flex mb-1 ${sender ? 'justify-end' : 'justify-start'} group`}
                                        onContextMenu={(e) => openContextMenu(e, msg)}
                                        onTouchStart={(e) => handleTouchStart(e, msg)}
                                        onTouchEnd={handleTouchEnd}
                                        onTouchMove={handleTouchEnd}
                                    >
                                        {!sender && selectedChat.type === 'group' && (
                                            <div className="self-end mb-1 mr-1.5 flex-shrink-0">
                                                <Avatar user={msg.sender} size={6} />
                                            </div>
                                        )}
                                        <div className="max-w-[72%] relative">
                                            {msg.forwardedFrom && (
                                                <div
                                                    className={`flex items-center gap-1 text-[10px] mb-0.5 ${sender ? 'justify-end' : 'justify-start'}`}
                                                    style={{ color: 'var(--text-muted)' }}
                                                >
                                                    <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                                                    Forwarded from {msg.forwardedFrom.senderName || 'Unknown'}
                                                </div>
                                            )}
                                            {msg.replyTo && (
                                                <button
                                                    onClick={() => msg.replyTo.messageId && scrollToMessage(msg.replyTo.messageId)}
                                                    className={`w-full px-3 py-2 rounded-t-2xl text-xs border-l-4 mb-0.5 text-left transition-opacity hover:opacity-80 ${
                                                        sender
                                                            ? 'bg-[#b7f5ac] text-gray-700 dark:bg-[#005C4B]/80'
                                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                                    }`}
                                                >
                                                    <p className="font-semibold truncate">{getFullName(msg.replyTo.sender)}</p>
                                                    <p className="truncate opacity-80">
                                                        {msg.replyTo.content || (msg.replyTo.fileUrl ? '📎 Attachment' : '')}
                                                    </p>
                                                </button>
                                            )}
                                            <div
                                                className={`px-3 pt-2 pb-1.5 shadow-sm select-text transition-all duration-300 ${
                                                    highlightedMsgId === msg._id
                                                        ? 'ring-2 ring-yellow-400 ring-offset-2 brightness-[1.03]'
                                                        : ''
                                                } ${
                                                    sender
                                                        ? 'bg-[#D9FDD3] dark:bg-[#005C4B] text-gray-900 dark:text-gray-100 rounded-2xl rounded-tr-[4px]'
                                                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-2xl rounded-tl-[4px]'
                                                }`}
                                            >
                                                {!sender && selectedChat.type === 'group' && (
                                                    <p className="text-xs font-bold mb-0.5 truncate" style={{ color: 'var(--brand-accent)' }}>
                                                        {getFullName(msg.sender)}
                                                    </p>
                                                )}
                                                {msg.isDeleted ? (
                                                    <p className="text-xs italic flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                                        <span>🚫</span> This message was deleted
                                                    </p>
                                                ) : (
                                                    <>
                                                        {msg.content && renderMentionContent(msg, sender)}
                                                        {msg.isEdited && <span className="text-[10px] opacity-50 ml-1 italic">edited</span>}
                                                        {msg.fileUrl && (
                                                            <div className="mt-1.5">
                                                                {msg.contentType === 'image' && (
                                                                    <img
                                                                        src={msg.fileUrl}
                                                                        alt={msg.fileName || 'img'}
                                                                        className="max-w-full rounded-xl cursor-pointer hover:opacity-95"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setMediaViewer({
                                                                                fileUrl: msg.fileUrl,
                                                                                contentType: 'image',
                                                                                fileName: msg.fileName || 'Image',
                                                                            });
                                                                        }}
                                                                    />
                                                                )}
                                                                {msg.contentType === 'video' && (
                                                                    <video src={msg.fileUrl} controls className="max-w-full rounded-xl" />
                                                                )}
                                                                {msg.contentType === 'audio' && (
                                                                    <audio src={msg.fileUrl} controls className="w-full mt-1" />
                                                                )}
                                                                {msg.contentType === 'application' && (
                                                                    <div
                                                                        className="flex items-center gap-2 p-2 rounded-xl mt-1 cursor-pointer"
                                                                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setMediaViewer({
                                                                                fileUrl: msg.fileUrl,
                                                                                contentType: 'pdf',
                                                                                fileName: msg.fileName || 'Document',
                                                                            });
                                                                        }}
                                                                    >
                                                                        <FileIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                                                                        <p className="text-xs font-medium truncate">{msg.fileName || 'Document'}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                                        {formatMsgTime(msg.createdAt)}
                                                    </span>
                                                    {sender && !msg.isDeleted && (
                                                        <CheckCheck className="w-3 h-3" style={{ color: 'var(--brand-accent)' }} />
                                                    )}
                                                </div>
                                            </div>
                                            {!msg.isDeleted && (
                                                <button
                                                    className={`absolute top-1/2 -translate-y-1/2 ${sender ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full shadow-sm`}
                                                    style={{ backgroundColor: 'var(--bg-surface)' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startReply(msg);
                                                    }}
                                                    title="Reply"
                                                >
                                                    <CornerUpLeft className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                            <AnimatePresence>
                                {typingUsers[selectedChat._id]?.isTyping && (
                                    <TypingBubble name={getFullName(users.find((u) => u._id === typingUsers[selectedChat._id]?.id)) || 'Someone'} />
                                )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} className="h-2" />
                        </div>
                        {/* Scroll button */}
                        <AnimatePresence>
                            {showScrollButton && (
                                <motion.button
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    onClick={() => scrollToBottom('smooth')}
                                    className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full shadow-lg border text-xs font-medium pointer-events-auto"
                                    style={{
                                        backgroundColor: 'var(--bg-surface)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                    {unreadCounts[selectedChat._id] > 0
                                        ? `${unreadCounts[selectedChat._id]} new message${unreadCounts[selectedChat._id] > 1 ? 's' : ''}`
                                        : 'Jump to latest'}
                                </motion.button>
                            )}
                        </AnimatePresence>
                        {/* Input area */}
                        <div
                            className="flex-shrink-0 border-t px-3 sm:px-4 py-3"
                            style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-color)',
                            }}
                        >
                            <AnimatePresence>
                                {replyTo && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2 border-l-4 overflow-hidden"
                                        style={{
                                            backgroundColor: 'var(--bg-subtle)',
                                            borderColor: 'var(--brand-accent)',
                                        }}
                                    >
                                        <CornerUpLeft className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--brand-accent)' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--brand-accent)' }}>
                                                {getFullName(replyTo.sender)}
                                            </p>
                                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                                {replyTo.content || '📎 Attachment'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={cancelReply}
                                            className="p-0.5 hover:bg-[var(--bg-hover)] rounded flex-shrink-0"
                                        >
                                            <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <AnimatePresence>
                                {editingMessage && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="flex items-center gap-2 rounded-xl px-3 py-2 mb-2 border-l-4 overflow-hidden"
                                        style={{
                                            backgroundColor: 'var(--brand-light)',
                                            borderColor: 'var(--brand-primary)',
                                        }}
                                    >
                                        <Edit2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold" style={{ color: 'var(--brand-primary)' }}>
                                                Editing message
                                            </p>
                                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                                {editingMessage.originalContent}
                                            </p>
                                        </div>
                                        <button
                                            onClick={cancelEdit}
                                            className="p-0.5 hover:bg-[var(--bg-hover)] rounded flex-shrink-0"
                                        >
                                            <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="flex items-end gap-2">
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <div className="relative">
                                        <button
                                            ref={emojiButtonRef}
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                                            style={{ color: 'var(--brand-accent)' }}
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        <AnimatePresence>
                                            {showEmojiPicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="absolute bottom-full left-0 z-30 mb-2 shadow-2xl rounded-2xl overflow-hidden"
                                                >
                                                    <EmojiPicker
                                                        onEmojiClick={(e) => {
                                                            setNewMessage((p) => p + e.emoji);
                                                            inputRef.current?.focus();
                                                        }}
                                                        theme="auto"
                                                        emojiStyle="native"
                                                        skinTonesDisabled
                                                        height={340}
                                                        width={320}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-hover)]"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                        onChange={(e) => {
                                            const f = e.target.files[0];
                                            if (f && f.size > 50 * 1024 * 1024) {
                                                toast.error('File exceeds 50MB');
                                                return;
                                            }
                                            if (f) setFile(f);
                                        }}
                                    />
                                </div>
                                <div
                                    className="relative flex-1 rounded-2xl px-4 py-2.5 flex items-center gap-2 min-h-[44px] ring-1 ring-transparent focus-within:ring-[var(--brand-accent)]/30 focus-within:bg-[var(--bg-surface)] transition-all"
                                    style={{ backgroundColor: 'var(--bg-subtle)' }}
                                >
                                                                        <textarea
                                        ref={inputRef}
                                        value={newMessage}
                                        onChange={(e) => {
                                            const nextValue = e.target.value;
                                            setNewMessage(nextValue);
                                            setDraftMentions((current) => normalizeDraftMentions(nextValue, current));
                                            if (selectedChat?._id) debouncedTyping(selectedChat._id, user?._id);
                                            if (selectedChat?.type === 'group') {
                                                const nextMatch = findMentionMatch(nextValue, e.target.selectionStart ?? nextValue.length);
                                                setMentionState(nextMatch ? { ...nextMatch, activeIndex: 0 } : EMPTY_MENTION_STATE);
                                            } else {
                                                setMentionState(EMPTY_MENTION_STATE);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (visibleMentionOptions.length) {
                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setMentionState((current) => ({ ...current, activeIndex: (current.activeIndex + 1) % visibleMentionOptions.length }));
                                                    return;
                                                }
                                                if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setMentionState((current) => ({ ...current, activeIndex: current.activeIndex <= 0 ? visibleMentionOptions.length - 1 : current.activeIndex - 1 }));
                                                    return;
                                                }
                                                if (e.key === 'Enter' || e.key === 'Tab') {
                                                    e.preventDefault();
                                                    chooseMention(visibleMentionOptions[Math.min(mentionState.activeIndex, visibleMentionOptions.length - 1)]);
                                                    return;
                                                }
                                                if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    setMentionState(EMPTY_MENTION_STATE);
                                                    return;
                                                }
                                            }
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder={editingMessage ? 'Edit your message...' : replyTo ? 'Reply...' : selectedChat?.type === 'group' ? 'Type a message... Use @ to mention someone' : 'Type a message'}
                                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder-[var(--text-muted)] min-w-0 resize-none overflow-y-auto"
                                        style={{ 
                                            color: 'var(--text-primary)',
                                            minHeight: '44px',
                                            maxHeight: '160px',
                                            lineHeight: '1.35'
                                        }}
                                        rows={1}
                                    />
                                    {visibleMentionOptions.length > 0 && (
                                        <div
                                            className="absolute bottom-full left-4 right-4 mb-2 overflow-hidden rounded-2xl border"
                                            style={{
                                                borderColor: 'var(--border-color)',
                                                backgroundColor: 'var(--bg-surface)',
                                                boxShadow: '0 12px 32px rgba(17,24,39,0.12)',
                                            }}
                                        >
                                            {visibleMentionOptions.map((option, index) => (
                                                <button
                                                    key={option.userId}
                                                    type="button"
                                                    onClick={() => chooseMention(option)}
                                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
                                                    style={index === mentionState.activeIndex
                                                        ? { backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }
                                                        : { color: 'var(--text-primary)' }}
                                                >
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>
                                                        {option.label.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{option.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {file && (
                                        <div className="flex items-center gap-1 text-xs truncate max-w-[80px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                                            <span className="truncate">{file.name}</span>
                                            <button onClick={() => setFile(null)}>
                                                <X className="w-3 h-3 text-red-400" />
                                            </button>
                                        </div>
                                    )}
                                    {isUploading && <Clock className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
                                </div>
                                <motion.button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() && !file}
                                    whileTap={{ scale: 0.92 }}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all ${
                                        newMessage.trim() || file
                                            ? 'bg-[var(--brand-accent)] hover:opacity-90 text-white'
                                            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                                    }`}
                                >
                                    <Send className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 select-none">
                        <div className="relative">
                            <div
                                className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
                                style={{ backgroundColor: 'var(--bg-surface)' }}
                            >
                                <Users className="w-10 h-10" style={{ color: 'var(--brand-accent)' }} />
                            </div>
                            <div
                                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                                style={{ backgroundColor: '#16a34a' }}
                            >
                                <span className="text-white text-sm font-bold">✓</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                Your messages
                            </h3>
                            <p className="text-[13px] max-w-[240px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                Pick a conversation from the list to start chatting with your team.
                            </p>
                        </div>
                    </div>
                )}
            </section>
            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <MessageContextMenu
                        msg={contextMenu.msg}
                        isSender={isSender(contextMenu.msg)}
                        isPinned={pinnedMessages.some((p) => p._id === contextMenu.msg._id)}
                        position={contextMenu.position}
                        onClose={() => setContextMenu(null)}
                        onReply={() => {
                            startReply(contextMenu.msg);
                            setContextMenu(null);
                        }}
                        onForward={() => {
                            setForwardModal({ msg: contextMenu.msg });
                            setContextMenu(null);
                        }}
                        onPin={() => {
                            handlePin(contextMenu.msg);
                            setContextMenu(null);
                        }}
                        onEdit={() => {
                            startEdit(contextMenu.msg);
                            setContextMenu(null);
                        }}
                        onCopy={() => {
                            navigator.clipboard?.writeText(contextMenu.msg.content || '');
                            toast.success('Copied!');
                            setContextMenu(null);
                        }}
                        onDeleteForMe={() => {
                            openDeleteModal(contextMenu.msg);
                            setContextMenu(null);
                        }}
                        onDeleteForEveryone={() => {
                            openDeleteModal(contextMenu.msg);
                            setContextMenu(null);
                        }}
                    />
                )}
            </AnimatePresence>
            {/* Delete Modal */}
            <AnimatePresence>
                {deleteModal && (
                    <DeleteConfirmModal
                        msg={deleteModal.msg}
                        isSender={isSender(deleteModal.msg)}
                        onDeleteForMe={() => handleDeleteForMe(deleteModal.msg)}
                        onDeleteForEveryone={() => handleDeleteForEveryone(deleteModal.msg)}
                        onCancel={() => setDeleteModal(null)}
                    />
                )}
            </AnimatePresence>
            {/* Forward Modal */}
            <AnimatePresence>
                {forwardModal && (
                    <ForwardModal
                        msg={forwardModal.msg}
                        allUsers={users}
                        groups={groups}
                        userChatMap={userChatMap}
                        currentUserId={user?._id}
                        onForward={handleForwardConfirm}
                        onClose={() => setForwardModal(null)}
                    />
                )}
            </AnimatePresence>
            {/* Group Modal */}
            <AnimatePresence>
                {groupModalMode && (
                    <GroupModal
                        isAddMode={groupModalMode === 'add'}
                        selectedChat={selectedChat}
                        users={users}
                        onClose={() => setGroupModalMode(null)}
                        onCreateGroup={handleCreateGroup}
                        onAddMembers={handleAddMembers}
                    />
                )}
            </AnimatePresence>
            {/* Members Modal */}
            <AnimatePresence>
                {showMembersModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4"
                        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                        onClick={() => setShowMembersModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, y: 10, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            className="rounded-2xl shadow-2xl border w-full max-w-sm"
                            style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-color)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4 px-5 pt-5">
                                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    {selectedChat?.type === 'group'
                                        ? selectedChat.name
                                        : getFullName(selectedChat?.recipient)}
                                </h3>
                                <button
                                    onClick={() => setShowMembersModal(false)}
                                    className="p-1.5 rounded-full hover:bg-[var(--bg-hover)]"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto px-5 pb-5">
                                {(selectedChat?.members || (selectedChat?.recipient ? [selectedChat.recipient] : [])).map((m) => {
                                    const isOnline = onlineUsers.has(m._id) || m.online;
                                    return (
                                        <div key={m._id} className="flex items-center gap-3 py-1.5">
                                            <div className="relative flex-shrink-0">
                                                <Avatar user={m} size={8} />
                                                {isOnline && (
                                                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-[var(--bg-surface)]" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {getFullName(m)}
                                                </p>
                                                <p className={`text-xs ${isOnline ? 'text-green-500' : ''}`} style={{ color: isOnline ? '#16a34a' : 'var(--text-muted)' }}>
                                                    {isOnline ? 'Online' : formatLastSeen(m.lastActive)}
                                                </p>
                                            </div>
                                            {selectedChat?.adminId === m._id && (
                                                <span
                                                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                                    style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}
                                                >
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setShowMembersModal(false)}
                                className="w-full py-2.5 text-sm font-medium transition-colors rounded-b-2xl"
                                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-subtle)' }}
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Media Viewer */}
            <AnimatePresence>
                {mediaViewer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
                        style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
                        onClick={() => setMediaViewer(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            className="relative w-full max-w-3xl max-h-[92vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                <p className="text-sm font-medium text-white truncate">{mediaViewer.fileName}</p>
                                <div className="flex gap-2">
                                    <a
                                        href={mediaViewer.fileUrl}
                                        download
                                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg"
                                    >
                                        Download
                                    </a>
                                    <button
                                        onClick={() => setMediaViewer(null)}
                                        className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto flex items-center justify-center rounded-xl bg-black/50">
                                {mediaViewer.contentType === 'image' && (
                                    <img src={mediaViewer.fileUrl} alt="" className="max-w-full max-h-[80vh] rounded-xl object-contain" />
                                )}
                                {mediaViewer.contentType === 'video' && (
                                    <video src={mediaViewer.fileUrl} controls autoPlay className="max-w-full max-h-[80vh] rounded-xl" />
                                )}
                                {mediaViewer.contentType === 'audio' && (
                                    <audio src={mediaViewer.fileUrl} controls autoPlay className="w-full" />
                                )}
                                {(mediaViewer.contentType === 'pdf' || mediaViewer.contentType === 'application') && (
                                    <iframe
                                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(mediaViewer.fileUrl)}&embedded=true`}
                                        className="w-full h-[75vh] rounded-xl"
                                        title="Document"
                                    />
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style>{`
                .scrollbar-thin::-webkit-scrollbar { width: 3px; }
                .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.4); border-radius: 10px; }
                .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.7); }
                .scrollbar-thin { scrollbar-width: thin; scrollbar-color: rgba(156,163,175,0.4) transparent; }
            `}</style>
        </div>
    );
};
export default TeamChat;