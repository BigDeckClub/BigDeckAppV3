import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Regex patterns for parsing decklist card entries
const CARD_LINE_QTY_PATTERN = /^\s*(\d+)\s+(.+)$/;
const CARD_SET_PAREN_PATTERN = /^(.*?)\s*\(\s*([^)]+)\s*\)\s*$/;
const CARD_SET_SEP_PATTERN = /^(.*?)\s*(?:[-|]\s*)([A-Za-z0-9]+)\s*$/;
const CARD_SET_TRAILING_PATTERN = /^(.*)\s+([A-Z0-9]{2,6})$/;

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

// Helper: Parse decklist text to cards
function parseDecklistTextToCards(deckText) {
  if (!deckText || typeof deckText !== "string") return [];

  const lines = deckText.split(/\r?\n/);
  const cards = [];
  let isSideboard = false;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    
    // Check for sideboard section marker
    if (/^sideboard/i.test(line) || /^\/\//i.test(line)) {
      isSideboard = true;
      continue;
    }

    const qtyNameMatch = line.match(CARD_LINE_QTY_PATTERN);
    let qty = 1;
    let rest = line;
    if (qtyNameMatch) {
      qty = parseInt(qtyNameMatch[1], 10) || 1;
      rest = qtyNameMatch[2].trim();
    }

    let name = rest;
    let setCode = null;

    // Try to extract set code from parentheses: "Card Name (SET)"
    const parenMatch = rest.match(CARD_SET_PAREN_PATTERN);
    if (parenMatch) {
      name = parenMatch[1].trim();
      setCode = parenMatch[2].trim();
    } else {
      // Try separator format: "Card Name - SET" or "Card Name | SET"
      const sepMatch = rest.match(CARD_SET_SEP_PATTERN);
      if (sepMatch) {
        name = sepMatch[1].trim();
        setCode = sepMatch[2].trim();
      } else {
        // Try trailing set code: "Card Name SET"
        const trailingSetMatch = rest.match(CARD_SET_TRAILING_PATTERN);
        if (trailingSetMatch) {
          name = trailingSetMatch[1].trim();
          setCode = trailingSetMatch[2].trim();
        }
      }
    }

    cards.push({ name, setCode, quantity: qty, isSideboard });
  }

  return cards;
}

// Helper: Insert deck items into deck_items table
async function insertDeckItems(client, decklistId, parsedCards) {
  for (const card of parsedCards) {
    // Try to find matching printing if setCode is provided
    let printingId = null;
    if (card.setCode) {
      const printingResult = await client.query(
        `SELECT p.id FROM printings p 
         JOIN cards c ON p.card_id = c.id 
         WHERE LOWER(c.name) = LOWER($1) AND UPPER(p.set_code) = UPPER($2)
         LIMIT 1`,
        [card.name, card.setCode]
      );
      if (printingResult.rows.length > 0) {
        printingId = printingResult.rows[0].id;
      }
    }
    
    await client.query(
      `INSERT INTO deck_items (decklist_id, printing_id, card_name, set_code, quantity, is_sideboard)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [decklistId, printingId, card.name, card.setCode, card.quantity, card.isSideboard]
    );
  }
}

// Helper: Delete all deck items for a decklist
async function deleteDeckItems(client, decklistId) {
  await client.query('DELETE FROM deck_items WHERE decklist_id = $1', [decklistId]);
}

// Helper: Fetch deck items for a decklist
async function fetchDeckItems(client, decklistId) {
  const result = await client.query(
    `SELECT 
      di.id,
      di.card_name,
      di.set_code,
      di.quantity,
      di.is_sideboard,
      di.printing_id,
      p.image_uri_small,
      p.image_uri_normal,
      p.rarity
    FROM deck_items di
    LEFT JOIN printings p ON di.printing_id = p.id
    WHERE di.decklist_id = $1
    ORDER BY di.is_sideboard, di.id`,
    [decklistId]
  );
  return result.rows;
}

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

  // GET /api/decklists/:id - Get a single decklist with parsed items
  router.get('/:id', async (req, res, next) => {
    const decklistId = parseInt(req.params.id, 10);
    
    if (isNaN(decklistId)) {
      return res.status(400).json({ error: 'Invalid decklist ID' });
    }
    
    try {
      console.log(`[DECKLISTS GET] Fetching decklist id=${decklistId}`);
      
      const result = await pool.query('SELECT * FROM decklists WHERE id = $1', [decklistId]);
      
      if (result.rows.length === 0) {
        console.warn(`[DECKLISTS GET] Decklist not found: id=${decklistId}`);
        return res.status(404).json({ error: 'Decklist not found' });
      }
      
      const decklist = result.rows[0];
      
      // Fetch parsed deck items from deck_items table
      const items = await fetchDeckItems(pool, decklistId);
      
      console.log(`[DECKLISTS GET] ✅ Retrieved decklist id=${decklistId} with ${items.length} items`);
      res.json({
        ...decklist,
        items
      });
    } catch (err) {
      console.error('[ERROR] Decklists GET by ID endpoint failure:', err.message, {
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
    
    const client = await pool.connect();
    
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
      
      await client.query('BEGIN');
      
      const { name, decklist } = value;
      
      // Insert decklist (keep the raw text for backward compatibility)
      const result = await client.query(
        'INSERT INTO decklists (name, decklist) VALUES ($1, $2) RETURNING *',
        [name, decklist]
      );
      
      const decklistId = result.rows[0].id;
      
      // Parse decklist and insert into deck_items table
      const parsedCards = parseDecklistTextToCards(decklist);
      await insertDeckItems(client, decklistId, parsedCards);
      
      console.log(`[DECKLISTS POST] ✅ Created decklist: id=${decklistId}, name="${name}", items=${parsedCards.length}`);
      
      await client.query('COMMIT');
      
      // Log activity
      await recordActivity(`Created decklist: ${name}`, { name, decklist_id: decklistId });
      
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[ERROR] Decklists POST endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    } finally {
      client.release();
    }
  });

  // PUT /api/decklists/:id - Update decklist
  router.put('/:id', async (req, res, next) => {
    const decklistId = parseInt(req.params.id, 10);
    
    if (isNaN(decklistId)) {
      return res.status(400).json({ error: 'Invalid decklist ID' });
    }
    
    console.log(`[DECKLISTS PUT] Updating decklist id=${decklistId}`);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if decklist exists
      const checkResult = await client.query('SELECT id FROM decklists WHERE id = $1', [decklistId]);
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
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
        
        // If decklist content is updated, re-parse and update deck_items
        await deleteDeckItems(client, decklistId);
        const parsedCards = parseDecklistTextToCards(decklist);
        await insertDeckItems(client, decklistId, parsedCards);
        console.log(`[DECKLISTS PUT] Updated ${parsedCards.length} deck items`);
      }
      
      if (updates.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      values.push(decklistId);
      const query = `UPDATE decklists SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await client.query(query, values);
      
      await client.query('COMMIT');
      
      console.log(`[DECKLISTS PUT] ✅ Updated decklist id=${decklistId}`);
      
      // Log activity
      await recordActivity(`Updated decklist: ${result.rows[0].name}`, { decklist_id: decklistId });
      
      res.json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[ERROR] Decklists PUT endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    } finally {
      client.release();
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
      
      // Delete decklist (deck_items will be deleted via ON DELETE CASCADE)
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
