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
import communityThemesRouter from './communityThemes.js';
import assetsRouter from './assets.js';
import adminRouter from './admin.js';
import diagnosticsRouter from './diagnostics.js';
import scryfallProxyRouter from './scryfallProxy.js';

export function registerRoutes(app) {
  // Health check (no /api prefix)
  app.use(healthRouter);
  
  // Proxy to external Scryfall API to avoid browser CORS issues
  // Mount the proxy directly at /api/external/scryfall so subpaths map cleanly.
  app.use('/api/external/scryfall', scryfallProxyRouter);

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
  app.use('/api', communityThemesRouter);
  app.use('/api', assetsRouter);
  app.use('/api', adminRouter);
  // Internal diagnostics (no API prefix)
  app.use('/internal', diagnosticsRouter);
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
  , communityThemesRouter, assetsRouter
  , diagnosticsRouter
};
