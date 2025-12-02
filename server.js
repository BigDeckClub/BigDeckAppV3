import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import compression from 'compression';
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
    app.listen(PORT, () => {
      console.log(`[SERVER] ✓ Running on port ${PORT}`);
      console.log('[SERVER] ✓ All systems ready');
    });
  } catch (error) {
    console.error('[APP] ✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Export pool for use in routes that may need direct access
export { pool };
