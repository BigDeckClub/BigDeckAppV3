import React, { createContext, useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

export const AuthContext = createContext();

let supabase = null;

function getSupabaseClient() {
  if (supabase) return supabase;
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('Missing Supabase configuration');
    return null;
  }
  
  supabase = createClient(url, key);
  return supabase;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabaseClient = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (!supabaseClient) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    // Check current session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    }).catch(err => {
      console.error('Error getting session:', err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription?.unsubscribe();
  }, [supabaseClient]);

  const login = async (email, password) => {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Supabase login error:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const signup = async (email, password) => {
    if (!supabaseClient) throw new Error('Supabase not initialized');
    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }
      return data;
    } catch (err) {
      console.error('Signup failed:', err);
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
