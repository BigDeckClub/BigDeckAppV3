import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

// ========== SALES ENDPOINTS ==========

// POST /api/sales - Record a sale for folder or deck
router.post('/api/sales', async (req, res) => {
  const { itemType, itemId, itemName, purchasePrice, sellPrice, quantity } = req.body;
  
  try {
    if (!itemType || !itemName || sellPrice === undefined || purchasePrice === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const profit = (sellPrice - purchasePrice) * (quantity || 1);
    
    const result = await pool.query(
      `INSERT INTO sales_history (item_type, item_id, item_name, purchase_price, sell_price, profit, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [itemType, itemId || null, itemName, purchasePrice, sellPrice, profit, quantity || 1]
    );
    
    // Log transaction to inventory_transactions
    await pool.query(
      `INSERT INTO inventory_transactions (card_name, transaction_type, quantity, purchase_price, sale_price, transaction_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
      [itemName, 'SALE', quantity || 1, purchasePrice, sellPrice]
    );

    // If selling a deck, reduce the reserved inventory items and the deck
    if (itemType === 'deck' && itemId) {
      // Get all reserved inventory items for this deck with quantities
      const reservationsResult = await pool.query(
        `SELECT inventory_item_id, quantity_reserved FROM deck_reservations WHERE deck_id = $1`,
        [itemId]
      );
      
      // Update inventory quantities by subtracting reserved amounts
      if (reservationsResult.rows.length > 0) {
        for (const reservation of reservationsResult.rows) {
          await pool.query(
            `UPDATE inventory SET quantity = quantity - $1 WHERE id = $2`,
            [reservation.quantity_reserved, reservation.inventory_item_id]
          );
        }
      }
      
      // Delete the deck and its reservations
      await pool.query(`DELETE FROM deck_missing_cards WHERE deck_id = $1`, [itemId]);
      await pool.query(`DELETE FROM deck_reservations WHERE deck_id = $1`, [itemId]);
      await pool.query(`DELETE FROM decks WHERE id = $1 AND is_deck_instance = TRUE`, [itemId]);
    }

    res.json({ success: true, sale: result.rows[0] });
  } catch (error) {
    console.error('[SALES] Error recording sale:', error.message);
    res.status(500).json({ error: 'Failed to record sale' });
  }
});

// GET /api/sales - Fetch all sales history
router.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM sales_history 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[SALES] Error fetching sales:', error.message);
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

// GET /api/transactions - Fetch sales transactions (for threshold calculations)
router.get('/api/transactions', async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = 'SELECT * FROM inventory_transactions';
    let params = [];
    
    if (type) {
      query += ' WHERE transaction_type = $1';
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
