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

const api = axios.create({ baseURL: `${API_BASE}/api/admin` });

const shouldClearSession = (error) => {
  if (error.response?.status !== 401) return false;
  const message = String(error.response?.data?.message || '').toLowerCase();
  return [
    'token expired',
    'invalid token',
    'token invalid or expired',
    'token missing',
    'auth required',
    'authentication required',
    'account is deactivated',
    'user not found',
    'not authorized',
  ].some((part) => message.includes(part));
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (shouldClearSession(err)) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
export { API_BASE };

