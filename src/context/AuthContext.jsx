import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} firstName - User first name
 * @property {string} lastName - User last name
 * @property {string} profileImage - User profile image URL
 */

/**
 * @typedef {Object} AuthContextValue
 * @property {User|null} user - Current user or null if not authenticated
 * @property {boolean} isLoading - Whether authentication is loading
 * @property {boolean} isAuthenticated - Whether user is authenticated
 * @property {function(): void} login - Redirect to login
 * @property {function(): void} logout - Logout and redirect
 * @property {function(): Promise<void>} refreshUser - Refresh user data
 */

const AuthContext = createContext(null);

/**
 * Auth provider component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[AUTH] Failed to fetch user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(() => {
    window.location.href = '/api/login';
  }, []);

  const logout = useCallback(() => {
    window.location.href = '/api/logout';
  }, []);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    await fetchUser();
  }, [fetchUser]);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication context
 * @returns {AuthContextValue}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
