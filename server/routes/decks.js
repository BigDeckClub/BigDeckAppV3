import express from 'express';
import { pool } from '../db/pool.js';
import { validateId } from '../middleware/index.js';
import { batchInsertReservations, batchInsertMissingCards } from '../utils/index.js';

const router = express.Router();

// ========== DECKS ENDPOINTS ==========
router.get('/api/decks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM decks 
      WHERE is_deck_instance = FALSE OR is_deck_instance IS NULL
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[DECKS] Error fetching decks:', error.message);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

router.post('/api/decks', async (req, res) => {
  const { name, format, description } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Deck name is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO decks (name, format, description, cards, is_deck_instance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())
       RETURNING *`,
      [name, format || 'Casual', description || '', '[]']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[DECKS] Error creating deck:', error.message);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

router.put('/api/decks/:id', validateId, async (req, res) => {
  const id = req.validatedId;
  const { name, format, description, cards } = req.body;
  
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
    
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(id);
    const query = `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
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

router.delete('/api/decks/:id', validateId, async (req, res) => {
  const id = req.validatedId;
  
  try {
    const result = await pool.query('DELETE FROM decks WHERE id = $1 RETURNING *', [id]);
    
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
router.get('/api/deck-instances', async (req, res) => {
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
      WHERE d.is_deck_instance = TRUE
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[DECKS] Error fetching deck instances:', error.message);
    res.status(500).json({ error: 'Failed to fetch deck instances' });
  }
});

// GET full details of a deck instance
router.get('/api/deck-instances/:id/details', validateId, async (req, res) => {
  const id = req.validatedId;
  
  try {
    const deckResult = await pool.query('SELECT * FROM decks WHERE id = $1 AND is_deck_instance = TRUE', [id]);
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
router.post('/api/decks/:id/copy-to-inventory', validateId, async (req, res) => {
  const id = req.validatedId;
  const { name } = req.body;
  
  try {
    const decklistResult = await pool.query('SELECT * FROM decks WHERE id = $1', [id]);
    if (decklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Decklist not found' });
    }
    const decklist = decklistResult.rows[0];
    const cards = decklist.cards || [];
    
    const deckName = name || decklist.name;
    const newDeckResult = await pool.query(
      `INSERT INTO decks (name, format, description, cards, decklist_id, is_deck_instance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
       RETURNING *`,
      [deckName, decklist.format, decklist.description, JSON.stringify(cards), id]
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
router.post('/api/deck-instances/:id/add-card', validateId, async (req, res) => {
  const id = req.validatedId;
  const { inventory_item_id, quantity } = req.body;
  
  try {
    const invResult = await pool.query(`
      SELECT i.*, 
        COALESCE(i.quantity, 0) - COALESCE(
          (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
        ) as available_quantity
      FROM inventory i WHERE i.id = $1
    `, [inventory_item_id]);
    
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
router.delete('/api/deck-instances/:id/remove-card', validateId, async (req, res) => {
  const id = req.validatedId;
  const { reservation_id, quantity } = req.body;
  
  try {
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
router.post('/api/deck-instances/:id/release', validateId, async (req, res) => {
  const id = req.validatedId;
  
  try {
    // Get all reservations for this deck before deleting
    const reservationsResult = await pool.query('SELECT inventory_item_id FROM deck_reservations WHERE deck_id = $1', [id]);
    
    // Move all reserved cards back to Unsorted and clear reserved_quantity
    if (reservationsResult.rows.length > 0) {
      const inventoryIds = reservationsResult.rows.map(r => r.inventory_item_id);
      const placeholders = inventoryIds.map((_, i) => `$${i + 1}`).join(',');
      await pool.query(`UPDATE inventory SET folder = 'Unsorted', reserved_quantity = 0 WHERE id IN (${placeholders})`, inventoryIds);
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
router.post('/api/deck-instances/:id/reoptimize', validateId, async (req, res) => {
  const id = req.validatedId;
  
  // Use a transaction to avoid TOCTOU race conditions
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const deckResult = await client.query('SELECT * FROM decks WHERE id = $1 AND is_deck_instance = TRUE', [id]);
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
router.put('/api/deck-instances/:id', validateId, async (req, res) => {
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
    
    const result = await pool.query(
      `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_deck_instance = TRUE RETURNING *`,
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
