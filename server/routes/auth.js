import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { pool } from '../db/pool.js';

const router = express.Router();

// ========== SUPABASE AUTH PROXY ==========
// Initialize Supabase client with service role key (server-side auth operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create single Supabase instance for all auth operations
const supabaseServer = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

/**
 * Ensure user exists in local users table (for foreign key constraints)
 * Creates or updates the user record when they log in or sign up
 */
async function ensureUserInDatabase(user) {
  if (!user || !user.id) return;
  
  try {
    await pool.query(`
      INSERT INTO users (id, email, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW()
    `, [user.id, user.email || null]);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] User synced to database:', user.id);
    }
  } catch (err) {
    console.error('[AUTH] Failed to sync user to database:', err.message);
    // Don't throw - auth should still succeed even if local sync fails
  }
}

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!supabaseServer) {
      console.error('[AUTH] Supabase not configured');
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] Login attempt for:', email);
    }
    const { data, error } = await supabaseServer.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('[AUTH] Login error:', error.message);
      return res.status(error.status || 401).json({ error: error.message });
    }

    // Sync user to local database for foreign key constraints
    if (data?.user) {
      await ensureUserInDatabase(data.user);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] Login successful for:', email);
    }
    res.json(data);
  } catch (error) {
    console.error('[AUTH] Login exception:', error.message);
    // Check if error is due to Supabase service being unavailable
    if (error.message?.includes('Unexpected token') || error.message?.includes('<html>')) {
      return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again later.' });
    }
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

router.post('/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!supabaseServer) {
      console.error('[AUTH] Supabase not configured');
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] Signup attempt for:', email);
    }
    const { data, error } = await supabaseServer.auth.signUp({ email, password });
    
    if (error) {
      console.error('[AUTH] Signup error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    // Sync user to local database for foreign key constraints
    if (data?.user) {
      await ensureUserInDatabase(data.user);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[AUTH] Signup successful for:', email);
    }
    res.json(data);
  } catch (error) {
    console.error('[AUTH] Signup exception:', error.message);
    // Check if error is due to Supabase service being unavailable
    if (error.message?.includes('Unexpected token') || error.message?.includes('<html>')) {
      return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again later.' });
    }
    res.status(500).json({ error: error.message || 'Signup failed' });
  }
});

// Get current session endpoint
router.get('/auth/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ user: null });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!supabaseServer) {
      return res.json({ user: null });
    }

    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    
    if (error || !user) {
      return res.json({ user: null });
    }
    
    res.json({ user });
  } catch (err) {
    console.error('[AUTH] Session error:', err.message);
    res.json({ user: null });
  }
});

router.post('/auth/logout', (req, res) => {
  res.json({ success: true });
});

export default router;
