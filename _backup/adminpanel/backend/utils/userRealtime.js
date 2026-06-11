const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

const resolveUserApiBase = () => {
  const explicitBase =
    process.env.USER_API_URL ||
    process.env.SHARED_USER_API_URL ||
    process.env.PRODUCTION_USER_API_URL;

  if (explicitBase) return explicitBase;

  return (process.env.NODE_ENV || '').toLowerCase() === 'production'
    ? 'https://negtm.onrender.com'
    : 'http://127.0.0.1:4001';
};

const RAW_USER_API_BASE = normalizeBase(resolveUserApiBase());
const INTERNAL_TOKEN = String(process.env.INTERNAL_API_TOKEN || process.env.JWT_SECRET || '').trim();

const getCandidateBases = (value) => {
  try {
    const url = new URL(value);
    const candidates = [];

    const pushCandidate = (hostname) => {
      const nextUrl = new URL(url.toString());
      nextUrl.hostname = hostname;
      candidates.push(nextUrl.toString().replace(/\/+$/, ''));
    };

    pushCandidate(url.hostname);
    if (url.hostname === 'localhost') pushCandidate('127.0.0.1');
    if (url.hostname === '127.0.0.1') pushCandidate('localhost');

    return [...new Set(candidates)];
  } catch {
    return [String(value || '').replace(/\/+$/, '')].filter(Boolean);
  }
};

const USER_API_BASES = getCandidateBases(RAW_USER_API_BASE);

const postToUserBackend = async (path, payload = {}) => {
  if (!path || !INTERNAL_TOKEN) return null;

  const errors = [];
  for (const baseUrl of USER_API_BASES) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-token': INTERNAL_TOKEN,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        errors.push(`${baseUrl}${path} -> ${response.status}`);
        continue;
      }

      const text = await response.text();
      if (!text) return {};

      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (error) {
      errors.push(`${baseUrl}${path} -> ${error.message}`);
    }
  }

  if (errors.length) {
    console.error('User backend request error:', errors.join(' | '));
  }

  return null;
};

const postToUserBackendWithAuth = async (path, payload = {}, authHeader = '') => {
  if (!path || !authHeader) return null;

  const errors = [];
  for (const baseUrl of USER_API_BASES) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        errors.push(`${baseUrl}${path} -> ${response.status}`);
        continue;
      }

      const text = await response.text();
      if (!text) return {};

      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (error) {
      errors.push(`${baseUrl}${path} -> ${error.message}`);
    }
  }

  if (errors.length) {
    console.error('User backend auth request error:', errors.join(' | '));
  }

  return null;
};

export const emitToUserBackend = async ({ event, data, room = '' }) => {
  if (!event) return false;
  const result = await postToUserBackend('/api/emit', { event, data, room });
  return !!result;
};

export const createNotificationInUserBackend = async (payload, authHeader = '') => {
  let result = await postToUserBackend('/api/notifications/internal', payload);
  if (!result) {
    result = await postToUserBackendWithAuth('/api/notifications/admin-sync/task', payload, authHeader);
  }
  return result?.notification || null;
};

export const syncTaskReminderInUserBackend = async (payload, authHeader = '') => {
  let result = await postToUserBackend('/api/reminders/internal/task-sync', payload);
  if (!result) {
    result = await postToUserBackendWithAuth('/api/reminders/admin-sync/task-sync', payload, authHeader);
  }
  return result?.reminder || null;
};

export const deleteTaskReminderInUserBackend = async (payload, authHeader = '') => {
  let result = await postToUserBackend('/api/reminders/internal/task-delete', payload);
  if (!result) {
    result = await postToUserBackendWithAuth('/api/reminders/admin-sync/task-delete', payload, authHeader);
  }
  return !!result?.success;
};
