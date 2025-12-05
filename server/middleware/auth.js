import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (process.env.NODE_ENV !== 'production') {
  console.log('[AUTH] Supabase config check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceRoleKey
  });
}

const supabase = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

if (!supabase) {
  console.error('[AUTH] ✗ WARNING: Supabase client not initialized - authentication will fail');
} else if (process.env.NODE_ENV !== 'production') {
  console.log('[AUTH] ✓ Supabase client initialized successfully');
}

/**
 * Authentication middleware - validates Supabase JWT token and attaches user to request
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    if (!supabase) {
      console.error('[AUTH] Supabase not configured');
      return res.status(500).json({ error: 'Authentication service not available' });
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[AUTH] Token verification failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    console.error('[AUTH] Authentication error:', error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication middleware - attaches user if token exists, but doesn't require it
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ') && supabase) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}
