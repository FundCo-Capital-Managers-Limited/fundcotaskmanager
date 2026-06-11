// utils/performanceCalculator.js
// ─────────────────────────────────────────────────────────────────────────────
// FundCo Performance Scoring System — v2
//
// DESIGN PRINCIPLES
// 1. Completing tasks earns base points weighted by priority.
// 2. Quality modifiers reward doing it RIGHT: meeting deadlines, completing
//    checklists fully, and getting admin approval.
// 3. A timeliness penalty applies to overdue uncompleted tasks (caps at -30).
// 4. Goals earn up to 100 pts each; partial progress is rewarded proportionally.
// 5. Total Score = Task Points + Goal Points + Bonus Points (admin-awarded).
// 6. Levels gate at natural milestone scores.
// ─────────────────────────────────────────────────────────────────────────────

// ── Base points per completed task ───────────────────────────────────────────
// Priority reflects effort and business impact.
export const PRIORITY_WEIGHTS = {
  High:   60,   // High-impact work; biggest reward
  Medium: 35,   // Standard deliverables
  Low:    15,   // Routine / minor tasks
};

// ── Multipliers applied on top of base ────────────────────────────────────────
// Applied multiplicatively against the base weight.
const APPROVAL_MULTIPLIER   = 1.5;  // Task was submitted AND approved by admin
const SUBMITTED_MULTIPLIER  = 1.2;  // Task submitted but not yet reviewed
const ON_TIME_BONUS         = 10;   // Flat bonus for completing before/on dueDate
const OVERDUE_PENALTY       = -5;   // Per day overdue when task is incomplete (max -30)
const CHECKLIST_MAX_BONUS   = 20;   // Full checklist = +20 pts; partial = pro-rated

// ── Goal scoring ───────────────────────────────────────────────────────────────
const GOAL_COMPLETE_BONUS   = 20;   // Extra bonus for 100% sub-goal completion
const GOAL_BASE_MAX         = 100;  // Max base points per goal (at 100% progress)

// ── Level thresholds ──────────────────────────────────────────────────────────
// Deliberately spaced so each level feels earned.
const LEVELS = [
  { name: 'Novice',       min:    0 },
  { name: 'Developing',   min:  150 },
  { name: 'Competent',    min:  350 },
  { name: 'Proficient',   min:  700 },
  { name: 'Advanced',     min: 1200 },
  { name: 'Expert',       min: 2000 },
  { name: 'Master',       min: 3500 },
];

// ── Calculate score for a single task ────────────────────────────────────────
export const calculateTaskScore = (task) => {
  // Only completed tasks earn base points
  if (!task.completed) {
    // Incomplete tasks: apply overdue penalty if past dueDate
    if (task.dueDate) {
      const daysLate = Math.floor((new Date() - new Date(task.dueDate)) / 86400000);
      if (daysLate > 0) {
        return Math.max(OVERDUE_PENALTY * Math.min(daysLate, 6), -30); // cap at -30
      }
    }
    return 0;
  }

  const base = PRIORITY_WEIGHTS[task.priority] || PRIORITY_WEIGHTS.Low;

  // ── Approval multiplier ──────────────────────────────────────────────────
  let score = base;
  if (task.submissionStatus === 'approved') {
    score = base * APPROVAL_MULTIPLIER;
  } else if (task.submissionStatus === 'submitted') {
    score = base * SUBMITTED_MULTIPLIER;
  }

  // ── On-time bonus ────────────────────────────────────────────────────────
  // Only applies if task has a dueDate and was completed (we use today as
  // completion proxy since completedAt isn't stored on the model)
  if (task.dueDate && new Date() <= new Date(task.dueDate)) {
    score += ON_TIME_BONUS;
  }

  // ── Checklist bonus ──────────────────────────────────────────────────────
  // Rewards thoroughness: finishing all checklist items earns the full bonus.
  if (task.checklist?.length) {
    const done  = task.checklist.filter(c => c.completed).length;
    const ratio = done / task.checklist.length;
    score += Math.round(ratio * CHECKLIST_MAX_BONUS);
  }

  return Math.round(score);
};

