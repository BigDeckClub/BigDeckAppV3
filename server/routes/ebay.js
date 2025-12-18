/**
 * eBay Integration Routes
 * Handles OAuth flow, listing management, and order sync
 */

import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/index.js';
import { pool } from '../db/pool.js';
import ebayService from '../services/ebayService.js';
import ebayTemplateService from '../services/ebayTemplateService.js';

// Lazy load image service to avoid canvas dependency issues
let ebayImageService = null;
async function getImageService() {
  if (!ebayImageService) {
    try {
      const module = await import('../services/ebayImageService.js');
      ebayImageService = module.default || module;
    } catch (err) {
      console.warn('[EBAY] Image service not available:', err.message);
      return null;
    }
  }
  return ebayImageService;
}

const router = express.Router();

/**
 * GET /api/ebay/status
 * Check eBay connection status and configuration
 */
router.get('/ebay/status', authenticate, async (req, res) => {
  try {
    const configured = ebayService.isEbayConfigured();
    const connection = await ebayService.getConnection(req.userId);

    res.json({
      configured,
      connected: !!connection,
      ebayUserId: connection?.ebay_user_id || null,
      connectedAt: connection?.connected_at || null,
      tokenExpiresAt: connection?.token_expires_at || null,
    });
  } catch (error) {
    console.error('[EBAY] Status check failed:', error);
    res.status(500).json({ error: 'Failed to check eBay status' });
  }
});

/**
 * GET /api/ebay/auth
 * Start OAuth flow - redirects to eBay authorization page
 */
router.get('/ebay/auth', authenticate, (req, res) => {
  if (!ebayService.isEbayConfigured()) {
    return res.status(503).json({
      error: 'eBay integration not configured',
      message: 'Please configure EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, and EBAY_REDIRECT_URI',
    });
  }

  // Generate state token to prevent CSRF
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in session or temporary storage (using query param for simplicity)
  // In production, store this server-side associated with the user
  const authUrl = ebayService.getAuthUrl(`${req.userId}:${state}`);

  res.json({ authUrl });
});

/**
 * GET /api/ebay/callback
 * OAuth callback - exchanges code for tokens
 */
