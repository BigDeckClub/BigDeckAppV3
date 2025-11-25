import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const decklistSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Decklist name is required',
    'string.max': 'Decklist name must be less than 255 characters'
  }),
  decklist: Joi.string().required().messages({
    'string.empty': 'Decklist content is required'
  })
});

// Factory function to create routes with pool dependency
export default function createDecklistRoutes(pool, recordActivity) {
  
  // GET /api/decklists - List all decklists
  router.get('/', async (req, res, next) => {
    try {
      console.log('[DECKLISTS GET] Fetching all decklists');
      const result = await pool.query('SELECT * FROM decklists ORDER BY created_at DESC');
      console.log(`[DECKLISTS GET] ✅ Retrieved ${result.rows.length} decklists`);
      res.json(result.rows);
    } catch (err) {
      console.error('[ERROR] Decklists GET endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  // POST /api/decklists - Create new decklist
  router.post('/', async (req, res, next) => {
    console.log('[DECKLISTS POST] Creating new decklist');
    
    try {
      // Validate request body
      const { error, value } = decklistSchema.validate(req.body, { abortEarly: false });
      if (error) {
        console.warn('[DECKLISTS POST] Validation failed:', error.details);
        return res.status(400).json({ 
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }
      
      const { name, decklist } = value;
      
      const result = await pool.query(
        'INSERT INTO decklists (name, decklist) VALUES ($1, $2) RETURNING *',
        [name, decklist]
      );
      
      const decklistId = result.rows[0].id;
      console.log(`[DECKLISTS POST] ✅ Created decklist: id=${decklistId}, name="${name}"`);
      
      // Log activity
      await recordActivity(`Created decklist: ${name}`, { name, decklist_id: decklistId });
      
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[ERROR] Decklists POST endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  // PUT /api/decklists/:id - Update decklist
  router.put('/:id', async (req, res, next) => {
    const decklistId = parseInt(req.params.id, 10);
    
    if (isNaN(decklistId)) {
      return res.status(400).json({ error: 'Invalid decklist ID' });
    }
    
    console.log(`[DECKLISTS PUT] Updating decklist id=${decklistId}`);
    
    try {
      // Check if decklist exists
      const checkResult = await pool.query('SELECT id FROM decklists WHERE id = $1', [decklistId]);
      if (checkResult.rows.length === 0) {
        console.warn(`[DECKLISTS PUT] Decklist not found: id=${decklistId}`);
        return res.status(404).json({ error: 'Decklist not found' });
      }
      
      const { name, decklist } = req.body;
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(name);
        paramIndex++;
      }
      if (decklist !== undefined) {
        updates.push(`decklist = $${paramIndex}`);
        values.push(decklist);
        paramIndex++;
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      values.push(decklistId);
      const query = `UPDATE decklists SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(query, values);
      
      console.log(`[DECKLISTS PUT] ✅ Updated decklist id=${decklistId}`);
      
      // Log activity
      await recordActivity(`Updated decklist: ${result.rows[0].name}`, { decklist_id: decklistId });
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[ERROR] Decklists PUT endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  // DELETE /api/decklists/:id - Delete decklist
  router.delete('/:id', async (req, res, next) => {
    const decklistId = parseInt(req.params.id, 10);
    
    if (isNaN(decklistId)) {
      return res.status(400).json({ error: 'Invalid decklist ID' });
    }
    
    console.log(`[DECKLISTS DELETE] Deleting decklist id=${decklistId}`);
    
    try {
      // Check if decklist exists
      const checkResult = await pool.query('SELECT name FROM decklists WHERE id = $1', [decklistId]);
      if (checkResult.rows.length === 0) {
        console.warn(`[DECKLISTS DELETE] Decklist not found: id=${decklistId}`);
        return res.status(404).json({ error: 'Decklist not found' });
      }
      
      const deckName = checkResult.rows[0].name;
      
      await pool.query('DELETE FROM decklists WHERE id = $1', [decklistId]);
      console.log(`[DECKLISTS DELETE] ✅ Deleted decklist id=${decklistId}`);
      
      // Log activity
      await recordActivity(`Deleted decklist: ${deckName}`, { decklist_id: decklistId });
      
      res.json({ success: true, id: decklistId });
    } catch (err) {
      console.error('[ERROR] Decklists DELETE endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  return router;
}
