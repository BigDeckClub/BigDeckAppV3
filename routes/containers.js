import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Regex patterns for parsing decklist card entries
// Matches formats like: "Card Name (SET)" or "Card Name - SET" or "Card Name SET"
const CARD_LINE_QTY_PATTERN = /^\s*(\d+)\s+(.+)$/;
const CARD_SET_PAREN_PATTERN = /^(.*?)\s*\(\s*([^)]+)\s*\)\s*$/;
const CARD_SET_SEP_PATTERN = /^(.*?)\s*(?:[-|]\s*)([A-Za-z0-9]+)\s*$/;
const CARD_SET_TRAILING_PATTERN = /^(.*)\s+([A-Z0-9]{2,6})$/;

// Validation schemas
const containerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Container name is required',
    'string.max': 'Container name must be less than 255 characters'
  }),
  decklist_id: Joi.number().integer().allow(null),
  cards: Joi.array().items(
    Joi.object({
      inventoryId: Joi.alternatives().try(
        Joi.number().integer(),
        Joi.string()
      ),
      name: Joi.string(),
      set: Joi.string(),
      set_name: Joi.string().allow(null),
      quantity_used: Joi.number().integer().min(0),
      purchase_price: Joi.number().min(0).allow(null)
    })
  ).default([])
});

const sellContainerSchema = Joi.object({
  salePrice: Joi.number().min(0).required().messages({
    'number.base': 'Sale price must be a number',
    'number.min': 'Sale price cannot be negative',
    'any.required': 'Sale price is required'
  })
});

// Helper: Parse decklist text to cards
function parseDecklistTextToCards(deckText) {
  if (!deckText || typeof deckText !== "string") return [];

  const lines = deckText.split(/\r?\n/);
  const cards = [];

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const qtyNameMatch = line.match(CARD_LINE_QTY_PATTERN);
    let qty = 1;
    let rest = line;
    if (qtyNameMatch) {
      qty = parseInt(qtyNameMatch[1], 10) || 1;
      rest = qtyNameMatch[2].trim();
    }

    let name = rest;
    let set = "";

    // Try to extract set code from parentheses: "Card Name (SET)"
    const parenMatch = rest.match(CARD_SET_PAREN_PATTERN);
    if (parenMatch) {
      name = parenMatch[1].trim();
      set = parenMatch[2].trim();
    } else {
      // Try separator format: "Card Name - SET" or "Card Name | SET"
      const sepMatch = rest.match(CARD_SET_SEP_PATTERN);
      if (sepMatch) {
        name = sepMatch[1].trim();
        set = sepMatch[2].trim();
      } else {
        // Try trailing set code: "Card Name SET"
        const trailingSetMatch = rest.match(CARD_SET_TRAILING_PATTERN);
        if (trailingSetMatch) {
          name = trailingSetMatch[1].trim();
          set = trailingSetMatch[2].trim();
        }
      }
    }

    cards.push({ name, set, qty });
  }

  return cards;
}

// Helper: Enrich cards with inventory data
async function enrichCardsWithInventory(deckCards, client) {
  const enriched = [];
  
  for (const card of deckCards) {
    let remainingQty = card.qty;
    
    const query = card.set 
      ? `SELECT id, name, set, quantity, set_name, purchase_price FROM inventory WHERE LOWER(name) = LOWER($1) AND UPPER(set) = UPPER($2) ORDER BY id`
      : `SELECT id, name, set, quantity, set_name, purchase_price FROM inventory WHERE LOWER(name) = LOWER($1) ORDER BY id`;
    
    const params = card.set ? [card.name, card.set] : [card.name];
    const { rows } = await client.query(query, params);
    
    for (const invItem of rows) {
      if (remainingQty <= 0) break;
      
      const allocate = Math.min(remainingQty, invItem.quantity);
      if (allocate > 0) {
        enriched.push({
          name: invItem.name,
          set: invItem.set || card.set,
          set_name: invItem.set_name,
          quantity_used: allocate,
          purchase_price: invItem.purchase_price,
          inventoryId: invItem.id
        });
        remainingQty -= allocate;
      }
    }
    
    if (remainingQty > 0) {
      enriched.push({
        name: card.name,
        set: card.set,
        set_name: null,
        quantity_used: 0,
        purchase_price: null,
        inventoryId: null
      });
    }
  }
  
  return enriched;
}

