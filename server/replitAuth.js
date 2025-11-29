import * as client from 'openid-client';
import { Strategy } from 'openid-client/passport';
import passport from 'passport';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import memoizee from 'memoizee';
import pkg from 'pg';

const { Pool } = pkg;

// Memoized OIDC config fetcher
const getOidcConfig = memoizee(
  async () => {
    console.log('[AUTH] Fetching OIDC configuration from Replit...');
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? 'https://replit.com/oidc'),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1000 } // Cache for 1 hour
);

// Get session store using PostgreSQL
function getSessionStore() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const PgStore = connectPg(session);
  return new PgStore({
    pool: pool,
    createTableIfMissing: true,
    tableName: 'sessions',
  });
}

// Update user session with token data
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Upsert user in database
async function upsertUser(claims) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await pool.query(
      `INSERT INTO users (id, email, first_name, last_name, profile_image_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         email = $2,
         first_name = $3,
         last_name = $4,
         profile_image_url = $5,
         updated_at = NOW()`,
      [
        claims['sub'],
        claims['email'] || null,
        claims['first_name'] || null,
        claims['last_name'] || null,
        claims['profile_image_url'] || null,
      ]
    );
    console.log(`[AUTH] ✓ User ${claims['sub']} upserted`);
  } catch (err) {
    console.error('[AUTH] ✗ Failed to upsert user:', err.message);
  } finally {
    await pool.end();
  }
}

export async function setupAuth(app) {
  try {
    // Trust proxy for correct client IP in cloud environments
    app.set('trust proxy', 1);

    // Session configuration
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const sessionStore = getSessionStore();

    app.use(
      session({
        secret: process.env.SESSION_SECRET,
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: sessionTtl,
          sameSite: 'lax',
        },
      })
    );

    // Initialize Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Serialize/deserialize user for session
    passport.serializeUser((user, cb) => cb(null, user));
    passport.deserializeUser((user, cb) => cb(null, user));

    // Get OIDC config
    const config = await getOidcConfig();
    console.log('[AUTH] ✓ OIDC config loaded');

    // Verify callback for Passport strategy
    const verify = async (tokens, verified) => {
      try {
        const user = {};
        updateUserSession(user, tokens);
        await upsertUser(tokens.claims());
        verified(null, user);
      } catch (err) {
        console.error('[AUTH] ✗ Verification failed:', err.message);
        verified(err);
      }
    };

    // Strategy registry
    const strategies = new Map();

    // Helper to get the actual Replit domain
    const getReplitDomain = () => {
      // Use REPLIT_DOMAINS environment variable (set by Replit)
      if (process.env.REPLIT_DOMAINS) {
        return process.env.REPLIT_DOMAINS;
      }
      // Fallback for production
      if (process.env.REPL_OWNER && process.env.REPL_SLUG) {
        return `${process.env.REPL_OWNER}--${process.env.REPL_SLUG}.repl.co`;
      }
      return null;
    };

    // Helper to construct callback URL
    const getCallbackURL = () => {
      const domain = getReplitDomain();
      if (domain) {
        return `https://${domain}`;
      }
      // Fallback for local development only
      return 'http://localhost:3000';
    };

    // Helper to ensure strategy exists
    const ensureStrategy = () => {
      const domain = getReplitDomain() || 'localhost';
      if (!strategies.has(domain)) {
        const strategyName = `replitauth:${domain}`;
        const callbackURL = `${getCallbackURL()}/api/callback`;
        console.log(`[AUTH] Creating strategy with callback: ${callbackURL}`);
        const strategy = new Strategy(
          {
            config,
            scope: 'openid email profile offline_access',
            callbackURL: callbackURL,
          },
          verify
        );
        passport.use(strategyName, strategy);
        strategies.set(domain, strategyName);
        console.log(`[AUTH] ✓ Strategy registered for ${domain}`);
      }
      return strategies.get(domain);
    };

    // ========== AUTH ROUTES ==========
    console.log('[AUTH] Registering auth routes...');

    // Login endpoint
    app.get('/api/login', (req, res, next) => {
      console.log('[AUTH] GET /api/login - initiating login flow');
      const strategyName = ensureStrategy();
      passport.authenticate(strategyName, {
        prompt: 'login consent',
        scope: ['openid', 'email', 'profile', 'offline_access'],
      })(req, res, next);
    });

    // Callback endpoint
    app.get('/api/callback', (req, res, next) => {
      console.log('[AUTH] GET /api/callback - processing OAuth response');
      const strategyName = ensureStrategy();
      passport.authenticate(strategyName, {
        successRedirect: '/',
        failureRedirect: '/api/login',
      })(req, res, next);
    });

    // Get current user
    app.get('/api/auth/user', (req, res) => {
      if (req.isAuthenticated() && req.user) {
        console.log(`[AUTH] ✓ User authenticated: ${req.user.claims?.email}`);
        res.json({
          id: req.user.claims?.sub,
          email: req.user.claims?.email,
          firstName: req.user.claims?.first_name,
          lastName: req.user.claims?.last_name,
          profileImage: req.user.claims?.profile_image_url,
        });
      } else {
        console.log('[AUTH] User not authenticated');
        res.status(401).json({ error: 'Unauthorized' });
      }
    });

    // Logout endpoint
    app.get('/api/logout', (req, res) => {
      console.log('[AUTH] GET /api/logout - signing out user');
      req.logout((err) => {
        if (err) {
          console.error('[AUTH] ✗ Logout error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }

        try {
          const logoutURL = client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID,
            post_logout_redirect_uri: `${getCallbackURL()}/`,
          });
          console.log('[AUTH] ✓ User logged out, redirecting to Replit logout');
          res.redirect(logoutURL.href);
        } catch (err) {
          console.error('[AUTH] ✗ Failed to build logout URL:', err);
          res.redirect('/');
        }
      });
    });

    console.log('[AUTH] ✓ All auth routes registered successfully');
  } catch (err) {
    console.error('[AUTH] ✗ Failed to setup authentication:', err.message);
    throw err;
  }
}
