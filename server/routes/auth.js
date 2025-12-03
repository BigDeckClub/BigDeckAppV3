import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// ========== SUPABASE AUTH PROXY ==========
// Initialize Supabase client with service role key (server-side auth operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create single Supabase instance for all auth operations
const supabaseServer = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!supabaseServer) {
      console.error('[AUTH] Supabase not configured');
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    console.log('[AUTH] Login attempt for:', email);
    const { data, error } = await supabaseServer.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('[AUTH] Login error:', error.message);
      return res.status(error.status || 401).json({ error: error.message });
    }

    console.log('[AUTH] Login successful for:', email);
    res.json(data);
  } catch (error) {
    console.error('[AUTH] Login exception:', error.message);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

router.post('/api/auth/signup', async (req, res) => {
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

    console.log('[AUTH] Signup attempt for:', email);
    const { data, error } = await supabaseServer.auth.signUp({ email, password });
    
    if (error) {
      console.error('[AUTH] Signup error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log('[AUTH] Signup successful for:', email);
    res.json(data);
  } catch (error) {
    console.error('[AUTH] Signup exception:', error.message);
    res.status(500).json({ error: error.message || 'Signup failed' });
  }
});

// Get current session endpoint
router.get('/api/auth/session', async (req, res) => {
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

router.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

export default router;
