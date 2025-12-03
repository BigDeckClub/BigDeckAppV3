import express from 'express';
import { pool } from '../db/pool.js';
import { validateId } from '../middleware/index.js';
import { fetchRetry } from '../utils/index.js';
import { recordChange, recordAudit, recordActivity } from './history.js';

const router = express.Router();

// ========== INVENTORY ENDPOINTS ==========
router.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.name, i.set, i.set_name, i.quantity, i.purchase_price, i.purchase_date, 
              i.reorder_type, i.image_url, i.scryfall_id, i.folder, i.created_at,
              i.low_inventory_alert, i.low_inventory_threshold, i.foil, i.quality,
              COALESCE(
                (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
              ) as reserved_quantity
       FROM inventory i ORDER BY i.name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[INVENTORY] Error fetching:', error.message);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

router.post('/api/inventory', async (req, res) => {
  const { name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, folder, foil, quality } = req.body;
  
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Card name is required and must be a non-empty string' });
  }
  
  // Quantity is optional but must be a positive integer greater than zero when provided
  if (quantity !== undefined && quantity !== null && (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity))) {
    return res.status(400).json({ error: 'Quantity must be a positive integer greater than zero when provided' });
  }
  
  // Purchase price is optional but must be a non-negative number when provided
  if (purchase_price !== undefined && purchase_price !== null && (typeof purchase_price !== 'number' || purchase_price < 0)) {
    return res.status(400).json({ error: 'Purchase price must be a non-negative number when provided' });
  }
  
  // Validate quality if provided
  const validQualities = ['NM', 'LP', 'MP', 'HP', 'DMG'];
  if (quality !== undefined && quality !== null && !validQualities.includes(quality)) {
    return res.status(400).json({ error: `Quality must be one of: ${validQualities.join(', ')}` });
  }

  try {
    // Fetch Scryfall ID for better market value tracking
    let scryfallId = null;
    try {
      let scryfallRes = null;
      
      // Try exact match with set if available
      if (set && set.length > 0) {
        const exactUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}&set=${set.toLowerCase()}`;
        scryfallRes = await fetchRetry(exactUrl);
        if (!scryfallRes?.ok) scryfallRes = null;
      }
      
      // Fallback to fuzzy match
      if (!scryfallRes) {
        const fuzzyUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`;
        scryfallRes = await fetchRetry(fuzzyUrl);
      }
      
      if (scryfallRes?.ok) {
        const cardData = await scryfallRes.json();
        scryfallId = cardData.id || null;
      }
    } catch (err) {
      console.debug('[INVENTORY] Failed to fetch Scryfall ID for market analytics:', err.message);
      // Continue without Scryfall ID - not critical
    }

    const result = await pool.query(
      `INSERT INTO inventory (name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, scryfall_id, folder, foil, quality, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
      [name, set || null, set_name || null, quantity || 1, purchase_price || null, purchase_date || null, reorder_type || 'normal', image_url || null, scryfallId, folder || 'Uncategorized', foil || false, quality || 'NM']
    );
    
    // Record PURCHASE transaction for analytics
    if (purchase_price && (quantity || 1) > 0) {
      await pool.query(
        `INSERT INTO inventory_transactions (card_name, transaction_type, quantity, purchase_price, transaction_date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
        [name, 'PURCHASE', quantity || 1, purchase_price]
      );
    }
    
    // Record activity for card addition
    const addedItem = result.rows[0];
    await recordActivity({
      activityType: 'card_added',
      title: `Added ${name}`,
      description: `Added ${quantity || 1} cop${(quantity || 1) === 1 ? 'y' : 'ies'} to inventory`,
      entityType: 'inventory',
      entityId: addedItem.id,
      metadata: { quantity: quantity || 1, set: set || null, folder: folder || 'Uncategorized' }
    });
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[INVENTORY] Error creating:', error.message);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

router.put('/api/inventory/:id', validateId, async (req, res) => {
  const id = req.validatedId;
  const { quantity, purchase_price, purchase_date, reorder_type, folder, low_inventory_alert, low_inventory_threshold, foil, quality } = req.body;

  try {
    // Fetch current values to track changes
    const currentResult = await pool.query(
      'SELECT name, quantity, purchase_price, folder, quality, foil FROM inventory WHERE id = $1',
      [id]
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
    if (low_inventory_alert !== undefined) {
      updates.push(`low_inventory_alert = $${paramCount++}`);
      values.push(low_inventory_alert);
    }
    if (low_inventory_threshold !== undefined) {
      updates.push(`low_inventory_threshold = $${paramCount++}`);
      values.push(low_inventory_threshold);
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
    const query = `UPDATE inventory SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    // Record all changes to change history
    for (const change of changes) {
      await recordChange({
        cardId: id,
        cardName: currentItem.name,
        fieldChanged: change.field,
        oldValue: change.old,
        newValue: change.new
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[INVENTORY] Error updating:', error.message);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Empty Trash - permanently delete all items in Trash folder
router.delete('/api/inventory/trash', async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM inventory WHERE folder = 'Trash' RETURNING *"
    );
    
    // Record audit log for empty trash operation
    if (result.rows.length > 0) {
      await recordAudit({
        actionType: 'trash_empty',
        description: `Permanently deleted ${result.rows.length} item${result.rows.length !== 1 ? 's' : ''} from trash`,
        entityType: 'inventory',
        metadata: { 
          deletedCount: result.rows.length,
          deletedItems: result.rows.map(item => ({ id: item.id, name: item.name }))
        }
      });
    }
    
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

router.delete('/api/inventory/:id', validateId, async (req, res) => {
  const id = req.validatedId;

  try {
    const result = await pool.query(
      'DELETE FROM inventory WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    // Record audit log for permanent deletion
    const deletedItem = result.rows[0];
    await recordAudit({
      actionType: 'item_deleted',
      description: `Permanently deleted "${deletedItem.name}"`,
      entityType: 'inventory',
      entityId: id,
      metadata: { cardName: deletedItem.name, quantity: deletedItem.quantity }
    });
    
    res.json({ message: 'Inventory item deleted', item: result.rows[0] });
  } catch (error) {
    console.error('[INVENTORY] Error deleting:', error.message);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Toggle low inventory alert for a specific card
router.post('/api/inventory/:id/toggle-alert', validateId, async (req, res) => {
  const id = req.validatedId;
  console.log('[API] TOGGLE-ALERT ENDPOINT HIT with id:', id);

  try {
    // Get current value
    console.log('[API] Fetching current state before toggle...');
    const beforeResult = await pool.query(
      'SELECT id, name, low_inventory_alert FROM inventory WHERE id = $1',
      [id]
    );
    
    if (beforeResult.rows.length === 0) {
      console.log('[API] Item not found:', id);
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    const beforeAlert = beforeResult.rows[0].low_inventory_alert;
    console.log('[API] TOGGLE BEFORE:', { id, name: beforeResult.rows[0].name, low_inventory_alert: beforeAlert });
    
    // Toggle the value
    console.log('[API] Executing UPDATE query to toggle...');
    const result = await pool.query(
      'UPDATE inventory SET low_inventory_alert = NOT low_inventory_alert WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log('[API] No rows returned after update');
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    const afterAlert = result.rows[0].low_inventory_alert;
    console.log('[API] TOGGLE AFTER:', { id, name: result.rows[0].name, low_inventory_alert: afterAlert });
    console.log('[API] Alert toggled successfully:', beforeAlert, '→', afterAlert);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[API] TOGGLE ERROR:', error.message);
    console.error('[API] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to toggle alert' });
  }
});

// Set low inventory threshold for a specific card
router.post('/api/inventory/:id/set-threshold', validateId, async (req, res) => {
  const id = req.validatedId;
  const { threshold } = req.body;

  try {
    if (threshold === undefined || threshold < 0) {
      return res.status(400).json({ error: 'Invalid threshold value' });
    }

    const result = await pool.query(
      'UPDATE inventory SET low_inventory_threshold = $1 WHERE id = $2 RETURNING *',
      [threshold, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[INVENTORY] Error setting threshold:', error.message);
    res.status(500).json({ error: 'Failed to set threshold' });
  }
});

// POST /api/inventory/bulk-threshold - Bulk update thresholds and alerts (DEBUG VERSION)
router.post('/api/inventory/bulk-threshold', async (req, res) => {
  console.log('[BULK-THRESHOLD] Endpoint hit');
  console.log('[BULK-THRESHOLD] Request body:', JSON.stringify(req.body).substring(0, 500));
  
  try {
    const { updates } = req.body;
    
    if (!updates) {
      console.log('[BULK-THRESHOLD] ERROR: No updates in body');
      return res.status(400).json({ error: 'Updates array is required' });
    }
    
    if (!Array.isArray(updates)) {
      console.log('[BULK-THRESHOLD] ERROR: Updates is not an array:', typeof updates);
      return res.status(400).json({ error: 'Updates must be an array' });
    }
    
    console.log(`[BULK-THRESHOLD] Processing ${updates.length} updates`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Execute all updates in parallel - track results properly
    const updatePromises = updates.map(async (update) => {
      try {
        const { id, threshold, enableAlert } = update;
        
        console.log(`[BULK-THRESHOLD] Updating item ${id}: threshold=${threshold}, alert=${enableAlert}`);
        
        await pool.query(
          `UPDATE inventory 
           SET low_inventory_threshold = $1,
               low_inventory_alert = $2
           WHERE id = $3`,
          [threshold, enableAlert ? true : false, id]
        );
        
        return { success: true, id };
      } catch (err) {
        console.error('[BULK-THRESHOLD] Item error:', update.id, err.message);
        errors.push({ id: update.id, error: err.message });
        return { success: false, id: update.id };
      }
    });
    
    // Collect results from all promises
    const results = await Promise.allSettled(updatePromises);
    successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
    errorCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success)).length;
    
    console.log(`[BULK-THRESHOLD] Complete: ${successCount} success, ${errorCount} errors`);
    
    res.json({ 
      success: true, 
      updated: successCount, 
      errors: errorCount,
      errorDetails: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('[BULK-THRESHOLD] Fatal error:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk update thresholds' });
  }
});

export default router;
