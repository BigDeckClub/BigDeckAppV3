import React, { createContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [supabaseClient] = useState(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('Missing Supabase env vars');
      return null;
    }
    
    return createClient(url, key);
  });

  useEffect(() => {
    if (!supabaseClient) {
      console.error('Supabase client is not available');
      setLoading(false);
      return;
    }

    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (mounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    let subscription;
    try {
      const { data } = supabaseClient.auth.onAuthStateChange(
        (event, session) => {
          if (mounted) {
            setUser(session?.user || null);
          }
        }
      );
      subscription = data.subscription;
    } catch (err) {
      console.error('Failed to subscribe to auth changes:', err);
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabaseClient]);

  const login = async (email, password) => {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const signup = async (email, password) => {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    }
  };

  const logout = async () => {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, supabase: supabaseClient }}>
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
