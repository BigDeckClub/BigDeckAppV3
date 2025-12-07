import express from 'express';
import { pool } from '../db/pool.js';
import { apiLimiter } from '../middleware/index.js';

const router = express.Router();

// Apply rate limiting to prevent abuse
router.use(apiLimiter);

// ========== SETTINGS ENDPOINTS ==========
// GET /api/settings/:key - Retrieve a setting
router.get('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    try {
      res.json(JSON.parse(result.rows[0].value));
    } catch (parseErr) {
      res.json(result.rows[0].value);
    }
  } catch (error) {
    console.error('[SETTINGS] Error fetching setting:', error.message);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// POST /api/settings/:key - Store a setting
router.post('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, JSON.stringify(value)]
    );
    
    console.log('[SETTINGS] Setting saved:', key);
    res.json({ success: true });
  } catch (error) {
    console.error('[SETTINGS] Error saving setting:', error.message);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

export default router;
