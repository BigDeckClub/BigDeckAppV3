import express from 'express';
import { pool } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ========== SALES ENDPOINTS ==========

// POST /api/sales - Record a sale for folder or deck
router.post('/api/sales', authenticate, async (req, res) => {
  const userId = req.userId;
  const { itemType, itemId, itemName, purchasePrice, sellPrice, quantity } = req.body;
  
  // Validate required fields
  if (!itemType || !itemName || sellPrice === undefined || purchasePrice === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Validate numeric fields
  const parsedSellPrice = Number(sellPrice);
  const parsedPurchasePrice = Number(purchasePrice);
  const parsedQuantity = quantity !== undefined ? Number(quantity) : 1;
  
  if (
    isNaN(parsedSellPrice) || parsedSellPrice < 0 ||
    isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0 ||
    isNaN(parsedQuantity) || parsedQuantity <= 0 || !Number.isInteger(parsedQuantity)
  ) {
    return res.status(400).json({ error: 'Invalid numeric values: sellPrice, purchasePrice must be non-negative numbers; quantity must be a positive integer.' });
  }
  
  // Use a transaction to ensure database consistency
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const profit = (parsedSellPrice - parsedPurchasePrice) * parsedQuantity;
    
    const result = await client.query(
      `INSERT INTO sales_history (item_type, item_id, item_name, purchase_price, sell_price, profit, quantity, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [itemType, itemId || null, itemName, parsedPurchasePrice, parsedSellPrice, profit, parsedQuantity, userId]
    );
    
    // Log transaction to inventory_transactions
    await client.query(
      `INSERT INTO inventory_transactions (card_name, transaction_type, quantity, purchase_price, sale_price, transaction_date, user_id)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6)`,
      [itemName, 'SALE', parsedQuantity, parsedPurchasePrice, parsedSellPrice, userId]
    );

    // If selling a deck, reduce the reserved inventory items and the deck
    if (itemType === 'deck' && itemId) {
      // Get all reserved inventory items for this deck with quantities (only if deck belongs to user)
      const reservationsResult = await client.query(
        `SELECT dr.inventory_item_id, dr.quantity_reserved 
         FROM deck_reservations dr
         JOIN decks d ON d.id = dr.deck_id
         WHERE dr.deck_id = $1 AND d.user_id = $2`,
        [itemId, userId]
      );
      
      // Update inventory quantities by subtracting reserved amounts
      if (reservationsResult.rows.length > 0) {
        for (const reservation of reservationsResult.rows) {
          await client.query(
            `UPDATE inventory SET quantity = quantity - $1 WHERE id = $2`,
            [reservation.quantity_reserved, reservation.inventory_item_id]
          );
        }
      }
      
      // Delete the deck and its reservations
      await client.query(`DELETE FROM deck_missing_cards WHERE deck_id = $1`, [itemId]);
      await client.query(`DELETE FROM deck_reservations WHERE deck_id = $1`, [itemId]);
      await client.query(`DELETE FROM decks WHERE id = $1 AND is_deck_instance = TRUE AND user_id = $2`, [itemId, userId]);
    }

    await client.query('COMMIT');
    res.json({ success: true, sale: result.rows[0] });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[SALES] Error during rollback:', rollbackError.message);
    }
    console.error('[SALES] Error recording sale:', error.message);
    res.status(500).json({ error: 'Failed to record sale' });
  } finally {
    client.release();
  }
});

// GET /api/sales - Fetch all sales history
router.get('/api/sales', authenticate, async (req, res) => {
  const userId = req.userId;
  try {
    const result = await pool.query(`
      SELECT * FROM sales_history 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('[SALES] Error fetching sales:', error.message);
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

// GET /api/transactions - Fetch sales transactions (for threshold calculations)
router.get('/api/transactions', authenticate, async (req, res) => {
  const userId = req.userId;
  try {
    const { type } = req.query;
    
    let query = 'SELECT * FROM inventory_transactions WHERE user_id = $1';
    let params = [userId];
    
    if (type) {
      query += ' AND transaction_type = $2';
      params.push(type.toUpperCase());
    }
    
    query += ' ORDER BY transaction_date DESC';
    
    const transactions = await pool.query(query, params);
    res.json(transactions.rows);
  } catch (error) {
    console.error('[TRANSACTIONS] Error fetching transactions:', error.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
