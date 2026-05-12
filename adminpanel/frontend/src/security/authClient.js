import axios from 'axios';

const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');
const AUTH_REFRESH_EXEMPT_PATHS = [
  '/api/admin/auth/login',
  '/api/admin/auth/forgot',
  '/api/admin/auth/reset',
];

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

const resolveAdminApiBase = () => {
  if (import.meta.env.VITE_ADMIN_API_URL) return import.meta.env.VITE_ADMIN_API_URL;
  if (isBrowserLocal()) return resolveLocalApiBase(4002);
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:4002';
};

const API_BASE = normalizeBase(resolveAdminApiBase());
const TOKEN_KEY = 'adminToken';
const USER_KEY = 'adminUser';
const ACCESS_EXPIRES_AT_KEY = 'fundcoAdminAccessExpiresAt';
const REFRESH_EXPIRES_AT_KEY = 'fundcoAdminRefreshExpiresAt';
const REMEMBER_ME_KEY = 'fundcoAdminRememberMe';
const AUTH_CHANGE_EVENT = 'fundco-admin-auth:changed';

let refreshPromise = null;

const isManagedUrl = (url) => {
  const normalized = String(url || '').trim();
  return !normalized || normalized.startsWith('/') || normalized.startsWith(API_BASE);
};

const shouldSkipRefreshForRequest = (request) => {
  const normalized = String(request?.url || '').trim().toLowerCase();
  return AUTH_REFRESH_EXEMPT_PATHS.some((path) => normalized.includes(path));
};

const emitAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const getAdminApiBase = () => API_BASE;

export const getAdminAccessToken = () => localStorage.getItem(TOKEN_KEY);

export const readStoredAdminUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

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

export const storeAdminSession = ({ token, user, accessTokenExpiresInSeconds, refreshSessionExpiresAt, rememberMe }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
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
  emitAuthChange();
};

export const clearAdminSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_EXPIRES_AT_KEY);
  localStorage.removeItem(REFRESH_EXPIRES_AT_KEY);
  localStorage.removeItem(REMEMBER_ME_KEY);
  emitAuthChange();
};

export const refreshAdminAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios.post(
    `${API_BASE}/api/admin/auth/refresh`,
    {},
    {
      withCredentials: true,
      skipAuthRefresh: true,
      skipAuthHeader: true,
    }
  ).then(({ data }) => {
    if (!data?.success || !data?.token || !data?.user) {
      throw new Error(data?.message || 'Unable to refresh session');
    }
    storeAdminSession({
      token: data.token,
      user: data.user,
      accessTokenExpiresInSeconds: data.accessTokenExpiresInSeconds,
      refreshSessionExpiresAt: data.refreshSessionExpiresAt,
      rememberMe: typeof data.rememberMe === 'boolean' ? data.rememberMe : readStoredSessionMeta().rememberMe,
    });
    return data;
  }).catch((error) => {
    if (isTerminalRefreshError(error)) {
      clearAdminSession();
    }
    throw error;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const bootstrapAdminSession = async () => {
  const hasLocalSession = Boolean(getAdminAccessToken() && readStoredAdminUser());

  if (isRefreshSessionExpired()) {
    clearAdminSession();
    return false;
  }

  if (hasLocalSession) {
    if (!isAccessTokenStale()) return true;
    try {
      await refreshAdminAccessToken();
      return true;
    } catch (error) {
      return !isTerminalRefreshError(error);
    }
  }

  try {
    await refreshAdminAccessToken();
    return true;
  } catch {
    return false;
  }
};

export const logoutAdminSession = async () => {
  try {
    await axios.post(
      `${API_BASE}/api/admin/auth/logout`,
      {},
      {
        withCredentials: true,
        skipAuthRefresh: true,
      }
    );
  } catch {
    // ignore transport failure on logout
  } finally {
    clearAdminSession();
  }
};

export const attachAdminAuthInterceptors = (instance) => {
  instance.defaults.withCredentials = true;

  instance.interceptors.request.use((config) => {
    if (!isManagedUrl(config.url)) return config;

    const nextConfig = { ...config };
    nextConfig.withCredentials = true;
    nextConfig.headers = nextConfig.headers || {};

    const token = getAdminAccessToken();
    if (token && !nextConfig.skipAuthHeader && !nextConfig.headers.Authorization) {
      nextConfig.headers.Authorization = `Bearer ${token}`;
    }
    return nextConfig;
  });

  instance.interceptors.response.use(
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
        const session = await refreshAdminAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${session.token}`;
        originalRequest.withCredentials = true;
        return instance(originalRequest);
      } catch (refreshError) {
        throw isTerminalRefreshError(refreshError) ? refreshError : error;
      }
    }
  );

  return instance;
};

export const adminAuthEvents = {
  AUTH_CHANGE_EVENT,
};
