import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      if (window.electronAPI?.authGetCurrentUser) {
        const result = await window.electronAPI.authGetCurrentUser();
        if (result.success && result.user) {
          setUser(result.user);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name) => {
    try {
      const result = await window.electronAPI?.authRegister(email, password, name);
      if (result?.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result?.error || 'Registration failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const login = async (email, password) => {
    try {
      const result = await window.electronAPI?.authLogin(email, password);
      if (result?.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result?.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await window.electronAPI?.authLogout();
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (updates) => {
    try {
      const result = await window.electronAPI?.authUpdateProfile(updates);
      if (result?.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result?.error || 'Update failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const connectHuggingFace = async (token, username) => {
    try {
      const result = await window.electronAPI?.authConnectHuggingFace(token, username);
      if (result?.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result?.error || 'Connection failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const disconnectHuggingFace = async () => {
    try {
      const result = await window.electronAPI?.authDisconnectHuggingFace();
      if (result?.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result?.error || 'Disconnect failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    isLoggedIn: !!user,
    register,
    login,
    logout,
    updateProfile,
    connectHuggingFace,
    disconnectHuggingFace,
    refreshUser: loadCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