router.get('/ebay/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('[EBAY] OAuth error:', error, error_description);
    return res.redirect(`/settings?ebay_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return res.redirect('/settings?ebay_error=Missing authorization code');
  }

  try {
    // Extract user ID from state
    const [userId] = state.split(':');
    if (!userId) {
      return res.redirect('/settings?ebay_error=Invalid state parameter');
    }

    // Exchange code for tokens
    const tokenData = await ebayService.exchangeCodeForTokens(code);

    // Store the connection
    await ebayService.storeConnection(userId, tokenData);

    // Log the successful connection
    await ebayService.logSyncAction(userId, 'oauth_connect', null, null, null, { success: true }, null);

    // Redirect back to settings with success
    res.redirect('/settings?ebay_connected=true');
  } catch (error) {
    console.error('[EBAY] OAuth callback failed:', error);
    await ebayService.logSyncAction(null, 'oauth_connect', null, null, null, null, error.message);
    res.redirect(`/settings?ebay_error=${encodeURIComponent('Failed to connect eBay account')}`);
  }
});

/**
 * POST /api/ebay/disconnect
 * Disconnect eBay account
 */
router.post('/ebay/disconnect', authenticate, async (req, res) => {
  try {
    await ebayService.removeConnection(req.userId);
    await ebayService.logSyncAction(req.userId, 'disconnect', null, null, null, { success: true }, null);
    res.json({ success: true });
  } catch (error) {
    console.error('[EBAY] Disconnect failed:', error);
    res.status(500).json({ error: 'Failed to disconnect eBay account' });
  }
});

/**
 * GET /api/ebay/listings
 * Get user's eBay listings
 */
router.get('/ebay/listings', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const listings = await ebayService.getUserListings(req.userId, status || null);
    res.json(listings);
  } catch (error) {
    console.error('[EBAY] Failed to get listings:', error);
    res.status(500).json({ error: 'Failed to get eBay listings' });
  }
});

/**
 * POST /api/ebay/listings
 * Create a new eBay listing from a deck
 */
router.post('/ebay/listings', authenticate, async (req, res) => {
  const { deckId, title, description, price, theme, imageUrls } = req.body;

  if (!deckId || !title || !price) {
    return res.status(400).json({ error: 'Missing required fields: deckId, title, price' });
  }

  try {
    // Check if deck exists and belongs to user
    const deckResult = await pool.query(
      `SELECT * FROM decks WHERE id = $1 AND user_id = $2`,
      [deckId, req.userId]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const deck = deckResult.rows[0];

    // Check if deck is already listed
    const existingListing = await ebayService.getListingByDeckId(req.userId, deckId);
    if (existingListing) {
      return res.status(400).json({
        error: 'Deck already has an active listing',
        listingId: existingListing.id,
      });
    }

    // Check if user has eBay connection
    const connection = await ebayService.getConnection(req.userId);
    if (!connection) {
      // Save as draft without pushing to eBay
      const listing = await ebayService.saveListingToDb(req.userId, deckId, {
        title,
        description,
        price,
        status: 'draft',
        theme,
        imageUrls,
      });

      return res.json({
        ...listing,
        message: 'Listing saved as draft. Connect eBay account to publish.',
      });
    }

    // Generate SKU for eBay inventory
    const sku = `DECK-${deckId}-${Date.now()}`;

    // Create inventory item on eBay
    await ebayService.createInventoryItem(req.userId, { ...deck, title, description }, sku);

    // Create offer (draft listing)
    const offerId = await ebayService.createOffer(req.userId, sku, price, {
      title,
      description,
    });

    // Save to database
    const listing = await ebayService.saveListingToDb(req.userId, deckId, {
      ebayOfferId: offerId,
      title,
      description,
      price,
      status: 'draft',
      theme,
      imageUrls,
    });

    await ebayService.logSyncAction(req.userId, 'create_listing', null, deckId, { sku, offerId }, listing, null);

    res.json(listing);
  } catch (error) {
    console.error('[EBAY] Failed to create listing:', error);
    await ebayService.logSyncAction(req.userId, 'create_listing', null, deckId, req.body, null, error.message);
    res.status(500).json({ error: 'Failed to create eBay listing', details: error.message });
  }
});

/**
 * POST /api/ebay/listings/:id/publish
 * Publish a draft listing to make it live
 */
router.post('/ebay/listings/:id/publish', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // Get the listing
    const listingResult = await pool.query(
      `SELECT * FROM ebay_listings WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listingResult.rows[0];

    if (listing.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft listings can be published' });
    }

    if (!listing.ebay_offer_id) {
      return res.status(400).json({ error: 'Listing has no eBay offer ID. Recreate the listing.' });
    }

    // Publish the offer on eBay
    const ebayListingId = await ebayService.publishOffer(req.userId, listing.ebay_offer_id);

    // Update listing in database
    const listingUrl = `https://www.ebay.com/itm/${ebayListingId}`;
    await pool.query(
      `UPDATE ebay_listings
       SET ebay_listing_id = $1, listing_url = $2, status = 'active', listed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [ebayListingId, listingUrl, id]
    );

    await ebayService.logSyncAction(req.userId, 'publish_listing', ebayListingId, listing.deck_id, { offerId: listing.ebay_offer_id }, { listingUrl }, null);

    res.json({
      success: true,
      ebayListingId,
      listingUrl,
    });
  } catch (error) {
    console.error('[EBAY] Failed to publish listing:', error);
    await ebayService.logSyncAction(req.userId, 'publish_listing', null, null, { listingId: id }, null, error.message);
    res.status(500).json({ error: 'Failed to publish listing', details: error.message });
  }
});

/**
 * PUT /api/ebay/listings/:id
 * Update a listing (price, title, etc.)
 */
router.put('/ebay/listings/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, description, price } = req.body;

  try {
    // Verify ownership
    const listingResult = await pool.query(
      `SELECT * FROM ebay_listings WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Update in database
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    if (title) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (description) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (price) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price);
    }
    updates.push('updated_at = NOW()');

    await pool.query(
      `UPDATE ebay_listings SET ${updates.join(', ')} WHERE id = $1`,
      values
    );

    // TODO: If listing is active on eBay, update it there too
    // This requires implementing the eBay offer update API

    res.json({ success: true });
  } catch (error) {
    console.error('[EBAY] Failed to update listing:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

/**
 * DELETE /api/ebay/listings/:id
 * End/remove a listing
 */
router.delete('/ebay/listings/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // Verify ownership
    const listingResult = await pool.query(
      `SELECT * FROM ebay_listings WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listingResult.rows[0];

    // TODO: If listing is active on eBay, end it there first
    // This requires implementing the eBay listing end API

    // Update status to ended
    await pool.query(
      `UPDATE ebay_listings SET status = 'ended', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await ebayService.logSyncAction(req.userId, 'end_listing', listing.ebay_listing_id, listing.deck_id, null, { success: true }, null);

    res.json({ success: true });
  } catch (error) {
    console.error('[EBAY] Failed to end listing:', error);
    res.status(500).json({ error: 'Failed to end listing' });
  }
});

/**
 * POST /api/ebay/sync-orders
 * Manually sync orders from eBay
 */
router.post('/ebay/sync-orders', authenticate, async (req, res) => {
  try {
    const connection = await ebayService.getConnection(req.userId);
    if (!connection) {
      return res.status(400).json({ error: 'No eBay connection found' });
    }

    // Get recent orders from eBay
    const orders = await ebayService.getOrders(req.userId);
    const syncedSales = [];

    for (const order of orders) {
      // Check if we have a listing for any item in this order
      for (const lineItem of order.lineItems || []) {
        const listingResult = await pool.query(
          `SELECT el.*, d.name as deck_name
           FROM ebay_listings el
           LEFT JOIN decks d ON el.deck_id = d.id
           WHERE el.ebay_listing_id = $1 AND el.user_id = $2 AND el.status = 'active'`,
          [lineItem.legacyItemId, req.userId]
        );

        if (listingResult.rows.length > 0) {
          const listing = listingResult.rows[0];

          // Update listing as sold
          await ebayService.updateListingStatus(listing.id, 'sold', {
            soldAt: new Date(order.creationDate),
            ebayBuyerUsername: order.buyer?.username,
            ebayOrderId: order.orderId,
          });

          // Record in sales_history
          const saleResult = await pool.query(
            `INSERT INTO sales_history
             (user_id, item_type, item_id, item_name, purchase_price, sell_price, profit, quantity)
             VALUES ($1, 'deck', $2, $3, $4, $5, $6, 1)
             RETURNING *`,
            [
              req.userId,
              listing.deck_id,
              listing.deck_name || listing.title,
              0, // TODO: Get actual purchase price from deck
              parseFloat(lineItem.total.value),
              parseFloat(lineItem.total.value), // Profit calculation needs deck cost
            ]
          );

          syncedSales.push({
            orderId: order.orderId,
            listingId: listing.id,
            saleId: saleResult.rows[0].id,
          });

          await ebayService.logSyncAction(req.userId, 'order_synced', listing.ebay_listing_id, listing.deck_id, { orderId: order.orderId }, saleResult.rows[0], null);
        }
      }
    }

    res.json({
      success: true,
      ordersChecked: orders.length,
      salesSynced: syncedSales.length,
      syncedSales,
    });
  } catch (error) {
    console.error('[EBAY] Failed to sync orders:', error);
    await ebayService.logSyncAction(req.userId, 'order_sync', null, null, null, null, error.message);
    res.status(500).json({ error: 'Failed to sync orders', details: error.message });
  }
});

/**
 * GET /api/ebay/logs
 * Get eBay sync logs for debugging
 */
router.get('/ebay/logs', authenticate, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await pool.query(
      `SELECT * FROM ebay_sync_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.userId, parseInt(limit)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[EBAY] Failed to get logs:', error);
    res.status(500).json({ error: 'Failed to get eBay logs' });
  }
});


/**
 * GET /api/ebay/templates?type=title
 * Returns templates for the current user (including global defaults)
 */
router.get('/ebay/templates', authenticate, async (req, res) => {
  try {
    const { type = 'title' } = req.query;
    const templates = await ebayTemplateService.getTemplates(req.userId, type);
    res.json(templates);
  } catch (error) {
    console.error('[EBAY] Failed to get templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});


/**
 * POST /api/ebay/templates/render
 * Body: { templateId?, templateContent?, deckId?, useAI?, extraContext? }
 * Renders a template with placeholders and optionally expands using AI.
 */
router.post('/ebay/templates/render', authenticate, async (req, res) => {
  try {
    const { templateId = null, templateContent = null, deckId = null, useAI = false, extraContext = {} } = req.body || {};

    let deck = null;
    if (deckId) {
      const r = await pool.query(`SELECT * FROM decks WHERE id = $1 AND user_id = $2`, [deckId, req.userId]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Deck not found' });
      deck = r.rows[0];
    }

    const result = await ebayTemplateService.renderTemplate({
      userId: req.userId,
      templateId,
      templateContent,
      deck,
      extraContext,
      useAI,
    });

    res.json(result);
  } catch (error) {
    console.error('[EBAY] Failed to render template:', error);
    res.status(500).json({ error: 'Failed to render template', details: error.message });
  }
});


/**
 * POST /api/ebay/templates
 * Create a new template for the user
 */
router.post('/ebay/templates', authenticate, async (req, res) => {
  try {
    const { template_type, template_name, template_content, is_default = false } = req.body || {};
    if (!template_type || !template_content) return res.status(400).json({ error: 'Missing template_type or template_content' });

    const result = await pool.query(
      `INSERT INTO ebay_templates (user_id, template_type, template_name, template_content, is_default, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) RETURNING *`,
      [req.userId, template_type, template_name || null, template_content, is_default]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[EBAY] Create template failed:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});


/**
 * PUT /api/ebay/templates/:id
 * Update a template (only owner may update)
 */
router.put('/ebay/templates/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { template_name, template_content, is_default } = req.body || {};

    // Verify ownership
    const existing = await pool.query(`SELECT * FROM ebay_templates WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    if (existing.rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Not allowed' });

    const updates = [];
    const values = [];
    let idx = 1;
    if (template_name !== undefined) { updates.push(`template_name = $${idx++}`); values.push(template_name); }
    if (template_content !== undefined) { updates.push(`template_content = $${idx++}`); values.push(template_content); }
    if (is_default !== undefined) { updates.push(`is_default = $${idx++}`); values.push(is_default); }
    values.push(id);

    if (updates.length === 0) return res.json(existing.rows[0]);

    const q = `UPDATE ebay_templates SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
    const r = await pool.query(q, values);
    res.json(r.rows[0]);
  } catch (error) {
    console.error('[EBAY] Update template failed:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});


/**
 * DELETE /api/ebay/templates/:id
 */
router.delete('/ebay/templates/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(`SELECT * FROM ebay_templates WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    if (existing.rows[0].user_id !== req.userId) return res.status(403).json({ error: 'Not allowed' });
    await pool.query(`DELETE FROM ebay_templates WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('[EBAY] Delete template failed:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * POST /api/ebay/check-availability
 * Body: { cards: [{ name, scryfall_id, quantity }] }
 * Returns availability counts from user's inventory for each requested card
 */
router.post('/ebay/check-availability', authenticate, async (req, res) => {
  try {
    const { cards } = req.body || {};
    if (!Array.isArray(cards)) {
      return res.status(400).json({ error: 'cards must be an array' });
    }

    const results = [];

    for (const card of cards) {
      const name = (card.name || '').trim();
      const scryfallId = card.scryfall_id || null;
      const requestedQty = parseInt(card.quantity || 1, 10) || 1;

      const query = await pool.query(
        `SELECT COALESCE(SUM(quantity),0) as qty FROM inventory WHERE user_id = $1 AND (LOWER(TRIM(name)) = LOWER(TRIM($2))${scryfallId ? ' OR scryfall_id = $3' : ''})`,
        scryfallId ? [req.userId, name, scryfallId] : [req.userId, name]
      );

      const available = parseInt(query.rows[0].qty, 10) || 0;

      results.push({
        requested: requestedQty,
        available,
        name,
        scryfall_id: scryfallId || null,
        ok: available >= requestedQty,
      });
    }

    res.json({ results });
  } catch (error) {
    console.error('[EBAY] Availability check failed:', error);
    res.status(500).json({ error: 'Failed to check availability', details: error.message });
  }
});

/**
 * GET /api/ebay/check-availability/:deckId
 * Returns availability status, deck value, and suggested price for a deck
 */
router.get('/ebay/check-availability/:deckId', authenticate, async (req, res) => {
  const { deckId } = req.params;

  try {
    // Get deck
    const deckResult = await pool.query(
      `SELECT * FROM decks WHERE id = $1 AND user_id = $2`,
      [deckId, req.userId]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const deck = deckResult.rows[0];
    const deckCards = Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]');

    let totalCards = 0;
    let missingCount = 0;
    let deckValue = 0;
    const missingCards = [];

    // Check availability for each card
    for (const card of deckCards) {
      const reqQty = parseInt(card.quantity || 1, 10) || 1;
      const name = card.name || card.cardName || '';
      totalCards += reqQty;

      // Get inventory quantity and purchase price
      const q = await pool.query(
        `SELECT COALESCE(SUM(quantity),0) as qty,
                COALESCE(AVG(purchase_price),0) as avg_price
         FROM inventory
         WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
        [req.userId, name]
      );

      const available = parseInt(q.rows[0].qty, 10) || 0;
      const avgPrice = parseFloat(q.rows[0].avg_price) || 0;

      // Add to deck value based on card price
      deckValue += avgPrice * reqQty;

      if (available < reqQty) {
        missingCount += (reqQty - available);
        missingCards.push({
          name,
          requested: reqQty,
          available,
          missing: reqQty - available
        });
      }
    }

    // Suggested price is deck cost + 20% markup + $5 shipping buffer
    const markupPercent = 1.20;
    const shippingBuffer = 5;
    const suggestedPrice = (deckValue * markupPercent) + shippingBuffer;

    res.json({
      available: missingCount === 0,
      totalCards,
      missingCount,
      missingCards: missingCards.slice(0, 10), // Only return first 10 missing
      deckValue: Math.round(deckValue * 100) / 100,
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    });
  } catch (error) {
    console.error('[EBAY] Deck availability check failed:', error);
    res.status(500).json({ error: 'Failed to check availability', details: error.message });
  }
});

