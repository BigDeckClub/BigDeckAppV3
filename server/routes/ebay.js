/**
 * eBay Integration Routes
 * Handles OAuth flow, listing management, and order sync
 */

import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/index.js';
import { pool } from '../db/pool.js';
import ebayService from '../services/ebayService.js';

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
  const { deckId, title, description, price } = req.body;

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

export default router;
