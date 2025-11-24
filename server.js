import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';

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
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully at', res.rows[0].now);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Inventory endpoints
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: err.message });
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
    console.error('Error adding inventory:', err);
    res.status(500).json({ error: err.message });
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
    console.error('Error updating inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

// Decklists endpoints
app.get('/api/decklists', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM decklists ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching decklists:', err);
    res.status(500).json({ error: err.message });
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
    console.error('Error adding decklist:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/decklists/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM decklists WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting decklist:', err);
    res.status(500).json({ error: err.message });
  }
});

// Containers endpoints
app.get('/api/containers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM containers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching containers:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/containers', async (req, res) => {
  try {
    const { name, decklist_id } = req.body;
    const result = await pool.query(
      'INSERT INTO containers (name, decklist_id) VALUES ($1, $2) RETURNING *',
      [name, decklist_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding container:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/containers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM containers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting container:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sales endpoints
app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY sold_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: err.message });
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
    console.error('Error recording sale:', err);
    res.status(500).json({ error: err.message });
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
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: err.message });
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
    console.error('Error saving settings:', err);
    res.status(500).json({ error: err.message });
  }
});

// Card prices endpoint with caching
const priceCache = {};
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

app.get('/api/prices/:cardName/:setCode', async (req, res) => {
  try {
    const { cardName, setCode } = req.params;
    const cacheKey = `${cardName}|${setCode}`;
    const now = Date.now();
    
    // Check cache
    if (priceCache[cacheKey] && (now - priceCache[cacheKey].timestamp) < CACHE_DURATION) {
      return res.json(priceCache[cacheKey].data);
    }
    
    // Fetch TCG price from Scryfall
    let tcgPrice = 'N/A';
    try {
      const scryfallRes = await fetch(`https://api.scryfall.com/cards/search?q=!"${cardName}"+set:${setCode.toLowerCase()}&unique=prints`);
      if (scryfallRes.ok) {
        const scryfallData = await scryfallRes.json();
        if (scryfallData.data && scryfallData.data.length > 0) {
          const card = scryfallData.data[0];
          if (card.prices?.usd) {
            tcgPrice = `$${parseFloat(card.prices.usd).toFixed(2)}`;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching Scryfall prices:', err);
    }
    
    // Fetch Card Kingdom price from their website
    let ckPrice = 'N/A';
    try {
      const scryfallRes = await fetch(`https://api.scryfall.com/cards/search?q=!"${cardName}"+set:${setCode.toLowerCase()}&unique=prints`);
      if (scryfallRes.ok) {
        const scryfallData = await scryfallRes.json();
        if (scryfallData.data && scryfallData.data.length > 0) {
          const card = scryfallData.data[0];
          // Try to find the scryfall_id and search Card Kingdom for exact card
          if (card.id) {
            try {
              // Construct Card Kingdom search URL based on card name and set
              const ckSearch = encodeURIComponent(`${cardName} ${setCode}`);
              const ckRes = await fetch(`https://www.cardkingdom.com/api/mtg/card/search?q=${ckSearch}`, {
                headers: { 'User-Agent': 'MTGCardManager/1.0' }
              });
              if (ckRes.ok) {
                const ckData = await ckRes.json();
                if (ckData && ckData[0] && ckData[0].price) {
                  ckPrice = `$${parseFloat(ckData[0].price).toFixed(2)}`;
                }
              }
            } catch (ckErr) {
              console.error('Card Kingdom API not available, using estimation:', ckErr);
              // Fallback: estimate based on Scryfall data
              if (card.prices?.usd_foil) {
                ckPrice = `$${parseFloat(card.prices.usd_foil).toFixed(2)}`;
              } else if (card.prices?.usd) {
                const estimated = parseFloat(card.prices.usd) * 1.15;
                ckPrice = `$${estimated.toFixed(2)}`;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching prices:', err);
    }
    
    const priceData = { tcg: tcgPrice, ck: ckPrice, updated: new Date().toISOString() };
    
    // Cache the result
    priceCache[cacheKey] = { data: priceData, timestamp: now };
    
    res.json(priceData);
  } catch (err) {
    console.error('Error fetching prices:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
