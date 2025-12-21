import express from 'express';
import fs from 'fs';
import { asyncHandler } from '../middleware/asyncHandler.js';
import path from 'path';
import { pathToFileURL } from 'url';
import { pool } from '../db/pool.js';

// Marketplace module will be loaded dynamically after build
import { z } from 'zod';
import inputSchema from '../autobuy/validation.js';

const router = express.Router();

// Lightweight per-route body parser with size limit to avoid huge uploads
router.use('/autobuy', express.json({ limit: '200kb' }));

// Attach database pool to request for all autobuy routes
router.use(/^\/autobuy/, (req, res, next) => {
  req.db = pool;
  next();
});

// Validation schemas (local copies for reference, main validation in validation.js)
const demandSchema = z.object({ cardId: z.string(), quantity: z.number().int().nonnegative(), maxPrice: z.number().nonnegative().optional() });
const directiveSchema = z.object({ cardId: z.string(), mode: z.enum(['FORCE', 'PREFER', 'SHIP_ONLY']), quantity: z.number().int().positive().optional() });
const offerSchema = z.object({ cardId: z.string(), sellerId: z.string(), price: z.number().nonnegative(), quantityAvailable: z.number().int().nonnegative(), marketplace: z.string().optional(), shipping: z.object({ base: z.number().nonnegative().optional(), freeAt: z.number().nonnegative().optional() }).optional() });
const hotSchema = z.object({ cardId: z.string(), IPS: z.number().optional(), targetInventory: z.number().optional() });

// User preferences schema for the /autobuy/plan-from-db endpoint
const preferencesSchema = z.object({
  priceThresholdPercent: z.number().min(50).max(150).default(100),
  minSellerRating: z.number().min(0).max(1).default(0.95),
  maxSellersPerOrder: z.number().int().min(1).max(20).default(5),
  allowHotListFiller: z.boolean().default(true),
  allowSpeculativeOverbuying: z.boolean().default(false),
  inventoryTimeHorizon: z.number().int().min(7).max(90).default(30),
  includeQueuedDecks: z.boolean().default(true),
}).strict();

/**
 * POST /api/autobuy/plan
 * 
 * Run the autobuy optimizer with provided demands, offers, and configuration.
 * This is the raw optimizer endpoint - caller must provide all data.
 */
router.post('/autobuy/plan', asyncHandler(async (req, res) => {
  const input = req.body || {};
  const parse = inputSchema.safeParse(input);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid input', details: parse.error.format() });
  }

  const p = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'optimizer.js');
  try {
    const mod = await import(pathToFileURL(p).href);
    const optimizer = mod.runFullPipeline ? mod : (mod.default || mod);
    if (!optimizer || !optimizer.runFullPipeline) {
      return res.status(500).json({ error: 'optimizer unavailable' });
    }
    const ckPrices = new Map(Object.entries(input.cardKingdomPrices || {}));
    const currentInventory = new Map(Object.entries(input.currentInventory || {}));
    const plan = optimizer.runFullPipeline({
      demands: input.demands || [],
      directives: input.directives || [],
      offers: input.offers || [],
      hotList: input.hotList || [],
      cardKingdomPrices: ckPrices,
      currentInventory,
    });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}));

/**
 * GET /api/autobuy/demand-summary
 * 
 * Get a summary of current demand from inventory alerts and deck requirements.
 * Requires database access (from req.db).
 */
