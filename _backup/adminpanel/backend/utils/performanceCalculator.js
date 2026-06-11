// ── Performance Scoring System (same as user backend) ─────────────────────────

export const PRIORITY_WEIGHTS = { High: 60, Medium: 35, Low: 15 };
const APPROVAL_MULTIPLIER = 1.5;
const SUBMITTED_MULTIPLIER = 1.2;
const ON_TIME_BONUS = 10;
const OVERDUE_PENALTY = -5;
const CHECKLIST_MAX_BONUS = 20;
const GOAL_COMPLETE_BONUS = 20;
const GOAL_BASE_MAX = 100;

const LEVELS = [
  { name: 'Novice', min: 0 },
  { name: 'Developing', min: 150 },
  { name: 'Competent', min: 350 },
  { name: 'Proficient', min: 700 },
  { name: 'Advanced', min: 1200 },
  { name: 'Expert', min: 2000 },
  { name: 'Master', min: 3500 },
];

export const calculateTaskScore = (task) => {
  if (!task.completed) {
    if (task.dueDate) {
      const daysLate = Math.floor((new Date() - new Date(task.dueDate)) / 86400000);
      if (daysLate > 0) return Math.max(OVERDUE_PENALTY * Math.min(daysLate, 6), -30);
    }
    return 0;
  }
  const base = PRIORITY_WEIGHTS[task.priority] || PRIORITY_WEIGHTS.Low;
  let score = base;
  if (task.submissionStatus === 'approved') score = base * APPROVAL_MULTIPLIER;
  else if (task.submissionStatus === 'submitted') score = base * SUBMITTED_MULTIPLIER;
  if (task.dueDate && new Date() <= new Date(task.dueDate)) score += ON_TIME_BONUS;
  if (task.checklist?.length) {
    const done = task.checklist.filter(c => c.completed).length;
    score += Math.round((done / task.checklist.length) * CHECKLIST_MAX_BONUS);
  }
  return Math.round(score);
};

export const calculateGoalScore = (goal) => {
  if (!goal.subGoals?.length) return 0;
  const completed = goal.subGoals.filter(s => s.completed).length;
  const progress = completed / goal.subGoals.length;
  return Math.round(progress * GOAL_BASE_MAX) + (progress === 1 ? GOAL_COMPLETE_BONUS : 0);
};

export const calculateUserTotalScore = (tasks = [], goals = []) => {
  const taskScore = tasks.reduce((sum, t) => sum + calculateTaskScore(t), 0);
  const goalScore = goals.reduce((sum, g) => sum + calculateGoalScore(g), 0);
  return Math.max(0, taskScore + goalScore);
};

export const calculateCompletionRate = (tasks = []) => {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
};

export const calculateOverdueRate = (tasks = []) => {
  const withDue = tasks.filter(t => t.dueDate);
  if (!withDue.length) return 0;
  return Math.round((withDue.filter(t => !t.completed && new Date(t.dueDate) < new Date()).length / withDue.length) * 100);
};

export const getUserLevel = (totalScore) => {
  const lvl = [...LEVELS].reverse().find(l => totalScore >= l.min);
  return lvl?.name || 'Novice';
};

export const getNextLevel = (totalScore) => {
  const currentIdx = LEVELS.findLastIndex(l => totalScore >= l.min);
  const next = LEVELS[currentIdx + 1];
  const current = LEVELS[currentIdx];
  if (!next) return { name: 'Master', progress: 100, pointsNeeded: 0 };
  const progress = Math.round(((totalScore - current.min) / (next.min - current.min)) * 100);
  return { name: next.name, progress: Math.min(progress, 99), pointsNeeded: next.min - totalScore };
};

export const getScoreBreakdown = (tasks = [], goals = []) => {
  let basePoints = 0, approvalBonus = 0, onTimeBonus = 0, checklistBonus = 0, penaltyTotal = 0, goalPoints = 0;
  tasks.forEach(t => {
    if (!t.completed) { penaltyTotal += calculateTaskScore(t); return; }
    const base = PRIORITY_WEIGHTS[t.priority] || PRIORITY_WEIGHTS.Low;
    basePoints += base;
    if (t.submissionStatus === 'approved') approvalBonus += Math.round(base * (APPROVAL_MULTIPLIER - 1));
    else if (t.submissionStatus === 'submitted') approvalBonus += Math.round(base * (SUBMITTED_MULTIPLIER - 1));
    if (t.dueDate && new Date() <= new Date(t.dueDate)) onTimeBonus += ON_TIME_BONUS;
    if (t.checklist?.length) {
      const done = t.checklist.filter(c => c.completed).length;
      checklistBonus += Math.round((done / t.checklist.length) * CHECKLIST_MAX_BONUS);
    }
  });
  goals.forEach(g => { goalPoints += calculateGoalScore(g); });
  return {
    basePoints, approvalBonus, onTimeBonus, checklistBonus, penaltyTotal, goalPoints,
    total: Math.max(0, basePoints + approvalBonus + onTimeBonus + checklistBonus + penaltyTotal + goalPoints),
  };
};

export { LEVELS };
