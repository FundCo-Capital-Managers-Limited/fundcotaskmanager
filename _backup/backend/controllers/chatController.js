// controllers/chatController.js
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';
import mongoose from 'mongoose';
import Chat from '../models/chatModel.js';
import Message from '../models/messageModel.js';
import User from '../models/userModel.js';
import { createNotification } from '../utils/notificationService.js';
import { uploadFileToIPFS } from '../pinning/pinata.js';

// Safe full name helper
const getFullName = (user) => {
    if (!user) return 'Unknown User';
    if (user.fullName) return user.fullName.trim();
    if (user.firstName || user.lastName) {
        return `${user.firstName || ''} ${user.lastName || ''} ${user.otherName || ''}`.trim();
    }
    return user.name?.trim() || 'Unknown User';
};

const getMessagePreview = ({ content, fileName, fileUrl }) => {
    if (content) return String(content).trim().slice(0, 140);
    if (fileName) return `Sent ${fileName}`;
    if (fileUrl) return 'Sent an attachment';
    return 'Sent a message';
};

const buildMentions = (mentions = [], chatMembers = [], senderId) => {
    const memberSet = new Set((chatMembers || []).map((memberId) => String(memberId)));
    const senderKey = String(senderId);
    const seen = new Set();

    return (Array.isArray(mentions) ? mentions : []).reduce((accumulator, item) => {
        const userId = item?.user?._id || item?.userId || item?._id || item?.id;
        const cleanLabel = sanitizeHtml(
            item?.label || item?.name || item?.fullName || '',
            { allowedTags: [], allowedAttributes: {} }
        ).trim();

        if (!userId || !mongoose.isValidObjectId(userId)) return accumulator;
        const userKey = String(userId);
        if (userKey === senderKey || !memberSet.has(userKey) || seen.has(userKey)) return accumulator;

        seen.add(userKey);
        accumulator.push({
            user: new mongoose.Types.ObjectId(userKey),
            label: validator.isLength(cleanLabel || userKey, { min: 1, max: 80 }) ? cleanLabel : userKey,
        });
        return accumulator;
    }, []);
};

// Fetch all users except current user
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } })
            .select('firstName lastName otherName avatar online lastActive')
            .lean();
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

// Create or get individual chat
export const createIndividualChat = async (req, res) => {
    const { recipientId } = req.body;
    if (!recipientId || !mongoose.isValidObjectId(recipientId)) {
        return res.status(400).json({ success: false, message: 'Valid recipient ID required' });
    }
    try {
        const recipient = await User.findById(recipientId)
            .select('firstName lastName otherName avatar online lastActive')
            .lean();
        if (!recipient) {
            return res.status(404).json({ success: false, message: 'Recipient not found' });
        }
        let chat = await Chat.findOne({
            type: 'individual',
            members: { $all: [req.user._id, recipientId], $size: 2 },
        }).populate('members', 'firstName lastName otherName avatar online lastActive').lean();
        if (!chat) {
            chat = new Chat({
                type: 'individual',
                members: [req.user._id, recipientId],
                unreadCounts: new Map([[req.user._id.toString(), 0], [recipientId.toString(), 0]]),
                updatedAt: Date.now(),
            });
            await chat.save();
            chat = await Chat.findById(chat._id)
                .populate('members', 'firstName lastName otherName avatar online lastActive')
                .lean();
        }
        // Attach the caller's unread count for this chat
        const unreadCount = chat.unreadCounts
            ? (chat.unreadCounts[req.user._id.toString()] ?? 0)
            : 0;
        res.json({ success: true, chat: { ...chat, myUnreadCount: unreadCount } });
    } catch (error) {
        console.error('Error creating individual chat:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to create chat' });
    }
};

// Fetch all groups for user
export const getGroups = async (req, res) => {
    try {
        const groups = await Chat.find({
            type: 'group',
            members: req.user._id,
        })
            .select('_id name avatar adminId members updatedAt unreadCounts')
            .populate('members', 'firstName lastName otherName avatar online lastActive')
            .populate('adminId', 'firstName lastName')
            .lean();

        // Attach each group's unread count for the calling user
        const groupsWithUnread = groups.map((g) => ({
            ...g,
            myUnreadCount: g.unreadCounts
                ? (g.unreadCounts[req.user._id.toString()] ?? 0)
                : 0,
        }));

        res.json({ success: true, groups: groupsWithUnread });
    } catch (error) {
        console.error('Error fetching groups:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch groups' });
    }
};

