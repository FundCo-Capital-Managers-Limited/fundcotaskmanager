import Goal from '../models/goalModel.js';
import { buildTeamQuery } from '../middleware/teamFilter.js';
import { createNotification } from '../utils/notificationService.js';

// ── Get all goals (team-filtered) ─────────────────────────────────────────────
export const getAllGoals = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'owner');
    const { search, type, timeframe } = req.query;

    if (search) query.title = { $regex: search, $options: 'i' };
    if (type) query.type = type;
    if (timeframe) query.timeframe = timeframe;

    const goals = await Goal.find(query)
      .populate('owner', 'firstName lastName otherName email position unitSector avatar')
      .populate('adminComments.user', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, goals, total: goals.length });
  } catch (err) {
    console.error('getAllGoals error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch goals' });
  }
};

// ── Get goal by ID ────────────────────────────────────────────────────────────
export const getGoalById = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate('owner', 'firstName lastName otherName email position avatar')
      .populate('adminComments.user', 'firstName lastName avatar')
      .populate('associatedTasks', 'title completed priority dueDate')
      .lean();
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.json({ success: true, goal });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch goal' });
  }
};

// ── Create goal for user ──────────────────────────────────────────────────────
export const createGoalForUser = async (req, res) => {
  try {
    const { title, subGoals, type, timeframe, startDate, endDate, ownerId, associatedTasks } = req.body;
    if (!title || !timeframe || !startDate || !endDate || !ownerId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (req.teamMemberIds && !req.teamMemberIds.map(String).includes(String(ownerId))) {
      return res.status(403).json({ success: false, message: 'User is not in your team' });
    }

    const goal = new Goal({
      title, subGoals: subGoals || [], type: type || 'personal', timeframe,
      startDate: new Date(startDate), endDate: new Date(endDate),
      associatedTasks: associatedTasks || [], owner: ownerId,
    });

    const saved = await goal.save();
    const populated = await Goal.findById(saved._id)
      .populate('owner', 'firstName lastName email avatar').lean();

    if (req.io) req.io.to(`user:${ownerId}`).emit('newGoal', populated);
    res.status(201).json({ success: true, goal: populated });
  } catch (err) {
    console.error('createGoalForUser error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Update goal ───────────────────────────────────────────────────────────────
export const updateGoal = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const updated = await Goal.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true })
      .populate('owner', 'firstName lastName email avatar')
      .populate('adminComments.user', 'firstName lastName avatar')
      .lean();

    if (!updated) return res.status(404).json({ success: false, message: 'Goal not found' });

    if (req.io) req.io.to(`user:${updated.owner._id || updated.owner}`).emit('goalUpdated', updated);
    res.json({ success: true, goal: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Delete goal ───────────────────────────────────────────────────────────────
export const deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const ownerId = goal.owner;
    await Goal.findByIdAndDelete(req.params.id);

    if (req.io) req.io.to(`user:${ownerId}`).emit('goalDeleted', req.params.id);
    res.json({ success: true, message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete goal' });
  }
};

// ── Add admin comment ─────────────────────────────────────────────────────────
export const addGoalComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content required' });

    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    goal.adminComments.push({ user: req.user._id, content: content.trim() });
    await goal.save();

    const populated = await Goal.findById(goal._id)
      .populate('owner', 'firstName lastName email avatar')
      .populate('adminComments.user', 'firstName lastName avatar')
      .lean();

    await createNotification({
      userId: goal.owner,
      type: 'goal',
      title: `New admin comment on ${goal.title}`,
      body: content.trim(),
      actorId: req.user._id,
      actorName: req.user.fullName || req.user.email,
      entityId: goal._id,
      entityType: 'Goal',
      data: { goalId: String(goal._id), status: 'commented' },
      io: req.io,
    });

    res.json({ success: true, goal: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

// ── Goal stats ────────────────────────────────────────────────────────────────
export const getGoalStats = async (req, res) => {
  try {
    const query = buildTeamQuery(req.teamMemberIds, 'owner');
    const goals = await Goal.find(query).lean();

    const total = goals.length;
    const completed = goals.filter(g => g.subGoals?.length > 0 && g.subGoals.every(s => s.completed)).length;
    const active = total - completed;
    const avgProgress = total > 0
      ? Math.round(goals.reduce((s, g) => {
          if (!g.subGoals?.length) return s;
          return s + (g.subGoals.filter(sg => sg.completed).length / g.subGoals.length) * 100;
        }, 0) / total)
      : 0;

    res.json({ success: true, stats: { total, completed, active, avgProgress } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch goal stats' });
  }
};
