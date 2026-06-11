import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../utils/api.js';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('adminUser'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then(({ data }) => {
        if (data.success) {
          setUser(data.user);
          localStorage.setItem('adminUser', JSON.stringify(data.user));
        }
      })
      .catch(() => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const syncUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem('adminUser', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('adminUser');
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
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      setUser(data.user);
    }
    return data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
  }, []);

  const isRole = useCallback((role) => user?.role === role, [user]);
  const hasRole = useCallback((...roles) => roles.includes(user?.role), [user]);

  return (
    <AuthContext.Provider value={{ user, setUser: syncUser, syncUser, refreshUser, login, logout, loading, isRole, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
