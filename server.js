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

// Card prices endpoint with caching
const priceCache = {};
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

app.get('/api/prices/:cardName/:setCode', async (req, res) => {
  const { cardName, setCode } = req.params;
  
  console.log('=== PRICE REQUEST RECEIVED ===');
  console.log('Card Name:', cardName);
  console.log('Set Code:', setCode);
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    // First fetch from Scryfall to get set name and card price
    console.log('\n=== FETCHING SCRYFALL DATA ===');
    const scryfallUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}"+set:${setCode.toLowerCase()}&unique=prints`;
    console.log('Scryfall URL:', scryfallUrl);
    
    const scryfallResponse = await fetch(scryfallUrl);
    console.log('Scryfall Status:', scryfallResponse.status);
    
    let tcgPrice = 'N/A';
    let setName = '';
    
    if (scryfallResponse.ok) {
      const scryfallData = await scryfallResponse.json();
      if (scryfallData.data && scryfallData.data.length > 0) {
        const card = scryfallData.data[0];
        tcgPrice = card.prices?.usd || 'N/A';
        if (tcgPrice !== 'N/A') {
          tcgPrice = `$${tcgPrice}`;
        }
        setName = card.set_name || '';
        console.log('TCGPlayer Price:', tcgPrice);
        console.log('Set Name from Scryfall:', setName);
      }
    } else {
      console.log('❌ Scryfall fetch failed');
    }
    
    // Construct Card Kingdom URL with set name
    const cardSlug = cardName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const setSlug = setName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ckUrl = `https://www.cardkingdom.com/mtg/${setSlug}/${cardSlug}`;
    
    console.log('Card Kingdom URL:', ckUrl);
    console.log('Attempting fetch...');
    
    // Fetch Card Kingdom page
    const ckResponse = await fetch(ckUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      },
      redirect: 'follow'
    });
    
    console.log('Fetch completed!');
    console.log('Status Code:', ckResponse.status);
    console.log('Status Text:', ckResponse.statusText);
    console.log('Content-Type:', ckResponse.headers.get('content-type'));
    console.log('Response OK?:', ckResponse.ok);
    
    if (!ckResponse.ok) {
      console.log('❌ CK Response NOT OK - Status:', ckResponse.status);
      // Try Scryfall fallback
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
      return res.json({ ck: 'N/A', tcg: tcgPrice });
    }
    
    const html = await ckResponse.text();
    console.log('HTML received, length:', html.length, 'characters');
    console.log('First 500 chars of HTML:', html.substring(0, 500));
    console.log('Does HTML contain "Add to Cart"?', html.includes('Add to Cart'));
    console.log('Does HTML contain "$"?', html.includes('$'));
    console.log('Does HTML contain "price"?', html.toLowerCase().includes('price'));
    
    // Parse with Cheerio
    const $ = load(html);
    console.log('Cheerio loaded successfully');
    
    // Try multiple selectors
    console.log('\n=== SEARCHING FOR PRICES ===');
    
    // Method 1: Look for common price containers
    const priceSelectors = [
      '.itemAddToCart .stylePrice',
      '.productDetailPrice',
      '[class*="price"]',
      '[id*="price"]',
      'span.price',
      'div.price',
      '.itemAddToCart span',
      '.product-price',
      '[data-price]'
    ];
    
    let foundPrices = [];
    
    priceSelectors.forEach(selector => {
      const elements = $(selector);
      console.log(`Selector "${selector}": found ${elements.length} elements`);
      
      elements.each((i, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          console.log(`  [${i}] Text: "${text}"`);
          foundPrices.push(text);
        }
      });
    });
    
    // Method 2: Search all text nodes for $ signs
    console.log('\n=== SEARCHING FOR $ PATTERNS ===');
    const allText = $('body').text();
    const dollarMatches = allText.match(/\$\d+\.\d{2}/g);
    console.log('Found $ patterns:', dollarMatches?.slice(0, 10) || 'none');
    
    // Method 3: Look for specific Card Kingdom price structure
    console.log('\n=== CHECKING SPECIFIC CK STRUCTURES ===');
    
    // CK often uses this structure
    const ckPriceElements = $('.itemAddToCart');
    console.log('Found .itemAddToCart elements:', ckPriceElements.length);
    
    ckPriceElements.each((i, elem) => {
      const html = $(elem).html();
      const text = $(elem).text();
      console.log(`\nAddToCart [${i}]:`);
      console.log('HTML:', html?.substring(0, 200));
      console.log('Text:', text?.substring(0, 100));
    });
    
    // Method 4: Check for JavaScript-rendered prices
    console.log('\n=== CHECKING FOR DATA ATTRIBUTES ===');
    $('[data-price], [data-amount], [data-value]').each((i, elem) => {
      console.log(`Element [${i}]:`, {
        tag: elem.name,
        price: $(elem).attr('data-price'),
        amount: $(elem).attr('data-amount'),
        value: $(elem).attr('data-value'),
        text: $(elem).text().substring(0, 50)
      });
    });
    
    // Try to parse any found price
    let ckPrice = 'N/A';
    
    // Parse from foundPrices array
    for (const priceText of foundPrices) {
      const match = priceText.match(/\$?(\d+\.\d{2})/);
      if (match) {
        const price = parseFloat(match[1]);
        console.log(`Attempting to parse: "${priceText}" -> $${price}`);
        if (price > 0.50) {
          ckPrice = price.toFixed(2);
          console.log('✅ Valid CK price found:', ckPrice);
          break;
        } else {
          console.log('❌ Price too low:', price);
        }
      }
    }
    
    // If still N/A, try direct text search
    if (ckPrice === 'N/A' && dollarMatches && dollarMatches.length > 0) {
      for (const match of dollarMatches) {
        const price = parseFloat(match.replace('$', ''));
        if (price > 0.50 && price < 10000) {
          ckPrice = price.toFixed(2);
          console.log('✅ Found price from pattern matching:', ckPrice);
          break;
        }
      }
    }
    
    console.log('\n=== FINAL RESULT ===');
    console.log('Card Kingdom Price:', ckPrice);
    
    // Get TCG price from Scryfall
    console.log('\n=== FETCHING SCRYFALL DATA ===');
    const scryfallUrl = `https://api.scryfall.com/cards/search?q=!"${cardName}"+set:${setCode.toLowerCase()}&unique=prints`;
    console.log('Scryfall URL:', scryfallUrl);
    
    const scryfallResponse = await fetch(scryfallUrl);
    console.log('Scryfall Status:', scryfallResponse.status);
    
    let tcgPrice = 'N/A';
    
    if (scryfallResponse.ok) {
      const scryfallData = await scryfallResponse.json();
      if (scryfallData.data && scryfallData.data.length > 0) {
        tcgPrice = scryfallData.data[0].prices?.usd || 'N/A';
        if (tcgPrice !== 'N/A') {
          tcgPrice = `$${tcgPrice}`;
        }
      }
      console.log('TCGPlayer Price:', tcgPrice);
    } else {
      console.log('❌ Scryfall fetch failed');
    }
    
    console.log('=== REQUEST COMPLETE ===\n');
    
    res.json({ ck: ckPrice, tcg: tcgPrice });
    
  } catch (error) {
    console.error('💥 ERROR IN PRICE ENDPOINT:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.json({ ck: 'N/A', tcg: 'N/A', error: error.message });
  }
});

// DEBUG ENDPOINT - Remove after testing
app.get('/api/debug/ck/:cardName', async (req, res) => {
  const { cardName } = req.params;
  
  try {
    const ckSlug = cardName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ckUrl = `https://www.cardkingdom.com/mtg/${ckSlug}`;
    
    console.log('DEBUG: Testing URL:', ckUrl);
    
    const response = await fetch(ckUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    
    res.json({
      url: ckUrl,
      status: response.status,
      htmlLength: html.length,
      htmlPreview: html.substring(0, 1000),
      containsDollar: html.includes('$'),
      containsAddToCart: html.includes('Add to Cart')
    });
    
  } catch (error) {
    res.json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