// Create new group
export const createGroup = async (req, res) => {
    const { name, members, avatar } = req.body;
    if (!members || !Array.isArray(members) || members.length < 1) {
        return res.status(400).json({ success: false, message: 'At least one member required' });
    }
    const sanitizedName = sanitizeHtml(name || 'Unnamed Group', { allowedTags: [], allowedAttributes: {} });
    if (!validator.isLength(sanitizedName, { min: 1, max: 50 })) {
        return res.status(400).json({ success: false, message: 'Group name must be between 1 and 50 characters' });
    }
    try {
        const uniqueMemberStrings = [...new Set(members)];
        const invalidIds = uniqueMemberStrings.filter((id) => !mongoose.isValidObjectId(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({ success: false, message: `Invalid member IDs: ${invalidIds.join(', ')}` });
        }
        const uniqueMembers = uniqueMemberStrings.map(id => new mongoose.Types.ObjectId(id));

        // Exclude the creator from member validation — they may or may not be in the list
        const nonCreatorIds = uniqueMemberStrings.filter(id => id !== req.user._id.toString());
        const nonCreatorObjectIds = nonCreatorIds.map(id => new mongoose.Types.ObjectId(id));

        const validMembers = await User.find({ _id: { $in: nonCreatorObjectIds.length ? nonCreatorObjectIds : uniqueMembers } })
            .select('firstName lastName otherName avatar online lastActive')
            .lean();

        // Only validate non-creator members exist
        if (nonCreatorIds.length > 0 && validMembers.length !== nonCreatorIds.length) {
            const foundIds = validMembers.map((m) => m._id.toString());
            const missingIds = nonCreatorIds.filter((id) => !foundIds.includes(id));
            return res.status(400).json({ success: false, message: `Members not found: ${missingIds.join(', ')}` });
        }

        // Build allMembers using string dedup then convert — ObjectId Set dedup is unreliable
        const allMemberStrings = [...new Set([...uniqueMemberStrings, req.user._id.toString()])];
        const allMembers = allMemberStrings.map(id => new mongoose.Types.ObjectId(id));
        const unreadMap = new Map();
        allMembers.forEach(id => unreadMap.set(id.toString(), 0));
        const chat = new Chat({
            type: 'group',
            name: sanitizedName,
            avatar: avatar && validator.isURL(avatar) ? avatar : '',
            adminId: req.user._id,
            members: allMembers,
            unreadCounts: unreadMap,
            updatedAt: Date.now(),
        });
        await chat.save();
        const populatedChat = await Chat.findById(chat._id)
            .select('_id type name avatar adminId members updatedAt unreadCounts')
            .populate('members', 'firstName lastName otherName avatar online lastActive')
            .populate('adminId', 'firstName lastName')
            .lean();
        req.io.to(chat._id.toString()).emit('groupCreated', { success: true, group: populatedChat });
        res.json({ success: true, group: populatedChat });
    } catch (error) {
        console.error('Error creating group:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to create group' });
    }
};

// Add members to group
export const addGroupMembers = async (req, res) => {
    const { members } = req.body;
    const { groupId } = req.params;
    if (!mongoose.isValidObjectId(groupId)) {
        return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }
    if (!members || !Array.isArray(members) || members.length < 1) {
        return res.status(400).json({ success: false, message: 'At least one member required' });
    }
    try {
        const uniqueMemberStrings = [...new Set(members)];
        const invalidIds = uniqueMemberStrings.filter((id) => !mongoose.isValidObjectId(id));
        if (invalidIds.length > 0) {
            return res.status(400).json({ success: false, message: `Invalid member IDs: ${invalidIds.join(', ')}` });
        }
        const uniqueMembers = uniqueMemberStrings.map(id => new mongoose.Types.ObjectId(id));
        const chat = await Chat.findOne({ _id: groupId, type: 'group', members: req.user._id });
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Group not found or access denied' });
        }
        const validMembers = await User.find({ _id: { $in: uniqueMembers } })
            .select('firstName lastName otherName avatar online lastActive')
            .lean();
        if (validMembers.length !== uniqueMemberStrings.length) {
            const foundIds = validMembers.map((m) => m._id.toString());
            const missingIds = uniqueMemberStrings.filter((id) => !foundIds.includes(id));
            return res.status(400).json({ success: false, message: `Members not found: ${missingIds.join(', ')}` });
        }
        const newMembers = uniqueMembers.filter((id) => !chat.members.includes(id));
        if (newMembers.length === 0) {
            return res.status(400).json({ success: false, message: 'No new members to add' });
        }
        newMembers.forEach(id => chat.unreadCounts.set(id.toString(), 0));
        chat.members = [...new Set([...chat.members, ...newMembers])];
        chat.updatedAt = Date.now();
        await chat.save();
        const populatedChat = await Chat.findById(chat._id)
            .select('_id type name avatar adminId members updatedAt unreadCounts')
            .populate('members', 'firstName lastName otherName avatar online lastActive')
            .populate('adminId', 'firstName lastName')
            .lean();
        req.io.to(chat._id.toString()).emit('groupUpdated', { success: true, group: populatedChat });
        res.json({ success: true, group: populatedChat });
    } catch (error) {
        console.error('Error adding group members:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to add members' });
    }
};