router.get('/autobuy/demand-summary', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get inventory items with low inventory alerts
    const alertItems = await db.query(`
      SELECT 
        scryfall_id as "cardId",
        name as "cardName",
        quantity,
        reserved,
        (quantity - COALESCE(reserved, 0)) as available,
        low_inventory_alert as "lowInventoryAlert",
        low_inventory_threshold as "lowInventoryThreshold",
        ck_price as "ckPrice"
      FROM inventory
      WHERE low_inventory_alert = true
        AND (quantity - COALESCE(reserved, 0)) < low_inventory_threshold
    `);

    // Get active and queued deck card requirements
    const deckCards = await db.query(`
      SELECT 
        dc.scryfall_id as "cardId",
        dc.name as "cardName",
        SUM(dc.quantity) as "totalNeeded",
        COUNT(DISTINCT d.id) as "deckCount",
        array_agg(DISTINCT d.name) as "deckNames"
      FROM deck_cards dc
      JOIN decks d ON dc.deck_id = d.id
      WHERE d.status IN ('active', 'queued')
      GROUP BY dc.scryfall_id, dc.name
    `);

    // Build summary
    const alertCardsCount = alertItems.rows?.length || 0;
    const deckCardsCount = deckCards.rows?.length || 0;
    const uniqueCards = new Set([
      ...(alertItems.rows || []).map(r => r.cardId),
      ...(deckCards.rows || []).map(r => r.cardId),
    ]);

    res.json({
      summary: {
        alertCardsCount,
        deckCardsCount,
        uniqueCardsNeeded: uniqueCards.size,
      },
      alertItems: alertItems.rows || [],
      deckCards: deckCards.rows || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch demand summary' });
  }
}));

/**
 * POST /api/autobuy/generate-hot-list
 * 
 * Generate a Hot List using the IPS Calculator based on current inventory and deck data.
 * Body can include optional configuration overrides.
 */
router.post('/autobuy/generate-hot-list', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Load IPS calculator module
    const ipsPath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'ipsCalculator.js');
    let ipsModule;
    try {
      ipsModule = await import(pathToFileURL(ipsPath).href);
    } catch (e) {
      return res.status(500).json({ error: 'IPS Calculator not available - run build first' });
    }

    const { generateHotList, filterEligibleHotList, DEFAULT_IPS_CONFIG } = ipsModule;
    const config = { ...DEFAULT_IPS_CONFIG, ...(req.body.config || {}) };

    // Fetch inventory with usage statistics
    const inventoryResult = await db.query(`
      SELECT 
        i.scryfall_id as "cardId",
        i.name as "cardName",
        i.quantity as "currentInventory",
        COALESCE(i.low_inventory_alert, false) as "lowInventoryAlertEnabled",
        COALESCE(i.low_inventory_threshold, 0) as "lowInventoryThreshold",
        COALESCE(i.ck_price, 0) as "ckPrice",
        COALESCE(i.market_price, i.ck_price, 0) as "marketMedianPrice",
        COALESCE(deck_usage.deck_count, 0) as "deckUsageCount",
        COALESCE(queued_usage.queued_count, 0) as "queuedDeckUsageCount",
        COALESCE(sales.velocity, 0) as "salesVelocity"
      FROM inventory i
      LEFT JOIN (
        SELECT dc.scryfall_id, COUNT(DISTINCT d.id) as deck_count
        FROM deck_cards dc
        JOIN decks d ON dc.deck_id = d.id
        WHERE d.status = 'active'
        GROUP BY dc.scryfall_id
      ) deck_usage ON i.scryfall_id = deck_usage.scryfall_id
      LEFT JOIN (
        SELECT dc.scryfall_id, COUNT(DISTINCT d.id) as queued_count
        FROM deck_cards dc
        JOIN decks d ON dc.deck_id = d.id
        WHERE d.status = 'queued'
        GROUP BY dc.scryfall_id
      ) queued_usage ON i.scryfall_id = queued_usage.scryfall_id
      LEFT JOIN (
        SELECT scryfall_id, 
               COUNT(*)::float / NULLIF(EXTRACT(EPOCH FROM (NOW() - MIN(sold_at))) / 86400, 0) as velocity
        FROM sales
        WHERE sold_at > NOW() - INTERVAL '30 days'
        GROUP BY scryfall_id
      ) sales ON i.scryfall_id = sales.scryfall_id
      WHERE i.ck_price > 0
    `);

    const cards = (inventoryResult.rows || []).map(row => ({
      cardId: row.cardId,
      cardName: row.cardName,
      deckUsageCount: parseInt(row.deckUsageCount) || 0,
      queuedDeckUsageCount: parseInt(row.queuedDeckUsageCount) || 0,
      salesVelocity: parseFloat(row.salesVelocity) || 0,
      lowInventoryAlertEnabled: row.lowInventoryAlertEnabled,
      lowInventoryThreshold: parseInt(row.lowInventoryThreshold) || 0,
      currentInventory: parseInt(row.currentInventory) || 0,
      ckPrice: parseFloat(row.ckPrice) || 0,
      marketMedianPrice: parseFloat(row.marketMedianPrice) || 0,
    }));

    // Load substitution service module
    const servicePath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'substitutionService.js');
    let substitutionResult = [];
    try {
      const mod = await import(pathToFileURL(servicePath).href);
      const substitutionService = mod.default || mod;

      // Fetch groups and enhance with inventory data
      const rawGroups = await substitutionService.getSubstitutionGroups(db);

      // Create a map of inventory for quick lookup
      const inventoryMap = new Map();
      cards.forEach(c => inventoryMap.set(c.cardId, c.currentInventory));

      // Transform groups into IPS-compatible format with inventory data
      substitutionResult = rawGroups.map(g => ({
        groupId: g.groupId,
        name: g.name,
        cards: g.cards, // string[] of cardIds
        cardInventory: inventoryMap // Map<string, number>
      }));
    } catch (e) {
      console.warn('Substitution service extraction failed:', e);
      // Fallback to empty groups if service fails, don't break the whole endpoint
      substitutionResult = [];
    }

    // Generate and filter hot list
    const hotList = generateHotList(cards, substitutionResult, config);
    const eligibleHotList = filterEligibleHotList(hotList, config);

    // Return top 100 by default
    const limit = req.body.limit || 100;
    res.json({
      hotList: eligibleHotList.slice(0, limit),
      totalCards: cards.length,
      eligibleCount: eligibleHotList.length,
      config,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate hot list' });
  }
}));

