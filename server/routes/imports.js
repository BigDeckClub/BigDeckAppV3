import express from 'express';
import { pool } from '../db/pool.js';
import { validateId } from '../middleware/index.js';

const router = express.Router();

// ========== IMPORTS ENDPOINTS ==========
router.get('/api/imports', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM imports ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[IMPORTS] Error fetching imports:', error.message);
    res.status(500).json({ error: 'Failed to fetch imports' });
  }
});

router.post('/api/imports', async (req, res) => {
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
      `INSERT INTO imports (title, description, card_list, source, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [title, description || null, cardList, source || 'wholesale', status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[IMPORTS] Error creating import:', error.message);
    res.status(500).json({ error: 'Failed to create import' });
  }
});

router.delete('/api/imports/:id', validateId, async (req, res) => {
  const id = req.validatedId;

  try {
    const result = await pool.query(
      'DELETE FROM imports WHERE id = $1 RETURNING *',
      [id]
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

router.patch('/api/imports/:id/complete', validateId, async (req, res) => {
  const id = req.validatedId;

  try {
    const result = await pool.query(
      `UPDATE imports SET status = 'completed', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Import not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[IMPORTS] Error updating import:', error.message);
    res.status(500).json({ error: 'Failed to update import' });
  }
});

router.patch('/api/imports/:id', validateId, async (req, res) => {
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

    const query = `UPDATE imports SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
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
