import express from 'express';
import Joi from 'joi';

const router = express.Router();

// Validation schema for inventory items
const inventorySchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Card name is required',
    'string.max': 'Card name must be less than 255 characters'
  }),
  set: Joi.string().max(20).allow(null, ''),
  set_name: Joi.string().max(255).allow(null, ''),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': 'Quantity must be a number',
    'number.min': 'Quantity must be at least 1',
    'any.required': 'Quantity is required'
  }),
  purchase_price: Joi.number().min(0).allow(null).messages({
    'number.min': 'Purchase price cannot be negative'
  }),
  purchase_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  image_url: Joi.string().uri().allow(null, ''),
  reorder_type: Joi.string().valid('normal', 'land', 'bulk').default('normal')
});

const updateInventorySchema = Joi.object({
  quantity: Joi.number().integer().min(0).messages({
    'number.base': 'Quantity must be a number',
    'number.min': 'Quantity cannot be negative'
  }),
  purchase_price: Joi.number().min(0).allow(null).messages({
    'number.min': 'Purchase price cannot be negative'
  }),
  purchase_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, ''),
  reorder_type: Joi.string().valid('normal', 'land', 'bulk')
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Factory function to create routes with pool dependency
export default function createInventoryRoutes(pool, recordActivity) {
  
  // GET /api/inventory - List all inventory items
  router.get('/', async (req, res, next) => {
    try {
      console.log('[INVENTORY GET] Fetching all inventory items');
      
      // Fetch all inventory items
      const invResult = await pool.query('SELECT * FROM inventory ORDER BY name');
      
      // For each inventory item, calculate how many cards are in active containers
      const enriched = await Promise.all(invResult.rows.map(async (item) => {
        const containerResult = await pool.query(
          `SELECT COALESCE(SUM((card->>'quantity_used')::int), 0)::int as in_containers 
           FROM containers, jsonb_array_elements(cards) as card 
           WHERE card->>'inventoryId' = $1`,
          [String(item.id)]
        );
        const quantity_in_containers = parseInt(containerResult.rows?.[0]?.in_containers || 0, 10);
        return {
          ...item,
          quantity_in_containers,
          quantity_available: Math.max(0, item.quantity - quantity_in_containers)
        };
      }));
      
      console.log(`[INVENTORY GET] ✅ Retrieved ${enriched.length} inventory items`);
      res.json(enriched);
    } catch (err) {
      console.error('[ERROR] Inventory GET endpoint failure:', err.message, { 
        code: err.code,
        detail: err.detail,
        stack: err.stack 
      });
      next(err);
    }
  });

  // POST /api/inventory - Create new inventory item
  router.post('/', async (req, res, next) => {
    console.log('[INVENTORY POST] ========== NEW REQUEST ==========');
    console.log('[INVENTORY POST] Raw body:', JSON.stringify(req.body, null, 2));
    
    try {
      // Validate request body
      const { error, value } = inventorySchema.validate(req.body, { abortEarly: false });
      if (error) {
        console.warn('[INVENTORY POST] Validation failed:', error.details);
        return res.status(400).json({ 
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }
      
      const { name, set, set_name, quantity, purchase_price, purchase_date, image_url, reorder_type } = value;
      
      console.log(`[INVENTORY POST] Inserting card: name="${name}", set="${set}", quantity=${quantity}, price=${purchase_price}, date=${purchase_date}`);
      
      const result = await pool.query(
        `INSERT INTO inventory 
         (name, set, set_name, quantity, purchase_price, purchase_date, image_url, reorder_type, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
         RETURNING *`,
        [
          name, 
          set || null, 
          set_name || null,
          quantity, 
          purchase_price || null, 
          purchase_date || new Date().toISOString().split('T')[0],
          image_url || null,
          reorder_type
        ]
      );
      
      const inventoryId = result.rows[0].id;
      const price = purchase_price || 0;
      const pDate = purchase_date || new Date().toISOString().split('T')[0];
      
      console.log(`[INVENTORY] ✅ Database insert successful: id=${inventoryId}, saved_quantity=${result.rows[0].quantity}`);
      
      // Log purchase in purchase_history
      await pool.query(
        `INSERT INTO purchase_history (inventory_id, purchase_date, purchase_price, quantity)
         VALUES ($1, $2, $3, $4)`,
        [inventoryId, pDate, price, quantity]
      );
      
      console.log(`[INVENTORY] ✅ Purchase history recorded: inventory_id=${inventoryId}, quantity=${quantity}`);
      
      // Log activity
      await recordActivity(
        `Added ${quantity}x ${name} (${set}) to inventory`,
        { name, set, quantity, purchase_price, inventory_id: inventoryId }
      );
      
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[ERROR] Inventory POST endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        constraint: err.constraint,
        stack: err.stack
      });
      next(err);
    }
  });

  // PUT /api/inventory/:id - Update inventory item
  router.put('/:id', async (req, res, next) => {
    const inventoryId = parseInt(req.params.id, 10);
    
    // Validate id parameter
    if (isNaN(inventoryId)) {
      return res.status(400).json({ error: 'Invalid inventory ID' });
    }
    
    try {
      console.log(`[INVENTORY PUT] Update requested: id=${inventoryId}`, req.body);
      
      // Validate request body
      const { error, value } = updateInventorySchema.validate(req.body, { abortEarly: false });
      if (error) {
        console.warn('[INVENTORY PUT] Validation failed:', error.details);
        return res.status(400).json({ 
          error: 'Validation failed',
          details: error.details.map(d => d.message)
        });
      }
      
      const { quantity, purchase_price, purchase_date, reorder_type } = value;
      
      // Check if inventory exists
      const checkResult = await pool.query('SELECT * FROM inventory WHERE id = $1', [inventoryId]);
      if (checkResult.rows.length === 0) {
        console.warn(`[INVENTORY PUT] Item not found: id=${inventoryId}`);
        return res.status(404).json({ error: 'Inventory item not found' });
      }
      
      // Build dynamic UPDATE query based on provided fields
      const fields = [];
      const values = [];
      let paramIndex = 1;
      
      if (quantity !== undefined) {
        fields.push(`quantity = $${paramIndex}`);
        values.push(quantity);
        paramIndex++;
      }
      if (purchase_price !== undefined) {
        fields.push(`purchase_price = $${paramIndex}`);
        values.push(purchase_price);
        paramIndex++;
      }
      if (purchase_date !== undefined) {
        fields.push(`purchase_date = $${paramIndex}`);
        values.push(purchase_date || null);
        paramIndex++;
      }
      if (reorder_type !== undefined) {
        fields.push(`reorder_type = $${paramIndex}`);
        values.push(reorder_type);
        paramIndex++;
      }
      
      // Add id as final parameter
      values.push(inventoryId);
      
      // Execute update
      const updateQuery = `UPDATE inventory SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await pool.query(updateQuery, values);
      
      const updatedItem = result.rows[0];
      console.log(`[INVENTORY PUT] ✅ Updated: id=${inventoryId}, new_quantity=${updatedItem.quantity}`);
      
      // Log activity
      await recordActivity(
        `Updated inventory: ${updatedItem.name} (${updatedItem.set})`,
        { id: inventoryId, quantity, purchase_price, purchase_date, reorder_type }
      );
      
      res.json(updatedItem);
    } catch (err) {
      console.error('[ERROR] Inventory PUT endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  // DELETE /api/inventory/:id - Delete inventory item
  router.delete('/:id', async (req, res, next) => {
    const inventoryId = parseInt(req.params.id, 10);
    
    // Validate id parameter
    if (isNaN(inventoryId)) {
      return res.status(400).json({ error: 'Invalid inventory ID' });
    }
    
    console.log(`[INVENTORY DELETE] Deletion requested for id=${inventoryId}`);
    
    try {
      // Check if item exists
      const existsResult = await pool.query('SELECT name, set FROM inventory WHERE id = $1', [inventoryId]);
      if (existsResult.rows.length === 0) {
        console.warn(`[INVENTORY DELETE] Item not found: id=${inventoryId}`);
        return res.status(404).json({ error: 'Inventory item not found' });
      }
      
      // Check if this inventory item has purchase_history records
      const historyCheck = await pool.query(
        'SELECT COUNT(*) as count FROM purchase_history WHERE inventory_id = $1',
        [inventoryId]
      );
      const historyCount = parseInt(historyCheck.rows[0].count, 10);
      
      if (historyCount > 0) {
        console.warn(`[INVENTORY DELETE] BLOCKED: Cannot delete id=${inventoryId} - has ${historyCount} purchase_history records`);
        return res.status(400).json({ 
          error: 'Cannot delete inventory item with purchase history. Purchase history is permanent and immutable.',
          historyCount
        });
      }
      
      const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING id', [inventoryId]);
      
      const item = existsResult.rows[0];
      console.log(`[INVENTORY DELETE] ✅ Deleted id=${inventoryId}`);
      
      // Log activity
      await recordActivity(
        `Deleted inventory item: ${item.name} (${item.set})`,
        { id: inventoryId }
      );
      
      res.json({ success: true, id: inventoryId });
    } catch (err) {
      console.error('[ERROR] Inventory DELETE endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  return router;
}
