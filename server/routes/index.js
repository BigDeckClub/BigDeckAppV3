// Routes barrel export - registers all route modules
import healthRouter from './health.js';
import pricesRouter from './prices.js';
import inventoryRouter from './inventory.js';
import importsRouter from './imports.js';
import analyticsRouter from './analytics.js';
import decksRouter from './decks.js';
import foldersRouter from './folders.js';
import salesRouter from './sales.js';
import settingsRouter from './settings.js';
import authRouter from './auth.js';
import lotsRouter from './lots.js';
import historyRouter from './history.js';
import aiRouter from './ai.js';

export function registerRoutes(app) {
  // Health check (no /api prefix)
  app.use(healthRouter);
  
  // API routes (mounted with /api prefix)
  app.use('/api', pricesRouter);
  app.use('/api', inventoryRouter);
  app.use('/api', importsRouter);
  app.use('/api', analyticsRouter);
  app.use('/api', decksRouter);
  app.use('/api', foldersRouter);
  app.use('/api', salesRouter);
  app.use('/api', settingsRouter);
  app.use('/api', authRouter);
  app.use('/api', lotsRouter);
  app.use('/api', historyRouter);
  app.use('/api', aiRouter);
}

export {
  healthRouter,
  pricesRouter,
  inventoryRouter,
  importsRouter,
  analyticsRouter,
  decksRouter,
  foldersRouter,
  salesRouter,
  settingsRouter,
  authRouter,
  lotsRouter,
  historyRouter,
  aiRouter
};
