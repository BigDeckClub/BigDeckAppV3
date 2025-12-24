// Log startup immediately to help debug Cloud Run issues
console.log('[BOOT] Starting server initialization...');
console.log('[BOOT] Node version:', process.version);
console.log('[BOOT] PORT:', process.env.PORT);
console.log('[BOOT] NODE_ENV:', process.env.NODE_ENV);
console.log('[BOOT] DATABASE_URL set:', !!process.env.DATABASE_URL);

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

console.log('[BOOT] Core imports loaded');

// Debug Env Loading
import dotenv from 'dotenv';
const result = dotenv.config();
if (result.error) {
  console.log('[BOOT] Dotenv error:', result.error);
}
console.log('[BOOT] Dotenv parsed keys:', result.parsed ? Object.keys(result.parsed) : 'none');
console.log('[BOOT] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log('[BOOT] GEMINI_API_KEY length:', process.env.GEMINI_API_KEY.length);
  // Log first/last chars to verify (safe-ish for debug)
  const k = process.env.GEMINI_API_KEY;
  console.log('[BOOT] GEMINI_API_KEY hint:', `${k.substring(0, 4)}...${k.substring(k.length - 4)}`);
} else {
  console.warn('[BOOT] WARNING: GEMINI_API_KEY is MISSING from process.env');
}

// Database and initialization
import { pool } from './server/db/pool.js';
import { initializeDatabase } from './server/db/init.js';

console.log('[BOOT] Database imports loaded');

// Middleware
import { errorHandler, requestId } from './server/middleware/index.js';

console.log('[BOOT] Middleware imports loaded');

// Routes
import { registerRoutes } from './server/routes/index.js';
// Import scryfall proxy to mount early for reliable matching
import scryfallProxyRouter from './server/routes/scryfallProxy.js';

console.log('[BOOT] Route imports loaded');

// Services
import { mtgjsonService } from './server/mtgjsonPriceService.js';

console.log('[BOOT] All imports loaded successfully');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, 'dist');

// Trust proxy for correct client IP handling in cloud environments
app.set('trust proxy', 1);

// ========== SECURITY MIDDLEWARE ==========
// Configure allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5000', 'http://localhost:3000'];

// Check if wildcard is present - treat as special case
const allowAllOrigins = allowedOrigins.includes('*');

// CSP configuration - 'unsafe-inline' is required for:
// 1. Vite's development build which injects inline scripts
// 2. React's inline event handlers and dynamic styles
// TODO: Consider implementing nonce-based CSP for production builds
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      // Allow Google Fonts stylesheets in development/preview environments
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.scryfall.com", "https://*.supabase.co"],
      // Allow font files from Google Fonts
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS handler - allowlist-based configuration
// Note: credentials cannot be used with wildcard origins per CORS spec
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow GitHub Codespaces forwarded URLs
    if (origin.endsWith('.app.github.dev')) {
      return callback(null, true);
    }

    // Allow local https dev
    if (origin === 'https://localhost:5000') {
      return callback(null, true);
    }

    if (allowAllOrigins || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  // Only enable credentials if not using wildcard (CORS spec requirement)
  credentials: !allowAllOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// ========== REQUEST ID TRACKING ==========
// Add unique request ID to each request for debugging and log correlation
app.use(requestId);

// ========== REQUEST LOGGING ==========
// Use 'dev' format for colored, concise output in development
// Skip logging for static assets to reduce noise
// Only enable verbose logging in development/staging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev', {
    skip: (req) => req.path.startsWith('/assets/') || req.path.endsWith('.js') || req.path.endsWith('.css')
  }));
} else {
  // In production, use minimal logging for errors only
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400
  }));
}

// Use Express 5 built-in JSON parser (bodyParser is redundant)
app.use(express.json({ limit: '10mb' }));

// Enable gzip/brotli compression for all responses
app.use(compression());

// ========== SERVE STATIC ASSETS ==========
// Must be before API routes so static files are served correctly
if (!fs.existsSync(distPath)) {
  console.error(`[STATIC] dist folder not found at ${distPath}. Assets will 500 until build runs.`);
}

app.use(express.static(distPath, {
  maxAge: '1d',
  etag: true,
}));

// ========== REGISTER ALL ROUTES ==========
// Mount scryfall proxy first so it cannot be intercepted by other /api routers
app.use('/api/external/scryfall', scryfallProxyRouter);
registerRoutes(app);

// ========== API 404 HANDLER ==========
app.use('/api', (req, res) => {
  console.log(`[404] API endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

// ========== CATCH-ALL HANDLER - SPA ROUTING ==========
// Must come after API routes and before error handling
app.use((req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }

  // Skip asset files - let express.static handle them or 404
  if (req.path.startsWith('/assets/') || req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return next();
  }

  const indexPath = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`[STATIC] index.html missing at ${indexPath}. Returning 500.`);
    return res.status(500).json({ error: 'Application bundle is not available. Please redeploy with a built client.' });
  }

  res.sendFile(indexPath);
});

// ========== CENTRALIZED ERROR HANDLING ==========
app.use(errorHandler);

// ========== STARTUP FUNCTION ==========
async function startServer() {
  try {
    console.log('[APP] Initializing database...');
    await initializeDatabase();

    console.log('[APP] Initializing MTGJSON price service...');
    try {
      await mtgjsonService.initialize();
    } catch (error) {
      console.error('[APP] ✗ Failed to initialize MTGJSON price service:', error);
      console.warn('[APP] Continuing startup without MTGJSON price service. Some features may be unavailable.');
    }

    // ========== START SERVER ==========
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`[SERVER] ✓ Running on port ${PORT}`);
      console.log('[SERVER] ✓ All systems ready');
    });

    // ========== GRACEFUL SHUTDOWN ==========
    let shutdownTimeout;
    const gracefulShutdown = async (signal) => {
      console.log(`\n[SERVER] Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async (err) => {
        if (err) {
          console.error('[SERVER] Error during server close:', err);
        }

        console.log('[SERVER] HTTP server closed');

        // Clear the forced shutdown timeout
        if (shutdownTimeout) {
          clearTimeout(shutdownTimeout);
        }

        // Close database pool
        try {
          await pool.end();
          console.log('[SERVER] Database pool closed');
        } catch (dbError) {
          console.error('[SERVER] Error closing database pool:', dbError);
        }

        console.log('[SERVER] ✓ Graceful shutdown complete');
        process.exit(0);
      });

      // Force exit after 30 seconds if graceful shutdown fails
      shutdownTimeout = setTimeout(() => {
        console.error('[SERVER] Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('[APP] ✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
