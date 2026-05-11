import axios from 'axios';

const API_BASE = String(import.meta.env.VITE_API_URL || 'http://localhost:4001').trim().replace(/\/+$/, '');
const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';
const USER_KEY = 'currentUser';
const ACCESS_EXPIRES_AT_KEY = 'fundcoUserAccessExpiresAt';
const REFRESH_EXPIRES_AT_KEY = 'fundcoUserRefreshExpiresAt';
const REMEMBER_ME_KEY = 'fundcoUserRememberMe';

let installed = false;
let refreshPromise = null;

const AUTH_CHANGE_EVENT = 'fundco-user-auth:changed';
const AUTH_FAILURE_MESSAGES = [
  'token expired',
  'invalid token',
  'token invalid or expired',
  'token missing',
  'authentication required',
  'account is deactivated',
  'user not found',
  'not authorized',
  'auth required',
];

const normalizeUrl = (value) => String(value || '').trim();
const isManagedUrl = (url) => {
  if (!url) return true;
  const normalized = normalizeUrl(url);
  return normalized.startsWith('/') || normalized.startsWith(API_BASE);
};

const emitAuthChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

const shouldAttemptRefresh = (error) => {
  if (error.response?.status !== 401) return false;
  const message = String(error.response?.data?.message || '').toLowerCase();
  return AUTH_FAILURE_MESSAGES.some((part) => message.includes(part));
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

export const storeUserSession = ({ token, user, accessTokenExpiresInSeconds, refreshSessionExpiresAt, rememberMe }) => {
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
  emitAuthChange();
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

  refreshPromise = axios.post(
    `${API_BASE}/api/user/refresh`,
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
    storeUserSession({
      token: data.token,
      user: data.user,
      accessTokenExpiresInSeconds: data.accessTokenExpiresInSeconds,
      refreshSessionExpiresAt: data.refreshSessionExpiresAt,
      rememberMe: typeof data.rememberMe === 'boolean' ? data.rememberMe : readStoredSessionMeta().rememberMe,
    });
    return data;
  }).catch((error) => {
    clearUserSession();
    throw error;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const bootstrapUserSession = async () => {
  if (isRefreshSessionExpired()) {
    clearUserSession();
    return false;
  }
  if (getAccessToken() && readStoredUser()) {
    if (!isAccessTokenStale()) return true;
    try {
      await refreshUserAccessToken();
      return true;
    } catch {
      return false;
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

      if (!shouldAttemptRefresh(error)) {
        if (error.response?.status === 401) clearUserSession();
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
        clearUserSession();
        throw refreshError;
      }
    }
  );
};

export const userAuthEvents = {
  AUTH_CHANGE_EVENT,
};