// Helper: Fetch container items from container_items table
// Returns items in the same format as the old JSONB cards field for backward compatibility
async function fetchContainerItems(client, containerId) {
  const result = await client.query(
    `SELECT 
      ci.id as container_item_id,
      ci.inventory_id as "inventoryId",
      ci.printing_id as "printingId",
      ci.quantity as quantity_used,
      i.name,
      i.set,
      i.set_name,
      i.purchase_price
    FROM container_items ci
    LEFT JOIN inventory i ON ci.inventory_id = i.id
    WHERE ci.container_id = $1
    ORDER BY ci.id`,
    [containerId]
  );
  return result.rows;
}

// Helper: Insert container items into container_items table
async function insertContainerItems(client, containerId, cardsArray) {
  for (const card of cardsArray) {
    const inventoryId = card.inventoryId ? parseInt(card.inventoryId, 10) : null;
    const printingId = card.printingId ? parseInt(card.printingId, 10) : null;
    const quantity = card.quantity_used || card.quantity || 1;
    
    await client.query(
      `INSERT INTO container_items (container_id, inventory_id, printing_id, quantity)
       VALUES ($1, $2, $3, $4)`,
      [containerId, inventoryId || null, printingId || null, quantity]
    );
  }
}

// Helper: Delete all container items for a container
async function deleteContainerItems(client, containerId) {
  await client.query('DELETE FROM container_items WHERE container_id = $1', [containerId]);
}

