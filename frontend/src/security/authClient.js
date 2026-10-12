import axios from 'axios';

const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

const isBrowserLocal = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const resolveLocalApiBase = (port) => {
  if (typeof window === 'undefined') return `http://localhost:${port}`;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${port}`;
};

const resolveUserApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (isBrowserLocal()) return resolveLocalApiBase(4001);
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:4001';
};

const API_BASE = normalizeBase(resolveUserApiBase());
const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';
const USER_KEY = 'currentUser';
const ACCESS_EXPIRES_AT_KEY = 'fundcoUserAccessExpiresAt';
const REFRESH_EXPIRES_AT_KEY = 'fundcoUserRefreshExpiresAt';
const REMEMBER_ME_KEY = 'fundcoUserRememberMe';
const AUTH_REFRESH_EXEMPT_PATHS = [
  '/api/user/login',
  '/login',
  '/api/user/register',
  '/register',
  '/api/user/signup',
  '/signup',
  '/api/user/forgot',
  '/forgot',
  '/api/user/reset',
  '/reset',
  '/api/user/resend',
  '/resend',
];

let installed = false;
let refreshPromise = null;
const AUTH_REFRESH_RETRY_DELAY_MS = 350;

const AUTH_CHANGE_EVENT = 'fundco-user-auth:changed';

const normalizeUrl = (value) => String(value || '').trim();
const isManagedUrl = (url) => {
  if (!url) return true;
  const normalized = normalizeUrl(url);
  return normalized.startsWith('/') || normalized.startsWith(API_BASE);
};

const shouldSkipRefreshForRequest = (request) => {
  const base = normalizeUrl(request?.baseURL).replace(/\/+$/, '');
  const path = normalizeUrl(request?.url);
  const normalized = `${base}${path.startsWith('/') ? path : `/${path}`}`.toLowerCase();
  return AUTH_REFRESH_EXEMPT_PATHS.some((path) => normalized.includes(path));
};

const emitAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

const readSessionSnapshot = () => ({
  hasToken: Boolean(localStorage.getItem(TOKEN_KEY)),
  userRaw: localStorage.getItem(USER_KEY) || '',
});

const emitAuthChangeIfNeeded = (previousSnapshot) => {
  const nextSnapshot = readSessionSnapshot();
  if (
    previousSnapshot.hasToken !== nextSnapshot.hasToken
    || previousSnapshot.userRaw !== nextSnapshot.userRaw
  ) {
    emitAuthChange();
  }
};

export const getUserApiBase = () => API_BASE;

export const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);

const readStoredSessionMeta = () => ({
  accessTokenExpiresAt: Number(localStorage.getItem(ACCESS_EXPIRES_AT_KEY) || 0),
  refreshSessionExpiresAt: localStorage.getItem(REFRESH_EXPIRES_AT_KEY) || '',
  rememberMe: localStorage.getItem(REMEMBER_ME_KEY) === 'true',
});

const isAccessTokenStale = () => {
  const { accessTokenExpiresAt } = readStoredSessionMeta();
  if (!accessTokenExpiresAt) return false;
  return accessTokenExpiresAt <= Date.now() + (5 * 60 * 1000);
};

const isRefreshSessionExpired = () => {
  const { refreshSessionExpiresAt } = readStoredSessionMeta();
  if (!refreshSessionExpiresAt) return false;
  const expiresAt = new Date(refreshSessionExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
};

const isTerminalRefreshError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (status === 401 || status === 403) return true;

  const message = String(
    error?.response?.data?.message
    || error?.message
    || ''
  ).toLowerCase();

  return [
    'refresh token missing',
    'refresh token invalid',
    'refresh token expired',
    'refresh token reuse detected',
    'unable to refresh session',
    'account inactive',
    'admin access denied',
  ].some((fragment) => message.includes(fragment));
};

const isRetryableRefreshError = (error) => {
  const status = Number(error?.response?.status || 0);
  if (status >= 500) return true;

  const message = String(
    error?.response?.data?.message
    || error?.message
    || ''
  ).toLowerCase();

  return [
    'network error',
    'failed to fetch',
    'load failed',
    'timeout',
    'socket hang up',
  ].some((fragment) => message.includes(fragment));
};

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
const toSessionExpiredError = (error) => {
  const nextError = error instanceof Error ? error : new Error('Session expired. Please sign in again.');
  nextError.message = 'Session expired. Please sign in again.';
  nextError.response = {
    ...(error?.response || {}),
    status: 401,
    data: {
      ...(error?.response?.data || {}),
      message: 'Session expired. Please sign in again.',
    },
  };
  nextError.isAuthExpired = true;
  return nextError;
};

const requestRefresh = () => axios.post(
  `${API_BASE}/api/user/refresh`,
  {},
  {
    withCredentials: true,
    skipAuthRefresh: true,
    skipAuthHeader: true,
  }
);

export const storeUserSession = ({ token, user, accessTokenExpiresInSeconds, refreshSessionExpiresAt, rememberMe }) => {
  const previousSnapshot = readSessionSnapshot();
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user?.id) localStorage.setItem(USER_ID_KEY, user.id);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (Number.isFinite(accessTokenExpiresInSeconds) && accessTokenExpiresInSeconds > 0) {
    localStorage.setItem(ACCESS_EXPIRES_AT_KEY, String(Date.now() + (accessTokenExpiresInSeconds * 1000)));
  }
  if (typeof refreshSessionExpiresAt === 'string' && refreshSessionExpiresAt.trim()) {
    localStorage.setItem(REFRESH_EXPIRES_AT_KEY, refreshSessionExpiresAt.trim());
  }
  if (typeof rememberMe === 'boolean') {
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
  }
  emitAuthChangeIfNeeded(previousSnapshot);
};

export const clearUserSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
  localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  emitAuthChange();
};

export const refreshUserAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { data } = await requestRefresh();
        if (!data?.success || !data?.token || !data?.user) {
          throw new Error(data?.message || 'Unable to refresh session');
        }
        storeUserSession({
          token: data.token,
          user: data.user,
          accessTokenExpiresInSeconds: data.accessTokenExpiresInSeconds,
          refreshSessionExpiresAt: data.refreshSessionExpiresAt,
          rememberMe: typeof data.rememberMe === 'boolean' ? data.rememberMe : readStoredSessionMeta().rememberMe,
        });
        return data;
      } catch (error) {
        lastError = error;
        if (attempt === 0 && isRetryableRefreshError(error)) {
          await delay(AUTH_REFRESH_RETRY_DELAY_MS);
          continue;
        }
        if (isTerminalRefreshError(error)) {
          clearUserSession();
          throw toSessionExpiredError(error);
        }
        throw error;
      }
    }

    throw lastError || new Error('Unable to refresh session');
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const bootstrapUserSession = async () => {
  const hasLocalSession = Boolean(getAccessToken() && readStoredUser());

  if (isRefreshSessionExpired()) {
    clearUserSession();
    return false;
  }

  if (hasLocalSession) {
    if (!isAccessTokenStale()) return true;
    try {
      await refreshUserAccessToken();
      return true;
    } catch (error) {
      return !isTerminalRefreshError(error);
    }
  }

  try {
    await refreshUserAccessToken();
    return true;
  } catch {
    return false;
  }
};

export const logoutUserSession = async () => {
  try {
    await axios.post(
      `${API_BASE}/api/user/logout`,
      {},
      {
        withCredentials: true,
        skipAuthRefresh: true,
      }
    );
  } catch {
    // ignore logout transport failures, local session still needs clearing
  } finally {
    clearUserSession();
  }
};

export const installUserAxiosAuth = () => {
  if (installed) return;
  installed = true;

  axios.defaults.withCredentials = true;

  axios.interceptors.request.use((config) => {
    if (!isManagedUrl(config.url)) return config;

    const nextConfig = { ...config };
    nextConfig.withCredentials = true;
    nextConfig.headers = nextConfig.headers || {};

    const token = getAccessToken();
    if (token && !nextConfig.skipAuthHeader && !nextConfig.headers.Authorization) {
      nextConfig.headers.Authorization = `Bearer ${token}`;
    }

    return nextConfig;
  });

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config || {};

      if (!isManagedUrl(originalRequest.url) || originalRequest.skipAuthRefresh || originalRequest._retry) {
        throw error;
      }

      if (error.response?.status !== 401 || shouldSkipRefreshForRequest(originalRequest)) {
        throw error;
      }

      originalRequest._retry = true;

      try {
        const session = await refreshUserAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${session.token}`;
        originalRequest.withCredentials = true;
        return axios(originalRequest);
      } catch (refreshError) {
        throw isTerminalRefreshError(refreshError) ? toSessionExpiredError(refreshError) : error;
      }
    }
  );
};

export const userAuthEvents = {
  AUTH_CHANGE_EVENT,
};



