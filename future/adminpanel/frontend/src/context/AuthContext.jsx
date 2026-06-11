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

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password }, { withCredentials: true });
    if (data.success) {
      storeAdminSession({ token: data.token, user: data.user });
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



