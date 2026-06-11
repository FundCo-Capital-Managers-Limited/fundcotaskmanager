// backend/server.js - FULLY CLEANED & PRODUCTION-READY
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import fileUpload from 'express-fileupload';
import cron from 'node-cron';
import { connectDB } from './config/db.js';

import userRouter from './routes/userRoute.js';
import taskRouter from './routes/taskRoutes.js';
import fileRouter from './routes/fileRoutes.js';
import chatRouter from './routes/chatRoutes.js';
import botChatRouter from './routes/botChatRoutes.js';
import urlRouter from './routes/urlRoutes.js';
import postRouter from './routes/postRoutes.js';
import reminderRouter from './routes/reminderRoutes.js';
import goalRouter from './routes/goalRoutes.js';
import performanceRouter from './routes/performanceRoutes.js';
import meetingRouter from './routes/meetingRoutes.js';
import learningRouter from './routes/learningRoutes.js';
import feedbackRouter from './routes/feedbackRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import grokRouter from './routes/grokRoutes.js';
import reportRouter from './routes/reportRoutes.js';
import roomRouter from './routes/roomRoutes.js';
import notificationRouter from './routes/notificationRoutes.js';

import { startReminderScheduler } from './utils/reminderScheduler.js';
import Meeting from './models/meetingModel.js';
import User from './models/userModel.js';

// Load all models
import './models/userModel.js';
import './models/chatModel.js';
import './models/messageModel.js';
import './models/botChatModel.js';
import './models/postModel.js';
import './models/reminderModel.js';
import './models/goalModel.js';
import './models/meetingModel.js';
import './models/learningMaterialModel.js';
import './models/feedbackModel.js';
import './models/notificationModel.js';
import Room from './models/roomModel.js';

import { setupRoomSignaling } from './socket/roomSignaling.js';

const app = express();
const httpServer = createServer(app);

// ─────────────────────────────────────────────────────────────
// PORT — comes ONLY from .env
const port = parseInt(process.env.PORT, 10);
if (!port) {
    console.error('❌ PORT is not defined in your .env file');
    process.exit(1);
}
console.log(`Starting server on port: ${port}`);


const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');
const configuredOrigins = [...new Set(
    [process.env.FRONTEND_URL, process.env.ADMIN_FRONTEND_URL, process.env.ALLOWED_ORIGINS]
        .flatMap((value) => String(value || '').split(','))
        .map(normalizeOrigin)
        .filter(Boolean)
)];

const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    const normalizedOrigin = normalizeOrigin(origin);

    if (!configuredOrigins.length) return true;
    if (configuredOrigins.includes(normalizedOrigin)) return true;

    if ((process.env.NODE_ENV || '').toLowerCase() !== 'production' && isLocalOrigin(normalizedOrigin)) {
        return true;
    }

    return false;
};

const corsOrigin = (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
};

// ─────────────────────────────────────────────────────────────
// Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],   
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
    },
    transports: ['polling', 'websocket'],
    allowUpgrades: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    maxHttpBufferSize: 1e8,
    path: '/socket.io',
    connectTimeout: 45000,
});

setupRoomSignaling(io);
global.io = io;

app.use((req, res, next) => { req.io = io; next(); });

// CORS
app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],   
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload middleware
app.use('/api/chats', fileUpload());
app.use('/api/bot', fileUpload());
app.use('/api/posts', fileUpload());

// Routes
app.use('/api/user',        userRouter);
app.use('/api/tasks',       taskRouter);
app.use('/api/files',       fileRouter);
app.use('/api/chats',       chatRouter);
app.use('/api/urls',        urlRouter);
app.use('/download',        urlRouter);
app.use('/api/bot',         botChatRouter);
app.use('/api/posts',       postRouter);
app.use('/api/reminders',   reminderRouter);
app.use('/api/goals',       goalRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/grok',        grokRouter);
app.use('/api/meetings',    meetingRouter);
app.use('/api/learning',    learningRouter);
app.use('/api/documents',   documentRoutes);
app.use('/api/reports',     reportRouter);
app.use('/api/feedback',    feedbackRouter);
app.use('/api/rooms',       roomRouter);
app.use('/api/notifications', notificationRouter);

// Environment variable validation
const requiredEnvVars = [
    'MONGO_URI', 'JWT_SECRET', 'WIT_AI_TOKEN', 'PINATA_API_KEY',
    'PINATA_SECRET_API_KEY', 'PINATA_JWT', 'BASE_URL', 'FRONTEND_URL',
    'EMAIL_USER', 'EMAIL_PASS', 'FIREBASE_CREDENTIALS', 'GROK_API_KEY', 'PORT',
];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// Socket.IO Auth
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) return next(new Error('Authentication token required'));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { id: decoded.id, email: decoded.email };
        next();
    } catch (error) {
        next(new Error('Authentication failed'));
    }
});

// ─────────────────────────────────────────────────────────────
// Socket.IO Events
const activeUserSockets = new Map();