// getChatMessages — parallel access-check + fetch + count
export const getChatMessages = async (req, res) => {
    const { chatId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    if (!mongoose.isValidObjectId(chatId)) {
        return res.status(400).json({ success: false, message: 'Invalid chat ID' });
    }
    try {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // Run access check, message fetch, and count all in parallel
        // Exclude messages the caller has deleted for themselves (deletedFor filter)
        const msgQuery = { chatId, deletedFor: { $nin: [req.user._id] } };
        const [chat, messages, totalMessages] = await Promise.all([
            Chat.findOne({ _id: chatId, members: req.user._id }).select('_id').lean(),
            Message.find(msgQuery)
                .select('_id chatId sender content fileUrl fileName contentType createdAt isDeleted isEdited reactions replyTo readBy mentions')
                .populate('sender', 'firstName lastName otherName avatar')
                .populate('mentions.user', 'firstName lastName otherName avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Message.countDocuments(msgQuery),
        ]);

        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found or access denied' });
        }

        res.json({
            success: true,
            messages: messages.reverse(),
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalMessages / limitNum),
                totalMessages,
            },
        });
    } catch (error) {
        console.error('Error fetching messages:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
};

// Send message (real-time fixed)
export const sendMessage = async (req, res) => {
    const { chatId } = req.params;
    const { content, fileUrl, contentType, fileName, replyTo, mentions = [] } = req.body;
    if (!mongoose.isValidObjectId(chatId)) {
        return res.status(400).json({ success: false, message: 'Invalid chat ID' });
    }
    if (!content && !fileUrl) {
        return res.status(400).json({ success: false, message: 'Message content or file required' });
    }
    const sanitizedContent = content ? sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }) : '';
    if (sanitizedContent && !validator.isLength(sanitizedContent, { min: 1, max: 1000 })) {
        return res.status(400).json({ success: false, message: 'Message content must be between 1 and 1000 characters' });
    }
    if (fileUrl && !validator.isURL(fileUrl)) {
        return res.status(400).json({ success: false, message: 'Invalid file URL' });
    }
    if (replyTo && !mongoose.isValidObjectId(replyTo)) {
        return res.status(400).json({ success: false, message: 'Invalid replyTo ID' });
    }
    try {
        const chat = await Chat.findOne(
            { _id: chatId, members: req.user._id },
            { members: 1, unreadCounts: 1, type: 1, name: 1 }
        ).lean();
        if (!chat) {
            return res.status(404).json({ success: false, message: 'Chat not found or access denied' });
        }

        const resolvedMentions = buildMentions(mentions, chat.members, req.user._id);

        const [message, senderDoc, mentionDocs] = await Promise.all([
            Message.create({
                chatId,
                sender: req.user._id,
                content: sanitizedContent,
                fileUrl,
                contentType,
                fileName,
                mentions: resolvedMentions,
                replyTo: replyTo ? await (async () => {
                    if (!mongoose.isValidObjectId(replyTo)) return null;
                    const original = await Message.findById(replyTo)
                        .populate('sender', 'firstName lastName otherName')
                        .lean();
                    if (!original) return null;
                    return {
                        messageId: original._id,
                        content: original.isDeleted ? 'This message was deleted' : original.content,
                        senderName: original.sender ? `${original.sender.firstName || ''} ${original.sender.lastName || ''}`.trim() : 'Unknown',
                        sender: original.sender?._id,
                        contentType: original.contentType,
                        fileUrl: original.fileUrl,
                    };
                })() : null,
            }),
            User.findById(req.user._id).select('firstName lastName otherName avatar').lean(),
            resolvedMentions.length
                ? User.find({ _id: { $in: resolvedMentions.map((item) => item.user) } })
                    .select('firstName lastName otherName avatar')
                    .lean()
                : Promise.resolve([]),
        ]);

        User.updateOne({ _id: req.user._id }, { $set: { lastActive: new Date() } }).catch(() => {});

        const senderName = getFullName(senderDoc);
        const mentionMap = new Map(mentionDocs.map((userDoc) => [String(userDoc._id), userDoc]));
        const populatedMentions = resolvedMentions.map((item) => ({
            user: mentionMap.get(String(item.user)) || { _id: item.user, firstName: item.label },
            label: item.label,
        }));

        const populatedMessage = {
            _id: message._id,
            chatId: message.chatId,
            sender: senderDoc,
            content: message.content,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            contentType: message.contentType,
            mentions: populatedMentions,
            isDeleted: false,
            isEdited: false,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            replyTo: message.replyTo,
        };

        const unreadIncrements = {};
        const now = Date.now();

        chat.members.forEach((memberId) => {
            const memberKey = memberId.toString();
            if (memberKey !== req.user._id.toString()) {
                const currentCount = (chat.unreadCounts && chat.unreadCounts[memberKey]) || 0;
                const newCount = currentCount + 1;
                unreadIncrements[`unreadCounts.${memberKey}`] = newCount;
                req.io.to(`user:${memberKey}`).emit('unreadUpdate', {
                    chatId,
                    count: newCount,
                    message: populatedMessage,
                });
            }
        });

        Chat.findByIdAndUpdate(chatId, {
            $set: { updatedAt: now, ...unreadIncrements },
        }).catch((error) => console.error('Chat update error:', error.message));

        const preview = getMessagePreview({ content: sanitizedContent, fileName, fileUrl });
        if (chat.type === 'individual') {
            const recipientId = chat.members.find((memberId) => String(memberId) !== String(req.user._id));
            if (recipientId) {
                await createNotification({
                    userId: recipientId,
                    type: 'chat',
                    title: `${senderName} sent you a message`,
                    body: preview,
                    actorId: req.user._id,
                    actorName: senderName,
                    entityId: chatId,
                    entityType: 'Chat',
                    data: { chatId: String(chatId), kind: 'direct' },
                    io: req.io,
                });
            }
        } else if (chat.type === 'group') {
            const mentionSet = new Set(resolvedMentions.map((mention) => String(mention.user)));
            const recipients = chat.members
                .map((memberId) => String(memberId))
                .filter((memberId) => memberId !== String(req.user._id));

            await Promise.all(recipients.map((memberId) => {
                const isMentioned = mentionSet.has(memberId);
                return createNotification({
                    userId: memberId,
                    type: 'chat',
                    title: isMentioned
                        ? `${senderName} mentioned you in ${chat.name || 'a group chat'}`
                        : `New message in ${chat.name || 'your group chat'}`,
                    body: preview,
                    actorId: req.user._id,
                    actorName: senderName,
                    entityId: chatId,
                    entityType: 'Chat',
                    data: {
                        chatId: String(chatId),
                        kind: isMentioned ? 'mention' : 'group',
                        chatName: chat.name || '',
                    },
                    io: req.io,
                });
            }));
        }

        req.io.to(chatId.toString()).emit('message', populatedMessage);
        res.json({ success: true, message: populatedMessage });
    } catch (error) {
        console.error('Error sending message:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

// Mark chat as read — resets unread count for the calling user
export const markChatRead = async (req, res) => {
    const { chatId } = req.params;
    if (!mongoose.isValidObjectId(chatId)) {
        return res.status(400).json({ success: false, message: 'Invalid chat ID' });
    }
    try {
        // Atomic update — no need to load the whole document
        const result = await Chat.findOneAndUpdate(
            { _id: chatId, members: req.user._id },
            { $set: { [`unreadCounts.${req.user._id.toString()}`]: 0 } },
            { new: false, projection: { _id: 1 } }
        );
        if (!result) {
            return res.status(404).json({ success: false, message: 'Chat not found or access denied' });
        }
        res.json({ success: true, chatId, count: 0 });
    } catch (error) {
        console.error('Error marking chat as read:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to mark chat as read' });
    }
};

// Edit message
export const editMessage = async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }
    if (!content || !validator.isLength(content, { min: 1, max: 1000 })) {
        return res.status(400).json({ success: false, message: 'Valid message content required' });
    }
    try {
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized to edit this message' });
        }
        if (message.isDeleted) {
            return res.status(400).json({ success: false, message: 'Cannot edit a deleted message' });
        }
        if (new Date() - new Date(message.createdAt) > 5 * 60 * 1000) {
            return res.status(400).json({ success: false, message: 'Edit time limit exceeded' });
        }
        message.content = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
        message.isEdited = true;
        await message.save();
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName otherName avatar')
            .populate('mentions.user', 'firstName lastName otherName avatar')
            .lean();
        req.io.to(message.chatId.toString()).emit('messageUpdated', populatedMessage);
        res.json({ success: true, message: populatedMessage });
    } catch (error) {
        console.error('Error editing message:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to edit message' });
    }
};

