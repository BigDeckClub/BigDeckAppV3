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

export function registerRoutes(app) {
  // Health check (no /api prefix)
  app.use(healthRouter);
  
  // API routes
  app.use(pricesRouter);
  app.use(inventoryRouter);
  app.use(importsRouter);
  app.use(analyticsRouter);
  app.use(decksRouter);
  app.use(foldersRouter);
  app.use(salesRouter);
  app.use(settingsRouter);
  app.use(authRouter);
  app.use(lotsRouter);
  app.use(historyRouter);
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
  historyRouter
};