/**
 * GET /api/autobuy/sample
 * 
 * Serve sample input JSON for testing the optimizer.
 */
router.get('/autobuy/sample', asyncHandler(async (req, res) => {
  const samplePath = path.join(process.cwd(), 'server', 'autobuy', 'examples', 'sample-input.json');
  try {
    const raw = await fs.promises.readFile(samplePath, 'utf8');
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'failed to load sample input' });
  }
}));

/**
 * GET /api/autobuy/status
 * 
 * Check if the autobuy optimizer is available and working.
 */
router.get('/autobuy/status', asyncHandler(async (req, res) => {
  const optimizerPath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'optimizer.js');
  const ipsPath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'ipsCalculator.js');
  const demandBuilderPath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'demandBuilder.js');

  const status = {
    optimizer: false,
    ipsCalculator: false,
    demandBuilder: false,
    ready: false,
  };

  try {
    await import(pathToFileURL(optimizerPath).href);
    status.optimizer = true;
  } catch (e) { /* not available */ }

  try {
    await import(pathToFileURL(ipsPath).href);
    status.ipsCalculator = true;
  } catch (e) { /* not available */ }

  try {
    await import(pathToFileURL(demandBuilderPath).href);
    status.demandBuilder = true;
  } catch (e) { /* not available */ }

  status.ready = status.optimizer && status.ipsCalculator && status.demandBuilder;

  res.json(status);
}));

// ============================================================================
// SUBSTITUTION GROUPS ROUTES
// ============================================================================

/**
 * GET /api/autobuy/substitution-groups
 * 
 * Get all substitution groups with their associated cards.
 * Used for displaying and managing card substitution relationships.
 */
router.get('/autobuy/substitution-groups', asyncHandler(async (req, res) => {
  try {
    // Use pool directly since req.db may not be attached
    const db = req.db || pool;

    // Load substitution service module
    const servicePath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'substitutionService.js');
    let substitutionService;
    try {
      const mod = await import(pathToFileURL(servicePath).href);
      substitutionService = mod.default || mod;
    } catch (e) {
      return res.status(500).json({ error: 'Substitution service not available - run build first' });
    }

    const groups = await substitutionService.getSubstitutionGroups(db);
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch substitution groups' });
  }
}));

