import User from '../models/userModel.js';
import Task from '../models/taskModel.js';
import Goal from '../models/goalModel.js';
import { buildTeamQuery } from '../middleware/teamFilter.js';
import {
  calculateUserTotalScore, calculateCompletionRate, calculateOverdueRate,
  getUserLevel, getNextLevel, getScoreBreakdown, calculateGoalScore,
  PRIORITY_WEIGHTS, LEVELS,
} from '../utils/performanceCalculator.js';

const getFullName = (u) => {
  if (!u) return 'Unknown';
  if (u.fullName) return u.fullName.trim();
  return `${u.firstName || ''} ${u.lastName || ''} ${u.otherName || ''}`.trim() || 'Unknown';
};

// ── Leaderboard (team-filtered) ───────────────────────────────────────────────
export const getLeaderboard = async (req, res) => {
  try {
    const userQuery = req.teamMemberIds ? { _id: { $in: req.teamMemberIds }, isActive: true } : { isActive: true };
    const users = await User.find(userQuery)
      .select('firstName lastName otherName email role points level badges lastActive position unitSector')
      .lean();

    const taskQuery = buildTeamQuery(req.teamMemberIds, 'owner');
    const goalQuery = buildTeamQuery(req.teamMemberIds, 'owner');

    const [allTasks, allGoals] = await Promise.all([
      Task.find(taskQuery).select('owner priority completed submissionStatus checklist dueDate').lean(),
      Goal.find(goalQuery).select('owner subGoals').lean(),
    ]);

    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = { ...u, tasks: [], goals: [] }; });
    allTasks.forEach(t => { const uid = t.owner.toString(); if (userMap[uid]) userMap[uid].tasks.push(t); });
    allGoals.forEach(g => { const uid = g.owner.toString(); if (userMap[uid]) userMap[uid].goals.push(g); });

    let leaderboard = Object.values(userMap).map(ud => {
      const totalScore = calculateUserTotalScore(ud.tasks, ud.goals);
      const completionRate = calculateCompletionRate(ud.tasks);
      const overdueRate = calculateOverdueRate(ud.tasks);
      const level = getUserLevel(totalScore);
      const nextLevel = getNextLevel(totalScore);
      const breakdown = getScoreBreakdown(ud.tasks, ud.goals);

      return {
        _id: ud._id, fullName: getFullName(ud), firstName: ud.firstName, lastName: ud.lastName,
        otherName: ud.otherName, position: ud.position, unitSector: ud.unitSector,
        role: ud.role, points: ud.points || 0, level, nextLevel, badges: ud.badges || [],
        lastActive: ud.lastActive, totalScore, completionRate, overdueRate, breakdown,
        taskCount: ud.tasks.length, completedTasks: ud.tasks.filter(t => t.completed).length,
        goalCount: ud.goals.length, rank: 0,
      };
    });

    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    leaderboard.forEach((u, i) => { u.rank = i + 1; });

    res.json({
      success: true,
      leaderboard: { top3: leaderboard.slice(0, 3), rest: leaderboard.slice(3) },
      allUsers: leaderboard,
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate leaderboard' });
  }
};

// ── User detail (for UserDetailModal) ─────────────────────────────────────────
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const [tasks, goals, targetUser] = await Promise.all([
      Task.find({ owner: userId }).select('priority completed submissionStatus checklist dueDate title').lean(),
      Goal.find({ owner: userId }).select('subGoals title timeframe').lean(),
      User.findById(userId).select('firstName lastName otherName role level badges activityLogs position unitSector points').lean(),
    ]);

    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const totalScore = calculateUserTotalScore(tasks, goals);
    const completionRate = calculateCompletionRate(tasks);
    const overdueRate = calculateOverdueRate(tasks);
    const level = getUserLevel(totalScore);
    const nextLevel = getNextLevel(totalScore);
    const breakdown = getScoreBreakdown(tasks, goals);

    const taskStatsByPriority = { Low: { count: 0, completed: 0 }, Medium: { count: 0, completed: 0 }, High: { count: 0, completed: 0 } };
    tasks.forEach(t => {
      const p = t.priority || 'Low';
      if (taskStatsByPriority[p]) {
        taskStatsByPriority[p].count++;
        if (t.completed) taskStatsByPriority[p].completed++;
      }
    });

    const goalDetails = goals.map(g => {
      const done = g.subGoals?.filter(s => s.completed).length || 0;
      const total = g.subGoals?.length || 0;
      return { title: g.title, timeframe: g.timeframe, done, total, progress: total ? Math.round((done / total) * 100) : 0 };
    });

    const taskPoints = breakdown.basePoints + breakdown.approvalBonus + breakdown.onTimeBonus + breakdown.checklistBonus;

    res.json({
      success: true,
      user: { fullName: getFullName(targetUser), ...targetUser },
      totalScore, taskPoints, goalPoints: breakdown.goalPoints,
      completionRate, overdueRate, level, nextLevel, breakdown,
      taskStatsByPriority, goalDetails,
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.subGoals?.every(s => s.completed)).length,
      bonusHistory: targetUser.activityLogs?.filter(l => l.action === 'bonus_awarded') || [],
    });
  } catch (err) {
    console.error('getUserDetails error:', err);
    res.status(500).json({ success: false, message: 'Failed to load user details' });
  }
};

// ── Award Bonus ───────────────────────────────────────────────────────────────
export const awardBonus = async (req, res) => {
  const { userId, bonusAmount, reason } = req.body;
  if (!userId || !bonusAmount || bonusAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid bonus data' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.points = (user.points || 0) + bonusAmount;
    user.activityLogs.push({
      action: 'bonus_awarded',
      details: `${bonusAmount} points awarded by ${req.user.fullName || req.user.email}. Reason: ${reason || 'No reason provided'}`,
      timestamp: new Date(),
    });
    user.level = getUserLevel(user.points);
    await user.save();

    if (req.io) {
      req.io.to(`user:${userId}`).emit('bonusAwarded', {
        points: bonusAmount, reason, newTotal: user.points, awardedBy: req.user.fullName,
      });
    }

    res.json({ success: true, message: `${bonusAmount} points awarded successfully`, newPoints: user.points });
  } catch (err) {
    console.error('awardBonus error:', err);
    res.status(500).json({ success: false, message: 'Bonus award failed' });
  }
};

// ── Dashboard analytics ───────────────────────────────────────────────────────
export const getDashboardAnalytics = async (req, res) => {
  try {
    const userQuery = req.teamMemberIds ? { _id: { $in: req.teamMemberIds }, isActive: true } : { isActive: true };
    const taskQuery = buildTeamQuery(req.teamMemberIds, 'owner');
    const goalQuery = buildTeamQuery(req.teamMemberIds, 'owner');
    const now = new Date();

    const [totalUsers, totalTasks, completedTasks, overdueTasks, pendingApproval, totalGoals, approvedTasks] = await Promise.all([
      User.countDocuments(userQuery),
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, completed: true }),
      Task.countDocuments({ ...taskQuery, completed: false, dueDate: { $lt: now } }),
      Task.countDocuments({ ...taskQuery, submissionStatus: 'submitted' }),
      Goal.countDocuments(goalQuery),
      Task.countDocuments({ ...taskQuery, submissionStatus: 'approved' }),
    ]);

    res.json({
      success: true,
      analytics: {
        totalUsers, totalTasks, completedTasks, overdueTasks, pendingApproval, totalGoals, approvedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};
