import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';
import { load } from 'cheerio';

const { Pool } = pkg;
const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create pool with Replit database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/mtgmanager'
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    // Connection error silently handled
  }
});

// Unified error handler middleware
const handleDbError = (err, res) => {
  res.status(500).json({ error: err.message });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Inventory endpoints
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        inv.*,
        COALESCE(SUM(ci.quantity_used), 0)::integer as in_containers_qty
      FROM inventory inv
      LEFT JOIN container_items ci ON inv.id = ci.inventory_id
      GROUP BY inv.id
      ORDER BY inv.name
    `);
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { name, set, set_name, quantity, purchase_date, purchase_price, reorder_type, image_url } = req.body;
    const result = await pool.query(
      'INSERT INTO inventory (name, set, set_name, quantity, purchase_date, purchase_price, reorder_type, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, set, set_name, quantity, purchase_date, purchase_price, reorder_type, image_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { quantity, purchase_price, purchase_date, reorder_type } = req.body;
    const result = await pool.query(
      'UPDATE inventory SET quantity = $1, purchase_price = $2, purchase_date = $3, reorder_type = $4 WHERE id = $5 RETURNING *',
      [quantity, purchase_price, purchase_date, reorder_type, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

// Decklists endpoints
app.get('/api/decklists', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM decklists ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.post('/api/decklists', async (req, res) => {
  try {
    const { name, decklist } = req.body;
    const result = await pool.query(
      'INSERT INTO decklists (name, decklist) VALUES ($1, $2) RETURNING *',
      [name, decklist]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.put('/api/decklists/:id', async (req, res) => {
  try {
    const { decklist } = req.body;
    const result = await pool.query(
      'UPDATE decklists SET decklist = $1 WHERE id = $2 RETURNING *',
      [decklist, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.delete('/api/decklists/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM decklists WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    handleDbError(err, res);
  }
});

// Containers endpoints
app.get('/api/containers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM containers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.post('/api/containers', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, decklist_id } = req.body;
    
    // Insert container
    const containerResult = await client.query(
      'INSERT INTO containers (name, decklist_id) VALUES ($1, $2) RETURNING *',
      [name, decklist_id]
    );
    const container = containerResult.rows[0];
    
    // Fetch the decklist to get card names and quantities
    const decklistResult = await client.query(
      'SELECT decklist FROM decklists WHERE id = $1',
      [decklist_id]
    );
    
    if (decklistResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Decklist not found' });
    }
    
    const decklistText = decklistResult.rows[0].decklist;
    const lines = decklistText.split('\n').filter(line => line.trim());
    
    // Parse decklist and allocate inventory
    for (const line of lines) {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (!match) continue;
      
      const neededQty = parseInt(match[1]);
      const cardName = match[2].trim();
      let remainingQty = neededQty;
      
      // Find inventory items for this card, sorted by purchase_date (oldest first)
      const inventoryItems = await client.query(
        `SELECT id, quantity, purchase_date FROM inventory 
         WHERE name ILIKE $1 AND quantity > 0
         ORDER BY purchase_date ASC, id ASC`,
        [cardName]
      );
      
      // Allocate oldest items first
      for (const item of inventoryItems.rows) {
        if (remainingQty <= 0) break;
        
        const qtyToUse = Math.min(remainingQty, item.quantity);
        
        // Add to container_items
        await client.query(
          `INSERT INTO container_items (container_id, inventory_id, quantity_used) 
           VALUES ($1, $2, $3)`,
          [container.id, item.id, qtyToUse]
        );
        
        // Reduce inventory quantity
        await client.query(
          `UPDATE inventory SET quantity = quantity - $1 WHERE id = $2`,
          [qtyToUse, item.id]
        );
        
        remainingQty -= qtyToUse;
      }
    }
    
    await client.query('COMMIT');
    res.json(container);
  } catch (err) {
    await client.query('ROLLBACK');
    handleDbError(err, res);
  } finally {
    client.release();
  }
});

// Get container items
app.get('/api/containers/:id/items', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ci.id, ci.inventory_id, ci.quantity_used, 
              inv.name, inv.set, inv.set_name, inv.purchase_price
       FROM container_items ci
       JOIN inventory inv ON ci.inventory_id = inv.id
       WHERE ci.container_id = $1
       ORDER BY inv.name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.delete('/api/containers/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get all items in this container to restore inventory
    const itemsResult = await client.query(
      `SELECT inventory_id, quantity_used FROM container_items WHERE container_id = $1`,
      [req.params.id]
    );
    
    // Restore inventory quantities
    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE inventory SET quantity = quantity + $1 WHERE id = $2`,
        [item.quantity_used, item.inventory_id]
      );
    }
    
    // Delete container_items
    await client.query(`DELETE FROM container_items WHERE container_id = $1`, [req.params.id]);
    
    // Delete container
    await client.query('DELETE FROM containers WHERE id = $1', [req.params.id]);
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    handleDbError(err, res);
  } finally {
    client.release();
  }
});