io.on('connection', async (socket) => {
    console.log(`✅ Socket connected: ${socket.id} | User: ${socket.user?.id || 'unknown'}`);

    const userId = String(socket.user.id);
    const connectedAt = new Date();
    if (!activeUserSockets.has(userId)) activeUserSockets.set(userId, new Set());
    activeUserSockets.get(userId).add(socket.id);

    try {
        await User.findByIdAndUpdate(userId, { online: true, lastActive: connectedAt }, { runValidators: false });
        io.emit('presence:update', { userId, online: true, lastActive: connectedAt });
    } catch (err) {
        console.error('Error updating presence:', err.message);
    }

    socket.join(`user:${userId}`);

    // ── Chat ──────────────────────────────────────────────────
    socket.on('joinChat',  (chatId) => { if (chatId) socket.join(chatId); });
    socket.on('leaveChat', (chatId) => { if (chatId) socket.leave(chatId); });
    socket.on('typing', ({ chatId, userId, isTyping }) => {
        if (chatId && userId) socket.to(chatId).emit('typing', { chatId, userId, isTyping });
    });

    // ── Posts (namespaced events: post:new, post:updated, post:deleted) ───
    // These are emitted server-side via req.io in postRoutes.js.
    // Clients can also push post events for broadcasting:
    socket.on('post:new',     (post)   => socket.broadcast.emit('post:new', post));
    socket.on('post:updated', (post)   => socket.broadcast.emit('post:updated', post));
    socket.on('post:deleted', (data)   => socket.broadcast.emit('post:deleted', data));

    // ── Reminders ─────────────────────────────────────────────
    socket.on('newReminder',      (r) => io.to(`user:${socket.user.id}`).emit('newReminder', r));
    socket.on('reminderUpdated',  (r) => io.to(`user:${socket.user.id}`).emit('reminderUpdated', r));
    socket.on('reminderTriggered',(r) => io.to(`user:${socket.user.id}`).emit('reminderTriggered', r));

    // ── Goals ─────────────────────────────────────────────────
    socket.on('newGoal',     (g) => io.to(`user:${socket.user.id}`).emit('newGoal', g));
    socket.on('goalUpdated', (g) => io.to(`user:${socket.user.id}`).emit('goalUpdated', g));
    socket.on('goalDeleted', (id)=> io.to(`user:${socket.user.id}`).emit('goalDeleted', id));

    // ── Meetings ──────────────────────────────────────────────
    socket.on('newMeeting',           (m)  => io.emit('newMeeting', m));
    socket.on('meetingUpdated',       (m)  => io.emit('meetingUpdated', m));
    socket.on('meetingDeleted',       (id) => io.emit('meetingDeleted', id));
    socket.on('newMeetingInvitation', (d)  => io.to(`user:${d.participantId}`).emit('newMeetingInvitation', d));

    // ── Room signaling (handled by setupRoomSignaling) ─────────
    socket.on('roomInvitation', (data) => {
        if (data.userId) io.to(`user:${data.userId}`).emit('roomInvitation', data);
    });

    socket.on('error',      (err)    => console.error('Socket error:', err.message));
    socket.on('disconnect', async (reason) => {
        console.log(`❌ Socket disconnected: ${socket.id} | ${reason}`);
        const sockets = activeUserSockets.get(userId);
        if (!sockets) return;
        sockets.delete(socket.id);
        if (sockets.size > 0) return;
        activeUserSockets.delete(userId);

        const lastActive = new Date();
        try {
            await User.findByIdAndUpdate(userId, { online: false, lastActive }, { runValidators: false });
            io.emit('presence:update', { userId, online: false, lastActive });
        } catch (err) {
            console.error('Error updating disconnect presence:', err.message);
        }
    });
});

// ─────────────────────────────────────────────────────────────
// Health check
app.get('/', (req, res) => res.json({
    success: true, message: 'API is running', port,
    socketEnabled: true, env: process.env.NODE_ENV || 'development',
}));

// Admin emit endpoint
app.post('/api/emit', (req, res) => {
    const internalToken = String(req.headers['x-internal-token'] || '').trim();
    const expectedToken = String(process.env.INTERNAL_API_TOKEN || process.env.JWT_SECRET || '').trim();
    if (!expectedToken || internalToken !== expectedToken) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { event, data, room } = req.body || {};
    if (!event || data === undefined) {
        return res.status(400).json({ success: false, message: 'Event and data are required' });
    }

    if (room) {
        io.to(String(room)).emit(event, data);
    } else {
        io.emit(event, data);
    }

    return res.json({ success: true, message: 'Event emitted' });
});
// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Meeting cron job
cron.schedule('*/5 * * * *', async () => {
    try {
        const now = new Date();
        await Meeting.updateMany({ status: 'scheduled', startTime: { $lte: now } }, { status: 'ongoing' });
        await Meeting.updateMany(
            { status: 'ongoing', $expr: { $gt: [{ $subtract: [now, '$startTime'] }, { $multiply: ['$duration', 60000] }] } },
            { status: 'ended', endedAt: now }
        );
    } catch (err) { console.error('Cron meeting status error:', err); }
});

// Start server
async function startServer() {
    try {
        await connectDB();
        console.log('✅ MongoDB connected successfully');
        httpServer.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${port}`);
            console.log(`📡 Socket.IO ready on ws://localhost:${port}/socket.io`);
            console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            startReminderScheduler();
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

export { app, io };
if (process.env.NODE_ENV !== 'test') startServer();