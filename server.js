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

// Smart Scryfall fallback that prefers recent, affordable printings
const getScryfallPriceWithSmartSetSelection = async (cardName, requestedSet) => {
  try {
    // First, try the requested set
    try {
      const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${requestedSet.toLowerCase()}`;
      const response = await fetch(url);
      if (response.ok) {
        const card = await response.json();
        const price = parseFloat(card.prices?.usd) || 0;
        if (price > 0) {
          return {
            tcg: `$${price.toFixed(2)}`,
            ck: `$${(price * 1.15).toFixed(2)}`,
            source: `Scryfall (${requestedSet})`
          };
        }
      }
    } catch (e) {
      console.log('Requested set not found, searching for cheapest printing...');
    }
    
    // If that fails, search ALL printings and find the cheapest recent one
    const searchUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}"&unique=prints&order=released`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.data || searchData.data.length === 0) {
      throw new Error('Card not found');
    }
    
    // Filter to cards with USD prices, prefer recent sets
    const cardsWithPrices = searchData.data
      .filter(card => card.prices?.usd && parseFloat(card.prices.usd) > 0)
      .map(card => ({
        set: card.set,
        setName: card.set_name,
        price: parseFloat(card.prices.usd),
        releaseDate: card.released_at,
        // Prefer standard-legal, recent sets
        isRecent: new Date(card.released_at) > new Date('2020-01-01'),
        isStandard: ['standard', 'core'].includes(card.set_type)
      }))
      .sort((a, b) => {
        // Sort by: recent > standard > cheapest
        if (a.isRecent !== b.isRecent) return b.isRecent - a.isRecent;
        if (a.isStandard !== b.isStandard) return b.isStandard - a.isStandard;
        return a.price - b.price;
      });
    
    if (cardsWithPrices.length === 0) {
      throw new Error('No cards with prices found');
    }
    
    const bestCard = cardsWithPrices[0];
    console.log(`Selected ${bestCard.setName} (${bestCard.set}) at $${bestCard.price}`);
    
    return {
      tcg: `$${bestCard.price.toFixed(2)}`,
      ck: `$${(bestCard.price * 1.15).toFixed(2)}`,
      source: `Scryfall (${bestCard.set} - cheapest recent)`
    };
    
  } catch (error) {
    console.error('Scryfall fallback error:', error);
    return { tcg: 'N/A', ck: 'N/A', source: 'Error' };
  }
};

// Card prices endpoint with MTGGoldfish HTML scraping and smart fallback
app.get('/api/prices/:cardName/:setCode', async (req, res) => {
  const { cardName, setCode } = req.params;
  
  console.log(`\n=== PRICE REQUEST: ${cardName} (${setCode}) ===`);
  
  // Strategy 1: Try MTGGoldfish direct price page with HTML scraping
  try {
    const formattedName = cardName.replace(/\s+/g, '_');
    const mtgGoldfishUrl = `https://www.mtggoldfish.com/price/${setCode}/${formattedName}`;
    
    console.log(`Trying MTGGoldfish: ${mtgGoldfishUrl}`);
    
    const response = await fetch(mtgGoldfishUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json'
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      
      // Look for embedded price data in the HTML - Card Kingdom and TCGPlayer prices
      const ckMatch = html.match(/Card\s+Kingdom[^$]*\$\s*([0-9.]+)/i);
      const tcgMatch = html.match(/TCG\s*Player[^$]*\$\s*([0-9.]+)/i);
      
      if (ckMatch || tcgMatch) {
        const ckPrice = ckMatch ? parseFloat(ckMatch[1]) : 0;
        const tcgPrice = tcgMatch ? parseFloat(tcgMatch[1]) : 0;
        
        console.log(`✓ MTGGoldfish success: TCG=$${tcgPrice}, CK=$${ckPrice}`);
        
        return res.json({
          tcg: tcgPrice > 0 ? `$${tcgPrice.toFixed(2)}` : 'N/A',
          ck: ckPrice > 0 ? `$${ckPrice.toFixed(2)}` : (tcgPrice > 0 ? `$${(tcgPrice * 1.15).toFixed(2)}` : 'N/A')
        });
      }
    }
    
    console.log(`✗ MTGGoldfish failed (${response.status})`);
  } catch (error) {
    console.log(`✗ MTGGoldfish error: ${error.message}`);
  }
  
  // Strategy 2: Scryfall with smart set selection
  console.log('Falling back to Scryfall with smart set selection...');
  const scryfallResult = await getScryfallPriceWithSmartSetSelection(cardName, setCode);
  res.json(scryfallResult);
});

// Debug endpoint to test MTGGoldfish responses
app.get('/api/debug/mtggoldfish/:cardName/:setCode?', async (req, res) => {
  const { cardName, setCode } = req.params;
  const results = {};
  
  // Test MTGGoldfish direct price endpoint
  try {
    const formattedName = cardName.replace(/\s+/g, '_');
    const mtgGoldfishUrl = `https://www.mtggoldfish.com/price/${setCode || 'LEA'}/${formattedName}`;
    console.log('Testing MTGGoldfish URL:', mtgGoldfishUrl);
    
    const response = await fetch(mtgGoldfishUrl);
    const html = await response.text();
    
    // Look for price patterns
    const ckMatch = html.match(/Card\s+Kingdom[^$]*\$\s*([0-9.]+)/i);
    const tcgMatch = html.match(/TCG\s*Player[^$]*\$\s*([0-9.]+)/i);
    
    results.mtgGoldfish = {
      status: response.status,
      htmlLength: html.length,
      foundCK: !!ckMatch,
      foundTCG: !!tcgMatch,
      ckPrice: ckMatch ? ckMatch[1] : null,
      tcgPrice: tcgMatch ? tcgMatch[1] : null,
      htmlSnippet: html.substring(0, 500)
    };
  } catch (e) {
    results.mtgGoldfish = { error: e.message };
  }
  
  res.json(results);
});


const PORT = 3000;
app.listen(PORT, () => {
});
