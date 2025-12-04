import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Database and initialization
import { pool } from './server/db/pool.js';
import { initializeDatabase } from './server/db/init.js';

// Middleware
import { errorHandler } from './server/middleware/index.js';

// Routes
import { registerRoutes } from './server/routes/index.js';

// Services
import { mtgjsonService } from './server/mtgjsonPriceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for correct client IP handling in cloud environments
app.set('trust proxy', 1);

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS handler - allow all origins for development and Replit deployment
// This is intentional: the app has no authentication and is designed for open access
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== REQUEST LOGGING ==========
// Use 'dev' format for colored, concise output in development
// Skip logging for static assets to reduce noise
app.use(morgan('dev', {
  skip: (req) => req.path.startsWith('/assets/') || req.path.endsWith('.js') || req.path.endsWith('.css')
}));

app.use(bodyParser.json());

// Enable gzip/brotli compression for all responses
app.use(compression());

// ========== REGISTER ALL ROUTES ==========
registerRoutes(app);

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

    // ========== SERVE STATIC ASSETS ==========
    app.use(express.static('dist', {
      maxAge: '1d', // Cache static assets for 1 day
      etag: true,
    }));

    // ========== CATCH-ALL HANDLER - SPA ROUTING ==========
    app.use((req, res) => {
      if (req.path.startsWith('/api/')) {
        console.log(`[404] API endpoint not found: ${req.method} ${req.path}`);
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      // Serve index.html for SPA routes
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });

    // ========== START SERVER ==========
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`[SERVER] ✓ Running on port ${PORT}`);
      console.log('[SERVER] ✓ All systems ready');
    });

    // ========== GRACEFUL SHUTDOWN ==========
    const gracefulShutdown = async (signal) => {
      console.log(`\n[SERVER] Received ${signal}. Starting graceful shutdown...`);
      
      // Stop accepting new connections
      server.close(async (err) => {
        if (err) {
          console.error('[SERVER] Error during server close:', err);
        }
        
        console.log('[SERVER] HTTP server closed');
        
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
      setTimeout(() => {
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
