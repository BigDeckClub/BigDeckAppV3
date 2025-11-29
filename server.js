import express from 'express';
import ViteExpress from 'vite-express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';
import { load } from 'cheerio';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
// import { mtgjsonService } from './server/mtgjsonPriceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pkg;
const app = express();

// Trust proxy for correct client IP handling in cloud environments
app.set('trust proxy', 1);

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS handler - allow all origins in development/production
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// ========== RATE LIMITING ==========
const priceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

// PostgreSQL connection
const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// ========== DATABASE INITIALIZATION ==========
async function initializeDatabase() {
  try {
    // Users table (for Replit Auth)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        profile_image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Sessions table (for Replit Auth)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire)`).catch(() => {});

    // Inventory table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        set VARCHAR(20),
        set_name VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        purchase_price REAL,
        purchase_date TEXT,
        reorder_type VARCHAR(20) DEFAULT 'Normal',
        image_url TEXT,
        scryfall_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS scryfall_id VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});

    // Decklists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decklists (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        decklist TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE decklists ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});

    // Containers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS containers (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        decklist_id INTEGER REFERENCES decklists(id) ON DELETE SET NULL,
        cards JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE containers ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await pool.query(`ALTER TABLE containers ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]'`).catch(() => {});

    // Container items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS container_items (
        id SERIAL PRIMARY KEY,
        container_id INTEGER REFERENCES containers(id) ON DELETE CASCADE,
        inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Sales table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        container_id INTEGER REFERENCES containers(id) ON DELETE SET NULL,
        sale_price REAL,
        sale_date TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});

    // Imports table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS imports (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        card_list TEXT,
        source VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS card_list TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS source VARCHAR(50)`).catch(() => {});
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`).catch(() => {});
    await pool.query(`ALTER TABLE imports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`).catch(() => {});

    // Usage history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usage_history (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Purchase history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_history (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER REFERENCES inventory(id) ON DELETE RESTRICT,
        purchase_date TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('[DB] ✓ Database initialized successfully');
  } catch (err) {
    console.error('[DB] ✗ Failed to initialize database:', err);
  }
}

