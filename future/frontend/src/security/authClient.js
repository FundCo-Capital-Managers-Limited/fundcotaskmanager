import axios from 'axios';

const API_BASE = String(import.meta.env.VITE_API_URL || 'http://localhost:4001').trim().replace(/\/+$/, '');
const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';
const USER_KEY = 'currentUser';

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

export const storeUserSession = ({ token, user }) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user?.id) localStorage.setItem(USER_ID_KEY, user.id);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  emitAuthChange();
};

export const clearUserSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_KEY);
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
    storeUserSession({ token: data.token, user: data.user });
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
  if (getAccessToken() && readStoredUser()) return true;
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