// Factory function to create routes with pool dependency
export default function createContainerRoutes(pool, recordActivity) {
  
  // GET /api/containers - List all containers
  router.get('/', async (req, res, next) => {
    try {
      console.log('[CONTAINERS GET] Fetching all containers');
      
      // Fetch containers with their items using new relational structure
      const containersResult = await pool.query(
        'SELECT id, name, decklist_id, created_at FROM containers ORDER BY created_at DESC'
      );
      
      // For each container, fetch its items from container_items table
      const containersWithItems = await Promise.all(
        containersResult.rows.map(async (container) => {
          const items = await fetchContainerItems(pool, container.id);
          return {
            ...container,
            // Return items as 'cards' for backward compatibility with frontend
            cards: items
          };
        })
      );
      
      console.log(`[CONTAINERS GET] ✅ Retrieved ${containersWithItems.length} containers`);
      res.json(containersWithItems);
    } catch (err) {
      console.error('[ERROR] Containers GET endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  // GET /api/containers/:id/items - Get container items
  router.get('/:id/items', async (req, res, next) => {
    const containerId = parseInt(req.params.id, 10);
    
    if (isNaN(containerId)) {
      return res.status(400).json({ error: 'Invalid container ID' });
    }
    
    try {
      console.log(`[CONTAINERS GET ITEMS] Fetching items for container id=${containerId}`);
      
      // Check if container exists
      const containerCheck = await pool.query(
        'SELECT id FROM containers WHERE id = $1',
        [containerId]
      );
      
      if (containerCheck.rows.length === 0) {
        console.warn(`[CONTAINERS GET ITEMS] Container not found: id=${containerId}`);
        return res.status(404).json({ error: 'Container not found' });
      }
      
      // Fetch items from container_items table
      const items = await fetchContainerItems(pool, containerId);
      
      console.log(`[CONTAINERS GET ITEMS] ✅ Retrieved ${items.length} items`);
      res.json(items);
    } catch (err) {
      console.error('[ERROR] Container items GET endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  // POST /api/containers - Create new container
  router.post('/', async (req, res, next) => {
    const client = await pool.connect();
    
    try {
      console.log('[CONTAINERS POST] Creating new container');
      
      // Validate request body
      const { error, value } = containerSchema.validate(req.body, { abortEarly: false });
      if (error) {
        console.warn('[CONTAINERS POST] Validation failed:', error.details);
        return res.status(400).json({ 
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }
      
      await client.query('BEGIN');
      
      const { name, decklist_id, cards } = value;
      
      console.log(`[CONTAINERS POST] Creating: name="${name}", decklist_id=${decklist_id}`);

      let cardsArray = Array.isArray(cards) && cards.length > 0 ? cards : null;
      
      if (cardsArray) {
        console.log(`[CONTAINERS POST] Using provided cards array with ${cardsArray.length} cards`);
      }

      // If decklist_id provided, fetch decklist text, parse it, and enrich with inventory
      if (!cardsArray && decklist_id) {
        const { rows } = await client.query('SELECT decklist FROM decklists WHERE id = $1', [decklist_id]);
        if (rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Decklist not found' });
        }
        const deckText = rows[0].decklist || "";
        const parsedCards = parseDecklistTextToCards(deckText);
        cardsArray = await enrichCardsWithInventory(parsedCards, client);
        console.log(`[CONTAINERS POST] Parsed decklist with ${parsedCards.length} cards, enriched to ${cardsArray.length} items`);
      }

      if (!Array.isArray(cardsArray)) cardsArray = [];

      // Insert container (no longer storing cards as JSONB)
      const { rows } = await client.query(
        'INSERT INTO containers (name, decklist_id) VALUES ($1, $2) RETURNING id',
        [name, decklist_id]
      );
      
      const containerId = rows[0].id;
      
      // Insert container items into container_items table
      await insertContainerItems(client, containerId, cardsArray);
      
      console.log(`[CONTAINERS POST] ✅ Created container id=${containerId} with ${cardsArray.length} items in container_items table`);
      
      await client.query('COMMIT');
      
      // Log activity
      await recordActivity(`Created container: ${name}`, { container_id: containerId, name });
      
      res.status(201).json({ id: containerId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[ERROR] Containers POST endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    } finally {
      client.release();
    }
  });

  // PUT /api/containers/:id - Update container
  router.put('/:id', async (req, res, next) => {
    const containerId = parseInt(req.params.id, 10);
    
    if (isNaN(containerId)) {
      return res.status(400).json({ error: 'Invalid container ID' });
    }
    
    const client = await pool.connect();
    
    try {
      console.log(`[CONTAINERS PUT] Updating container id=${containerId}`);
      
      await client.query('BEGIN');
      
      // Check if container exists
      const checkResult = await client.query('SELECT id, name FROM containers WHERE id = $1', [containerId]);
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn(`[CONTAINERS PUT] Container not found: id=${containerId}`);
        return res.status(404).json({ error: 'Container not found' });
      }
      
      const { name, cards } = req.body;
      
      // Update container name if provided
      if (name !== undefined) {
        await client.query('UPDATE containers SET name = $1 WHERE id = $2', [name, containerId]);
      }
      
      // Update container items if provided
      if (cards !== undefined) {
        const cardsArray = Array.isArray(cards) ? cards : [];
        
        // Delete existing container items
        await deleteContainerItems(client, containerId);
        
        // Insert new container items
        await insertContainerItems(client, containerId, cardsArray);
        
        console.log(`[CONTAINERS PUT] Updated ${cardsArray.length} items in container_items table`);
      }
      
      await client.query('COMMIT');
      
      // Fetch updated container with items
      const updatedContainer = await client.query(
        'SELECT id, name, decklist_id, created_at FROM containers WHERE id = $1',
        [containerId]
      );
      const items = await fetchContainerItems(pool, containerId);
      
      console.log(`[CONTAINERS PUT] ✅ Updated container id=${containerId}`);
      res.json({
        ...updatedContainer.rows[0],
        cards: items
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[ERROR] Containers PUT endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    } finally {
      client.release();
    }
  });

  // DELETE /api/containers/:id - Delete container
  router.delete('/:id', async (req, res, next) => {
    const containerId = parseInt(req.params.id, 10);
    
    if (isNaN(containerId)) {
      return res.status(400).json({ error: 'Invalid container ID' });
    }
    
    console.log(`[CONTAINERS DELETE] Deleting container id=${containerId}`);
    
    try {
      // Check if container exists
      const checkResult = await pool.query('SELECT name FROM containers WHERE id = $1', [containerId]);
      if (checkResult.rows.length === 0) {
        console.warn(`[CONTAINERS DELETE] Container not found: id=${containerId}`);
        return res.status(404).json({ error: 'Container not found' });
      }
      
      const containerName = checkResult.rows[0].name;
      
      // Delete container (container_items will be deleted via ON DELETE CASCADE)
      const result = await pool.query('DELETE FROM containers WHERE id = $1 RETURNING id', [containerId]);
      console.log(`[CONTAINERS DELETE] ✅ Deleted container id=${containerId}`);
      
      // Log activity
      await recordActivity(`Deleted container: ${containerName}`, { container_id: containerId });
      
      res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
      console.error('[ERROR] Containers DELETE endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  // POST /api/containers/:id/sell - Sell container
  router.post('/:id/sell', async (req, res, next) => {
    const containerId = parseInt(req.params.id, 10);
    
    if (isNaN(containerId)) {
      return res.status(400).json({ error: 'Invalid container ID' });
    }
    
    const client = await pool.connect();
    
    try {
      console.log(`[CONTAINERS SELL] Selling container id=${containerId}`);
      
      // Validate request body
      const { error, value } = sellContainerSchema.validate(req.body, { abortEarly: false });
      if (error) {
        console.warn('[CONTAINERS SELL] Validation failed:', error.details);
        return res.status(400).json({ 
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }
      
      const { salePrice } = value;

      await client.query('BEGIN');

      // Get container details
      const containerResult = await client.query(
        'SELECT id, name, decklist_id FROM containers WHERE id = $1 FOR UPDATE',
        [containerId]
      );
      
      if (containerResult.rows.length === 0) {
        await client.query('ROLLBACK');
        console.warn(`[CONTAINERS SELL] Container not found: id=${containerId}`);
        return res.status(404).json({ error: 'Container not found' });
      }

      const container = containerResult.rows[0];

      // Fetch container items from container_items table
      const items = await fetchContainerItems(client, containerId);

      console.log(`[CONTAINERS SELL] Container: ${container.name}, Price: $${salePrice}, Items: ${items.length}`);

      // Decrement inventory for each container item
      for (const item of items) {
        if (item.inventoryId && item.quantity_used > 0) {
          const updateResult = await client.query(
            `UPDATE inventory 
             SET quantity = GREATEST(0, quantity - $1)
             WHERE id = $2
             RETURNING id, quantity`,
            [item.quantity_used, item.inventoryId]
          );
          
          if (updateResult.rows.length > 0) {
            console.log(`[CONTAINERS SELL] ✅ Inventory decremented: id=${updateResult.rows[0].id}, new_qty=${updateResult.rows[0].quantity}`);
          }
        }
      }

      // Delete container (container_items will be deleted via ON DELETE CASCADE)
      await client.query('DELETE FROM containers WHERE id = $1', [container.id]);
      console.log(`[CONTAINERS SELL] ✅ Container deleted`);

      // Insert sale record
      const saleResult = await client.query(
        `INSERT INTO sales (
          container_id, 
          sale_price, 
          sold_date, 
          decklist_id,
          created_at
        ) VALUES ($1, $2, NOW(), $3, NOW()) 
        RETURNING *`,
        [container.id, salePrice, container.decklist_id]
      );

      const sale = saleResult.rows[0];
      console.log(`[CONTAINERS SELL] ✅ Sale recorded: id=${sale.id}`);

      await client.query('COMMIT');
      
      // Log activity
      await recordActivity(
        `Sold container: ${container.name} for $${salePrice}`,
        { container_id: container.id, container_name: container.name, sale_price: salePrice, sale_id: sale.id }
      );
      
      res.json({
        ...sale,
        container_name: container.name
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[ERROR] Containers SELL endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    } finally {
      client.release();
    }
  });

  return router;
}
