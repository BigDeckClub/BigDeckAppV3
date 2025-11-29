import { ExpressAuth } from '@auth/express';
import PostgresAdapter from '@auth/pg-adapter';
import Google from '@auth/express/providers/google';
import Apple from '@auth/express/providers/apple';
import Facebook from '@auth/express/providers/facebook';
import Credentials from '@auth/express/providers/credentials';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import pkg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;

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

// Create connection pool for Auth.js adapter
function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

// Upsert user in the legacy users table (for backward compatibility)
async function upsertLegacyUser(pool, user) {
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
        user.id,
        user.email || null,
        user.name?.split(' ')[0] || null,
        user.name?.split(' ').slice(1).join(' ') || null,
        user.image || null,
      ]
    );
    console.log(`[AUTH] ✓ User ${user.id} upserted to legacy users table`);
  } catch (err) {
    console.error('[AUTH] ✗ Failed to upsert legacy user:', err.message);
  }
}

// Find user by email for credentials authentication
async function findUserByEmail(pool, email) {
  try {
    const result = await pool.query(
      'SELECT * FROM auth_users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error('[AUTH] ✗ Failed to find user by email:', err.message);
    return null;
  }
}

// Create Auth.js configuration
function createAuthConfig(pool) {
  return {
    adapter: PostgresAdapter(pool),
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
      Apple({
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET,
      }),
      Facebook({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      }),
      Credentials({
        id: 'credentials',
        name: 'Email',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await findUserByEmail(pool, credentials.email);
          if (!user || !user.password_hash) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        },
      }),
    ],
    session: {
      strategy: 'database',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    callbacks: {
      async session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
      async signIn({ user, account }) {
        // Sync user to legacy users table for backward compatibility
        await upsertLegacyUser(pool, user);
        return true;
      },
    },
    pages: {
      signIn: '/login',
      error: '/login',
    },
    trustHost: true,
    secret: process.env.AUTH_SECRET,
  };
}

// Initialize Auth.js tables in PostgreSQL
async function initializeAuthTables(pool) {
  try {
    // Auth.js required tables - verification_token, accounts, sessions, users
    // Note: The @auth/pg-adapter expects specific table names

    // Auth.js users table (separate from legacy users table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        "emailVerified" TIMESTAMPTZ,
        image TEXT,
        password_hash VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Auth.js accounts table for OAuth providers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        type VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        "providerAccountId" VARCHAR(255) NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type VARCHAR(255),
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        UNIQUE(provider, "providerAccountId")
      )
    `);

    // Auth.js sessions table (separate from existing sessions for express-session)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
        "userId" UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        expires TIMESTAMPTZ NOT NULL
      )
    `);

    // Auth.js verification tokens for email verification
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_token (
        identifier VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identifier, token)
      )
    `);

    console.log('[AUTH] ✓ Auth.js tables initialized');
  } catch (err) {
    console.error('[AUTH] ✗ Failed to initialize Auth.js tables:', err.message);
    throw err;
  }
}

export async function setupAuth(app) {
  try {
    // Trust proxy for correct client IP in cloud environments
    app.set('trust proxy', 1);

    const pool = createPool();

    // Initialize Auth.js tables
    await initializeAuthTables(pool);

    // Session configuration for Express (used for CSRF protection and general session needs)
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

    // Auth.js configuration
    const authConfig = createAuthConfig(pool);

    // Mount Auth.js at /api/auth/*
    app.use('/api/auth/*', ExpressAuth(authConfig));

    // ========== CUSTOM AUTH ROUTES ==========
    console.log('[AUTH] Registering auth routes...');

    // Login endpoint - redirect to Auth.js signin page
    app.get('/api/login', (req, res) => {
      console.log('[AUTH] GET /api/login - redirecting to signin');
      res.redirect('/api/auth/signin');
    });

    // Logout endpoint - redirect to Auth.js signout
    app.get('/api/logout', (req, res) => {
      console.log('[AUTH] GET /api/logout - redirecting to signout');
      res.redirect('/api/auth/signout');
    });

    // Get current user (compatibility endpoint)
    app.get('/api/auth/user', async (req, res) => {
      try {
        // Get session from Auth.js
        const authResponse = await fetch(
          `${req.protocol}://${req.get('host')}/api/auth/session`,
          {
            headers: {
              cookie: req.headers.cookie || '',
            },
          }
        );

        if (authResponse.ok) {
          const session = await authResponse.json();
          if (session?.user) {
            console.log(`[AUTH] ✓ User authenticated: ${session.user.email}`);
            res.json({
              id: session.user.id,
              email: session.user.email,
              firstName: session.user.name?.split(' ')[0] || null,
              lastName: session.user.name?.split(' ').slice(1).join(' ') || null,
              profileImage: session.user.image,
            });
            return;
          }
        }

        console.log('[AUTH] User not authenticated');
        res.status(401).json({ error: 'Unauthorized' });
      } catch (err) {
        console.error('[AUTH] ✗ Failed to get user:', err.message);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Register new user with email/password
    app.post('/api/auth/register', async (req, res) => {
      try {
        const { email, password, name } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await findUserByEmail(pool, email);
        if (existingUser) {
          return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const result = await pool.query(
          `INSERT INTO auth_users (email, password_hash, name)
           VALUES ($1, $2, $3)
           RETURNING id, email, name`,
          [email, passwordHash, name || null]
        );

        const newUser = result.rows[0];

        // Also create in legacy users table
        await upsertLegacyUser(pool, {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        });

        console.log(`[AUTH] ✓ New user registered: ${email}`);
        res.status(201).json({
          message: 'User registered successfully',
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          },
        });
      } catch (err) {
        console.error('[AUTH] ✗ Failed to register user:', err.message);
        res.status(500).json({ error: 'Failed to register user' });
      }
    });

    console.log('[AUTH] ✓ All auth routes registered successfully');
  } catch (err) {
    console.error('[AUTH] ✗ Failed to setup authentication:', err.message);
    throw err;
  }
}