/**
 * POST /api/ebay/create-listing-from-decklist
 * Body: { deckId, price, title, description }
 * Creates a draft listing from a deck's card list and saves to DB.
 */
router.post('/ebay/create-listing-from-decklist', authenticate, async (req, res) => {
  const { deckId, price, title, description } = req.body || {};

  if (!deckId || !price) {
    return res.status(400).json({ error: 'Missing required fields: deckId, price' });
  }

  try {
    const deckResult = await pool.query(
      `SELECT * FROM decks WHERE id = $1 AND user_id = $2`,
      [deckId, req.userId]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const deck = deckResult.rows[0];

    // Basic availability check for cards listed in the deck (if deck.cards is an array of items)
    const missing = [];
    try {
      const deckCards = Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]');
      for (const c of deckCards) {
        const reqQty = parseInt(c.quantity || 1, 10) || 1;
        const name = c.name || c.cardName || '';
        const q = await pool.query(
          `SELECT COALESCE(SUM(quantity),0) as qty FROM inventory WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
          [req.userId, name]
        );
        const available = parseInt(q.rows[0].qty, 10) || 0;
        if (available < reqQty) {
          missing.push({ name, requested: reqQty, available });
        }
      }
    } catch (err) {
      // If deck.cards couldn't be parsed, skip availability verification
    }

    if (missing.length > 0) {
      return res.status(400).json({ error: 'Not enough inventory for deck', missing });
    }

    // Prevent duplicate active listing
    const existing = await ebayService.getListingByDeckId(req.userId, deckId);
    if (existing) {
      return res.status(400).json({ error: 'Deck already has an active listing', listingId: existing.id });
    }

    // Save as draft in DB (don't push to eBay yet)
    const listing = await ebayService.saveListingToDb(req.userId, deckId, {
      title: title || deck.name,
      description: description || deck.description || `Deck: ${deck.name}`,
      price,
      status: 'draft',
    });

    res.json({ listing, message: 'Draft listing created from deck' });
  } catch (error) {
    console.error('[EBAY] create listing from decklist failed:', error);
    res.status(500).json({ error: 'Failed to create listing from decklist', details: error.message });
  }
});

// ========== PHASE 2: AI DESCRIPTION GENERATION ==========

/**
 * POST /api/ebay/generate-description
 * Body: { deckId, commander?, theme?, conditionTemplate?, includesTemplate? }
 * Generates an AI-powered eBay listing description for a deck
 */
router.post('/ebay/generate-description', authenticate, async (req, res) => {
  try {
    const { deckId, commander, theme, conditionTemplate, includesTemplate } = req.body || {};

    if (!deckId) {
      return res.status(400).json({ error: 'deckId is required' });
    }

    // Fetch deck data
    const deckResult = await pool.query(
      `SELECT * FROM decks WHERE id = $1 AND user_id = $2`,
      [deckId, req.userId]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const deck = deckResult.rows[0];
    const deckCards = Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]');

    // Extract deck info
    const commanderName = commander || deck.commander || 'Unknown Commander';
    const deckTheme = theme || 'Commander';

    // Calculate color identity from cards
    const colorSet = new Set();
    deckCards.forEach(c => {
      if (c.color_identity) {
        (Array.isArray(c.color_identity) ? c.color_identity : []).forEach(color => colorSet.add(color));
      }
    });
    const colorIdentity = ['W', 'U', 'B', 'R', 'G'].filter(c => colorSet.has(c)).join('') || 'Colorless';

    // Get notable/expensive cards (top 5 by some criteria, or just first 5 non-basic lands)
    const notableCards = deckCards
      .filter(c => c.name && !c.name.match(/^(Plains|Island|Swamp|Mountain|Forest)$/i))
      .slice(0, 8)
      .map(c => c.name);

    // Fetch condition and includes templates
    let conditionText = conditionTemplate || 'Cards are in Near Mint to Lightly Played condition.';
    let includesText = includesTemplate || 'Includes 100-card Commander deck, sleeved in premium sleeves, shipped in a secure deck box.';

    if (!conditionTemplate) {
      const condRes = await pool.query(
        `SELECT template_content FROM ebay_templates WHERE template_type = 'condition' AND (user_id = $1 OR user_id IS NULL) AND is_default = true LIMIT 1`,
        [req.userId]
      );
      if (condRes.rows.length > 0) conditionText = condRes.rows[0].template_content;
    }

    if (!includesTemplate) {
      const inclRes = await pool.query(
        `SELECT template_content FROM ebay_templates WHERE template_type = 'includes' AND (user_id = $1 OR user_id IS NULL) AND is_default = true LIMIT 1`,
        [req.userId]
      );
      if (inclRes.rows.length > 0) includesText = inclRes.rows[0].template_content;
    }

    // Check if OpenAI is configured
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return a basic template without AI
      const basicDescription = `**${commanderName}** - ${deckTheme} Commander Deck

This ${colorIdentity} Commander deck is built around ${commanderName} and features a ${deckTheme.toLowerCase()} strategy.

**Notable Cards:**
${notableCards.map(c => `• ${c}`).join('\n')}

**Condition:** ${conditionText}

**What's Included:** ${includesText}`;

      return res.json({ description: basicDescription, meta: { ai: false } });
    }

    // Generate with OpenAI
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const prompt = `Generate an eBay listing description for this MTG Commander deck:

Commander: ${commanderName}
Deck Name: ${deck.name}
Theme/Strategy: ${deckTheme}
Colors: ${colorIdentity}
Card Count: ${deckCards.length}
Notable Cards: ${notableCards.join(', ')}

Include:
- Brief description of the commander and what makes them fun to play
- How the deck plays (strategy overview)
- Notable synergies or win conditions
- Card condition statement: "${conditionText}"
- What's included: "${includesText}"

Keep it concise (under 1000 characters), professional, and appealing to MTG Commander players. Use bullet points or short paragraphs. Don't use excessive emojis or hype language.`;

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that writes compelling eBay listing descriptions for Magic: The Gathering Commander decks. Focus on gameplay appeal and value.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const aiDescription = completion.choices?.[0]?.message?.content || '';

    res.json({ description: aiDescription, meta: { ai: true, model } });
  } catch (error) {
    console.error('[EBAY] Generate description failed:', error);
    res.status(500).json({ error: 'Failed to generate description', details: error.message });
  }
});

/**
 * POST /api/ebay/generate-image
 * Body: { deckId, commander?, theme? }
 * Generates a listing image for a deck using card images
 */
router.post('/ebay/generate-image', authenticate, async (req, res) => {
  try {
    const { deckId, commander, theme } = req.body || {};

    if (!deckId) {
      return res.status(400).json({ error: 'deckId is required' });
    }

    // Fetch deck data
    const deckResult = await pool.query(
      `SELECT * FROM decks WHERE id = $1 AND user_id = $2`,
      [deckId, req.userId]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const deck = deckResult.rows[0];
    const deckCards = Array.isArray(deck.cards) ? deck.cards : JSON.parse(deck.cards || '[]');

    // Get commander info
    const commanderName = commander || deck.commander || deck.name || 'Commander Deck';
    const deckTheme = theme || '';

    // Find commander card image URL (look for card matching commander name)
    let commanderImageUrl = null;
    const commanderCard = deckCards.find(c =>
      c.name && commanderName && c.name.toLowerCase().includes(commanderName.toLowerCase().split(',')[0])
    );
    if (commanderCard?.image_url) {
      commanderImageUrl = commanderCard.image_url;
    } else if (commanderCard?.scryfall_id) {
      // Try to construct Scryfall image URL
      commanderImageUrl = `https://cards.scryfall.io/normal/front/${commanderCard.scryfall_id.slice(0, 1)}/${commanderCard.scryfall_id.slice(1, 2)}/${commanderCard.scryfall_id}.jpg`;
    }

    // Get featured cards (non-land, non-commander cards with images)
    const featuredCardUrls = deckCards
      .filter(c => c.image_url && c.name !== commanderName && !c.name?.match(/^(Plains|Island|Swamp|Mountain|Forest)$/i))
      .slice(0, 2)
      .map(c => c.image_url);

    // Try to load image service
    const imageService = await getImageService();
    if (!imageService) {
      return res.status(503).json({
        error: 'Image generation service not available',
        message: 'The canvas library may not be installed. Please install it with: npm install canvas'
      });
    }

    // Generate image
    const result = await imageService.generateListingImage({
      commander: commanderName,
      theme: deckTheme,
      commanderImageUrl,
      featuredCardUrls,
    });

    res.json({
      imageUrl: result.imageUrl,
      filename: result.filename,
    });
  } catch (error) {
    console.error('[EBAY] Generate image failed:', error);
    res.status(500).json({ error: 'Failed to generate image', details: error.message });
  }
});

/**
 * POST /api/ebay/bulk-create-listings
 * Body: { deckIds: number[], defaultPrice?: number }
 * Creates draft listings for multiple decks at once
 */
router.post('/ebay/bulk-create-listings', authenticate, async (req, res) => {
  const { deckIds, defaultPrice } = req.body || {};

  if (!Array.isArray(deckIds) || deckIds.length === 0) {
    return res.status(400).json({ error: 'deckIds must be a non-empty array' });
  }

  if (deckIds.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 decks can be listed at once' });
  }

  const results = {
    created: [],
    skipped: [],
    errors: [],
  };

  try {
    for (const deckId of deckIds) {
      try {
        // Check if deck exists and belongs to user
        const deckResult = await pool.query(
          `SELECT d.*, d.commander as deck_commander
           FROM decks d
           WHERE d.id = $1 AND d.user_id = $2 AND d.is_deck_instance = FALSE`,
          [deckId, req.userId]
        );

        if (deckResult.rows.length === 0) {
          results.skipped.push({ deckId, reason: 'Deck not found or is a deck instance' });
          continue;
        }

        const deck = deckResult.rows[0];

        // Check for existing active listing
        const existingListing = await ebayService.getListingByDeckId(req.userId, deckId);
        if (existingListing) {
          results.skipped.push({ deckId, deckName: deck.name, reason: 'Listing already exists' });
          continue;
        }

        // Get default title template
        const templateResult = await pool.query(
          `SELECT * FROM ebay_templates
           WHERE template_type = 'title' AND (user_id = $1 OR user_id IS NULL)
           ORDER BY user_id DESC NULLS LAST, is_default DESC LIMIT 1`,
          [req.userId]
        );

        const template = templateResult.rows[0];
        let title = `${deck.deck_commander || deck.name} - 100 Card EDH MTG Commander Deck`;

        if (template) {
          title = ebayTemplateService.renderTemplate(template.template_content, {
            commander: deck.deck_commander || deck.name,
            theme: '',
            card_count: '100',
            deck_name: deck.name,
          });
        }

        // Truncate title to eBay's 80 char limit
        if (title.length > 80) {
          title = title.substring(0, 77) + '...';
        }

        // Create the listing
        const listing = await ebayService.saveListingToDb(req.userId, deckId, {
          title,
          description: `Complete Commander deck featuring ${deck.deck_commander || deck.name}. Ready to play!`,
          price: defaultPrice || 0,
          status: 'draft',
        });

        results.created.push({
          deckId,
          deckName: deck.name,
          listingId: listing.id,
          title,
        });
      } catch (err) {
        results.errors.push({ deckId, error: err.message });
      }
    }

    res.json({
      success: true,
      summary: {
        total: deckIds.length,
        created: results.created.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
      },
      ...results,
    });
  } catch (error) {
    console.error('[EBAY] Bulk create listings failed:', error);
    res.status(500).json({ error: 'Failed to create bulk listings', details: error.message });
  }
});

/**
 * GET /api/ebay/analytics
 * Returns aggregated eBay sales statistics for the dashboard
 */
router.get('/ebay/analytics', authenticate, async (req, res) => {
  try {
    // Get listing counts by status
    const statusCounts = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM ebay_listings
       WHERE user_id = $1
       GROUP BY status`,
      [req.userId]
    );

    const counts = statusCounts.rows.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {});

    // Get total revenue from completed sales
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(price), 0) as total_revenue
       FROM ebay_listings
       WHERE user_id = $1 AND status = 'completed'`,
      [req.userId]
    );

    // Get monthly sales for chart (last 6 months)
    const monthlySales = await pool.query(
      `SELECT
         DATE_TRUNC('month', completed_at) as month,
         COUNT(*) as sales_count,
         COALESCE(SUM(price), 0) as revenue
       FROM ebay_listings
       WHERE user_id = $1 AND status = 'completed' AND completed_at IS NOT NULL
       GROUP BY DATE_TRUNC('month', completed_at)
       ORDER BY month DESC
       LIMIT 6`,
      [req.userId]
    );

    res.json({
      totalListings: Object.values(counts).reduce((a, b) => a + b, 0),
      activeListings: counts.active || 0,
      pendingOrders: (counts.sold || 0) + (counts.shipped || 0),
      completedSales: counts.completed || 0,
      draftListings: counts.draft || 0,
      totalRevenue: parseFloat(revenueResult.rows[0].total_revenue) || 0,
      monthlySales: monthlySales.rows.map(row => ({
        month: row.month,
        sales: parseInt(row.sales_count, 10),
        revenue: parseFloat(row.revenue),
      })),
    });
  } catch (error) {
    console.error('[EBAY] Analytics failed:', error);
    res.status(500).json({ error: 'Failed to get analytics', details: error.message });
  }
});

// ========== PHASE 3: ORDER FULFILLMENT ==========

/**
 * POST /api/ebay/listings/:id/create-picklist
 * Creates a deck instance (pick list) for fulfillment when an order is received
 */
router.post('/ebay/listings/:id/create-picklist', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    // Get the listing
    const listingResult = await pool.query(
      `SELECT el.*, d.name as deck_name, d.cards, d.format, d.description as deck_description
       FROM ebay_listings el
       JOIN decks d ON el.deck_id = d.id
       WHERE el.id = $1 AND el.user_id = $2`,
      [id, req.userId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listingResult.rows[0];

    if (listing.deck_instance_id) {
      return res.status(400).json({ error: 'Pick list already exists', deckInstanceId: listing.deck_instance_id });
    }

    if (!['sold', 'active'].includes(listing.status)) {
      return res.status(400).json({ error: 'Can only create pick list for sold or active listings' });
    }

    const deckCards = Array.isArray(listing.cards) ? listing.cards : JSON.parse(listing.cards || '[]');

    // Create deck instance
    const instanceResult = await pool.query(
      `INSERT INTO decks (user_id, name, format, description, cards, decklist_id, is_deck_instance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
       RETURNING *`,
      [
        req.userId,
        `[SOLD] ${listing.deck_name || listing.title}`,
        listing.format || 'Commander',
        `Pick list for eBay order. Listing ID: ${id}`,
        JSON.stringify(deckCards),
        listing.deck_id
      ]
    );

    const deckInstance = instanceResult.rows[0];

    // Reserve cards from inventory (same logic as copy-to-inventory in decks.js)
    const cardNames = [...new Set(
      deckCards
        .filter(c => typeof c.name === 'string' && c.name.trim().length > 0)
        .map(c => c.name.toLowerCase().trim())
    )];

    let inventoryResult = { rows: [] };
    if (cardNames.length > 0) {
      inventoryResult = await pool.query(`
        SELECT i.id, i.name, i.folder, i.purchase_price, i.quantity,
          COALESCE(i.quantity, 0) - COALESCE(
            (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
          ) as available_quantity
        FROM inventory i
        WHERE LOWER(TRIM(i.name)) = ANY($1::text[])
          AND i.user_id = $2
          AND COALESCE(i.quantity, 0) - COALESCE(
            (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
          ) > 0
        ORDER BY LOWER(TRIM(i.name)), COALESCE(i.purchase_price, 999999) ASC
      `, [cardNames, req.userId]);
    }

    // Group inventory items by card name
    const inventoryByName = {};
    for (const item of inventoryResult.rows) {
      const key = item.name.toLowerCase().trim();
      if (!inventoryByName[key]) inventoryByName[key] = [];
      inventoryByName[key].push({ ...item, available_quantity: parseInt(item.available_quantity) });
    }

    // Process reservations
    const reservations = [];
    const missingCards = [];
    const usedQuantities = {};

    for (const card of deckCards) {
      if (typeof card.name !== 'string' || card.name.trim().length === 0) continue;

      const cardKey = card.name.toLowerCase().trim();
      const quantityNeeded = card.quantity || 1;
      const availableItems = inventoryByName[cardKey] || [];

      let remainingNeeded = quantityNeeded;

      for (const invItem of availableItems) {
        if (remainingNeeded <= 0) break;

        const alreadyUsed = usedQuantities[invItem.id] || 0;
        const actualAvailable = invItem.available_quantity - alreadyUsed;

        if (actualAvailable <= 0) continue;

        const reserveQty = Math.min(remainingNeeded, actualAvailable);

        if (reserveQty > 0) {
          reservations.push({
            deck_id: deckInstance.id,
            inventory_item_id: invItem.id,
            quantity_reserved: reserveQty,
            original_folder: invItem.folder || 'Uncategorized'
          });
          usedQuantities[invItem.id] = alreadyUsed + reserveQty;
          remainingNeeded -= reserveQty;
        }
      }

      if (remainingNeeded > 0) {
        missingCards.push({
          deck_id: deckInstance.id,
          card_name: card.name,
          set_code: card.set || null,
          quantity_needed: remainingNeeded
        });
      }
    }

    // Batch insert reservations
    if (reservations.length > 0) {
      const values = reservations.map((r, i) =>
        `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`
      ).join(', ');
      const params = reservations.flatMap(r => [r.deck_id, r.inventory_item_id, r.quantity_reserved, r.original_folder]);
      await pool.query(
        `INSERT INTO deck_reservations (deck_id, inventory_item_id, quantity_reserved, original_folder) VALUES ${values}`,
        params
      );
    }

    // Batch insert missing cards
    if (missingCards.length > 0) {
      const values = missingCards.map((m, i) =>
        `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`
      ).join(', ');
      const params = missingCards.flatMap(m => [m.deck_id, m.card_name, m.set_code, m.quantity_needed]);
      await pool.query(
        `INSERT INTO deck_missing_cards (deck_id, card_name, set_code, quantity_needed) VALUES ${values}`,
        params
      );
    }

    // Update listing with deck instance ID and status
    await pool.query(
      `UPDATE ebay_listings SET deck_instance_id = $1, status = 'sold', sold_at = COALESCE(sold_at, NOW()), updated_at = NOW() WHERE id = $2`,
      [deckInstance.id, id]
    );

    await ebayService.logSyncAction(req.userId, 'create_picklist', listing.ebay_listing_id, listing.deck_id, { listingId: id }, {
      deckInstanceId: deckInstance.id,
      reservedCount: reservations.reduce((sum, r) => sum + r.quantity_reserved, 0),
      missingCount: missingCards.reduce((sum, m) => sum + m.quantity_needed, 0)
    }, null);

    res.json({
      success: true,
      deckInstance,
      reservedCount: reservations.reduce((sum, r) => sum + r.quantity_reserved, 0),
      missingCount: missingCards.reduce((sum, m) => sum + m.quantity_needed, 0),
      missingCards
    });
  } catch (error) {
    console.error('[EBAY] Create picklist failed:', error);
    res.status(500).json({ error: 'Failed to create pick list', details: error.message });
  }
});

/**
 * POST /api/ebay/listings/:id/mark-shipped
 * Mark a listing as shipped
 */
router.post('/ebay/listings/:id/mark-shipped', authenticate, async (req, res) => {
  const { id } = req.params;
  const { trackingNumber, carrier } = req.body || {};

  try {
    const listingResult = await pool.query(
      `SELECT * FROM ebay_listings WHERE id = $1 AND user_id = $2`,
      [id, req.userId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listingResult.rows[0];

    if (listing.status !== 'sold') {
      return res.status(400).json({ error: 'Can only mark shipped for sold listings' });
    }

    await pool.query(
      `UPDATE ebay_listings SET status = 'shipped', shipped_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await ebayService.logSyncAction(req.userId, 'mark_shipped', listing.ebay_listing_id, listing.deck_id, { trackingNumber, carrier }, { success: true }, null);

    res.json({ success: true, status: 'shipped' });
  } catch (error) {
    console.error('[EBAY] Mark shipped failed:', error);
    res.status(500).json({ error: 'Failed to mark as shipped', details: error.message });
  }
});

/**
 * POST /api/ebay/listings/:id/complete
 * Complete a sale - decrements inventory and records in sales history
 */
router.post('/ebay/listings/:id/complete', authenticate, async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get listing with deck instance
    const listingResult = await client.query(
      `SELECT el.*, d.name as instance_name, d.cards as instance_cards
       FROM ebay_listings el
       LEFT JOIN decks d ON el.deck_instance_id = d.id
       WHERE el.id = $1 AND el.user_id = $2`,
      [id, req.userId]
    );

    if (listingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listingResult.rows[0];

    if (!['sold', 'shipped'].includes(listing.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only complete sold or shipped listings' });
    }

    if (!listing.deck_instance_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No pick list exists. Create pick list first.' });
    }

    // Get reservations for the deck instance
    const reservationsResult = await client.query(
      `SELECT dr.*, i.name, i.purchase_price
       FROM deck_reservations dr
       JOIN inventory i ON dr.inventory_item_id = i.id
       WHERE dr.deck_id = $1`,
      [listing.deck_instance_id]
    );

    // Calculate total cost (purchase price) and count
    let totalCost = 0;
    let totalCards = 0;
    for (const r of reservationsResult.rows) {
      totalCost += (parseFloat(r.purchase_price) || 0) * r.quantity_reserved;
      totalCards += r.quantity_reserved;
    }

    // Decrement inventory quantities
    for (const r of reservationsResult.rows) {
      await client.query(
        `UPDATE inventory SET quantity = GREATEST(0, quantity - $1) WHERE id = $2`,
        [r.quantity_reserved, r.inventory_item_id]
      );
    }

    // Delete reservations
    await client.query(`DELETE FROM deck_reservations WHERE deck_id = $1`, [listing.deck_instance_id]);

    // Delete missing cards records
    await client.query(`DELETE FROM deck_missing_cards WHERE deck_id = $1`, [listing.deck_instance_id]);

    // Record in sales_history
    const profit = parseFloat(listing.price) - totalCost;
    await client.query(
      `INSERT INTO sales_history (user_id, item_type, item_id, item_name, purchase_price, sell_price, profit, quantity, created_at)
       VALUES ($1, 'deck', $2, $3, $4, $5, $6, 1, NOW())`,
      [req.userId, listing.deck_id, listing.title || listing.instance_name, totalCost, listing.price, profit]
    );

    // Update listing status
    await client.query(
      `UPDATE ebay_listings SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Archive the deck instance (mark as completed but keep for records)
    await client.query(
      `UPDATE decks SET name = $1, updated_at = NOW() WHERE id = $2`,
      [`[COMPLETED] ${listing.instance_name || listing.title}`, listing.deck_instance_id]
    );

    await client.query('COMMIT');

    await ebayService.logSyncAction(req.userId, 'complete_sale', listing.ebay_listing_id, listing.deck_id, { listingId: id }, {
      totalCost,
      sellPrice: listing.price,
      profit,
      cardsRemoved: totalCards
    }, null);

    res.json({
      success: true,
      status: 'completed',
      totalCost,
      sellPrice: parseFloat(listing.price),
      profit,
      cardsRemoved: totalCards
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[EBAY] Complete sale failed:', error);
    res.status(500).json({ error: 'Failed to complete sale', details: error.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/ebay/listings/:id/picklist
 * Get the pick list details for a listing
 */
router.get('/ebay/listings/:id/picklist', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const listingResult = await pool.query(
      `SELECT el.*, d.name as instance_name, d.cards as instance_cards
       FROM ebay_listings el
       LEFT JOIN decks d ON el.deck_instance_id = d.id
       WHERE el.id = $1 AND el.user_id = $2`,
      [id, req.userId]
    );

    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = listingResult.rows[0];

    if (!listing.deck_instance_id) {
      return res.json({ hasPicklist: false });
    }

    // Get reservations with inventory details
    const reservationsResult = await pool.query(
      `SELECT dr.*, i.name, i.set, i.folder, i.purchase_price, i.image_url
       FROM deck_reservations dr
       JOIN inventory i ON dr.inventory_item_id = i.id
       WHERE dr.deck_id = $1
       ORDER BY i.name`,
      [listing.deck_instance_id]
    );

    // Get missing cards
    const missingResult = await pool.query(
      `SELECT * FROM deck_missing_cards WHERE deck_id = $1 ORDER BY card_name`,
      [listing.deck_instance_id]
    );

    // Calculate totals
    let totalCost = 0;
    let reservedCount = 0;
    for (const r of reservationsResult.rows) {
      totalCost += (parseFloat(r.purchase_price) || 0) * r.quantity_reserved;
      reservedCount += r.quantity_reserved;
    }

    const missingCount = missingResult.rows.reduce((sum, m) => sum + m.quantity_needed, 0);

    res.json({
      hasPicklist: true,
      deckInstanceId: listing.deck_instance_id,
      instanceName: listing.instance_name,
      reservations: reservationsResult.rows,
      missingCards: missingResult.rows,
      totalCost,
      reservedCount,
      missingCount,
      status: listing.status
    });
  } catch (error) {
    console.error('[EBAY] Get picklist failed:', error);
    res.status(500).json({ error: 'Failed to get pick list', details: error.message });
  }
});

export default router;
