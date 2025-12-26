import express from 'express';
import { pool } from '../db/pool.js';
import { mtgjsonService } from '../mtgjsonPriceService.js';
import { authenticate } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/index.js';

const router = express.Router();

console.log('[ANALYTICS] Router module loaded');

// Apply rate limiting to prevent abuse
router.use(apiLimiter);

// ========== ANALYTICS ENDPOINTS ==========
router.get('/analytics/market-values', authenticate, async (req, res) => {
  console.log('[ANALYTICS] GET /analytics/market-values hit');
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

    res.json({
      totalCards,
      totalAvailable,
      uniqueCards
    });
  } catch (error) {
    console.error('[ANALYTICS] Error calculating card metrics:', error.message);
    res.json({
      totalCards: 0,
      totalAvailable: 0,
      uniqueCards: 0
    });
  }
});

router.get('/analytics/top-cards', authenticate, async (req, res) => {
  console.log('[ANALYTICS] GET /analytics/top-cards hit');
  const userId = req.userId;
  try {
    const result = await pool.query('SELECT id, name, quantity, scryfall_id, purchase_price, image_url, folder FROM inventory WHERE user_id = $1', [userId]);
    const items = result.rows || [];

    const pricedItems = items.map(item => {
      let unitPrice = 0;
      let priceSource = 'purchase';

      if (item.scryfall_id) {
        const prices = mtgjsonService.getPricesByScryfallId(item.scryfall_id);
        // Prefer TCGPlayer, then CardKingdom, then purchase_price
        if (prices && prices.tcgplayer) {
          unitPrice = prices.tcgplayer;
          priceSource = 'tcgplayer';
        } else if (prices && prices.cardkingdom) {
          unitPrice = prices.cardkingdom;
          priceSource = 'cardkingdom';
        } else {
          unitPrice = parseFloat(item.purchase_price) || 0;
        }
      } else {
        unitPrice = parseFloat(item.purchase_price) || 0;
      }

      return {
        ...item,
        unitPrice,
        totalValue: unitPrice * (item.quantity || 0),
        priceSource
      };
    });

    // Sort by total value descending
    const topCards = pricedItems
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
      .map(card => ({
        id: card.id, // Wait, I didn't select ID. I should select ID.
        name: card.name,
        quantity: card.quantity,
        value: card.totalValue,
        unitPrice: card.unitPrice,
        priceSource: card.priceSource
      }));

    res.json(topCards);
  } catch (error) {
    console.error('[ANALYTICS] Error fetching top cards:', error.message);
    res.status(500).json({ error: 'Failed to fetch top cards' });
  }
});

export default router;
