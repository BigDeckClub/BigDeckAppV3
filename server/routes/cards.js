import express from 'express';
import { mtgjsonService } from '../mtgjsonPriceService.js';
import { apiLimiter } from '../middleware/index.js';

const router = express.Router();

/**
 * GET /api/cards/metadata
 * Bulk look up card metadata by names
 * Query param: names (comma separated)
 */
router.get('/cards/metadata', apiLimiter, async (req, res) => {
    const { names } = req.query;

    if (!names) {
        return res.status(400).json({ error: 'Missing names query parameter' });
    }

    try {
        const nameList = names.split(',').map(n => n.trim());
        const metadata = mtgjsonService.getCardsDataByNames(nameList);

        return res.status(200).json(metadata);
    } catch (err) {
        console.error('[CARDS] Metadata error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch card metadata' });
    }
});

/**
 * GET /api/cards/metadata/:name
 * Single card metadata lookup
 */
router.get('/cards/metadata/:name', apiLimiter, async (req, res) => {
    const { name } = req.params;

    try {
        const data = mtgjsonService.getCardDataByName(name);
        if (!data) {
            return res.status(404).json({ error: 'Card not found' });
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error('[CARDS] Metadata single error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch card metadata' });
    }
});

export default router;
