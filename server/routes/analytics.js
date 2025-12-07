import express from 'express';
import { pool } from '../db/pool.js';
import { mtgjsonService } from '../mtgjsonPriceService.js';
import { authenticate } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/index.js';

const router = express.Router();

// Apply rate limiting to prevent abuse
router.use(apiLimiter);

// ========== ANALYTICS ENDPOINTS ==========
router.get('/analytics/market-values', authenticate, async (req, res) => {
  const userId = req.userId;
  try {
    const result = await pool.query('SELECT scryfall_id, quantity FROM inventory WHERE scryfall_id IS NOT NULL AND user_id = $1', [userId]);
    const items = result.rows || [];
    
    let cardkingdomTotal = 0;
    let tcgplayerTotal = 0;
    
    if (items.length === 0) {
      console.log('[ANALYTICS] No inventory items with Scryfall IDs found for market valuation');
      return res.json({ cardkingdom: 0, tcgplayer: 0 });
    }
    
    for (const item of items) {
      const prices = mtgjsonService.getPricesByScryfallId(item.scryfall_id);
      if (prices && prices.cardkingdom) cardkingdomTotal += prices.cardkingdom * (item.quantity || 0);
      if (prices && prices.tcgplayer) tcgplayerTotal += prices.tcgplayer * (item.quantity || 0);
    }
    
    console.log(`[ANALYTICS] Market values calculated: CK=$${cardkingdomTotal.toFixed(2)}, TCG=$${tcgplayerTotal.toFixed(2)} from ${items.length} items`);
    res.json({ cardkingdom: cardkingdomTotal, tcgplayer: tcgplayerTotal });
  } catch (error) {
    console.error('[ANALYTICS] Error calculating market values:', error.message);
    res.json({ cardkingdom: 0, tcgplayer: 0 });
  }
});

router.get('/analytics/card-metrics', authenticate, async (req, res) => {
  const userId = req.userId;
  try {
    // Current inventory (total cards and unique cards)
    const totalResult = await pool.query('SELECT COUNT(DISTINCT LOWER(TRIM(name))) as unique_count, SUM(quantity) as total_count FROM inventory WHERE user_id = $1', [userId]);
    const totalRow = totalResult.rows[0];
    const totalCards = parseInt(totalRow.total_count) || 0;
    const uniqueCards = parseInt(totalRow.unique_count) || 0;
    
    // Available cards (total - reserved)
    const availableResult = await pool.query(`
      SELECT COALESCE(SUM(
        COALESCE(i.quantity, 0) - COALESCE((
          SELECT SUM(dr.quantity_reserved)
          FROM deck_reservations dr
          WHERE dr.inventory_item_id = i.id
        ), 0)
      ), 0) as available_count
      FROM inventory i
      WHERE i.user_id = $1
    `, [userId]);
    const totalAvailable = parseInt(availableResult.rows[0].available_count) || 0;
    
    // Sold in last 60 days (from transaction history)
    const soldResult = await pool.query(
      'SELECT SUM(quantity) as count FROM inventory_transactions WHERE transaction_type = $1 AND transaction_date >= CURRENT_DATE - INTERVAL \'60 days\' AND user_id = $2',
      ['SALE', userId]
    );
    const totalSoldLast60d = parseInt(soldResult.rows[0].count) || 0;
    
    // Purchased in last 60 days = current inventory + sold in period (since current reflects post-sale)
    const purchasedLast60d = totalCards + totalSoldLast60d;
    
    // Lifetime totals = sum all SALE transactions
    const lifetimeSoldResult = await pool.query(
      'SELECT SUM(quantity) as count FROM inventory_transactions WHERE transaction_type = $1 AND user_id = $2',
      ['SALE', userId]
    );
    const lifetimeTotalCards = parseInt(lifetimeSoldResult.rows[0].count) || 0;
    
    // Lifetime value = sum all PURCHASE transaction values (correct equation)
    const lifetimePurchaseValueResult = await pool.query(
      'SELECT COALESCE(SUM(quantity * purchase_price), 0) as value FROM inventory_transactions WHERE transaction_type = $1 AND user_id = $2',
      ['PURCHASE', userId]
    );
    const lifetimeTotalValue = parseFloat(lifetimePurchaseValueResult.rows[0].value) || 0;
    
    res.json({
      totalCards,
      totalAvailable,
      uniqueCards,
      totalSoldLast60d,
      totalPurchasedLast60d: purchasedLast60d,
      lifetimeTotalCards,
      lifetimeTotalValue
    });
  } catch (error) {
    console.error('[ANALYTICS] Error calculating card metrics:', error.message);
    res.json({
      totalCards: 0,
      totalAvailable: 0,
      uniqueCards: 0,
      totalSoldLast60d: 0,
      totalPurchasedLast60d: 0,
      lifetimeTotalCards: 0,
      lifetimeTotalValue: 0
    });
  }
});

export default router;
