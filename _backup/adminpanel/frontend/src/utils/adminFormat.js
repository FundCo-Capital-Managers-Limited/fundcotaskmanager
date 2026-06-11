export const formatPersonName = (person, fallback = 'Unknown') => {
  if (!person) return fallback;
  if (person.fullName?.trim()) return person.fullName.trim();
  const fullName = [person.firstName, person.lastName, person.otherName].filter(Boolean).join(' ').trim();
  return fullName || fallback;
};

export const getRoleLabel = (role) => {
  if (role === 'admin') return 'Super Admin';
  if (role === 'executive') return 'Executive';
  if (role === 'team-lead') return 'Team Lead';
  return 'Standard';
};

export const getInitials = (person, fallback = 'A') => {
  if (!person) return fallback;
  const parts = [person.firstName, person.lastName]
    .filter(Boolean)
    .map((value) => value.trim()[0])
    .filter(Boolean);
  if (parts.length) return parts.slice(0, 2).join('').toUpperCase();
  if (person.fullName?.trim()) {
    return person.fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((value) => value[0])
      .join('')
      .toUpperCase();
  }
  return fallback;
};

export const clampPercentage = (value) => {
  if (!Number.isFinite(Number(value))) return 0;
  return Math.max(0, Math.min(100, Math.round(Number(value))));
};

export const percentOf = (done, total) => {
  if (!total) return 0;
  return clampPercentage((done / total) * 100);
};

export const formatCompactNumber = (value) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);

export const getTaskProgress = (task) => {
  if (task?.checklist?.length) {
    const completed = task.checklist.filter((item) => item.completed).length;
    return percentOf(completed, task.checklist.length);
  }
  return task?.completed ? 100 : 0;
};

export const isTaskOverdue = (task) =>
  Boolean(task?.dueDate && !task?.completed && new Date(task.dueDate).getTime() < Date.now());

export const getGoalProgress = (goal) => {
  if (!goal?.subGoals?.length) return 0;
  const completed = goal.subGoals.filter((item) => item.completed).length;
  return percentOf(completed, goal.subGoals.length);
};
