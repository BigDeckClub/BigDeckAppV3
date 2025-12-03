import express from 'express';
import { pool } from '../db/pool.js';

const router = express.Router();

// ========== CHANGE HISTORY ENDPOINTS ==========

// GET /api/history/changes - Fetch change history with filtering
router.get('/api/history/changes', async (req, res) => {
  try {
    const { field_changed, start_date, end_date, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT ch.*, i.folder, i.image_url
      FROM change_history ch
      LEFT JOIN inventory i ON ch.card_id = i.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;
    
    if (field_changed && field_changed !== 'all') {
      query += ` AND ch.field_changed = $${paramCount++}`;
      values.push(field_changed);
    }
    
    if (start_date) {
      query += ` AND ch.changed_at >= $${paramCount++}`;
      values.push(start_date);
    }
    
    if (end_date) {
      query += ` AND ch.changed_at <= $${paramCount++}`;
      values.push(end_date);
    }
    
    query += ` ORDER BY ch.changed_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM change_history ch WHERE 1=1`;
    const countValues = [];
    let countParamCount = 1;
    
    if (field_changed && field_changed !== 'all') {
      countQuery += ` AND ch.field_changed = $${countParamCount++}`;
      countValues.push(field_changed);
    }
    if (start_date) {
      countQuery += ` AND ch.changed_at >= $${countParamCount++}`;
      countValues.push(start_date);
    }
    if (end_date) {
      countQuery += ` AND ch.changed_at <= $${countParamCount++}`;
      countValues.push(end_date);
    }
    
    const countResult = await pool.query(countQuery, countValues);
    
    res.json({
      changes: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[HISTORY] Error fetching change history:', error.message);
    res.status(500).json({ error: 'Failed to fetch change history' });
  }
});

// POST /api/history/changes - Record a change (internal use)
router.post('/api/history/changes', async (req, res) => {
  const { card_id, card_name, field_changed, old_value, new_value, user_id } = req.body;
  
  if (!card_name || !field_changed) {
    return res.status(400).json({ error: 'Card name and field changed are required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO change_history (card_id, card_name, field_changed, old_value, new_value, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [card_id || null, card_name, field_changed, old_value?.toString() ?? null, new_value?.toString() ?? null, user_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[HISTORY] Error recording change:', error.message);
    res.status(500).json({ error: 'Failed to record change' });
  }
});

// ========== AUDIT LOG ENDPOINTS ==========

// GET /api/history/audit - Fetch audit log with filtering
router.get('/api/history/audit', async (req, res) => {
  try {
    const { action_type, start_date, end_date, limit = 100, offset = 0 } = req.query;
    
    let query = `SELECT * FROM audit_log WHERE 1=1`;
    const values = [];
    let paramCount = 1;
    
    if (action_type && action_type !== 'all') {
      query += ` AND action_type = $${paramCount++}`;
      values.push(action_type);
    }
    
    if (start_date) {
      query += ` AND created_at >= $${paramCount++}`;
      values.push(start_date);
    }
    
    if (end_date) {
      query += ` AND created_at <= $${paramCount++}`;
      values.push(end_date);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM audit_log WHERE 1=1`;
    const countValues = [];
    let countParamCount = 1;
    
    if (action_type && action_type !== 'all') {
      countQuery += ` AND action_type = $${countParamCount++}`;
      countValues.push(action_type);
    }
    if (start_date) {
      countQuery += ` AND created_at >= $${countParamCount++}`;
      countValues.push(start_date);
    }
    if (end_date) {
      countQuery += ` AND created_at <= $${countParamCount++}`;
      countValues.push(end_date);
    }
    
    const countResult = await pool.query(countQuery, countValues);
    
    res.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[HISTORY] Error fetching audit log:', error.message);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// POST /api/history/audit - Record an audit entry
router.post('/api/history/audit', async (req, res) => {
  const { action_type, description, entity_type, entity_id, metadata, user_id } = req.body;
  
  if (!action_type) {
    return res.status(400).json({ error: 'Action type is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO audit_log (action_type, description, entity_type, entity_id, metadata, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [action_type, description || null, entity_type || null, entity_id || null, metadata ? JSON.stringify(metadata) : '{}', user_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[HISTORY] Error recording audit entry:', error.message);
    res.status(500).json({ error: 'Failed to record audit entry' });
  }
});

// ========== ACTIVITY FEED ENDPOINTS ==========

// GET /api/history/activity - Fetch activity feed
router.get('/api/history/activity', async (req, res) => {
  try {
    const { activity_type, limit = 50, offset = 0 } = req.query;
    
    let query = `SELECT * FROM activity_feed WHERE 1=1`;
    const values = [];
    let paramCount = 1;
    
    if (activity_type && activity_type !== 'all') {
      query += ` AND activity_type = $${paramCount++}`;
      values.push(activity_type);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM activity_feed WHERE 1=1`;
    const countValues = [];
    let countParamCount = 1;
    
    if (activity_type && activity_type !== 'all') {
      countQuery += ` AND activity_type = $${countParamCount++}`;
      countValues.push(activity_type);
    }
    
    const countResult = await pool.query(countQuery, countValues);
    
    res.json({
      activities: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('[HISTORY] Error fetching activity feed:', error.message);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// POST /api/history/activity - Record an activity
router.post('/api/history/activity', async (req, res) => {
  const { activity_type, title, description, entity_type, entity_id, metadata, user_id } = req.body;
  
  if (!activity_type || !title) {
    return res.status(400).json({ error: 'Activity type and title are required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO activity_feed (activity_type, title, description, entity_type, entity_id, metadata, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [activity_type, title, description || null, entity_type || null, entity_id || null, metadata ? JSON.stringify(metadata) : '{}', user_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[HISTORY] Error recording activity:', error.message);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

// ========== HELPER FUNCTIONS FOR INTERNAL USE ==========

/**
 * Record a change in the change history table
 * @param {Object} params - Change parameters
 * @param {number} [params.cardId] - The inventory item ID
 * @param {string} params.cardName - The card name
 * @param {string} params.fieldChanged - The field that was changed
 * @param {*} [params.oldValue] - The previous value
 * @param {*} [params.newValue] - The new value
 * @param {string} [params.userId] - The user ID
 */
export async function recordChange({ cardId, cardName, fieldChanged, oldValue, newValue, userId }) {
  try {
    await pool.query(
      `INSERT INTO change_history (card_id, card_name, field_changed, old_value, new_value, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cardId || null, cardName, fieldChanged, oldValue?.toString() ?? null, newValue?.toString() ?? null, userId || null]
    );
  } catch (error) {
    console.error('[HISTORY] Error recording change:', error.message);
  }
}

/**
 * Record an audit log entry
 * @param {Object} params - Audit parameters
 * @param {string} params.actionType - The type of action (e.g., 'bulk_import', 'trash_empty')
 * @param {string} [params.description] - Human-readable description
 * @param {string} [params.entityType] - The type of entity (e.g., 'inventory', 'deck')
 * @param {number} [params.entityId] - The entity ID
 * @param {Object} [params.metadata] - Additional metadata as JSON
 * @param {string} [params.userId] - The user ID
 */
export async function recordAudit({ actionType, description, entityType, entityId, metadata, userId }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (action_type, description, entity_type, entity_id, metadata, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actionType, description || null, entityType || null, entityId || null, metadata ? JSON.stringify(metadata) : '{}', userId || null]
    );
  } catch (error) {
    console.error('[HISTORY] Error recording audit entry:', error.message);
  }
}

/**
 * Record an activity in the activity feed
 * @param {Object} params - Activity parameters
 * @param {string} params.activityType - The type of activity (e.g., 'card_added', 'import_completed')
 * @param {string} params.title - Short title for the activity
 * @param {string} [params.description] - Additional description
 * @param {string} [params.entityType] - The type of entity
 * @param {number} [params.entityId] - The entity ID
 * @param {Object} [params.metadata] - Additional metadata as JSON
 * @param {string} [params.userId] - The user ID
 */
export async function recordActivity({ activityType, title, description, entityType, entityId, metadata, userId }) {
  try {
    await pool.query(
      `INSERT INTO activity_feed (activity_type, title, description, entity_type, entity_id, metadata, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [activityType, title, description || null, entityType || null, entityId || null, metadata ? JSON.stringify(metadata) : '{}', userId || null]
    );
  } catch (error) {
    console.error('[HISTORY] Error recording activity:', error.message);
  }
}

export default router;