// Delete message — WhatsApp-style dual mode
// deleteScope: 'everyone' (default, sender only) | 'me' (any participant, hides for caller only)
export const deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    const { deleteScope = 'everyone' } = req.body; // 'everyone' | 'me'

    if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }
    try {
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        // Verify the caller is a member of this chat
        const chat = await Chat.findOne({ _id: message.chatId, members: req.user._id }).select('_id').lean();
        if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

        if (deleteScope === 'me') {
            // ── Delete for me: add caller to deletedFor array ──────────────────
            // Any participant can do this, any time, for any message
            if (!message.deletedFor.some((id) => id.toString() === req.user._id.toString())) {
                message.deletedFor.push(req.user._id);
                await message.save();
            }
            // This is a client-side only change — no broadcast needed
            return res.json({ success: true, messageId, deleteScope: 'me' });
        }

        // ── Delete for everyone ────────────────────────────────────────────────
        // Only the sender can delete for everyone
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the sender can delete for everyone' });
        }
        if (message.isDeleted) {
            return res.json({ success: true, messageId, deleteScope: 'everyone' }); // already deleted
        }

        message.isDeleted = true;
        message.content = 'This message was deleted';
        message.fileUrl = null;
        message.fileName = null;
        message.contentType = '';
        message.reactions = [];
        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName otherName avatar')
            .populate('mentions.user', 'firstName lastName otherName avatar')
            .lean();

        // Broadcast to everyone in the chat room
        req.io.to(message.chatId.toString()).emit('messageDeleted', { ...populatedMessage, deleteScope: 'everyone' });
        res.json({ success: true, message: populatedMessage, deleteScope: 'everyone' });
    } catch (error) {
        console.error('Error deleting message:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to delete message' });
    }
};