// ========== HELPER FUNCTIONS ==========
function parseDecklistTextToCards(deckText) {
  if (!deckText || typeof deckText !== "string") return [];

  const lines = deckText.split(/\r?\n/);
  const cards = [];

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const qtyNameMatch = line.match(/^\s*(\d+)\s+(.+)$/);
    let qty = 1;
    let rest = line;
    if (qtyNameMatch) {
      qty = parseInt(qtyNameMatch[1], 10) || 1;
      rest = qtyNameMatch[2].trim();
    }

    let name = rest;
    let set = "";

    const parenMatch = rest.match(/^(.*?)\s*\(\s*([^)]+)\s*\)\s*$/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      set = parenMatch[2].trim();
    } else {
      const sepMatch = rest.match(/^(.*?)\s*(?:[-|]\s*)([A-Za-z0-9]+)\s*$/);
      if (sepMatch) {
        name = sepMatch[1].trim();
        set = sepMatch[2].trim();
      } else {
        const trailingSetMatch = rest.match(/^(.*)\s+([A-Z0-9]{2,6})$/);
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

// ========== FETCH WITH RETRY ==========
async function fetchRetry(url, options = {}, retries = 2) {
  try {
    const response = await fetch(url, {
      timeout: 10000,
      ...options
    });
    return response;
  } catch (err) {
    if (retries > 0) {
      console.log(`[FETCH] Retry ${3 - retries}/2 for ${url}`);
      return fetchRetry(url, options, retries - 1);
    }
    console.error(`[FETCH] Failed after retries: ${url}`);
    return null;
  }
}

// ========== HEALTH CHECK ==========
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// ========== PRICES ENDPOINT ==========
app.get('/api/prices/:cardName/:setCode', priceLimiter, async (req, res) => {
  const { cardName, setCode } = req.params;
  
  console.log(`[PRICES] Lookup request: card="${cardName}", set="${setCode}"`);
  
  try {
    let tcgPrice = 'N/A';
    let scryfallRes = null;
    
    if (setCode && setCode.length > 0) {
      const exactUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${setCode.toLowerCase()}`;
      console.log(`[PRICES] Trying Scryfall exact match: ${exactUrl}`);
      scryfallRes = await fetchRetry(exactUrl);
      
      if (!scryfallRes?.ok) {
        console.log(`[PRICES] Exact match failed, trying fuzzy search...`);
        scryfallRes = null;
      }
    }
    
    if (!scryfallRes) {
      const fuzzyUrl = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
      console.log(`[PRICES] Trying Scryfall fuzzy search: ${fuzzyUrl}`);
      scryfallRes = await fetchRetry(fuzzyUrl);
    }
    
    if (scryfallRes?.ok) {
      try {
        const card = await scryfallRes.json();
        const price = parseFloat(card.prices?.usd);
        if (price > 0) {
          tcgPrice = `$${price.toFixed(2)}`;
          console.log(`[PRICES] ✓ TCG price found: ${tcgPrice}`);
        }
      } catch (parseErr) {
        console.error(`[PRICES] ✗ Failed to parse Scryfall response:`, parseErr.message);
      }
    }
    
    let ckPrice = 'N/A';
    try {
      const ckSearchUrl = `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${encodeURIComponent(cardName)}`;
      const response = await fetchRetry(ckSearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response?.ok) {
        const html = await response.text();
        if (html && html.length > 50 && !html.includes("captcha")) {
          const $ = load(html);
          const priceElement = $('[class*="price"]').first();
          if (priceElement.length) {
            const priceText = priceElement.text().trim();
            if (priceText) ckPrice = priceText;
          }
        }
      }
    } catch (err) {
      // Silent fail for CK scraping
    }
    
    // If CK price not found, try MTGJSON as fallback
    if (ckPrice === 'N/A') {
      try {
        // Try lookup by card name
        const mtgjsonData = mtgjsonService.getPriceByName(cardName);
        if (mtgjsonData?.ck) {
          ckPrice = `$${mtgjsonData.ck}`;
          console.log(`[PRICES] ✓ CK price from MTGJSON: ${ckPrice}`);
        }
      } catch (err) {
        // Silent fail for MTGJSON fallback
      }
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ tcg: tcgPrice, ck: ckPrice });
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ tcg: 'N/A', ck: 'N/A' });
  }
});

// ========== TEST ENDPOINT ==========
app.get('/api/prices-test/:cardName/:setCode', (req, res) => {
  res.json({ 
    tcg: "$1.23", 
    ck: "$2.34",
    source: "test-endpoint",
    timestamp: new Date().toISOString()
  });
});

// ========== IMPORTS ENDPOINTS ==========
app.get('/api/imports', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM imports ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[IMPORTS] Error fetching imports:', error.message);
    res.status(500).json({ error: 'Failed to fetch imports' });
  }
});

app.post('/api/imports', async (req, res) => {
  const { title, description, cardList, source, status } = req.body;
  
  if (!title || !cardList) {
    return res.status(400).json({ error: 'Title and card list are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO imports (title, description, card_list, source, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [title, description || null, cardList, source || 'wholesale', status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[IMPORTS] Error creating import:', error.message);
    res.status(500).json({ error: 'Failed to create import' });
  }
});

app.delete('/api/imports/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM imports WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Import not found' });
    }
    
    res.json({ message: 'Import deleted', import: result.rows[0] });
  } catch (error) {
    console.error('[IMPORTS] Error deleting import:', error.message);
    res.status(500).json({ error: 'Failed to delete import' });
  }
});

app.patch('/api/imports/:id/complete', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE imports SET status = 'completed', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Import not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[IMPORTS] Error updating import:', error.message);
    res.status(500).json({ error: 'Failed to update import' });
  }
});

app.patch('/api/imports/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, cardList, source, status } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (cardList !== undefined) {
      updates.push(`card_list = $${paramCount++}`);
      values.push(cardList);
    }
    if (source !== undefined) {
      updates.push(`source = $${paramCount++}`);
      values.push(source);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE imports SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Import not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[IMPORTS] Error updating import:', error.message);
    res.status(500).json({ error: 'Failed to update import' });
  }
});

// ========== STARTUP FUNCTION ==========
async function startServer() {
  try {
    console.log('[APP] Initializing database...');
    await initializeDatabase();
    
    console.log('[APP] Initializing MTGJSON price service...');
    await mtgjsonService.initialize();
    console.log('[APP] ✓ MTGJSON service ready');
    

    // ========== CATCH-ALL HANDLER (AFTER all routes) ==========
    app.use((req, res) => {
      if (req.path.startsWith('/api/')) {
        console.log(`[404] API endpoint not found: ${req.method} ${req.path}`);
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      // Let ViteExpress handle everything else (SPA routes, static files, etc.)
    });

    // ========== START WITH VITE EXPRESS ==========
    const PORT = process.env.PORT || 3000;
    ViteExpress.listen(app, PORT, () => {
      console.log(`[SERVER] ✓ Running on port ${PORT}`);
      console.log('[SERVER] ✓ All systems ready');
    });
  } catch (error) {
    console.error('[APP] ✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
