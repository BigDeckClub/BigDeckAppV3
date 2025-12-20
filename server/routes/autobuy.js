import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import path from 'path';
import { pathToFileURL } from 'url';
import { z } from 'zod';
import inputSchema from '../autobuy/validation.js';

const router = express.Router();

// Lightweight per-route body parser with size limit to avoid huge uploads
router.use('/autobuy/plan', express.json({ limit: '200kb' }));

// Validation schemas
const demandSchema = z.object({ cardId: z.string(), quantity: z.number().int().nonnegative(), maxPrice: z.number().nonnegative().optional() });
const directiveSchema = z.object({ cardId: z.string(), mode: z.enum(['FORCE', 'PREFER', 'SHIP_ONLY']), quantity: z.number().int().positive().optional() });
const offerSchema = z.object({ cardId: z.string(), sellerId: z.string(), price: z.number().nonnegative(), quantityAvailable: z.number().int().nonnegative(), marketplace: z.string().optional(), shipping: z.object({ base: z.number().nonnegative().optional(), freeAt: z.number().nonnegative().optional() }).optional() });
const hotSchema = z.object({ cardId: z.string(), IPS: z.number().optional(), targetInventory: z.number().optional() });

// imported strict inputSchema from server/autobuy/validation.js

router.post('/autobuy/plan', asyncHandler(async (req, res) => {
  const input = req.body || {};
  const parse = inputSchema.safeParse(input);
  if (!parse.success) {
    return res.status(400).json({ error: 'invalid input', details: parse.error.format() });
  }

  const p = path.join(process.cwd(), 'dist', 'server', 'autobuy', 'optimizer.js');
  try {
    const mod = await import(pathToFileURL(p).href);
    const optimizer = mod.runFullPipeline ? mod : (mod.default || mod);
    if (!optimizer || !optimizer.runFullPipeline) {
      return res.status(500).json({ error: 'optimizer unavailable' });
    }
    const ckPrices = new Map(Object.entries(input.cardKingdomPrices || {}));
    const currentInventory = new Map(Object.entries(input.currentInventory || {}));
    const plan = optimizer.runFullPipeline({
      demands: input.demands || [],
      directives: input.directives || [],
      offers: input.offers || [],
      hotList: input.hotList || [],
      cardKingdomPrices: ckPrices,
      currentInventory,
    });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
}));

// Serve sample input to UI safely
router.get('/autobuy/sample', asyncHandler(async (req, res) => {
  const samplePath = path.join(process.cwd(), 'server', 'autobuy', 'examples', 'sample-input.json');
  try {
    const raw = await fs.promises.readFile(samplePath, 'utf8');
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'failed to load sample input' });
  }
}));

export default router;