// Upload file
export const uploadChatFile = async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const file = req.files.file;
        if (file.size > 50 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: 'File size exceeds 50MB' });
        }
        const buffer = file.data;
        const fileName = sanitizeHtml(file.name, { allowedTags: [], allowedAttributes: {} });
        const mimeType = file.mimetype;
        const cid = await uploadFileToIPFS(buffer, fileName, mimeType);
        const fileUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        const contentType = mimeType.split('/')[0];
        res.json({ success: true, fileUrl, contentType, fileName });
    } catch (error) {
        console.error('Error uploading chat file:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
};

// Fetch chat timestamps — single aggregate, no sub-queries
export const getChatTimestamps = async (req, res) => {
    try {
        // Get all chats in one query, then aggregate messages in one pipeline
        const userChats = await Chat.find({ members: req.user._id }).select('_id updatedAt').lean();
        const chatIds = userChats.map((c) => c._id);

        const lastMsgAgg = await Message.aggregate([
            { $match: { chatId: { $in: chatIds } } },
            { $sort: { createdAt: -1 } },
            { $group: { _id: '$chatId', createdAt: { $first: '$createdAt' } } },
        ]);

        const hasMsgSet = new Set(lastMsgAgg.map((m) => m._id.toString()));
        const timestamps = {};

        // Only record timestamps for chats that have actual messages.
        // No updatedAt fallback — that causes empty chats to show fake recent times.
        lastMsgAgg.forEach((m) => { timestamps[m._id.toString()] = m.createdAt.toISOString(); });

        res.json({ success: true, timestamps });
    } catch (error) {
        console.error('Error fetching chat timestamps:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch timestamps' });
    }
};

// Get total unread count
export const getUnreadTotal = async (req, res) => {
    try {
        const total = await Chat.aggregate([
            { $match: { members: req.user._id } },
            { $group: { _id: null, total: { $sum: { $ifNull: [ `$unreadCounts.${req.user._id.toString()}`, 0 ] } } } }
        ]);
        res.json({ success: true, total: total[0]?.total || 0 });
    } catch (error) {
        console.error('Error fetching unread total:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch unread total' });
    }
};

