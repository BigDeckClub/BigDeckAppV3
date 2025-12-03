import express from 'express';
import { pool } from '../db/pool.js';
import { validateId } from '../middleware/index.js';
import { fetchRetry } from '../utils/index.js';

const router = express.Router();

// ========== PURCHASE LOTS ENDPOINTS ==========

// GET /api/lots - Fetch all purchase lots
router.get('/api/lots', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM purchase_lots ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[LOTS] Error fetching lots:', error.message);
    res.status(500).json({ error: 'Failed to fetch purchase lots' });
  }
});

// POST /api/lots - Create a new purchase lot
router.post('/api/lots', async (req, res) => {
  const { name, total_cost, card_count } = req.body;
  
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Lot name is required and must be a non-empty string' });
  }
  
  if (name.trim().length > 255) {
    return res.status(400).json({ error: 'Lot name must not exceed 255 characters' });
  }
  
  if (total_cost !== undefined && total_cost !== null && (typeof total_cost !== 'number' || total_cost < 0)) {
    return res.status(400).json({ error: 'Total cost must be a non-negative number when provided' });
  }
  
  if (card_count !== undefined && card_count !== null && (typeof card_count !== 'number' || card_count <= 0 || !Number.isInteger(card_count))) {
    return res.status(400).json({ error: 'Card count must be a positive integer when provided' });
  }

  try {
    // Calculate per-card cost
    const perCardCost = (total_cost && card_count) ? (total_cost / card_count) : null;
    
    const result = await pool.query(
      `INSERT INTO purchase_lots (name, total_cost, card_count, per_card_cost, purchase_date, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, NOW())
       RETURNING *`,
      [name.trim(), total_cost || null, card_count || null, perCardCost]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[LOTS] Error creating lot:', error.message);
    res.status(500).json({ error: 'Failed to create purchase lot' });
  }
});

// POST /api/lots/:id/cards - Bulk add cards to a lot
router.post('/api/lots/:id/cards', validateId, async (req, res) => {
  const lotId = req.validatedId;
  const { cards } = req.body;
  
  // Input validation
  if (!cards || !Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'Cards array is required and must not be empty' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the lot details to retrieve total_cost
    const lotResult = await client.query(
      `SELECT name, total_cost FROM purchase_lots WHERE id = $1`,
      [lotId]
    );
    
    if (lotResult.rows.length === 0) {
      await client.query('ROLLBACK').catch(err => console.error('[LOTS] Rollback failed:', err.message));
      return res.status(404).json({ error: 'Lot not found' });
    }
    
    const lot = lotResult.rows[0];
    const totalCost = lot.total_cost;
    const lotName = lot.name;

    // Calculate total card count (sum of all quantities)
    const totalCardCount = cards.reduce((sum, card) => sum + (card.quantity || 1), 0);
    const perCardCost = (totalCost > 0 && totalCardCount > 0) ? (totalCost / totalCardCount) : null;
    
    // Update the lot with final card count and per-card cost
    await client.query(
      `UPDATE purchase_lots 
       SET card_count = $1, per_card_cost = $2
       WHERE id = $3`,
      [totalCardCount, perCardCost, lotId]
    );
    
    const insertedCards = [];
    
    // Insert each card into inventory with lot reference
    for (const card of cards) {
      // Validate individual card name
      if (!card.name || typeof card.name !== 'string' || card.name.trim().length === 0) {
        await client.query('ROLLBACK').catch(err => console.error('[LOTS] Rollback failed:', err.message));
        return res.status(400).json({ error: 'Each card must have a valid name' });
      }
      
      // Validate quantity if provided
      if (card.quantity !== undefined && card.quantity !== null && (typeof card.quantity !== 'number' || card.quantity <= 0 || !Number.isInteger(card.quantity))) {
        await client.query('ROLLBACK').catch(err => console.error('[LOTS] Rollback failed:', err.message));
        return res.status(400).json({ error: 'Card quantity must be a positive integer when provided' });
      }
      
      // Validate quality if provided
      const validQualities = ['NM', 'LP', 'MP', 'HP', 'DMG'];
      if (card.quality !== undefined && card.quality !== null && !validQualities.includes(card.quality)) {
        await client.query('ROLLBACK').catch(err => console.error('[LOTS] Rollback failed:', err.message));
        return res.status(400).json({ error: `Quality must be one of: ${validQualities.join(', ')}` });
      }
      
      // Validate foil if provided
      if (card.foil !== undefined && card.foil !== null && typeof card.foil !== 'boolean') {
        await client.query('ROLLBACK').catch(err => console.error('[LOTS] Rollback failed:', err.message));
        return res.status(400).json({ error: 'Foil must be a boolean' });
      }
      
      // Try to fetch Scryfall ID
      let scryfallId = null;
      try {
        let scryfallRes = null;
        
        if (card.set && card.set.length > 0) {
          const exactUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&set=${card.set.toLowerCase()}`;
          scryfallRes = await fetchRetry(exactUrl);
          if (!scryfallRes?.ok) scryfallRes = null;
        }
        
        if (!scryfallRes) {
          const fuzzyUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(card.name)}`;
          scryfallRes = await fetchRetry(fuzzyUrl);
        }
        
        if (scryfallRes?.ok) {
          const cardData = await scryfallRes.json();
          scryfallId = cardData.id || null;
        }
      } catch (err) {
        // Continue without Scryfall ID
      }

      const result = await client.query(
        `INSERT INTO inventory (name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, scryfall_id, folder, foil, quality, lot_id, lot_name, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         RETURNING *`,
        [
          card.name,
          card.set || null,
          card.set_name || null,
          card.quantity || 1,
          perCardCost, // Use calculated per-card cost
          'normal',
          card.image_url || null,
          scryfallId,
          card.folder || 'Uncategorized',
          card.foil || false,
          card.quality || 'NM',
          lotId,
          lotName || null
        ]
      );
      
      insertedCards.push(result.rows[0]);
      
      // Record PURCHASE transaction for analytics
      if (perCardCost && (card.quantity || 1) > 0) {
        await client.query(
          `INSERT INTO inventory_transactions (card_name, transaction_type, quantity, purchase_price, transaction_date)
           VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
          [card.name, 'PURCHASE', card.quantity || 1, perCardCost]
        );
      }
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      lot_id: lotId,
      lot_name: lotName,
      total_cost: totalCost,
      card_count: totalCardCount,
      per_card_cost: perCardCost,
      cards: insertedCards
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(rollbackError => {
      console.error('[LOTS] ROLLBACK failed:', rollbackError.message);
    });
    console.error('[LOTS] Error adding cards to lot:', error.message);
    res.status(500).json({ error: 'Failed to add cards to lot' });
  } finally {
    client.release();
  }
});

// GET /api/lots/:id - Get a specific lot with its cards
router.get('/api/lots/:id', validateId, async (req, res) => {
  const lotId = req.validatedId;

  try {
    const lotResult = await pool.query(
      `SELECT * FROM purchase_lots WHERE id = $1`,
      [lotId]
    );
    
    if (lotResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lot not found' });
    }
    
    const cardsResult = await pool.query(
      `SELECT * FROM inventory WHERE lot_id = $1 ORDER BY name ASC`,
      [lotId]
    );
    
    res.json({
      ...lotResult.rows[0],
      cards: cardsResult.rows
    });
  } catch (error) {
    console.error('[LOTS] Error fetching lot:', error.message);
    res.status(500).json({ error: 'Failed to fetch lot' });
  }
});

export default router;
