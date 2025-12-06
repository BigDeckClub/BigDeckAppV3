import React, { createContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Defensive check for localStorage availability
        if (typeof localStorage === 'undefined') {
          console.warn('[AUTH] localStorage not available');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        const saved = localStorage.getItem('supabase_user');
        if (mounted && saved) {
          try {
            const parsedUser = JSON.parse(saved);
            setUser(parsedUser);
          } catch (parseError) {
            console.error('[AUTH] Failed to parse saved user:', parseError);
            // Clear corrupted data
            localStorage.removeItem('supabase_user');
          }
        }
      } catch (err) {
        console.error('[AUTH] Error initializing auth:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth expiration events
    const handleAuthExpired = () => {
      console.log('[AUTH] Auth expired event received, logging out user');
      if (mounted) {
        setUser(null);
      }
    };

    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      mounted = false;
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Login failed (${response.status})`);
      }

      if (data.user) {
        setUser(data.user);
        try {
          localStorage.setItem('supabase_user', JSON.stringify(data.user));
        } catch (storageErr) {
          console.error('[AUTH] Failed to save user to localStorage:', storageErr);
        }
      }
      if (data.session) {
        try {
          localStorage.setItem('supabase_session', JSON.stringify(data.session));
        } catch (storageErr) {
          console.error('[AUTH] Failed to save session to localStorage:', storageErr);
        }
      }
      return data;
    } catch (err) {
      console.error('[AUTH] Login error:', err);
      throw err;
    }
  };

  const signup = async (email, password) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      let data = {};
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json().catch(() => ({}));
      } else {
        const text = await response.text();
        console.log('[AUTH] Response text:', text);
      }

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Signup failed';
        throw new Error(errorMsg);
      }

      if (data.user) {
        setUser(data.user);
        try {
          localStorage.setItem('supabase_user', JSON.stringify(data.user));
        } catch (storageErr) {
          console.error('[AUTH] Failed to save user to localStorage:', storageErr);
        }
      }
      if (data.session) {
        try {
          localStorage.setItem('supabase_session', JSON.stringify(data.session));
        } catch (storageErr) {
          console.error('[AUTH] Failed to save session to localStorage:', storageErr);
        }
      }
      return data;
    } catch (err) {
      console.error('[AUTH] Signup error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      try {
        localStorage.removeItem('supabase_user');
        localStorage.removeItem('supabase_session');
      } catch (storageErr) {
        console.error('[AUTH] Failed to clear localStorage:', storageErr);
      }
    } catch (err) {
      console.error('[AUTH] Logout error:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