// Get all unread counts for the current user (one map of chatId -> count)
export const getAllUnreadCounts = async (req, res) => {
    try {
        const chats = await Chat.find({ members: req.user._id })
            .select('_id unreadCounts')
            .lean();
        const counts = {};
        chats.forEach((chat) => {
            const count = chat.unreadCounts
                ? (chat.unreadCounts[req.user._id.toString()] ?? 0)
                : 0;
            if (count > 0) counts[chat._id.toString()] = count;
        });
        res.json({ success: true, counts });
    } catch (error) {
        console.error('Error fetching all unread counts:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch unread counts' });
    }
};

// Mark message as read
export const markMessageRead = async (req, res) => {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }
    try {
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
        if (!message.readBy.some((rb) => rb.userId.toString() === req.user._id.toString())) {
            message.readBy.push({ userId: req.user._id, timestamp: new Date() });
            await message.save();
        }
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName otherName avatar')
            .populate('mentions.user', 'firstName lastName otherName avatar')
            .lean();
        req.io.to(message.chatId.toString()).emit('messageRead', populatedMessage);
        res.json({ success: true, message: populatedMessage });
    } catch (error) {
        console.error('Error marking message as read:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to mark message as read' });
    }
};

// Add reaction
export const addReaction = async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }
    if (!emoji || !validator.isLength(emoji, { min: 1, max: 10 })) {
        return res.status(400).json({ success: false, message: 'Valid emoji required' });
    }
    try {
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
        if (message.isDeleted) return res.status(400).json({ success: false, message: 'Cannot react to deleted message' });
        const existingReaction = message.reactions.find(r => r.userId.toString() === req.user._id.toString());
        if (existingReaction) {
            existingReaction.emoji = emoji;
            existingReaction.timestamp = new Date();
        } else {
            message.reactions.push({ userId: req.user._id, emoji, timestamp: new Date() });
        }
        await message.save();
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName otherName avatar')
            .populate('mentions.user', 'firstName lastName otherName avatar')
            .lean();
        req.io.to(message.chatId.toString()).emit('messageUpdated', populatedMessage);
        res.json({ success: true, message: populatedMessage });
    } catch (error) {
        console.error('Error adding reaction:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to add reaction' });
    }
};

// Remove reaction
export const removeReaction = async (req, res) => {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }
    try {
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
        message.reactions = message.reactions.filter(r => r.userId.toString() !== req.user._id.toString());
        await message.save();
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName otherName avatar')
            .populate('mentions.user', 'firstName lastName otherName avatar')
            .lean();
        req.io.to(message.chatId.toString()).emit('messageUpdated', populatedMessage);
        res.json({ success: true, message: populatedMessage });
    } catch (error) {
        console.error('Error removing reaction:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to remove reaction' });
    }
};


