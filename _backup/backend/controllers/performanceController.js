// controllers/performanceController.js
import User from '../models/userModel.js';
import Task from '../models/taskModel.js';
import Goal from '../models/goalModel.js';
import OpenAI from 'openai';
import {
  calculateUserTotalScore,
  calculateCompletionRate,
  calculateOverdueRate,
  getUserLevel,
  getNextLevel,
  getScoreBreakdown,
  calculateTaskScore,
  calculateGoalScore,
  PRIORITY_WEIGHTS,
  LEVELS,
} from '../utils/performanceCalculator.js';

const openai = new OpenAI({
  apiKey:  process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const getFullName = (user) => {
  if (!user) return 'Unknown User';
  if (user.fullName) return user.fullName.trim();
  if (user.firstName || user.lastName)
    return `${user.firstName || ''} ${user.lastName || ''} ${user.otherName || ''}`.trim();
  return user.name?.trim() || 'Unknown User';
};

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const getLeaderboard = async (req, res) => {
  try {
    const users    = await User.find({ isActive: true })
      .select('firstName lastName otherName email role points level badges lastActive position unitSector')
      .lean();
    const allTasks = await Task.find({}).select('owner priority completed submissionStatus checklist dueDate').lean();
    const allGoals = await Goal.find({}).select('owner subGoals').lean();

    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = { ...u, tasks: [], goals: [] }; });
    allTasks.forEach(t => { const uid = t.owner.toString(); if (userMap[uid]) userMap[uid].tasks.push(t); });
    allGoals.forEach(g => { const uid = g.owner.toString(); if (userMap[uid]) userMap[uid].goals.push(g); });

    let leaderboard = Object.values(userMap).map(ud => {
      const totalScore     = calculateUserTotalScore(ud.tasks, ud.goals);
      const completionRate = calculateCompletionRate(ud.tasks);
      const overdueRate    = calculateOverdueRate(ud.tasks);
      const level          = getUserLevel(totalScore);
      const nextLevel      = getNextLevel(totalScore);
      const breakdown      = getScoreBreakdown(ud.tasks, ud.goals);

      return {
        _id: ud._id,
        fullName:     getFullName(ud),
        firstName:    ud.firstName,
        lastName:     ud.lastName,
        otherName:    ud.otherName,
        position:     ud.position,
        unitSector:   ud.unitSector,
        role:         ud.role,
        points:       ud.points || 0,
        level,
        nextLevel,
        badges:       ud.badges || [],
        lastActive:   ud.lastActive,
        totalScore,
        completionRate,
        overdueRate,
        breakdown,
        rank: 0,
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

// ── My Performance ────────────────────────────────────────────────────────────
export const getMyPerformance = async (req, res) => {
  try {
    const userId = req.user.id;
    const [tasks, goals, currentUser] = await Promise.all([
      Task.find({ owner: userId }).lean(),
      Goal.find({ owner: userId }).lean(),
      User.findById(userId).select('firstName lastName otherName points badges level position unitSector').lean(),
    ]);

    const totalScore     = calculateUserTotalScore(tasks, goals);
    const completionRate = calculateCompletionRate(tasks);
    const overdueRate    = calculateOverdueRate(tasks);
    const level          = getUserLevel(totalScore);
    const nextLevel      = getNextLevel(totalScore);
    const breakdown      = getScoreBreakdown(tasks, goals);

    res.json({
      success: true,
      performance: {
        fullName:         getFullName(currentUser),
        totalScore,
        completionRate,
        overdueRate,
        level,
        nextLevel,
        breakdown,
        taskCount:        tasks.length,
        completedTasks:   tasks.filter(t => t.completed).length,
        goalsCount:       goals.length,
        completedGoals:   goals.filter(g => g.subGoals?.every(s => s.completed)).length,
        taskPoints:       breakdown.basePoints + breakdown.approvalBonus + breakdown.onTimeBonus + breakdown.checklistBonus,
        goalPoints:       breakdown.goalPoints,
        penalties:        breakdown.penaltyTotal,
        badges:           currentUser.badges || [],
        bonusPoints:      currentUser.points || 0,
        position:         currentUser.position,
        unitSector:       currentUser.unitSector,
      },
    });
  } catch (err) {
    console.error('MyPerformance error:', err);
    res.status(500).json({ success: false, message: 'Failed to load performance' });
  }
};

// ── User Details ──────────────────────────────────────────────────────────────
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;
    const canSeeBonusHistory = requestingUser.id === userId || requestingUser.role === 'admin';

    const [tasks, goals, targetUser] = await Promise.all([
      Task.find({ owner: userId }).select('priority completed submissionStatus checklist dueDate title').lean(),
      Goal.find({ owner: userId }).select('subGoals title timeframe').lean(),
      User.findById(userId).select('firstName lastName otherName role level badges activityLogs position unitSector').lean(),
    ]);

    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const totalScore     = calculateUserTotalScore(tasks, goals);
    const completionRate = calculateCompletionRate(tasks);
    const overdueRate    = calculateOverdueRate(tasks);
    const level          = getUserLevel(totalScore);
    const nextLevel      = getNextLevel(totalScore);
    const breakdown      = getScoreBreakdown(tasks, goals);

    // Per-priority breakdown
    const taskStatsByPriority = {
      Low:    { count: 0, completed: 0, basePoints: 0, approvalBonus: 0, checklistBonus: 0, onTimeBonus: 0 },
      Medium: { count: 0, completed: 0, basePoints: 0, approvalBonus: 0, checklistBonus: 0, onTimeBonus: 0 },
      High:   { count: 0, completed: 0, basePoints: 0, approvalBonus: 0, checklistBonus: 0, onTimeBonus: 0 },
    };

    tasks.forEach(task => {
      const p = task.priority || 'Low';
      if (!taskStatsByPriority[p]) return;
      const s = taskStatsByPriority[p];
      s.count++;
      if (task.completed) {
        s.completed++;
        const base = PRIORITY_WEIGHTS[p] || 15;
        s.basePoints += base;
        if (task.submissionStatus === 'approved')  s.approvalBonus  += Math.round(base * 0.5);
        else if (task.submissionStatus === 'submitted') s.approvalBonus += Math.round(base * 0.2);
        if (task.dueDate && new Date() <= new Date(task.dueDate)) s.onTimeBonus += 10;
        if (task.checklist?.length) {
          const done = task.checklist.filter(c => c.completed).length;
          s.checklistBonus += Math.round((done / task.checklist.length) * 20);
        }
      }
    });

    // Goal details
    const goalDetails = goals.map(g => {
      const done     = g.subGoals?.filter(s => s.completed).length || 0;
      const total    = g.subGoals?.length || 0;
      const progress = total ? Math.round((done / total) * 100) : 0;
      return { title: g.title, timeframe: g.timeframe, done, total, progress, points: calculateGoalScore(g) };
    });

    const taskPoints = breakdown.basePoints + breakdown.approvalBonus + breakdown.onTimeBonus + breakdown.checklistBonus;
    const goalPoints = breakdown.goalPoints;

    res.json({
      success: true,
      user: {
        fullName:    getFullName(targetUser),
        firstName:   targetUser.firstName,
        lastName:    targetUser.lastName,
        otherName:   targetUser.otherName,
        role:        targetUser.role,
        level,
        position:    targetUser.position,
        unitSector:  targetUser.unitSector,
      },
      totalScore,
      taskPoints,
      goalPoints,
      completionRate,
      overdueRate,
      level,
      nextLevel,
      breakdown,
      taskStatsByPriority,
      goalDetails,
      totalGoals:     goals.length,
      completedGoals: goals.filter(g => g.subGoals?.every(s => s.completed)).length,
      bonusHistory:   canSeeBonusHistory
        ? targetUser.activityLogs?.filter(l => l.action === 'bonus_awarded') || []
        : [],
    });
  } catch (err) {
    console.error('UserDetails error:', err);
    res.status(500).json({ success: false, message: 'Failed to load user details' });
  }
};

// ── AI Analysis ───────────────────────────────────────────────────────────────
export const getUserAIAnalysis = async (req, res) => {
  try {
    const { userId } = req.params;
    const isSelfView  = req.user.id === userId;

    const [tasks, goals, targetUser] = await Promise.all([
      Task.find({ owner: userId }).select('title description priority completed submissionStatus checklist dueDate').lean(),
      Goal.find({ owner: userId }).select('subGoals title timeframe').lean(),
      User.findById(userId).select('firstName lastName otherName position unitSector role level').lean(),
    ]);

    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const fullName       = getFullName(targetUser);
    const totalScore     = calculateUserTotalScore(tasks, goals);
    const completionRate = calculateCompletionRate(tasks);
    const overdueRate    = calculateOverdueRate(tasks);
    const breakdown      = getScoreBreakdown(tasks, goals);

    const taskList = tasks.slice(0, 12).map(t => {
      const status = t.completed ? 'DONE' : 'PENDING';
      const overdue = !t.completed && t.dueDate && new Date(t.dueDate) < new Date() ? ' [OVERDUE]' : '';
      const desc = t.description ? ` - ${t.description.substring(0, 120)}` : '';
      return `${status}${overdue} | ${t.priority} | ${t.title}${desc}`;
    }).join('\n');

    const systemPrompt = isSelfView
      ? `You are Super Admin writing a detailed internal performance note.
Start directly with the analysis. Never use bold text, asterisks, hashes, or em-dashes.
Write naturally like a real manager in an internal review.
Reference the actual task titles and describe real achievements.
Be honest about completion rate (${completionRate}%), overdue rate (${overdueRate}%), and total score (${totalScore}).
Explain what the score means and whether a bonus is warranted based on the formula: base task points + approval bonus + on-time bonus + checklist bonus + goal points.
Give enough detail for this to feel like a thorough performance review note.`
      : `You are Super Admin writing a detailed internal performance note about ${fullName}.
Refer to them using their full name and they/their pronouns.
Start directly with the analysis. Never use bold text, asterisks, hashes, or em-dashes.
Write naturally like a real manager reviewing a team member.
Reference actual task titles and describe what they achieved.
Comment on their completion rate (${completionRate}%), overdue rate (${overdueRate}%), and total score (${totalScore}).
Explain whether a bonus is warranted. Be direct and thorough.`;

    const userDataForAI = `
Name: ${fullName}
Role: ${targetUser.position || 'Not specified'} | Unit: ${targetUser.unitSector || 'Not specified'}
Total Score: ${totalScore}
Score Breakdown: Base=${breakdown.basePoints} + Approval=${breakdown.approvalBonus} + OnTime=${breakdown.onTimeBonus} + Checklist=${breakdown.checklistBonus} + Goals=${breakdown.goalPoints} + Penalties=${breakdown.penaltyTotal}
Completion Rate: ${completionRate}%  |  Overdue Rate: ${overdueRate}%
Tasks (sample):
${taskList || 'No tasks found'}
Goals completed: ${goals.filter(g => g.subGoals?.every(s => s.completed)).length} of ${goals.length}
`.trim();

    const response = await openai.chat.completions.create({
      model:       'grok-4',
      messages:    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userDataForAI }],
      temperature: 0.4,
      max_tokens:  950,
    });

    let aiNote = response.choices[0].message.content.trim().replace(/\s+/g, ' ');
    res.json({ success: true, aiNote });
  } catch (err) {
    console.error('AI Analysis error:', err);
    res.json({ success: true, aiNote: 'Super Admin has reviewed this performance. A detailed note will be available shortly.' });
  }
};

// ── Award Bonus ───────────────────────────────────────────────────────────────
export const awardBonus = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
  const { userId, bonusAmount, reason } = req.body;
  if (!userId || !bonusAmount || bonusAmount <= 0)
    return res.status(400).json({ success: false, message: 'Invalid bonus data' });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.points = (user.points || 0) + bonusAmount;
    user.activityLogs.push({
      action:    'bonus_awarded',
      details:   `${bonusAmount} points awarded. Reason: ${reason || 'No reason provided'}`,
      timestamp: new Date(),
    });
    user.level = getUserLevel(user.points);
    await user.save();

    if (global.io) global.io.to(`user:${userId}`).emit('bonusAwarded', { points: bonusAmount, reason, newTotal: user.points });

    res.json({ success: true, message: `${bonusAmount} points awarded successfully.`, newPoints: user.points });
  } catch (err) {
    console.error('AwardBonus error:', err);
    res.status(500).json({ success: false, message: 'Bonus award failed' });
  }
};