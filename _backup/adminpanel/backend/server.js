import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import goalRoutes from './routes/goalRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import learningRoutes from './routes/learningRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import sharedProxyRoutes from './routes/sharedProxyRoutes.js';

// Models (register with mongoose)
import './models/userModel.js';
import './models/taskModel.js';
import './models/goalModel.js';
import './models/reportModel.js';
import './models/postModel.js';
import './models/adminTeamModel.js';
import './models/projectModel.js';
import './models/reminderModel.js';
import './models/learningMaterialModel.js';
import './models/roomModel.js';
import './models/notificationModel.js';

const app = express();
const httpServer = createServer(app);

const port = parseInt(process.env.ADMIN_PORT || '4002', 10);
console.log(`Starting Admin server on port: ${port}`);


const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');
const configuredOrigins = [...new Set(
  [process.env.ADMIN_FRONTEND_URL, process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS]
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

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Share io with user backend via global
global.adminIo = io;

// Attach io to every request
app.use((req, res, next) => { req.io = io; next(); });

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/team', teamRoutes);
app.use('/api/admin/tasks', taskRoutes);
app.use('/api/admin/goals', goalRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/admin/performance', performanceRoutes);
app.use('/api/admin/projects', projectRoutes);
app.use('/api/admin/social', socialRoutes);
app.use('/api/admin/reminders', reminderRoutes);
app.use('/api/admin/learning', learningRoutes);
app.use('/api/admin/meetings', meetingRoutes);
app.use('/api/admin/notifications', notificationRoutes);
app.use('/api/admin/shared', sharedProxyRoutes);

// ── Socket.IO Auth ────────────────────────────────────────────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Auth required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id };
    next();
  } catch { next(new Error('Auth failed')); }
});

io.on('connection', (socket) => {
  console.log(`✅ Admin socket connected: ${socket.id}`);
  socket.join(`admin:${socket.user.id}`);
  socket.join(`user:${socket.user.id}`);
  socket.on('disconnect', () => console.log(`❌ Admin socket disconnected: ${socket.id}`));
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  success: true, message: 'Admin API running', port,
  socketEnabled: true,
}));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Admin server error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await connectDB();
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Admin server running on port ${port}`);
      console.log(`📡 Admin Socket.IO ready`);
    });
  } catch (err) {
    console.error('Failed to start admin server:', err.message);
    process.exit(1);
  }
}

export { app, io };
if (process.env.NODE_ENV !== 'test') startServer();