// Get a map of {userId -> chatId} for all individual chats the caller is in.
// Eliminates the N+1 POST /individual calls on the frontend.
export const getUserChatMap = async (req, res) => {
    try {
        const chats = await Chat.find({
            type: 'individual',
            members: req.user._id,
        }).select('_id members').lean();

        const map = {};
        chats.forEach((chat) => {
            const otherId = chat.members.find(
                (m) => m.toString() !== req.user._id.toString()
            );
            if (otherId) map[otherId.toString()] = chat._id.toString();
        });

        res.json({ success: true, map });
    } catch (error) {
        console.error('Error fetching user chat map:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch user chat map' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/chats/init  —  Single endpoint that replaces 5+ separate calls.
// Returns: users, groups (with unread), individual chat map, last messages
// per chat, timestamps, and unread counts — all in one round trip.
// ─────────────────────────────────────────────────────────────────────────────
export const getInitialData = async (req, res) => {
    try {
        const userId = req.user._id;

        // ── 1. Parallel: all users + all chats the caller belongs to ──────────
        const [allUsers, allChats] = await Promise.all([
            User.find({ _id: { $ne: userId } })
                .select('firstName lastName otherName avatar online lastActive')
                .lean(),
            Chat.find({ members: userId })
                .select('_id type name avatar adminId members updatedAt unreadCounts')
                .populate('members', 'firstName lastName otherName avatar online lastActive')
                .populate('adminId', 'firstName lastName')
                .lean(),
        ]);

        const chatIds = allChats.map((c) => c._id);

        // ── 2. One aggregate: last message per chat (content + sender) ────────
        const lastMessageDocs = await Message.aggregate([
            { $match: { chatId: { $in: chatIds } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$chatId',
                    messageId: { $first: '$_id' },
                    content: { $first: '$content' },
                    contentType: { $first: '$contentType' },
                    fileUrl: { $first: '$fileUrl' },
                    isDeleted: { $first: '$isDeleted' },
                    createdAt: { $first: '$createdAt' },
                    senderId: { $first: '$sender' },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'senderId',
                    foreignField: '_id',
                    as: 'senderArr',
                    pipeline: [{ $project: { firstName: 1, lastName: 1, otherName: 1, avatar: 1 } }],
                },
            },
            { $addFields: { sender: { $arrayElemAt: ['$senderArr', 0] } } },
            { $project: { senderArr: 0 } },
        ]);

        // ── 3. Build response maps ─────────────────────────────────────────────
        const lastMsgMap = {};     // chatId -> last message object
        const timestampMap = {};   // chatId -> ISO string

        lastMessageDocs.forEach((doc) => {
            const cid = doc._id.toString();
            lastMsgMap[cid] = {
                _id: doc.messageId,
                chatId: doc._id,
                content: doc.content,
                contentType: doc.contentType,
                fileUrl: doc.fileUrl,
                isDeleted: doc.isDeleted,
                createdAt: doc.createdAt,
                sender: doc.sender,
            };
            timestampMap[cid] = doc.createdAt.toISOString();
        });

        // Do NOT fall back to chat.updatedAt for chats with no messages.
        // Using updatedAt causes chats to appear at the top of the list with a fake recent
        // timestamp even when no messages have been exchanged. The frontend sorts by
        // lastMessage presence, and we mirror that here for consistency.
        // (Groups/chats with no messages will sort alphabetically on the frontend.)

        // ── 4. Split chats into groups vs individual, build chat map ──────────
        const groups = [];
        const userChatMap = {};   // otherId -> chatId (for individual chats)
        const unreadCounts = {};  // chatId -> count

        allChats.forEach((chat) => {
            const cid = chat._id.toString();
            const myUnread = chat.unreadCounts
                ? (chat.unreadCounts[userId.toString()] ?? 0)
                : 0;
            if (myUnread > 0) unreadCounts[cid] = myUnread;

            if (chat.type === 'group') {
                groups.push({ ...chat, myUnreadCount: myUnread });
            } else {
                // individual — find the other member
                const other = chat.members.find(
                    (m) => m._id.toString() !== userId.toString()
                );
                if (other) userChatMap[other._id.toString()] = cid;
            }
        });

        res.json({
            success: true,
            users: allUsers,
            groups,
            userChatMap,
            lastMessages: lastMsgMap,
            timestamps: timestampMap,
            unreadCounts,
        });
    } catch (error) {
        console.error('Error in getInitialData:', error.message, error.stack);
        res.status(500).json({ success: false, message: 'Failed to load chat data' });
    }
};

// ── Pin message ───────────────────────────────────────────────────────────────
// Any member can pin. Max 3 pinned messages per chat (oldest replaced).
export const pinMessage = async (req, res) => {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }
    try {
        const message = await Message.findById(messageId).lean();
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        const chat = await Chat.findOne({ _id: message.chatId, members: req.user._id });
        if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

        const already = chat.pinnedMessages.some((id) => id.toString() === messageId);
        if (already) return res.json({ success: true, pinnedMessages: chat.pinnedMessages });

        // Keep max 3 — remove oldest if full
        if (chat.pinnedMessages.length >= 3) chat.pinnedMessages.shift();
        chat.pinnedMessages.push(messageId);
        await chat.save();

        req.io.to(chat._id.toString()).emit('messagePinned', { chatId: chat._id, messageId, pinnedMessages: chat.pinnedMessages });
        res.json({ success: true, pinnedMessages: chat.pinnedMessages });
    } catch (error) {
        console.error('Error pinning message:', error.message);
        res.status(500).json({ success: false, message: 'Failed to pin message' });
    }
};

// ── Unpin message ─────────────────────────────────────────────────────────────
export const unpinMessage = async (req, res) => {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }
    try {
        const message = await Message.findById(messageId).lean();
        if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

        const chat = await Chat.findOne({ _id: message.chatId, members: req.user._id });
        if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

        chat.pinnedMessages = chat.pinnedMessages.filter((id) => id.toString() !== messageId);
        await chat.save();

        req.io.to(chat._id.toString()).emit('messageUnpinned', { chatId: chat._id, messageId, pinnedMessages: chat.pinnedMessages });
        res.json({ success: true, pinnedMessages: chat.pinnedMessages });
    } catch (error) {
        console.error('Error unpinning message:', error.message);
        res.status(500).json({ success: false, message: 'Failed to unpin message' });
    }
};

// ── Get pinned messages (full objects) ────────────────────────────────────────
export const getPinnedMessages = async (req, res) => {
    const { chatId } = req.params;
    if (!mongoose.isValidObjectId(chatId)) {
        return res.status(400).json({ success: false, message: 'Invalid chat ID' });
    }
    try {
        const chat = await Chat.findOne({ _id: chatId, members: req.user._id })
            .select('pinnedMessages').lean();
        if (!chat) return res.status(403).json({ success: false, message: 'Access denied' });

        const messages = await Message.find({ _id: { $in: chat.pinnedMessages } })
            .populate('sender', 'firstName lastName otherName avatar')
            .populate('mentions.user', 'firstName lastName otherName avatar')
            .lean();

        res.json({ success: true, pinnedMessages: messages });
    } catch (error) {
        console.error('Error fetching pinned messages:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch pinned messages' });
    }
};

