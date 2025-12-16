import express from 'express';
import { mtgjsonService } from '../mtgjsonPriceService.js';

const router = express.Router();

// Read-only diagnostics for MTGJSON service
router.get('/mtgjson-status', (req, res) => {
  try {
    const status = {
      ready: !!mtgjsonService.isReady?.(),
      lastFetchTime: mtgjsonService.lastFetchTime || null,
      priceCount: mtgjsonService.priceData ? mtgjsonService.priceData.size : 0,
      scryfallMappings: mtgjsonService.scryfallToMtgjsonMap ? mtgjsonService.scryfallToMtgjsonMap.size : 0,
      cacheFilePath: typeof mtgjsonService.CACHE_FILE !== 'undefined' ? mtgjsonService.CACHE_FILE : null
    };
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: 'failed to read mtgjson service status', message: err?.message });
  }
});

export default router;
