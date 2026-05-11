import axios from 'axios';
import { attachAdminAuthInterceptors } from '../security/authClient.js';

const normalizeBase = (value, fallback) => {
  const raw = String(value || fallback || '').trim().replace(/\/+$/, '');
  try {
    const url = new URL(raw);
    if (url.hostname === 'localhost') {
      url.hostname = '127.0.0.1';
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return raw;
  }
};

const isBrowserLocal = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const getDefaultUserApiBase = () => (isBrowserLocal() ? 'http://127.0.0.1:4001' : 'https://negtm.onrender.com');
const getDefaultUserFrontendBase = () => (isBrowserLocal() ? 'http://127.0.0.1:5173' : 'https://fundcoaiopm.vercel.app');

export const USER_API_BASE = normalizeBase(import.meta.env.VITE_USER_API_URL, getDefaultUserApiBase());
export const USER_FRONTEND_BASE = normalizeBase(import.meta.env.VITE_USER_FRONTEND_URL, getDefaultUserFrontendBase());

const userApi = attachAdminAuthInterceptors(
  axios.create({
    baseURL: USER_API_BASE,
    withCredentials: true,
  })
);

export default userApi;
