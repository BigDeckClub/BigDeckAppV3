import session from 'express-session';

export async function setupAuth(app) {
  const sessionSecret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';

  console.log('[AUTH] Environment check:');
  console.log(`  SESSION_SECRET: ${sessionSecret ? 'SET' : 'MISSING'}`);

  // Session middleware
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  console.log('[AUTH] Registering auth routes...');

  // Get current user
  app.get('/api/auth/user', (req, res) => {
    console.log('[AUTH] GET /api/auth/user - User:', req.session.user ? 'Authenticated' : 'Not authenticated');
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  });
  console.log('[AUTH]   ✓ GET /api/auth/user');

  // Login endpoint (accepts any credentials for now, real Replit auth can be added later)
  app.post('/api/login', (req, res) => {
    console.log('[AUTH] POST /api/login called');
    try {
      // Store user session
      req.session.user = {
        id: `user-${Date.now()}`,
        email: req.body.email || 'user@example.com',
        name: req.body.name || 'User',
      };
      console.log('[AUTH] User logged in:', req.session.user);
      res.json({ success: true, user: req.session.user });
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });
  console.log('[AUTH]   ✓ POST /api/login');

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    console.log('[AUTH] POST /api/logout called');
    req.session.destroy((err) => {
      if (err) {
        console.error('[AUTH] Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      console.log('[AUTH] User logged out');
      res.json({ success: true });
    });
  });
  console.log('[AUTH]   ✓ POST /api/logout');

  console.log('[AUTH] ✓ Auth setup complete - all routes registered');
}
