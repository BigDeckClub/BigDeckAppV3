import express from 'express';
import { mtgjsonService } from '../mtgjsonPriceService.js';
import { pool } from '../db/pool.js';

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

// Database connectivity check - exposes error details (use carefully)
router.get('/db-check', async (req, res) => {
  try {
    const start = Date.now();
    const result = await pool.query('SELECT NOW() as now, current_database() as db_name, inet_server_addr() as server_ip');
    const duration = Date.now() - start;

    res.json({
      status: 'connected',
      timestamp: result.rows[0].now,
      database: result.rows[0].db_name,
      server_ip: result.rows[0].server_ip,
      latency_ms: duration,
      pool_total: pool.totalCount,
      pool_idle: pool.idleCount,
      pool_waiting: pool.waitingCount
    });
  } catch (err) {
    console.error('[DIAGNOSTICS] DB Check Failed:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      hint: 'Check DATABASE_URL, network restrictions, and SSL settings'
    });
  }
});

export default router;
