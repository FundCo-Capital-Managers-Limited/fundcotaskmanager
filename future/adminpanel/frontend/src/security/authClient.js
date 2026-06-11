import axios from 'axios';

const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

const isBrowserLocal = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const resolveAdminApiBase = () => {
  if (import.meta.env.VITE_ADMIN_API_URL) return import.meta.env.VITE_ADMIN_API_URL;
  if (isBrowserLocal()) return 'http://127.0.0.1:4002';
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://127.0.0.1:4002';
};

const API_BASE = normalizeBase(resolveAdminApiBase());
const TOKEN_KEY = 'adminToken';
const USER_KEY = 'adminUser';
const AUTH_CHANGE_EVENT = 'fundco-admin-auth:changed';
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

let refreshPromise = null;

const isManagedUrl = (url) => {
  const normalized = String(url || '').trim();
  return !normalized || normalized.startsWith('/') || normalized.startsWith(API_BASE);
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

export const storeAdminSession = ({ token, user }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  emitAuthChange();
};

export const clearAdminSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
    storeAdminSession({ token: data.token, user: data.user });
    return data;
  }).catch((error) => {
    clearAdminSession();
    throw error;
  }).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const bootstrapAdminSession = async () => {
  if (getAdminAccessToken() && readStoredAdminUser()) return true;
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

      if (!shouldAttemptRefresh(error)) {
        if (error.response?.status === 401) clearAdminSession();
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
        clearAdminSession();
        throw refreshError;
      }
    }
  );

  return instance;
};

export const adminAuthEvents = {
  AUTH_CHANGE_EVENT,
};



