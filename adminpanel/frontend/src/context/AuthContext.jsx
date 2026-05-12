import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api.js';
import {
  adminAuthEvents,
  bootstrapAdminSession,
  clearAdminSession,
  logoutAdminSession,
  readStoredAdminUser,
  storeAdminSession,
} from '../security/authClient.js';

const AuthContext = createContext(null);

const hasKnownAdminSession = () => Boolean(
  localStorage.getItem('adminToken')
  || localStorage.getItem('adminUser')
  || localStorage.getItem('fundcoAdminRefreshExpiresAt')
);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readStoredAdminUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      await bootstrapAdminSession();
      if (!active) return;

      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setUser(data.user);
          storeAdminSession({ token: localStorage.getItem('adminToken'), user: data.user });
        } else {
          setUser(null);
        }
      } catch {
        setUser(readStoredAdminUser());
      } finally {
        if (active) setLoading(false);
      }
    };

    syncSession();

    const handleAuthChange = () => setUser(readStoredAdminUser());
    window.addEventListener(adminAuthEvents.AUTH_CHANGE_EVENT, handleAuthChange);

    return () => {
      active = false;
      window.removeEventListener(adminAuthEvents.AUTH_CHANGE_EVENT, handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    let active = true;
    let resumeTimeoutId = null;

    const syncFromStorage = () => {
      if (!active) return;
      setUser(readStoredAdminUser());
    };

    const refreshSession = async () => {
      if (!user && !hasKnownAdminSession()) return;

      try {
        await bootstrapAdminSession();
      } catch {
        // bootstrapAdminSession already normalizes local state when recovery fails
      } finally {
        syncFromStorage();
      }
    };

    const scheduleRefresh = () => {
      if (!active) return;
      window.clearTimeout(resumeTimeoutId);
      resumeTimeoutId = window.setTimeout(refreshSession, 180);
    };

    const intervalId = window.setInterval(refreshSession, 10 * 60 * 1000);
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefresh();
      }
    };

    window.addEventListener('focus', scheduleRefresh);
    window.addEventListener('pageshow', scheduleRefresh);
    window.addEventListener('online', scheduleRefresh);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.clearTimeout(resumeTimeoutId);
      window.removeEventListener('focus', scheduleRefresh);
      window.removeEventListener('pageshow', scheduleRefresh);
      window.removeEventListener('online', scheduleRefresh);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [loading, user]);

  const syncUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      storeAdminSession({ token: localStorage.getItem('adminToken'), user: nextUser });
    } else {
      clearAdminSession();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    if (data.success) {
      syncUser(data.user);
      return data.user;
    }
    return null;
  }, [syncUser]);

  const login = async (email, password, rememberMe = false) => {
    const { data } = await api.post('/auth/login', { email, password, rememberMe }, { withCredentials: true });
    if (data.success) {
      storeAdminSession({
        token: data.token,
        user: data.user,
        accessTokenExpiresInSeconds: data.accessTokenExpiresInSeconds,
        refreshSessionExpiresAt: data.refreshSessionExpiresAt,
        rememberMe,
      });
      setUser(data.user);
    }
    return data;
  };

  const logout = useCallback(() => {
    logoutAdminSession().finally(() => setUser(null));
  }, []);

  const isRole = useCallback((role) => user?.role === role, [user]);
  const hasRole = useCallback((...roles) => roles.includes(user?.role), [user]);

  return (
    <AuthContext.Provider value={{ user, setUser: syncUser, syncUser, refreshUser, login, logout, loading, isRole, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