/**
 * POST /api/autobuy/substitution-groups
 * 
 * Create a new substitution group with optional initial cards.
 * Body: { name: string, description?: string, cards: Array<{ scryfallId: string, cardName?: string }> }
 */
router.post('/autobuy/substitution-groups', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { name, description, cards } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const cardList = Array.isArray(cards) ? cards : [];

    // Validate card format
    for (const card of cardList) {
      if (!card.scryfallId || typeof card.scryfallId !== 'string') {
        return res.status(400).json({ error: 'Each card must have a scryfallId' });
      }
    }

    // Load substitution service module
    const servicePath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'substitutionService.js');
    let substitutionService;
    try {
      const mod = await import(pathToFileURL(servicePath).href);
      substitutionService = mod.default || mod;
    } catch (e) {
      return res.status(500).json({ error: 'Substitution service not available - run build first' });
    }

    const group = await substitutionService.createGroup(db, name.trim(), cardList, description);
    res.status(201).json({ group });
  } catch (err) {
    // Check for conflict errors (cards already in other groups)
    if (err.message?.includes('already in')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Failed to create substitution group' });
  }
}));

/**
 * PUT /api/autobuy/substitution-groups/:id/cards
 * 
 * Add a card to an existing substitution group.
 * Body: { scryfallId: string, cardName?: string }
 */
router.put('/autobuy/substitution-groups/:id/cards', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const { scryfallId, cardName } = req.body;

    if (!scryfallId || typeof scryfallId !== 'string') {
      return res.status(400).json({ error: 'scryfallId is required' });
    }

    // Load substitution service module
    const servicePath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'substitutionService.js');
    let substitutionService;
    try {
      const mod = await import(pathToFileURL(servicePath).href);
      substitutionService = mod.default || mod;
    } catch (e) {
      return res.status(500).json({ error: 'Substitution service not available - run build first' });
    }

    const group = await substitutionService.addCardToGroup(db, groupId, scryfallId, cardName);
    res.json({ group });
  } catch (err) {
    // Check for not found errors
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    // Check for conflict errors (card already in a group)
    if (err.message?.includes('already in')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Failed to add card to group' });
  }
}));

/**
 * DELETE /api/autobuy/substitution-groups/:id
 * 
 * Delete a substitution group and all its card associations.
 */
