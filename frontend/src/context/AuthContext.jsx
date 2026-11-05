import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ev_token');
    const savedUser = localStorage.getItem('ev_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token validity
      authAPI.getMe()
        .then(res => setUser(res.user))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('ev_token', res.token);
    localStorage.setItem('ev_user', JSON.stringify(res.user));
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    localStorage.setItem('ev_token', res.token);
    localStorage.setItem('ev_user', JSON.stringify(res.user));
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ev_token');
    localStorage.removeItem('ev_user');
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
