import express from 'express';
import { pool as defaultPool } from '../db/pool.js';
import { validateId, authenticate, apiLimiter } from '../middleware/index.js';
import { fetchRetry } from '../utils/index.js';
import { scryfallServerClient as defaultScryfallClient } from '../utils/scryfallClient.server.js';
import { createInventoryItemSchema, updateInventoryItemSchema, setThresholdSchema, validateBody } from '../utils/validation.js';

/**
 * Create an inventory router with injectable dependencies for easier testing.
 * @param {{pool, scryfallServerClient, validateIdMiddleware, authenticateMiddleware, apiLimiterMiddleware}} deps
 */
export function createInventoryRouter({
  pool = defaultPool,
  scryfallServerClient = defaultScryfallClient,
  validateIdMiddleware = validateId,
  authenticateMiddleware = authenticate,
  apiLimiterMiddleware = apiLimiter
} = {}) {
  const router = express.Router();
  // Apply rate limiting to all inventory routes to prevent abuse
  router.use(apiLimiterMiddleware);

// ========== INVENTORY ENDPOINTS ==========
  router.get('/inventory', authenticateMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.name, i.set, i.set_name, i.quantity, i.purchase_price, i.purchase_date, 
              i.reorder_type, i.image_url, i.scryfall_id, i.folder, i.created_at,
              i.foil, i.quality,
              COALESCE(
                (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
              ) as reserved_quantity
       FROM inventory i 
       WHERE i.user_id = $1
       ORDER BY i.name ASC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
      console.error('[INVENTORY] Error fetching:', error.message);
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });

  router.post('/inventory', authenticateMiddleware, validateBody(createInventoryItemSchema), async (req, res) => {
  const { name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, folder, foil, quality } = req.body;
  
  try {
    // Fetch Scryfall ID for better market value tracking (non-blocking lookup)
    let scryfallId = null;
    try {
      // Normalize set if present
      let normalizedSet = null;
      if (set) {
        if (typeof set === 'string') {
          const s = set.trim().toLowerCase();
          if (s && s !== 'unknown') normalizedSet = s;
        } else if (typeof set === 'object') {
          const s = (set.editioncode || set.mtgoCode || '').toString().trim().toLowerCase();
          if (s && s !== 'unknown') normalizedSet = s;
        }
      }

      const card = await scryfallServerClient.getCardByName(name, { exact: true, set: normalizedSet });
      if (card?.scryfall_id) {
        scryfallId = card.scryfall_id;
        console.log(`[INVENTORY] ✓ Found Scryfall ID for "${name}"${set ? ` (${set})` : ''}`);
      } else {
        console.warn(`[INVENTORY] ⚠ Could not find Scryfall ID for "${name}"${set ? ` (${set})` : ''} - market prices will not be available`);
      }
    } catch (err) {
      console.error(`[INVENTORY] ✗ Failed to fetch Scryfall ID for "${name}":`, err.message);
      // Continue without Scryfall ID - not critical
    }

    // scryfall lookup completed

    const result = await pool.query(
      `INSERT INTO inventory (user_id, name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, scryfall_id, folder, foil, quality, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING *`,
      [req.userId, name, set || null, set_name || null, quantity || 1, purchase_price || null, purchase_date || null, reorder_type || 'normal', image_url || null, scryfallId, folder || 'Uncategorized', foil || false, quality || 'NM']
    );
    // INSERT completed
    
    // Record PURCHASE transaction for analytics
    if (purchase_price && (quantity || 1) > 0) {
      await pool.query(
        `INSERT INTO inventory_transactions (card_name, transaction_type, quantity, purchase_price, transaction_date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
        [name, 'PURCHASE', quantity || 1, purchase_price]
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[INVENTORY] Error creating:', error.message);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

  router.put('/inventory/:id', authenticateMiddleware, validateIdMiddleware, validateBody(updateInventoryItemSchema), async (req, res) => {
    const id = req.validatedId;
  const { quantity, purchase_price, purchase_date, reorder_type, folder, foil, quality } = req.body;

  try {
    // Fetch current values to track changes - ensure user owns this item
    const currentResult = await pool.query(
      'SELECT name, quantity, purchase_price, folder, quality, foil FROM inventory WHERE id = $1 AND user_id = $2',
      [id, req.userId]
    );
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    const currentItem = currentResult.rows[0];
    const changes = [];
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount++}`);
      values.push(quantity);
      if (currentItem.quantity !== quantity) {
        changes.push({ field: 'quantity', old: currentItem.quantity, new: quantity });
      }
    }
    if (purchase_price !== undefined) {
      updates.push(`purchase_price = $${paramCount++}`);
      values.push(purchase_price);
      if (parseFloat(currentItem.purchase_price || 0) !== parseFloat(purchase_price || 0)) {
        changes.push({ field: 'purchase_price', old: currentItem.purchase_price, new: purchase_price });
      }
    }
    if (purchase_date !== undefined) {
      updates.push(`purchase_date = $${paramCount++}`);
      values.push(purchase_date);
    }
    if (reorder_type !== undefined) {
      updates.push(`reorder_type = $${paramCount++}`);
      values.push(reorder_type);
    }
    if (folder !== undefined) {
      updates.push(`folder = $${paramCount++}`);
      values.push(folder);
      if (currentItem.folder !== folder) {
        changes.push({ field: 'folder', old: currentItem.folder, new: folder });
      }
    }
    if (foil !== undefined) {
      updates.push(`foil = $${paramCount++}`);
      values.push(foil);
      if (currentItem.foil !== foil) {
        changes.push({ field: 'foil', old: currentItem.foil, new: foil });
      }
    }
    if (quality !== undefined) {
      updates.push(`quality = $${paramCount++}`);
      values.push(quality);
      if (currentItem.quality !== quality) {
        changes.push({ field: 'quality', old: currentItem.quality, new: quality });
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE inventory SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;
    values.push(req.userId);
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[INVENTORY] Error updating:', error.message);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
  });

// Empty Trash - permanently delete all items in Trash folder
  router.delete('/inventory/trash', authenticateMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM inventory WHERE folder = 'Trash' AND user_id = $1 RETURNING *",
      [req.userId]
    );

    res.json({ 
      message: 'Trash emptied', 
      deletedCount: result.rows.length,
      items: result.rows 
    });
  } catch (error) {
    console.error('[INVENTORY] Error emptying trash:', error.message);
    res.status(500).json({ error: 'Failed to empty trash' });
  }
  });

  router.delete('/inventory/:id', authenticateMiddleware, validateIdMiddleware, async (req, res) => {
    const id = req.validatedId;

    try {
      const result = await pool.query(
        'DELETE FROM inventory WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, req.userId]
      );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    res.json({ message: 'Inventory item deleted', item: result.rows[0] });
    } catch (error) {
      console.error('[INVENTORY] Error deleting:', error.message);
      res.status(500).json({ error: 'Failed to delete inventory item' });
    }
  });


// POST /api/inventory/backfill-scryfall-ids - Backfill missing Scryfall IDs for price tracking
  router.post('/inventory/backfill-scryfall-ids', authenticateMiddleware, async (req, res) => {
  try {
    // Find all inventory items without Scryfall IDs for this user
    const result = await pool.query(
      'SELECT id, name, set FROM inventory WHERE (scryfall_id IS NULL OR scryfall_id = \'\') AND user_id = $1',
      [req.userId]
    );
    
    const itemsToUpdate = result.rows || [];
    
    if (itemsToUpdate.length === 0) {
      return res.json({ 
        success: true, 
        message: 'All inventory items already have Scryfall IDs',
        updated: 0,
        total: 0
      });
    }
    
    console.log(`[BACKFILL] Starting to backfill ${itemsToUpdate.length} items with missing Scryfall IDs`);

    // Use batchResolve in chunks to avoid many individual requests and to reuse rate-limited queue
    const CHUNK_SIZE = 75;
    let successCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

      const identifiers = itemsToUpdate.map(it => ({ name: it.name, set: (typeof it.set === 'string' ? it.set.toLowerCase() : (it.set?.editioncode || it.set?.mtgoCode || '') ) }));

    for (let i = 0; i < identifiers.length; i += CHUNK_SIZE) {
      const chunk = identifiers.slice(i, i + CHUNK_SIZE);
      try {
        const resolved = await scryfallServerClient.batchResolve(chunk);
        // Update database for items found in this chunk
        for (const item of itemsToUpdate.slice(i, i + CHUNK_SIZE)) {
          const key = `${(item.name || '').toLowerCase().trim()}|${(item.set || '').toLowerCase().trim()}`;
          const card = resolved[key];
          if (card && card.scryfall_id) {
            try {
              await pool.query('UPDATE inventory SET scryfall_id = $1 WHERE id = $2', [card.scryfall_id, item.id]);
              successCount++;
              console.log(`[BACKFILL] ✓ Updated item ${item.id}: "${item.name}" with Scryfall ID`);
            } catch (dbErr) {
              errorCount++;
              console.error(`[BACKFILL] ✗ DB update failed for item ${item.id}:`, dbErr.message);
            }
          } else {
            notFoundCount++;
            console.log(`[BACKFILL] ⚠ Could not find Scryfall ID for item ${item.id}: "${item.name}"`);
          }
        }
      } catch (err) {
        errorCount += Math.min(CHUNK_SIZE, chunk.length);
        console.error('[BACKFILL] ✗ batchResolve failed for chunk:', err.message);
      }
    }

    console.log(`[BACKFILL] Complete: ${successCount} updated, ${notFoundCount} not found, ${errorCount} errors`);

    res.json({
      success: true,
      message: `Backfill complete: ${successCount} items updated with Scryfall IDs`,
      updated: successCount,
      notFound: notFoundCount,
      errors: errorCount,
      total: itemsToUpdate.length
    });
  } catch (error) {
    console.error('[BACKFILL] Fatal error:', error);
    res.status(500).json({ error: 'Failed to backfill Scryfall IDs' });
  }
});


  return router;
}

// Default export for runtime usage with real dependencies
const defaultRouter = createInventoryRouter();
export default defaultRouter;
