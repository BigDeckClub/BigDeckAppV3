import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Database and initialization
import { pool } from './server/db/pool.js';
import { initializeDatabase } from './server/db/init.js';

// Middleware
import { errorHandler, requestId } from './server/middleware/index.js';

// Routes
import { registerRoutes } from './server/routes/index.js';

// Services
import { mtgjsonService } from './server/mtgjsonPriceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, 'dist');

// Trust proxy for correct client IP handling in cloud environments
app.set('trust proxy', 1);

// ========== SERVE STATIC ASSETS FIRST ==========
// Static files must be served before CORS/other middleware to avoid CORS issues
// These are same-origin requests and don't need CORS headers
if (!fs.existsSync(distPath)) {
  console.error(`[STATIC] dist folder not found at ${distPath}. Assets will 500 until build runs.`);
}

app.use(express.static(distPath, {
  maxAge: '1d',
  etag: true,
}));

// Serve uploaded assets during development (uploads/)
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch (e) { /* ignore */ }
}
app.use('/uploads', express.static(uploadsPath, { maxAge: '1d', etag: true }));

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
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://api.scryfall.com", "https://*.supabase.co"],
      fontSrc: ["'self'", "data:"],
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

// ========== REGISTER ALL ROUTES ==========
registerRoutes(app);

// ========== API 404 HANDLER ==========
app.use('/api', (req, res) => {
  console.log(`[404] API endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

// ========== CATCH-ALL HANDLER - SPA ROUTING ==========
// Must come after API routes and before error handling
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
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
