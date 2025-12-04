import express from 'express';
import { pool } from '../db/pool.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Server start time for uptime calculation
const serverStartTime = Date.now();

// Supabase admin client for user lookup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

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

// Debug endpoint to check inventory user_id distribution (temporary)
router.get('/debug/inventory-users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        user_id,
        COUNT(*) as card_count,
        SUM(quantity) as total_quantity
      FROM inventory 
      GROUP BY user_id 
      ORDER BY card_count DESC
    `);
    
    const usersResult = await pool.query(`SELECT id, email FROM users`);
    
    res.json({
      inventory_by_user: result.rows,
      users: usersResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Migrate orphaned data to a specific user by email
router.post('/debug/migrate-to-user', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  
  try {
    // Look up user in Supabase
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      return res.status(500).json({ error: 'Failed to list users: ' + listError.message });
    }
    
    const targetUser = users.find(u => u.email === email);
    
    if (!targetUser) {
      return res.status(404).json({ 
        error: `User ${email} not found in Supabase`,
        available_users: users.map(u => u.email)
      });
    }
    
    const userId = targetUser.id;
    
    // Ensure user exists in our users table
    await pool.query(`
      INSERT INTO users (id, email) 
      VALUES ($1, $2) 
      ON CONFLICT (id) DO UPDATE SET email = $2
    `, [userId, email]);
    
    const migrated = {};
    
    // Migrate inventory items with NULL user_id
    try {
      const inventoryResult = await pool.query(`
        UPDATE inventory SET user_id = $1 WHERE user_id IS NULL
      `, [userId]);
      migrated.inventory = inventoryResult.rowCount;
    } catch (e) { migrated.inventory = 'table not found'; }
    
    // Migrate decks with NULL user_id
    try {
      const decksResult = await pool.query(`
        UPDATE decks SET user_id = $1 WHERE user_id IS NULL
      `, [userId]);
      migrated.decks = decksResult.rowCount;
    } catch (e) { migrated.decks = 'table not found'; }
    
    // Migrate decklists with NULL user_id
    try {
      const decklistsResult = await pool.query(`
        UPDATE decklists SET user_id = $1 WHERE user_id IS NULL
      `, [userId]);
      migrated.decklists = decklistsResult.rowCount;
    } catch (e) { migrated.decklists = 'table not found'; }
    
    // Migrate folders with NULL user_id
    try {
      const foldersResult = await pool.query(`
        UPDATE folders SET user_id = $1 WHERE user_id IS NULL
      `, [userId]);
      migrated.folders = foldersResult.rowCount;
    } catch (e) { migrated.folders = 'table not found'; }
    
    // Migrate deck_instances with NULL user_id
    try {
      const deckInstancesResult = await pool.query(`
        UPDATE deck_instances SET user_id = $1 WHERE user_id IS NULL
      `, [userId]);
      migrated.deck_instances = deckInstancesResult.rowCount;
    } catch (e) { migrated.deck_instances = 'table not found'; }
    
    // Migrate containers with NULL user_id
    try {
      const containersResult = await pool.query(`
        UPDATE containers SET user_id = $1 WHERE user_id IS NULL
      `, [userId]);
      migrated.containers = containersResult.rowCount;
    } catch (e) { migrated.containers = 'table not found'; }
    
    res.json({
      success: true,
      user_id: userId,
      email: email,
      migrated
    });
  } catch (err) {
    console.error('[MIGRATE] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
