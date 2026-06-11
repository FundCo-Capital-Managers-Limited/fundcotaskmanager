const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

const resolveAdminApiBase = () => {
  const explicitBase =
    process.env.ADMIN_API_URL ||
    process.env.ADMIN_BACKEND_URL ||
    process.env.SHARED_ADMIN_API_URL ||
    process.env.PRODUCTION_ADMIN_API_URL;

  if (explicitBase) return explicitBase;

  return (process.env.NODE_ENV || '').toLowerCase() === 'production'
    ? ''
    : 'http://127.0.0.1:4002';
};

const RAW_ADMIN_API_BASE = normalizeBase(resolveAdminApiBase());
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

const ADMIN_API_BASES = getCandidateBases(RAW_ADMIN_API_BASE);

const postToAdminBackend = async (path, payload = {}) => {
  if (!path || !INTERNAL_TOKEN) return null;

  const errors = [];
  for (const baseUrl of ADMIN_API_BASES) {
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
    console.error('Admin backend request error:', errors.join(' | '));
  }

  return null;
};

export const createNotificationInAdminBackend = async (payload = {}) => {
  const result = await postToAdminBackend('/api/admin/notifications/internal', payload);
  return result?.notification || null;
};
