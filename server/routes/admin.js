import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { runBackfill } from '../jobs/backfillScryfall.js';

const router = express.Router();

function isAdmin(userId) {
  const env = process.env.ADMIN_USER_IDS || '';
  if (!env) return false;
  const ids = env.split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(userId);
}

// POST /api/admin/backfill-scryfall
router.post('/admin/backfill-scryfall', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!isAdmin(userId)) {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }

    const { limit = 200, dryRun = false, background = true } = req.body || {};

    if (background) {
      // Run job in background and return 202
      setImmediate(async () => {
        try {
          console.log('[ADMIN] Starting background backfill (triggered by user', userId, ')');
          const stats = await runBackfill({ limit: Number(limit) || 200, dryRun: Boolean(dryRun) });
          console.log('[ADMIN] Background backfill complete:', stats);
        } catch (err) {
          console.error('[ADMIN] Background backfill error:', err?.message || err);
        }
      });

      return res.status(202).json({ success: true, message: 'Backfill job started in background' });
    }

    // Run synchronously and return stats
    const stats = await runBackfill({ limit: Number(limit) || 200, dryRun: Boolean(dryRun) });
    return res.json({ success: true, stats });
  } catch (error) {
    console.error('[ADMIN] backfill endpoint error:', error?.message || error);
    res.status(500).json({ error: 'Failed to trigger backfill' });
  }
});

export default router;
