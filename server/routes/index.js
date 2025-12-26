// Routes barrel export - registers all route modules
import healthRouter from './health.js';
import pricesRouter from './prices.js';
import inventoryRouter from './inventory.js';
import importsRouter from './imports.js';
import analyticsRouter from './analytics.js';
import decksRouter from './decks.js';
import foldersRouter from './folders.js';
import settingsRouter from './settings.js';
import authRouter from './auth.js';
import lotsRouter from './lots.js';
import aiRouter from './ai.js';
import communityThemesRouter from './communityThemes.js';
import assetsRouter from './assets.js';
import adminRouter from './admin.js';
import diagnosticsRouter from './diagnostics.js';
import scryfallProxyRouter from './scryfallProxy.js';


import cardsRouter from './cards.js';
import tcgplayerRouter from './tcgplayer.js';

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
  app.use('/api', settingsRouter);
  app.use('/api', authRouter);
  app.use('/api', lotsRouter);

  console.log('[ROUTES] Registering AI router at /api/ai');
  console.log('[ROUTES] AI Router type:', typeof aiRouter);
  console.log('[ROUTES] AI Router stack length:', aiRouter?.stack?.length || 'N/A');

  // Log all routes in the AI router
  if (aiRouter?.stack) {
    console.log('[ROUTES] AI Router routes:');
    aiRouter.stack.forEach((layer, i) => {
      const route = layer.route;
      if (route) {
        const methods = Object.keys(route.methods).join(',').toUpperCase();
        console.log(`  ${i + 1}. ${methods} ${route.path}`);
      }
    });
  }

  app.use('/api/ai', aiRouter);
  console.log('[ROUTES] AI router registered');

  app.use('/api', communityThemesRouter);
  app.use('/api', assetsRouter);
  app.use('/api', adminRouter);


  app.use('/api', cardsRouter);
  app.use('/api', tcgplayerRouter);
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
  settingsRouter,
  authRouter,
  lotsRouter,
  aiRouter,
  communityThemesRouter,
  assetsRouter,
  diagnosticsRouter,

  tcgplayerRouter,
};