router.delete('/autobuy/substitution-groups/:id', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const groupId = parseInt(req.params.id, 10);
    if (isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    // Load substitution service module
    const servicePath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'substitutionService.js');
    let substitutionService;
    try {
      const mod = await import(pathToFileURL(servicePath).href);
      substitutionService = mod.default || mod;
    } catch (e) {
      return res.status(500).json({ error: 'Substitution service not available - run build first' });
    }

    const deleted = await substitutionService.deleteGroup(db, groupId);
    if (!deleted) {
      return res.status(404).json({ error: `Group with id ${groupId} not found` });
    }

    res.json({ success: true, message: `Group ${groupId} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete substitution group' });
  }
}));

/**
 * DELETE /api/autobuy/substitution-groups/:id/cards/:cardId
 * 
 * Remove a card from its substitution group.
 */
router.delete('/autobuy/substitution-groups/:id/cards/:cardId', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const cardId = req.params.cardId;
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID is required' });
    }

    // Load substitution service module
    const servicePath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'substitutionService.js');
    let substitutionService;
    try {
      const mod = await import(pathToFileURL(servicePath).href);
      substitutionService = mod.default || mod;
    } catch (e) {
      return res.status(500).json({ error: 'Substitution service not available - run build first' });
    }

    const removed = await substitutionService.removeCardFromGroup(db, cardId);
    if (!removed) {
      return res.status(404).json({ error: `Card ${cardId} not found in any group` });
    }

    res.json({ success: true, message: `Card ${cardId} removed from group` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to remove card from group' });
  }
}));

/**
 * POST /api/autobuy/analytics/runs
 * 
 * Start tracking a new manual optimizer run.
 */
router.post('/autobuy/analytics/runs', asyncHandler(async (req, res) => {
  const { predictedTotal, notes } = req.body;
  if (predictedTotal === undefined) {
    return res.status(400).json({ error: 'predictedTotal is required' });
  }

  const { AnalyticsService } = await import(pathToFileURL(path.join(process.cwd(), 'dist', 'server', 'autobuy', 'analytics.js')).href);
  const analytics = new AnalyticsService(req.db);

  const runId = await analytics.startRun({
    predictedTotal: parseFloat(predictedTotal),
    notes
  });

  // If items provided, log them
  if (req.body.items && Array.isArray(req.body.items)) {
    await analytics.logRunItems(runId, req.body.items);
  }

  res.json({ runId });
}));

/**
 * PUT /api/autobuy/analytics/runs/:id
 * 
 * Update status of a run (complete, cancel, etc).
 */
router.put('/autobuy/analytics/runs/:id', asyncHandler(async (req, res) => {
  const { status, actualTotal } = req.body;
  const runId = parseInt(req.params.id);

  if (!status) return res.status(400).json({ error: 'status is required' });

  const { AnalyticsService } = await import(pathToFileURL(path.join(process.cwd(), 'dist', 'server', 'autobuy', 'analytics.js')).href);
  const analytics = new AnalyticsService(req.db);

  await analytics.completeRun(runId, {
    status,
    actualTotal: actualTotal !== undefined ? parseFloat(actualTotal) : 0
  });

  res.json({ success: true });
}));

/**
 * GET /api/autobuy/analytics/dashboard
 * 
 * Get high-level stats for the analytics dashboard.
 */
router.get('/autobuy/analytics/dashboard', asyncHandler(async (req, res) => {
  try {
    const { AnalyticsService } = await import(pathToFileURL(path.join(process.cwd(), 'dist', 'server', 'autobuy', 'analytics.js')).href);
    const analytics = new AnalyticsService(req.db);
    const stats = await analytics.getDashboardStats();
    res.json(stats);
  } catch (error) {
    // Graceful fallback
    res.json({
      total_runs: 0,
      completed_runs: 0,
      total_spend: 0,
      avg_savings: 0
    });
  }
}));

/**
 * GET /api/autobuy/analytics/runs
 * 
 * Get recent optimizer runs.
 */
router.get('/autobuy/analytics/runs', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const { AnalyticsService } = await import(pathToFileURL(path.join(process.cwd(), 'dist', 'server', 'autobuy', 'analytics.js')).href);
  const analytics = new AnalyticsService(req.db);
  const runs = await analytics.getRecentRuns(limit);
  res.json({ runs });
}));

// NOTE: /analytics/accuracy, /analytics/suggestions, and /analytics/sell-through
// routes are defined below (after loadAnalyticsService helper) with better error handling


/**
 * POST /api/autobuy/fetch-offers
 * 
 * Fetch normalized offers from all enabled marketplaces for the given card IDs.
 * Results are cached for 15 minutes.
 * 
 * Request body:
 * {
 *   cardIds: string[],        // Required: Array of Scryfall card IDs
 *   cardLookups?: [{          // Optional: Card info for better TCGPlayer matching
 *     scryfallId: string,
 *     cardName?: string,
 *     setCode?: string
 *   }],
 *   skipCache?: boolean       // Optional: Force fresh fetch
 * }
 * 
 * Response:
 * {
 *   offers: Offer[],
 *   errors: [{ marketplace: string, error: string }],
 *   fromCache: boolean,
 *   fetchedAt: string,
 *   enabledMarketplaces: string[]
 * }
 */
router.post('/autobuy/fetch-offers', asyncHandler(async (req, res) => {
  // Validate request body
  const fetchOffersSchema = z.object({
    cardIds: z.array(z.string()).min(1).max(500),
    cardLookups: z.array(z.object({
      scryfallId: z.string(),
      cardName: z.string().optional(),
      setCode: z.string().optional(),
    })).optional(),
    skipCache: z.boolean().optional(),
  });

  const parse = fetchOffersSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parse.error.format()
    });
  }

  const { cardIds, cardLookups, skipCache = false } = parse.data;

  try {
    // Load marketplace module dynamically
    const marketplacePath = path.join(process.cwd(), 'dist', 'server', 'marketplace', 'index.js');
    let marketplaceModule;

    try {
      marketplaceModule = await import(pathToFileURL(marketplacePath).href);
    } catch (e) {
      return res.status(500).json({
        error: 'Marketplace module not available - run build first',
        hint: 'Run: npm run build:autobuy'
      });
    }

    const { fetchAllOffers, getConfigFromEnv, getEnabledMarketplaces } = marketplaceModule;

    // Get config from environment
    const config = getConfigFromEnv();
    const enabledMarketplaces = getEnabledMarketplaces(config);

    if (enabledMarketplaces.length === 0) {
      return res.status(400).json({
        error: 'No marketplaces enabled',
        hint: 'Set TCGPLAYER_ENABLED=true and provide TCGPLAYER_API_KEY in environment'
      });
    }

    // If cardLookups not provided, try to get card info from database
    let lookups = cardLookups;
    if (!lookups && req.db) {
      try {
        const result = await req.db.query(
          `SELECT scryfall_id as "scryfallId", name as "cardName", set_code as "setCode"
           FROM inventory
           WHERE scryfall_id = ANY($1)`,
          [cardIds]
        );
        if (result.rows?.length > 0) {
          lookups = result.rows;
        }
      } catch (e) {
        // Continue without lookups - will attempt matching by ID only
        console.warn('Could not fetch card lookups from database:', e.message);
      }
    }

    // Fetch offers from all marketplaces
    const result = await fetchAllOffers(cardIds, config, lookups, skipCache);

    res.json({
      ...result,
      enabledMarketplaces,
      cardCount: cardIds.length,
      offerCount: result.offers.length,
    });
  } catch (err) {
    console.error('Fetch offers error:', err);
    res.status(500).json({
      error: err.message || 'Failed to fetch offers',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}));

/**
 * GET /api/autobuy/marketplace-status
 * 
 * Check which marketplaces are enabled and configured.
 */
router.get('/autobuy/marketplace-status', asyncHandler(async (req, res) => {
  try {
    const marketplacePath = path.join(process.cwd(), 'dist', 'server', 'marketplace', 'index.js');
    let marketplaceModule;

    try {
      marketplaceModule = await import(pathToFileURL(marketplacePath).href);
    } catch (e) {
      return res.json({
        available: false,
        error: 'Marketplace module not built',
        marketplaces: {}
      });
    }

    const { getConfigFromEnv, getEnabledMarketplaces } = marketplaceModule;
    const config = getConfigFromEnv();
    const enabledMarketplaces = getEnabledMarketplaces(config);

    res.json({
      available: true,
      enabledMarketplaces,
      marketplaces: {
        TCG: {
          enabled: config.tcgplayer?.enabled || false,
          configured: !!(config.tcgplayer?.apiKey),
        },
        MANABOX: {
          enabled: config.manabox?.enabled || false,
          configured: !!(config.manabox?.apiKey),
        },
        CK: {
          enabled: config.cardKingdom?.enabled || false,
          configured: true, // CK doesn't need API key currently
        },
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}));

// ============================================================================
// Analytics Endpoints - Learning Loop for IPS Weight Tuning
// ============================================================================

/**
 * Helper to load analytics service module
 */
async function loadAnalyticsService() {
  const analyticsPath = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'analyticsService.js');
  try {
    const mod = await import(pathToFileURL(analyticsPath).href);
    // analyticsService.ts exports the class as default
    const AnalyticsService = mod.default || mod.AnalyticsService;
    if (!AnalyticsService) return null;
    // Return a factory function that creates service instances
    return (db) => new AnalyticsService(db);
  } catch (e) {
    console.error('Failed to load analytics service:', e.message);
    return null;
  }
}

/**
 * POST /api/autobuy/runs
 * 
 * Record a new autobuy run with predicted baskets.
 * Body: { baskets: [{ sellerId, marketplace?, items: [{ cardId, cardName?, price, quantity }] }] }
 */
router.post('/autobuy/runs', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const createService = await loadAnalyticsService();
    if (!createService) {
      return res.status(500).json({ error: 'Analytics service not available - run build first' });
    }

    const service = createService(db);
    const { baskets } = req.body;

    if (!baskets || !Array.isArray(baskets)) {
      return res.status(400).json({ error: 'baskets array is required' });
    }

    const runId = await service.recordPurchaseRun(baskets);
    res.json({ runId, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to record purchase run' });
  }
}));

/**
 * POST /api/autobuy/runs/:id/record-actuals
 * 
 * Update a run with actual purchase data.
 * Body: { items: [{ cardId, actualPrice, wasPurchased, purchasedAt? }] }
 */
router.post('/autobuy/runs/:id/record-actuals', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const createService = await loadAnalyticsService();
    if (!createService) {
      return res.status(500).json({ error: 'Analytics service not available - run build first' });
    }

    const service = createService(db);
    const runId = parseInt(req.params.id);
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    await service.recordActualPurchase(runId, items);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to record actual purchases' });
  }
}));

/**
 * GET /api/autobuy/analytics/accuracy
 * 
 * Get prediction accuracy metrics.
 * Query: days (default 30)
 */
router.get('/autobuy/analytics/accuracy', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const createService = await loadAnalyticsService();
    if (!createService) {
      return res.status(500).json({ error: 'Analytics service not available - run build first' });
    }

    const service = createService(db);
    const days = parseInt(req.query.days) || 30;

    const metrics = await service.getAccuracyMetrics(days);
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get accuracy metrics' });
  }
}));

/**
 * GET /api/autobuy/analytics/suggestions
 * 
 * Get IPS weight adjustment suggestions based on outcomes.
 */
router.get('/autobuy/analytics/suggestions', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const createService = await loadAnalyticsService();
    if (!createService) {
      return res.status(500).json({ error: 'Analytics service not available - run build first' });
    }

    const service = createService(db);
    const suggestions = await service.suggestWeightAdjustments();
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get weight suggestions' });
  }
}));

/**
 * GET /api/autobuy/analytics/runs
 * 
 * Get recent autobuy runs for dashboard display.
 * Query: limit (default 10)
 */
router.get('/autobuy/analytics/runs', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const createService = await loadAnalyticsService();
    if (!createService) {
      return res.status(500).json({ error: 'Analytics service not available - run build first' });
    }

    const service = createService(db);
    const limit = parseInt(req.query.limit) || 10;

    const runs = await service.getRecentRuns(limit);
    res.json({ runs });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get recent runs' });
  }
}));

/**
 * GET /api/autobuy/analytics/sell-through
 * 
 * Get sell-through rate metrics.
 * Query: cardId (optional), days (default 30)
 */
router.get('/autobuy/analytics/sell-through', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const createService = await loadAnalyticsService();
    if (!createService) {
      return res.status(500).json({ error: 'Analytics service not available - run build first' });
    }

    const service = createService(db);
    const cardId = req.query.cardId;
    const days = parseInt(req.query.days) || 30;

    const metrics = await service.getSellThroughRate(cardId, days);
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get sell-through metrics' });
  }
}));

/**
 * GET /api/autobuy/analytics/profit/:cardId
 * 
 * Get profit metrics for a specific card.
 */
router.get('/autobuy/analytics/profit/:cardId', asyncHandler(async (req, res) => {
  try {
    const db = req.db;
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const createService = await loadAnalyticsService();
    if (!createService) {
      return res.status(500).json({ error: 'Analytics service not available - run build first' });
    }

    const service = createService(db);
    const cardId = req.params.cardId;

    const metrics = await service.getProfitPerCard(cardId);
    if (!metrics) {
      return res.status(404).json({ error: 'No purchase data found for this card' });
    }
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to get profit metrics' });
  }
}));

export default router;

