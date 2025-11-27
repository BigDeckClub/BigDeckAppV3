import express from 'express';

// Factory function to create routes with pool dependency
export default function createSalesRoutes(pool) {
  const router = express.Router();
  
  // GET /api/sales - List all sales
  router.get('/', async (req, res, next) => {
    try {
      console.log('[SALES GET] Fetching all sales records');
      
      const result = await pool.query(`
        SELECT 
          s.id,
          s.container_id,
          s.sale_price,
          s.sold_date,
          s.created_at,
          s.decklist_id,
          d.name as decklist_name
        FROM sales s
        LEFT JOIN decklists d ON s.decklist_id = d.id
        ORDER BY COALESCE(s.sold_date, s.created_at) DESC
      `);
      
      console.log(`[SALES GET] ✅ Found ${result.rows.length} sales records`);
      
      // Map to frontend-expected format
      const sales = result.rows.map(sale => ({
        id: sale.id,
        container_id: sale.container_id,
        sale_price: parseFloat(sale.sale_price),
        sold_date: sale.sold_date || sale.created_at,
        created_at: sale.created_at || sale.sold_date,
        decklist_id: sale.decklist_id,
        decklist_name: sale.decklist_name
      }));
      
      res.json(sales);
    } catch (err) {
      console.error('[ERROR] Sales GET endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  // GET /api/sales/:id - Get single sale
  router.get('/:id', async (req, res, next) => {
    const saleId = parseInt(req.params.id, 10);
    
    if (isNaN(saleId)) {
      return res.status(400).json({ error: 'Invalid sale ID' });
    }
    
    try {
      console.log(`[SALES GET] Fetching sale id=${saleId}`);
      
      const result = await pool.query(`
        SELECT 
          s.id,
          s.container_id,
          s.sale_price,
          s.sold_date,
          s.created_at,
          s.decklist_id,
          d.name as decklist_name
        FROM sales s
        LEFT JOIN decklists d ON s.decklist_id = d.id
        WHERE s.id = $1
      `, [saleId]);
      
      if (result.rows.length === 0) {
        console.warn(`[SALES GET] Sale not found: id=${saleId}`);
        return res.status(404).json({ error: 'Sale not found' });
      }
      
      const sale = result.rows[0];
      console.log(`[SALES GET] ✅ Found sale id=${saleId}`);
      
      res.json({
        id: sale.id,
        container_id: sale.container_id,
        sale_price: parseFloat(sale.sale_price),
        sold_date: sale.sold_date || sale.created_at,
        created_at: sale.created_at || sale.sold_date,
        decklist_id: sale.decklist_id,
        decklist_name: sale.decklist_name
      });
    } catch (err) {
      console.error('[ERROR] Sales GET by ID endpoint failure:', err.message, {
        code: err.code,
        detail: err.detail,
        stack: err.stack
      });
      next(err);
    }
  });

  return router;
}
