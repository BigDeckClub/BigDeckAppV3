import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { pool } from '../db/pool.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Simple admin guard using ADMIN_EMAILS env var (comma-separated)
function requireAdmin(req, res, next) {
  const adminEnv = process.env.ADMIN_EMAILS;
  if (!adminEnv) {
    // No admin list configured — allow but warn (DEV only)
    console.warn('[AUTH] ADMIN_EMAILS not configured; POST /api/community-themes is unprotected');
    return next();
  }

  const allowed = adminEnv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const userEmail = (req.user && req.user.email) ? String(req.user.email).toLowerCase() : null;
  if (!userEmail || !allowed.includes(userEmail)) {
    return res.status(403).json({ error: 'admin privileges required' });
  }
  return next();
}

// GET /api/community-themes/:communityId
router.get('/:communityId', asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  try {
    const q = 'SELECT data FROM community_themes WHERE community_id = $1 LIMIT 1';
    const result = await pool.query(q, [communityId]);
    if (result && result.rows && result.rows.length) {
      return res.json({ theme: result.rows[0].data });
    }
    return res.json({ theme: null });
  } catch (err) {
    console.error('[DB] communityThemes GET error', err);
    res.status(500).json({ error: 'server error' });
  }
}));

// POST /api/community-themes/:communityId (admin-only)
// Body: { theme: { name, vars: { '--var': value }, bannerUrl } }
router.post('/:communityId', optionalAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const payload = req.body;
  if (!payload || !payload.theme || typeof payload.theme !== 'object') {
    return res.status(400).json({ error: 'invalid payload' });
  }

  try {
    const upsert = `INSERT INTO community_themes (community_id, data) VALUES ($1, $2)
      ON CONFLICT (community_id) DO UPDATE SET data = $2, updated_at = now() RETURNING data`;
    const result = await pool.query(upsert, [communityId, payload.theme]);
    return res.json({ ok: true, theme: result.rows[0].data });
  } catch (err) {
    console.error('[DB] communityThemes POST error', err);
    res.status(500).json({ error: 'server error' });
  }
}));

export default router;
