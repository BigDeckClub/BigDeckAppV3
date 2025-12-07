import express from 'express';
import { pool } from '../db/pool.js';
import { validateId, authenticate, apiLimiter } from '../middleware/index.js';
import { batchInsertReservations, batchInsertMissingCards } from '../utils/index.js';

const router = express.Router();

// Apply rate limiting to all deck routes to prevent abuse
router.use(apiLimiter);

// ========== DECKS ENDPOINTS ==========
router.get('/decks', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM decks 
      WHERE (is_deck_instance = FALSE OR is_deck_instance IS NULL)
        AND user_id = $1
      ORDER BY created_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[DECKS] Error fetching decks:', error.message);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

router.post('/decks', authenticate, async (req, res) => {
  const { name, format, description } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Deck name is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO decks (user_id, name, format, description, cards, is_deck_instance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), NOW())
       RETURNING *`,
      [req.userId, name, format || 'Casual', description || '', '[]']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[DECKS] Error creating deck:', error.message);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

router.put('/decks/:id', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  const { name, format, description, cards, archidekt_url } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (format !== undefined) {
      updates.push(`format = $${paramCount++}`);
      values.push(format);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (cards !== undefined) {
      updates.push(`cards = $${paramCount++}`);
      values.push(JSON.stringify(cards));
    }
    if (archidekt_url !== undefined) {
      updates.push(`archidekt_url = $${paramCount++}`);
      values.push(archidekt_url);
    }
    
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    values.push(req.userId);
    const query = `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DECKS] Error updating deck:', error.message);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// POST sync deck from Archidekt
router.post('/decks/:id/sync-archidekt', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  
  try {
    // Get deck with archidekt_url - ensure user owns it
    const deckResult = await pool.query('SELECT * FROM decks WHERE id = $1 AND user_id = $2', [id, req.userId]);
    
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    const deck = deckResult.rows[0];
    
    if (!deck.archidekt_url) {
      return res.status(400).json({ error: 'No Archidekt URL linked to this deck' });
    }
    
    // Extract deck ID from Archidekt URL
    const archidektIdMatch = deck.archidekt_url.match(/archidekt\.com\/decks\/(\d+)/);
    if (!archidektIdMatch) {
      return res.status(400).json({ error: 'Invalid Archidekt URL format' });
    }
    
    const archidektId = archidektIdMatch[1];
    
    // Fetch deck from Archidekt API
    const archidektResponse = await fetch(`https://archidekt.com/api/decks/${archidektId}/small/`);
    
    if (!archidektResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch deck from Archidekt' });
    }
    
    const archidektData = await archidektResponse.json();
    
    // Transform Archidekt cards to our format
    const archidektCards = archidektData.cards.map(card => ({
      name: card.card.oracleCard.name,
      quantity: card.quantity,
      set: card.card.edition.editioncode || '',
      collector_number: card.card.collectorNumber || '',
      scryfall_id: card.card.uid || null
    }));
    
    // Get local deck cards
    const localCards = deck.cards || [];
    
    // Create maps for comparison
    const localCardMap = new Map();
    localCards.forEach(card => {
      const key = `${card.name}|${card.set}|${card.collector_number}`;
      localCardMap.set(key, card);
    });
    
    const archidektCardMap = new Map();
    archidektCards.forEach(card => {
      const key = `${card.name}|${card.set}|${card.collector_number}`;
      archidektCardMap.set(key, card);
    });
    
    // Calculate differences
    const added = [];
    const removed = [];
    const modified = [];
    
    // Find added and modified cards
    archidektCards.forEach(archCard => {
      const key = `${archCard.name}|${archCard.set}|${archCard.collector_number}`;
      const localCard = localCardMap.get(key);
      
      if (!localCard) {
        added.push(archCard);
      } else if (localCard.quantity !== archCard.quantity) {
        modified.push({
          card: archCard,
          oldQuantity: localCard.quantity,
          newQuantity: archCard.quantity
        });
      }
    });
    
    // Find removed cards
    localCards.forEach(localCard => {
      const key = `${localCard.name}|${localCard.set}|${localCard.collector_number}`;
      if (!archidektCardMap.has(key)) {
        removed.push(localCard);
      }
    });
    
    res.json({
      archidektName: archidektData.name,
      archidektFormat: archidektData.formats?.[0] || deck.format,
      archidektDescription: archidektData.description || '',
      changes: {
        added,
        removed,
        modified
      },
      hasChanges: added.length > 0 || removed.length > 0 || modified.length > 0
    });
    
  } catch (error) {
    console.error('[DECKS] Error syncing from Archidekt:', error.message);
    res.status(500).json({ error: 'Failed to sync deck from Archidekt' });
  }
});

