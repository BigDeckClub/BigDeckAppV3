import { createClient } from '@supabase/supabase-js';

// Dev auth bypass: enabled when DEV_AUTH_BYPASS=true. If running in production this will
// log a warning but still respect the variable (use with care).
const isProduction = process.env.NODE_ENV === 'production';
const devBypassEnabled = String(process.env.DEV_AUTH_BYPASS) === 'true';
if (devBypassEnabled && isProduction) {
  console.warn('[AUTH] DEV_AUTH_BYPASS is enabled in production environment - proceed with caution');
}
// Log current state for debugging when running in dev/preview
console.log('[AUTH] devBypassEnabled=', devBypassEnabled, 'NODE_ENV=', process.env.NODE_ENV);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

function getDevUser() {
  // Allow overriding via env vars; provide sensible defaults
  const id = process.env.DEV_AUTH_USER_ID || '00000000-0000-4000-8000-000000000000';
  const email = process.env.DEV_AUTH_EMAIL || 'dev@bigdeck.app';
  return { id, email }; 
}

/**
 * Authentication middleware - validates Supabase JWT token and attaches user to request
 */
export async function authenticate(req, res, next) {
  try {
    // Dev bypass: if enabled, or if request includes `x-dev-bypass: true` header, attach a fake user and skip token verification
    const headerBypass = String(req.headers['x-dev-bypass'] || '').toLowerCase() === 'true';
    if (devBypassEnabled || headerBypass) {
      const devUser = getDevUser();
      console.warn('[AUTH] Dev auth bypass enabled - attaching dev user:', devUser.email);
      req.user = { id: devUser.id, email: devUser.email };
      req.userId = devUser.id;
      return next();
    }
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    if (!supabase) {
      console.error('[AUTH] Supabase not configured');
      return res.status(500).json({ error: 'Authentication service not available' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[AUTH] Token verification failed:', error?.message);
      // Check if error is due to Supabase service being unavailable
      if (error?.message?.includes('Unexpected token') || error?.message?.includes('<html>')) {
        return res.status(503).json({ error: 'Authentication service temporarily unavailable. Please try again later.' });
      }
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request object
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
    // Dev bypass: attach dev user if bypass enabled or header requested
    const headerBypass = String(req.headers['x-dev-bypass'] || '').toLowerCase() === 'true';
    if (devBypassEnabled || headerBypass) {
      const devUser = getDevUser();
      req.user = { id: devUser.id, email: devUser.email };
      req.userId = devUser.id;
      return next();
    }
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
