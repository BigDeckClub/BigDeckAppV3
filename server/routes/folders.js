import express from 'express';
import { pool } from '../db/pool.js';
import { validateId } from '../middleware/index.js';

const router = express.Router();

// Reserved folder names that cannot be created by users (case-insensitive)
const RESERVED_FOLDER_NAMES = ['unsorted', 'uncategorized', 'all cards'];

// ========== FOLDERS ENDPOINTS ==========

// GET /api/folders - Fetch all folders
router.get('/api/folders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, description, created_at, updated_at 
      FROM folders 
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[FOLDERS] Error fetching folders:', error.message);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

// POST /api/folders - Create a new folder
router.post('/api/folders', async (req, res) => {
  const { name, description } = req.body;
  
  try {
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }
    
    const trimmedName = name.trim();
    
    // Check for reserved folder names (case-insensitive)
    if (RESERVED_FOLDER_NAMES.includes(trimmedName.toLowerCase())) {
      return res.status(400).json({ error: `"${trimmedName}" is a reserved folder name and cannot be used` });
    }
    
    const result = await pool.query(
      `INSERT INTO folders (name, description) VALUES ($1, $2) RETURNING *`,
      [trimmedName, description || null]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Folder already exists' });
    }
    console.error('[FOLDERS] Error creating folder:', error.message);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// PUT /api/folders/:id - Update folder
router.put('/api/folders/:id', validateId, async (req, res) => {
  const id = req.validatedId;
  const { name, description } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined && name.trim().length > 0) {
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE folders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[FOLDERS] Error updating folder:', error.message);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// DELETE /api/folders/:id - Delete folder
router.delete('/api/folders/:id', validateId, async (req, res) => {
  const id = req.validatedId;
  
  try {
    // Get the folder name first
    const folderResult = await pool.query(
      `SELECT name FROM folders WHERE id = $1`,
      [id]
    );
    
    if (folderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    
    const folderName = folderResult.rows[0].name;
    
    // Move all cards in this folder to 'Uncategorized'
    await pool.query(
      `UPDATE inventory SET folder = 'Uncategorized' WHERE folder = $1`,
      [folderName]
    );
    
    // Delete the folder
    const result = await pool.query(
      `DELETE FROM folders WHERE id = $1 RETURNING *`,
      [id]
    );
    
    res.json({ success: true, folder: result.rows[0] });
  } catch (error) {
    console.error('[FOLDERS] Error deleting folder:', error.message);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

export default router;
