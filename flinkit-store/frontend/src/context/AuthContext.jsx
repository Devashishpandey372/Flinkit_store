import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('flinkit_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('flinkit_token');
      if (!token) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/me');
        const fetchedUser = res.data.data.user;
        setUser(fetchedUser);
        localStorage.setItem('flinkit_user', JSON.stringify(fetchedUser));
      } catch (err) {
        // Only clear credentials if the token is genuinely invalid or expired
        if (err.response?.status === 401) {
          localStorage.removeItem('flinkit_token');
          localStorage.removeItem('flinkit_user');
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: loggedInUser, token } = res.data.data;
    localStorage.setItem('flinkit_token', token);
    localStorage.setItem('flinkit_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const signup = useCallback(async (data) => {
    const res = await api.post('/auth/signup', data);
    const { user: newUser, token } = res.data.data;
    localStorage.setItem('flinkit_token', token);
    localStorage.setItem('flinkit_user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('flinkit_token');
    localStorage.removeItem('flinkit_user');
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('flinkit_user', JSON.stringify(updatedUser));
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await api.patch('/auth/update-profile', data);
    const updated = res.data.data.user;
    setUser(updated);
    localStorage.setItem('flinkit_user', JSON.stringify(updated));
    toast.success('Profile updated successfully');
    return updated;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await api.patch('/auth/change-password', { currentPassword, newPassword });
    toast.success('Password changed successfully');
  }, []);

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        signup,
        logout,
        updateUser,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
