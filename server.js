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

// Helper function to fetch Card Kingdom price from MTGGoldfish widget
async function fetchCardKingdomPriceFromWidget(cardName, setCode) {
  try {
    const cardId = `${cardName} [${setCode.toUpperCase()}]`;
    console.log('🔍 Fetching CK price from widget, card_id:', cardId);
    
    const widgetUrl = `https://www.mtggoldfish.com/cardkingdom/price_widget?card_id=${encodeURIComponent(cardId)}`;
    
    const response = await fetch(widgetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log('⚠️ Widget status:', response.status);
      return 'N/A';
    }
    
    const html = await response.text();
    const $ = load(html);
    
    // Try multiple parsing strategies to find the price
    let price = 'N/A';
    
    // Strategy 1: Look for price in table cells
    const tables = $('table');
    tables.each((tableIdx, table) => {
      if (price !== 'N/A') return false;
      
      $(table).find('tr').each((rowIdx, row) => {
        if (price !== 'N/A') return false;
        const cells = $(row).find('td');
        
        // Look through all cells for a price pattern
        cells.each((cellIdx, cell) => {
          const text = $(cell).text().trim();
          const match = text.match(/^\$[\d.]+/);
          if (match) {
            price = match[0];
            console.log('✅ Found CK price:', price);
            return false;
          }
        });
      });
    });
    
    // Strategy 2: Look for price anywhere in the HTML with regex
    if (price === 'N/A') {
      const priceRegex = /\$[\d.]+/g;
      const matches = html.match(priceRegex);
      if (matches && matches.length > 0) {
        // Filter out common false positives and get the smallest price
        const prices = matches.map(p => parseFloat(p.replace('$', ''))).sort((a, b) => a - b);
        if (prices.length > 0) {
          price = `$${prices[0].toFixed(2)}`;
          console.log('✅ Found CK price (regex):', price);
        }
      }
    }
    
    return price;
  } catch (error) {
    console.log('❌ Widget parse failed:', error.message);
    return 'N/A';
  }
}

// Card prices endpoint with both TCG and Card Kingdom
app.get('/api/prices/:cardName/:setCode', async (req, res) => {
  const { cardName, setCode } = req.params;
  
  console.log('=== PRICE REQUEST ===');
  console.log('Card:', cardName, 'Set:', setCode);
  
  try {
    // Fetch TCG price from Scryfall
    const scryfallUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}"+set:${setCode.toLowerCase()}&unique=prints`;
    
    const scryfallResponse = await fetch(scryfallUrl);
    let tcgPrice = 'N/A';
    
    if (scryfallResponse.ok) {
      const scryfallData = await scryfallResponse.json();
      if (scryfallData.data && scryfallData.data.length > 0) {
        const card = scryfallData.data[0];
        tcgPrice = card.prices?.usd || 'N/A';
        if (tcgPrice !== 'N/A') {
          tcgPrice = `$${tcgPrice}`;
        }
      }
    }
    
    console.log('TCG Price:', tcgPrice);
    
    // Fetch Card Kingdom price from MTGGoldfish widget
    const ckPrice = await fetchCardKingdomPriceFromWidget(cardName, setCode);
    console.log('CK Price:', ckPrice);
    
    res.json({ tcg: tcgPrice, ck: ckPrice });
    
  } catch (error) {
    console.error('Error fetching price:', error.message);
    res.json({ tcg: 'N/A', ck: 'N/A', error: error.message });
  }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