// Sales endpoints
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY sold_date DESC');
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { container_id, decklist_id, sale_price } = req.body;
    const result = await pool.query(
      'INSERT INTO sales (container_id, decklist_id, sale_price) VALUES ($1, $2, $3) RETURNING *',
      [container_id, decklist_id, sale_price]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Settings endpoints
app.get('/api/settings/:key', async (req, res) => {
  try {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
    if (result.rows.length > 0) {
      res.json(result.rows[0].value);
    } else {
      res.json(null);
    }
  } catch (err) {
    handleDbError(err, res);
  }
});

app.post('/api/settings/:key', async (req, res) => {
  try {
    const { value } = req.body;
    const result = await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2 RETURNING *',
      [req.params.key, JSON.stringify(value)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Helper function to fetch Card Kingdom price from MTGGoldfish widget
async function fetchCardKingdomPriceFromWidget(cardName, setCode) {
  try {
    const cardId = `${cardName} [${setCode.toUpperCase()}]`;
    const widgetUrl = `https://www.mtggoldfish.com/cardkingdom/price_widget?card_id=${encodeURIComponent(cardId)}`;
    
    const response = await fetch(widgetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      return 'N/A';
    }
    
    const html = await response.text();
    
    // Look for prices in the widget HTML
    // Card Kingdom widget typically shows multiple prices, we want the retail price (not bid)
    // Extract all prices and get the middle/higher one which is typically the retail asking price
    const priceMatches = html.match(/\$[\d.]+/g);
    
    if (priceMatches && priceMatches.length > 0) {
      // If there are multiple prices, return the second or third one
      // (first is often bid, later ones are asking prices)
      if (priceMatches.length >= 2) {
        // Try the second price (often the retail asking price)
        return priceMatches[1];
      }
      return priceMatches[0];
    }
    
    return 'N/A';
  } catch (error) {
    return 'N/A';
  }
}

// Card prices endpoint with both TCG and Card Kingdom
app.get('/api/prices/:cardName/:setCode', async (req, res) => {
  const { cardName, setCode } = req.params;
  
  try {
    let tcgPrice = 'N/A';
    let ckPrice = 'N/A';
    
    // Try to fetch with the primary set code first
    const scryfallUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}"+set:${setCode.toLowerCase()}&unique=prints`;
    const scryfallResponse = await fetch(scryfallUrl);
    let scryfallData = null;
    
    if (scryfallResponse.ok) {
      scryfallData = await scryfallResponse.json();
    }
    
    // If primary set was found, use it
    if (scryfallData && scryfallData.data && scryfallData.data.length > 0) {
      const card = scryfallData.data[0];
      tcgPrice = card.prices?.usd || 'N/A';
      if (tcgPrice !== 'N/A') {
        tcgPrice = `$${tcgPrice}`;
      }
      
      // Fetch Card Kingdom price from MTGGoldfish widget
      ckPrice = await fetchCardKingdomPriceFromWidget(cardName, setCode);
      
      // If CK price is N/A but we have TCG, estimate CK
      if (ckPrice === 'N/A' && tcgPrice !== 'N/A') {
        const tcgNum = parseFloat(tcgPrice.replace('$', ''));
        const estimatedCk = (tcgNum * 1.15).toFixed(2);
        ckPrice = `$${estimatedCk}`;
      }
    } else {
      // Primary set failed, try alternative set codes
      
      // Try to find a printing with CK pricing available
      const printingsUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}"&unique=prints&order=released`;
      const printingsResponse = await fetch(printingsUrl);
      
      if (printingsResponse.ok) {
        const printingsData = await printingsResponse.json();
        
        if (printingsData.data && printingsData.data.length > 0) {
          // Try each printing to find one with CK pricing (limit to 5 attempts)
          for (const card of printingsData.data.slice(0, 5)) {
            const altSetCode = card.set.toUpperCase();
            const altCkPrice = await fetchCardKingdomPriceFromWidget(cardName, altSetCode);
            
            if (altCkPrice !== 'N/A') {
              ckPrice = altCkPrice;
              // Get TCG price for this set
              if (card.prices?.usd) {
                tcgPrice = `$${card.prices.usd}`;
              }
              break;
            }
          }
          
          // If no CK pricing found, estimate from TCG or use first printing's TCG price
          if (ckPrice === 'N/A') {
            if (printingsData.data[0].prices?.usd) {
              tcgPrice = `$${printingsData.data[0].prices.usd}`;
              const tcgNum = parseFloat(tcgPrice.replace('$', ''));
              const estimatedCk = (tcgNum * 1.15).toFixed(2);
              ckPrice = `$${estimatedCk}`;
            }
          }
        }
      }
    }
    
    res.json({ tcg: tcgPrice, ck: ckPrice });
    
  } catch (error) {
    res.json({ tcg: 'N/A', ck: 'N/A', error: error.message });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
});