// ── Forward message ───────────────────────────────────────────────────────────
// Copies message content into one or more target chats, tagging it as forwarded.
export const forwardMessage = async (req, res) => {
    const { messageId } = req.params;
    const { targetChatIds } = req.body; // array of chatId strings

    if (!mongoose.isValidObjectId(messageId)) {
        return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }
    if (!Array.isArray(targetChatIds) || targetChatIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Target chat IDs required' });
    }
    if (targetChatIds.length > 5) {
        return res.status(400).json({ success: false, message: 'Cannot forward to more than 5 chats at once' });
    }

    try {
        const original = await Message.findById(messageId)
            .populate('sender', 'firstName lastName otherName')
            .lean();
        if (!original || original.isDeleted) {
            return res.status(404).json({ success: false, message: 'Message not found or deleted' });
        }

        // Verify caller has access to the original chat
        const srcChat = await Chat.findOne({ _id: original.chatId, members: req.user._id }).lean();
        if (!srcChat) return res.status(403).json({ success: false, message: 'Access denied' });

        const senderName = original.sender
            ? `${original.sender.firstName || ''} ${original.sender.lastName || ''}`.trim()
            : 'Unknown';

        const results = await Promise.allSettled(
            targetChatIds.map(async (targetChatId) => {
                if (!mongoose.isValidObjectId(targetChatId)) return;

                const targetChat = await Chat.findOne({ _id: targetChatId, members: req.user._id });
                if (!targetChat) return;

                // Build forwarded message
                const fwdMsg = new Message({
                    chatId: targetChatId,
                    sender: req.user._id,
                    content: original.content,
                    fileUrl: original.fileUrl,
                    fileName: original.fileName,
                    contentType: original.contentType,
                    forwardedFrom: {
                        messageId: original._id,
                        senderName,
                        chatName: srcChat.name || 'Chat',
                    },
                });
                await fwdMsg.save();

                // Populate sender for broadcast
                const senderDoc = await User.findById(req.user._id)
                    .select('firstName lastName otherName avatar').lean();
                const populated = { ...fwdMsg.toObject(), sender: senderDoc };

                // Update chat unread counts and broadcast
                const userId = req.user._id.toString();
                const unreadIncrements = {};
                targetChat.members.forEach((memberId) => {
                    const mid = memberId.toString();
                    if (mid !== userId) {
                        const cur = (targetChat.unreadCounts && targetChat.unreadCounts[mid]) || 0;
                        unreadIncrements[`unreadCounts.${mid}`] = cur + 1;
                        req.io.to(`user:${mid}`).emit('unreadUpdate', {
                            chatId: targetChatId,
                            count: cur + 1,
                            message: populated,
                        });
                    }
                });
                Chat.findByIdAndUpdate(targetChatId, { $set: { updatedAt: Date.now(), ...unreadIncrements } }).catch(() => {});
                req.io.to(targetChatId.toString()).emit('message', populated);
            })
        );

        res.json({ success: true, forwarded: results.filter((r) => r.status === 'fulfilled').length });
    } catch (error) {
        console.error('Error forwarding message:', error.message);
        res.status(500).json({ success: false, message: 'Failed to forward message' });
    }
};

export default {
    getUsers,
    createIndividualChat,
    getGroups,
    createGroup,
    addGroupMembers,
    getChatMessages,
    sendMessage,
    markChatRead,
    getAllUnreadCounts,
    editMessage,
    deleteMessage,
    uploadChatFile,
    getChatTimestamps,
    getUnreadTotal,
    markMessageRead,
    addReaction,
    removeReaction,
    getUserChatMap,
    getInitialData,
    pinMessage,
    unpinMessage,
    getPinnedMessages,
    forwardMessage
};