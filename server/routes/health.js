import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

// Server start time for uptime calculation
const serverStartTime = Date.now();

// ========== HEALTH CHECK ==========
router.get('/health', async (req, res) => {
  let dbStatus;
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }
  
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const response = {
    ok: dbStatus === 'connected',
    database: dbStatus,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString()
  };
  
  res.status(response.ok ? 200 : 500).json(response);
});

export default router;
