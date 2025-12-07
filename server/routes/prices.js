import express from 'express';
import { priceLimiter } from '../middleware/index.js';
import { getCachedPrice, setCachedPrice, fetchRetry } from '../utils/index.js';
import { mtgjsonService } from '../mtgjsonPriceService.js';

const router = express.Router();

// ========== PRICES ENDPOINT ==========
router.get('/prices/:cardName/:setCode', priceLimiter, async (req, res) => {
  const { cardName, setCode } = req.params;
  const cacheKey = `${cardName.toLowerCase()}_${(setCode || '').toLowerCase()}`;
  
  // Check cache first
  const cachedResult = getCachedPrice(cacheKey);
  if (cachedResult) {
    return res.status(200).json(cachedResult);
  }
  
  try {
    let tcgPrice = 'N/A';
    let ckPrice = 'N/A';
    let scryfallRes = null;
    let cardData = null;
    
    if (setCode && setCode.length > 0) {
      const exactUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${setCode.toLowerCase()}`;
      scryfallRes = await fetchRetry(exactUrl);
      
      if (!scryfallRes?.ok) {
        scryfallRes = null;
      }
    }
    
    if (!scryfallRes) {
      const fuzzyUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
      scryfallRes = await fetchRetry(fuzzyUrl);
    }
    
    if (scryfallRes?.ok) {
      try {
        cardData = await scryfallRes.json();
        const price = parseFloat(cardData.prices?.usd);
        if (price > 0) {
          tcgPrice = `$${price.toFixed(2)}`;
        }
      } catch (parseErr) {
        console.error(`[PRICES] Failed to parse Scryfall response:`, parseErr.message);
      }
    }
    
    // Get Card Kingdom price from MTGJSON using the card's Scryfall ID
    // Only attempt CK lookup if MTGJSON service is ready
    const mtgjsonReady = mtgjsonService.isReady();
    
    if (cardData && mtgjsonReady) {
      try {
        // Scryfall returns the card's unique ID which we can use to look up MTGJSON prices
        const scryfallId = cardData.id;
        if (scryfallId) {
          const ckPriceResult = mtgjsonService.getCardKingdomPriceByScryfallId(scryfallId);
          if (ckPriceResult) {
            ckPrice = ckPriceResult;
          }
        }
      } catch (err) {
        console.error(`[PRICES] Failed to get CK price from MTGJSON:`, err.message);
      }
    }
    
    const result = { tcg: tcgPrice, ck: ckPrice };
    
    // Only cache if MTGJSON was ready
    // This prevents caching incomplete data when service is still initializing
    if (mtgjsonReady) {
      setCachedPrice(cacheKey, result);
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ tcg: 'N/A', ck: 'N/A' });
  }
});

export default router;