// ── Calculate score for a single goal ────────────────────────────────────────
export const calculateGoalScore = (goal) => {
  if (!goal.subGoals?.length) return 0;
  const completed  = goal.subGoals.filter(s => s.completed).length;
  const progress   = completed / goal.subGoals.length; // 0–1
  const basePoints = Math.round(progress * GOAL_BASE_MAX);
  const bonus      = progress === 1 ? GOAL_COMPLETE_BONUS : 0;
  return basePoints + bonus;
};

// ── Calculate total task score for a user ─────────────────────────────────────
export const calculateUserTaskScore = (tasks = []) => {
  return tasks.reduce((sum, t) => sum + calculateTaskScore(t), 0);
};

// ── Calculate total goal score for a user ─────────────────────────────────────
export const calculateUserGoalScore = (goals = []) => {
  return goals.reduce((sum, g) => sum + calculateGoalScore(g), 0);
};

// ── Total combined score ──────────────────────────────────────────────────────
export const calculateUserTotalScore = (tasks = [], goals = []) => {
  const taskScore = calculateUserTaskScore(tasks);
  const goalScore = calculateUserGoalScore(goals);
  return Math.max(0, taskScore + goalScore); // floor at 0 (penalties don't go negative overall)
};

// ── Completion rate ────────────────────────────────────────────────────────────
// % of tasks marked completed (0–100, integer)
export const calculateCompletionRate = (tasks = []) => {
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.completed).length;
  return Math.round((done / tasks.length) * 100);
};

// ── Overdue rate ───────────────────────────────────────────────────────────────
export const calculateOverdueRate = (tasks = []) => {
  const withDue  = tasks.filter(t => t.dueDate);
  if (!withDue.length) return 0;
  const overdue  = withDue.filter(t => !t.completed && new Date(t.dueDate) < new Date()).length;
  return Math.round((overdue / withDue.length) * 100);
};

// ── User level ────────────────────────────────────────────────────────────────
export const getUserLevel = (totalScore) => {
  const lvl = [...LEVELS].reverse().find(l => totalScore >= l.min);
  return lvl?.name || 'Novice';
};

// ── Next level info (for UI progress bars) ────────────────────────────────────
export const getNextLevel = (totalScore) => {
  const currentIdx = LEVELS.findLastIndex(l => totalScore >= l.min);
  const next       = LEVELS[currentIdx + 1];
  const current    = LEVELS[currentIdx];
  if (!next) return { name: 'Master', progress: 100, pointsNeeded: 0 };
  const progress     = Math.round(((totalScore - current.min) / (next.min - current.min)) * 100);
  const pointsNeeded = next.min - totalScore;
  return { name: next.name, progress: Math.min(progress, 99), pointsNeeded };
};

// ── Score breakdown (for UserDetailModal) ─────────────────────────────────────
export const getScoreBreakdown = (tasks = [], goals = []) => {
  let basePoints       = 0;
  let approvalBonus    = 0;
  let onTimeBonus      = 0;
  let checklistBonus   = 0;
  let penaltyTotal     = 0;
  let goalPoints       = 0;

  tasks.forEach(t => {
    if (!t.completed) {
      const pen = calculateTaskScore(t); // negative or 0
      penaltyTotal += pen;
      return;
    }
    const base = PRIORITY_WEIGHTS[t.priority] || PRIORITY_WEIGHTS.Low;
    basePoints += base;

    if (t.submissionStatus === 'approved') approvalBonus += Math.round(base * (APPROVAL_MULTIPLIER - 1));
    else if (t.submissionStatus === 'submitted') approvalBonus += Math.round(base * (SUBMITTED_MULTIPLIER - 1));

    if (t.dueDate && new Date() <= new Date(t.dueDate)) onTimeBonus += ON_TIME_BONUS;

    if (t.checklist?.length) {
      const done  = t.checklist.filter(c => c.completed).length;
      checklistBonus += Math.round((done / t.checklist.length) * CHECKLIST_MAX_BONUS);
    }
  });

  goals.forEach(g => { goalPoints += calculateGoalScore(g); });

  return {
    basePoints,
    approvalBonus,
    onTimeBonus,
    checklistBonus,
    penaltyTotal,
    goalPoints,
    total: Math.max(0, basePoints + approvalBonus + onTimeBonus + checklistBonus + penaltyTotal + goalPoints),
  };
};

export { LEVELS };