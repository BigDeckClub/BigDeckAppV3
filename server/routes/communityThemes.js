import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
const router = express.Router();

// GET /api/community-themes/:communityId
router.get('/:communityId', asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  try {
    // TODO: Replace with DB fetch logic (use server/db pool or ORM)
    // Example placeholder response: null theme to indicate defaults should be used
    return res.json({ theme: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}));

// POST /api/community-themes/:communityId (admin-only)
// Body: { theme: { name, vars: { '--var': value }, bannerUrl } }
router.post('/:communityId', /* TODO: requireAdmin middleware */ asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const payload = req.body;
  // Minimal validation
  if (!payload || !payload.theme || typeof payload.theme !== 'object') {
    return res.status(400).json({ error: 'invalid payload' });
  }

  try {
    // TODO: Upsert theme into DB (community_themes table)
    // For now echo back payload as if saved
    return res.json({ ok: true, theme: payload.theme });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
}));

export default router;
