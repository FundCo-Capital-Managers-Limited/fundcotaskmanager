const clampInterval = (value, fallback = 1, max = 52) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.round(parsed)));
};

const normalizeWeekdays = (weekdays = [], fallbackDay = null) => {
  const normalized = [...new Set(
    (Array.isArray(weekdays) ? weekdays : [weekdays])
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  )].sort((left, right) => left - right);

  if (normalized.length) return normalized;
  if (fallbackDay === null || fallbackDay === undefined) return [];

  const parsedFallback = Number(fallbackDay);
  return Number.isInteger(parsedFallback) && parsedFallback >= 0 && parsedFallback <= 6
    ? [parsedFallback]
    : [];
};

export const normalizeRecurrenceInput = (recurrence, remindAt) => {
  if (!recurrence || recurrence === 'none') return null;

  const frequency = String(recurrence.frequency || '').trim().toLowerCase();
  if (!frequency) return null;
  if (!['daily', 'weekly'].includes(frequency)) {
    throw new Error('Invalid recurrence frequency');
  }

  const baseDate = new Date(remindAt);
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error('Invalid reminder time');
  }

  const normalized = {
    frequency,
    interval: clampInterval(recurrence.interval, 1),
    weekdays: [],
    timezone: String(recurrence.timezone || 'Africa/Lagos').trim() || 'Africa/Lagos',
  };

  if (frequency === 'weekly') {
    normalized.weekdays = normalizeWeekdays(recurrence.weekdays, baseDate.getDay());
    if (!normalized.weekdays.length) {
      throw new Error('Weekly reminders require at least one weekday');
    }
  }

  return normalized;
};

export const getRecurrenceLabel = (recurrence = {}) => {
  if (!recurrence?.frequency) return '';
  if (recurrence.frequency === 'daily') {
    return recurrence.interval > 1 ? `Every ${recurrence.interval} days` : 'Every day';
  }

  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const labels = (recurrence.weekdays || []).map((day) => weekdayNames[day]).filter(Boolean);
  if (!labels.length) return recurrence.interval > 1 ? `Every ${recurrence.interval} weeks` : 'Every week';
  if (recurrence.interval > 1) {
    return `Every ${recurrence.interval} weeks on ${labels.join(', ')}`;
  }
  return `Every ${labels.join(', ')}`;
};

export const getNextRecurringReminderAt = (reminder) => {
  if (!reminder?.recurrence?.frequency) return null;
  const current = new Date(reminder.remindAt);
  if (Number.isNaN(current.getTime())) return null;

  if (reminder.recurrence.frequency === 'daily') {
    const next = new Date(current);
    next.setDate(next.getDate() + clampInterval(reminder.recurrence.interval, 1));
    return next;
  }

  const weekdays = normalizeWeekdays(reminder.recurrence.weekdays, current.getDay());
  if (!weekdays.length) return null;
  const weekInterval = clampInterval(reminder.recurrence.interval, 1);

  for (let dayOffset = 1; dayOffset <= weekInterval * 7; dayOffset += 1) {
    const candidate = new Date(current);
    candidate.setDate(current.getDate() + dayOffset);
    candidate.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());

    const weeksApart = Math.floor(dayOffset / 7);
    const isAllowedWeek = weeksApart === 0 || weeksApart % weekInterval === 0;
    if (isAllowedWeek && weekdays.includes(candidate.getDay())) {
      return candidate;
    }
  }

  const fallback = new Date(current);
  fallback.setDate(fallback.getDate() + weekInterval * 7);
  return fallback;
};



