import express from 'express';
import { pool } from '../db/pool.js';
import { validateId } from '../middleware/index.js';
import { authenticate } from '../middleware/auth.js';
import { recordAudit, recordActivity } from './history.js';

const router = express.Router();

// ========== IMPORTS ENDPOINTS ==========
router.get('/api/imports', authenticate, async (req, res) => {
  const userId = req.userId;
  try {
    const result = await pool.query(
      'SELECT * FROM imports WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[IMPORTS] Error fetching imports:', error.message);
    res.status(500).json({ error: 'Failed to fetch imports' });
  }
});

router.post('/api/imports', authenticate, async (req, res) => {
  const userId = req.userId;
  const { title, description, cardList, source, status } = req.body;
  
  // Input validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  
  if (!cardList || typeof cardList !== 'string' || cardList.trim().length === 0) {
    return res.status(400).json({ error: 'Card list is required and must be a non-empty string' });
  }
  
  const validSources = ['wholesale', 'tcgplayer', 'cardkingdom', 'local', 'other'];
  if (source !== undefined && source !== null && !validSources.includes(source)) {
    return res.status(400).json({ error: `Source must be one of: ${validSources.join(', ')}` });
  }
  
  const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
  if (status !== undefined && status !== null && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `INSERT INTO imports (title, description, card_list, source, status, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [title, description || null, cardList, source || 'wholesale', status || 'pending', userId]
    );
    
    // Count cards in the import (basic estimate from card list)
    const cardCount = cardList.split('\n').filter(line => line.trim().length > 0).length;
    
    // Record audit and activity for the import
    const importRecord = result.rows[0];
    await recordAudit({
      actionType: 'bulk_import',
      description: `Created import "${title}" with ~${cardCount} cards`,
      entityType: 'import',
      entityId: importRecord.id,
      metadata: { title, source: source || 'wholesale', cardCount },
      userId
    });
    
    await recordActivity({
      activityType: 'import_created',
      title: `Import created: ${title}`,
      description: `Started import with ~${cardCount} cards from ${source || 'wholesale'}`,
      entityType: 'import',
      entityId: importRecord.id,
      metadata: { source: source || 'wholesale', cardCount },
      userId
    });
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[IMPORTS] Error creating import:', error.message);
    res.status(500).json({ error: 'Failed to create import' });
  }
});

router.delete('/api/imports/:id', authenticate, validateId, async (req, res) => {
  const userId = req.userId;
  const id = req.validatedId;

  try {
    const result = await pool.query(
      'DELETE FROM imports WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Import not found' });
    }
    
    res.json({ message: 'Import deleted', import: result.rows[0] });
  } catch (error) {
    console.error('[IMPORTS] Error deleting import:', error.message);
    res.status(500).json({ error: 'Failed to delete import' });
  }
});

router.patch('/api/imports/:id/complete', authenticate, validateId, async (req, res) => {
  const userId = req.userId;
  const id = req.validatedId;

  try {
    const result = await pool.query(
      `UPDATE imports SET status = 'completed', updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Import not found' });
    }
    
    // Record audit and activity for completed import
    const completedImport = result.rows[0];
    const cardCount = completedImport.card_list ? 
      completedImport.card_list.split('\n').filter(line => line.trim().length > 0).length : 0;
    
    await recordAudit({
      actionType: 'import_completed',
      description: `Completed import "${completedImport.title}"`,
      entityType: 'import',
      entityId: id,
      metadata: { title: completedImport.title, cardCount },
      userId
    });
    
    await recordActivity({
      activityType: 'import_completed',
      title: `Import completed: ${completedImport.title}`,
      description: `Successfully imported ~${cardCount} cards`,
      entityType: 'import',
      entityId: id,
      metadata: { cardCount },
      userId
    });
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[IMPORTS] Error updating import:', error.message);
    res.status(500).json({ error: 'Failed to update import' });
  }
});

router.patch('/api/imports/:id', authenticate, validateId, async (req, res) => {
  const userId = req.userId;
  const id = req.validatedId;
  const { title, description, cardList, source, status } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (cardList !== undefined) {
      updates.push(`card_list = $${paramCount++}`);
      values.push(cardList);
    }
    if (source !== undefined) {
      updates.push(`source = $${paramCount++}`);
      values.push(source);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    updates.push('updated_at = NOW()');
    values.push(id);
    values.push(userId);

    const query = `UPDATE imports SET ${updates.join(', ')} WHERE id = $${paramCount} AND user_id = $${paramCount + 1} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Import not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[IMPORTS] Error updating import:', error.message);
    res.status(500).json({ error: 'Failed to update import' });
  }
});

export default router;
