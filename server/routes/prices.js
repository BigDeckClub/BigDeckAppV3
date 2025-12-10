import express from 'express';
import { priceLimiter } from '../middleware/index.js';
import { fetchRetry } from '../utils/index.js';
import { priceResolver } from '../utils/priceResolver.js';

const router = express.Router();

// ========== PRICES ENDPOINT ==========
router.get('/prices/:cardName/:setCode', priceLimiter, async (req, res) => {
  const { cardName, setCode } = req.params;
  try {
    const prices = await priceResolver.getCardPrices({ name: cardName, set: setCode });
    // Normalize to expected response shape: use 'N/A' where null
    const result = { tcg: prices.tcg ?? 'N/A', ck: prices.ck ?? 'N/A' };
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(result);
  } catch (err) {
    console.error('[PRICES] resolver error:', err?.message || err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ tcg: 'N/A', ck: 'N/A' });
  }
});

export default router;