// POST apply Archidekt sync changes
router.post('/decks/:id/apply-sync', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  const { cards, name, format, description } = req.body;
  
  try {
    const updates = ['cards = $1', 'last_synced = NOW()', 'updated_at = NOW()'];
    const values = [JSON.stringify(cards)];
    let paramCount = 2;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (format !== undefined) {
      updates.push(`format = $${paramCount++}`);
      values.push(format);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    values.push(id);
    values.push(req.userId);
    const query = `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DECKS] Error applying sync:', error.message);
    res.status(500).json({ error: 'Failed to apply sync changes' });
  }
});

router.delete('/decks/:id', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  
  try {
    const result = await pool.query('DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    res.json({ message: 'Deck deleted', deck: result.rows[0] });
  } catch (error) {
    console.error('[DECKS] Error deleting deck:', error.message);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// ========== DECK INSTANCES (Two-Tier System) ==========

// GET all deck instances
router.get('/deck-instances', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*,
        (SELECT COALESCE(SUM(dr.quantity_reserved), 0) FROM deck_reservations dr WHERE dr.deck_id = d.id) as reserved_count,
        (SELECT COALESCE(SUM(dm.quantity_needed), 0) FROM deck_missing_cards dm WHERE dm.deck_id = d.id) as missing_count,
        (SELECT COALESCE(SUM(dr.quantity_reserved * COALESCE(i.purchase_price, 0)), 0) 
         FROM deck_reservations dr
         JOIN inventory i ON dr.inventory_item_id = i.id 
         WHERE dr.deck_id = d.id) as total_cost
      FROM decks d
      WHERE d.is_deck_instance = TRUE AND d.user_id = $1
      ORDER BY d.created_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[DECKS] Error fetching deck instances:', error.message);
    res.status(500).json({ error: 'Failed to fetch deck instances' });
  }
});

// GET full details of a deck instance
router.get('/deck-instances/:id/details', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  
  try {
    const deckResult = await pool.query('SELECT * FROM decks WHERE id = $1 AND is_deck_instance = TRUE AND user_id = $2', [id, req.userId]);
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck instance not found' });
    }
    const deck = deckResult.rows[0];
    
    // Fetch original decklist if it exists
    let originalDecklist = null;
    if (deck.decklist_id) {
      const decklistResult = await pool.query('SELECT id, name, cards FROM decks WHERE id = $1', [deck.decklist_id]);
      if (decklistResult.rows.length > 0) {
        originalDecklist = decklistResult.rows[0];
      }
    }
    
    const reservationsResult = await pool.query(`
      SELECT dr.*, i.name, i.set, i.purchase_price, i.folder as original_folder, i.quantity as inventory_quantity
      FROM deck_reservations dr
      JOIN inventory i ON dr.inventory_item_id = i.id
      WHERE dr.deck_id = $1
      ORDER BY i.name, i.purchase_price ASC
    `, [id]);
    
    const missingResult = await pool.query(`
      SELECT * FROM deck_missing_cards WHERE deck_id = $1 ORDER BY card_name
    `, [id]);
    
    // Calculate totals with proper type conversion
    let totalCost = 0;
    let reservedCount = 0;
    reservationsResult.rows.forEach(r => {
      const qty = parseInt(r.quantity_reserved) || 0;
      const price = parseFloat(r.purchase_price) || 0;
      totalCost += qty * price;
      reservedCount += qty;
    });
    
    let missingCount = 0;
    missingResult.rows.forEach(m => {
      missingCount += parseInt(m.quantity_needed) || 0;
    });
    
    // Calculate extras (cards in deck not in original decklist)
    const decklistCardNames = originalDecklist && originalDecklist.cards 
      ? new Set(originalDecklist.cards.map(c => c.name.toLowerCase().trim()))
      : new Set();
    
    const extraCount = reservationsResult.rows.filter(r => 
      !decklistCardNames.has(r.name.toLowerCase().trim())
    ).reduce((sum, r) => sum + parseInt(r.quantity_reserved || 0), 0);
    
    // Calculate original decklist card count
    const decklistCardCount = originalDecklist && originalDecklist.cards
      ? originalDecklist.cards.reduce((sum, c) => sum + (c.quantity || 1), 0)
      : 0;
    
    res.json({
      deck: deck,
      reservations: reservationsResult.rows,
      missingCards: missingResult.rows,
      totalCost: totalCost,
      reservedCount: reservedCount,
      missingCount: missingCount,
      originalDecklist: originalDecklist ? { id: originalDecklist.id, name: originalDecklist.name, cardCount: decklistCardCount } : null,
      extraCount: extraCount
    });
  } catch (error) {
    console.error('[DECKS] Error fetching deck details:', error.message);
    res.status(500).json({ error: 'Failed to fetch deck details' });
  }
});

// POST copy decklist to inventory (create deck instance)
router.post('/decks/:id/copy-to-inventory', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  const { name } = req.body;
  
  try {
    const decklistResult = await pool.query('SELECT * FROM decks WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (decklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Decklist not found' });
    }
    const decklist = decklistResult.rows[0];
    const cards = decklist.cards || [];
    
    const deckName = name || decklist.name;
    const newDeckResult = await pool.query(
      `INSERT INTO decks (user_id, name, format, description, cards, decklist_id, is_deck_instance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
       RETURNING *`,
      [req.userId, deckName, decklist.format, decklist.description, JSON.stringify(cards), id]
    );
    const newDeck = newDeckResult.rows[0];
    
    // Step 1: Get all unique, valid card names from the decklist
    const cardNames = [...new Set(
      cards
        .filter(c => typeof c.name === 'string' && c.name.trim().length > 0)
        .map(c => c.name.toLowerCase().trim())
    )];
    
    // Step 2: Fetch ALL matching inventory items in ONE query, only if cardNames is non-empty
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
    
    // Step 3: Group inventory items by card name for efficient lookup
    const inventoryByName = {};
    for (const item of inventoryResult.rows) {
      const key = item.name.toLowerCase().trim();
      if (!inventoryByName[key]) inventoryByName[key] = [];
      inventoryByName[key].push({ ...item, available_quantity: parseInt(item.available_quantity) });
    }
    
    // Step 4: Process each card in the decklist using in-memory data
    const reservations = [];
    const missingCards = [];
    const usedQuantities = {}; // Track quantities used during this operation
    
    for (const card of cards) {
      // Skip cards without valid names
      if (typeof card.name !== 'string' || card.name.trim().length === 0) continue;
      
      const cardKey = card.name.toLowerCase().trim();
      const quantityNeeded = card.quantity || 1;
      const availableItems = inventoryByName[cardKey] || [];
      
      let remainingNeeded = quantityNeeded;
      
      for (const invItem of availableItems) {
        if (remainingNeeded <= 0) break;
        
        // Account for quantities already reserved in this batch
        const alreadyUsed = usedQuantities[invItem.id] || 0;
        const actualAvailable = invItem.available_quantity - alreadyUsed;
        
        if (actualAvailable <= 0) continue;
        
        const reserveQty = Math.min(remainingNeeded, actualAvailable);
        
        if (reserveQty > 0) {
          reservations.push({
            deck_id: newDeck.id,
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
          deck_id: newDeck.id,
          card_name: card.name,
          set_code: card.set || null,
          quantity_needed: remainingNeeded
        });
      }
    }
    
    // Step 5: Batch insert reservations (if any)
    await batchInsertReservations(reservations, pool);
    
    // Step 6: Batch insert missing cards (if any)
    await batchInsertMissingCards(missingCards, pool);
    
    res.status(201).json({
      deck: newDeck,
      reservations: reservations,
      missingCards: missingCards,
      totalCards: cards.reduce((sum, c) => sum + (c.quantity || 1), 0),
      reservedCount: reservations.reduce((sum, r) => sum + r.quantity_reserved, 0),
      missingCount: missingCards.reduce((sum, m) => sum + m.quantity_needed, 0)
    });
  } catch (error) {
    console.error('[DECKS] Error copying to inventory:', error.message);
    res.status(500).json({ error: 'Failed to copy deck to inventory' });
  }
});

// POST add card to deck instance
router.post('/deck-instances/:id/add-card', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  const { inventory_item_id, quantity } = req.body;
  
  try {
    // First verify user owns this deck
    const deckCheck = await pool.query('SELECT id FROM decks WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (deckCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    const invResult = await pool.query(`
      SELECT i.*, 
        COALESCE(i.quantity, 0) - COALESCE(
          (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
        ) as available_quantity
      FROM inventory i WHERE i.id = $1 AND i.user_id = $2
    `, [inventory_item_id, req.userId]);
    
    if (invResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    const invItem = invResult.rows[0];
    if (invItem.available_quantity < quantity) {
      return res.status(400).json({ error: 'Not enough available quantity' });
    }
    
    const existingRes = await pool.query(
      'SELECT * FROM deck_reservations WHERE deck_id = $1 AND inventory_item_id = $2',
      [id, inventory_item_id]
    );
    
    if (existingRes.rows.length > 0) {
      await pool.query(
        'UPDATE deck_reservations SET quantity_reserved = quantity_reserved + $1 WHERE deck_id = $2 AND inventory_item_id = $3',
        [quantity, id, inventory_item_id]
      );
    } else {
      await pool.query(
        `INSERT INTO deck_reservations (deck_id, inventory_item_id, quantity_reserved, original_folder)
         VALUES ($1, $2, $3, $4)`,
        [id, inventory_item_id, quantity, invItem.folder || 'Uncategorized']
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DECKS] Error adding card:', error.message);
    res.status(500).json({ error: 'Failed to add card' });
  }
});

// DELETE remove card from deck instance
router.delete('/deck-instances/:id/remove-card', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  const { reservation_id, quantity } = req.body;
  
  try {
    // Verify user owns this deck
    const deckCheck = await pool.query('SELECT id FROM decks WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (deckCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    const resResult = await pool.query('SELECT * FROM deck_reservations WHERE id = $1 AND deck_id = $2', [reservation_id, id]);
    
    if (resResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    const reservation = resResult.rows[0];
    
    if (quantity >= reservation.quantity_reserved) {
      // Move card back to unsorted when removing from deck
      await pool.query('UPDATE inventory SET folder = $1 WHERE id = $2', ['Uncategorized', reservation.inventory_item_id]);
      await pool.query('DELETE FROM deck_reservations WHERE id = $1', [reservation_id]);
    } else {
      await pool.query(
        'UPDATE deck_reservations SET quantity_reserved = quantity_reserved - $1 WHERE id = $2',
        [quantity, reservation_id]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DECKS] Error removing card:', error.message);
    res.status(500).json({ error: 'Failed to remove card' });
  }
});


// POST release entire deck instance
router.post('/deck-instances/:id/release', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  
  try {
    // Verify user owns this deck
    const deckCheck = await pool.query('SELECT id FROM decks WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (deckCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    // Get all reservations for this deck before deleting
    const reservationsResult = await pool.query('SELECT inventory_item_id FROM deck_reservations WHERE deck_id = $1', [id]);
    
    // Move all reserved cards back to Uncategorized and clear reserved_quantity
    if (reservationsResult.rows.length > 0) {
      const inventoryIds = reservationsResult.rows.map(r => r.inventory_item_id);
      const placeholders = inventoryIds.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`UPDATE inventory SET folder = 'Uncategorized', reserved_quantity = 0 WHERE id IN (${placeholders})`, inventoryIds);
    }
    
    await pool.query('DELETE FROM deck_reservations WHERE deck_id = $1', [id]);
    await pool.query('DELETE FROM deck_missing_cards WHERE deck_id = $1', [id]);
    await pool.query('DELETE FROM decks WHERE id = $1 AND is_deck_instance = TRUE', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DECKS] Error releasing deck:', error.message);
    res.status(500).json({ error: 'Failed to release deck' });
  }
});

// POST reoptimize deck instance
router.post('/deck-instances/:id/reoptimize', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  
  // Use a transaction to avoid TOCTOU race conditions
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const deckResult = await client.query('SELECT * FROM decks WHERE id = $1 AND is_deck_instance = TRUE AND user_id = $2', [id, req.userId]);
    if (deckResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Deck not found' });
    }
    const deck = deckResult.rows[0];
    const cards = deck.cards || [];
    
    await client.query('DELETE FROM deck_reservations WHERE deck_id = $1', [id]);
    await client.query('DELETE FROM deck_missing_cards WHERE deck_id = $1', [id]);
    
    // Step 1: Get all unique, valid card names from the decklist
    const cardNames = [...new Set(
      cards
        .filter(c => typeof c.name === 'string' && c.name.trim().length > 0)
        .map(c => c.name.toLowerCase().trim())
    )];
    
    // Step 2: Fetch ALL matching inventory items in ONE query, only if cardNames is non-empty
    let inventoryResult = { rows: [] };
    if (cardNames.length > 0) {
      inventoryResult = await client.query(`
        SELECT i.id, i.name, i.folder, i.purchase_price, i.quantity,
          COALESCE(i.quantity, 0) - COALESCE(
            (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
          ) as available_quantity
        FROM inventory i
        WHERE LOWER(TRIM(i.name)) = ANY($1::text[])
          AND COALESCE(i.quantity, 0) - COALESCE(
            (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
          ) > 0
        ORDER BY LOWER(TRIM(i.name)), COALESCE(i.purchase_price, 999999) ASC
      `, [cardNames]);
    }
    
    // Step 3: Group inventory items by card name for efficient lookup
    const inventoryByName = {};
    for (const item of inventoryResult.rows) {
      const key = item.name.toLowerCase().trim();
      if (!inventoryByName[key]) inventoryByName[key] = [];
      inventoryByName[key].push({ ...item, available_quantity: parseInt(item.available_quantity) });
    }
    
    // Step 4: Process each card in the decklist using in-memory data
    const reservations = [];
    const missingCards = [];
    const usedQuantities = {}; // Track quantities used during this operation
    
    for (const card of cards) {
      // Skip cards without valid names
      if (typeof card.name !== 'string' || card.name.trim().length === 0) continue;
      
      const cardKey = card.name.toLowerCase().trim();
      const quantityNeeded = card.quantity || 1;
      const availableItems = inventoryByName[cardKey] || [];
      
      let remainingNeeded = quantityNeeded;
      
      for (const invItem of availableItems) {
        if (remainingNeeded <= 0) break;
        
        // Account for quantities already reserved in this batch
        const alreadyUsed = usedQuantities[invItem.id] || 0;
        const actualAvailable = invItem.available_quantity - alreadyUsed;
        
        if (actualAvailable <= 0) continue;
        
        const reserveQty = Math.min(remainingNeeded, actualAvailable);
        
        if (reserveQty > 0) {
          reservations.push({
            deck_id: id,
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
          deck_id: id,
          card_name: card.name,
          set_code: card.set || null,
          quantity_needed: remainingNeeded
        });
      }
    }
    
    // Step 5: Batch insert reservations (if any) - pass client for transaction
    await batchInsertReservations(reservations, client);
    
    // Step 6: Batch insert missing cards (if any) - pass client for transaction
    await batchInsertMissingCards(missingCards, client);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      reservedCount: reservations.reduce((sum, r) => sum + r.quantity_reserved, 0),
      missingCount: missingCards.reduce((sum, m) => sum + m.quantity_needed, 0)
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DECKS] Error reoptimizing:', error.message);
    res.status(500).json({ error: 'Failed to reoptimize deck' });
  } finally {
    client.release();
  }
});

// PUT update deck instance metadata
router.put('/deck-instances/:id', authenticate, validateId, async (req, res) => {
  const id = req.validatedId;
  const { name, format, description } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (format !== undefined) {
      updates.push(`format = $${paramCount++}`);
      values.push(format);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    values.push(req.userId);
    
    const result = await pool.query(
      `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_deck_instance = TRUE AND user_id = $${paramCount + 1} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DECKS] Error updating deck:', error.message);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

export default router;
