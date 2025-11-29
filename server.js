import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { mtgjsonService } from './server/mtgjsonPriceService.js';

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

// CORS handler - allow all origins for development and Replit deployment
// This is intentional: the app has no authentication and is designed for open access
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

// Rate limiter for deck operations
const deckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60 // Allow 60 deck operations per minute
});

// ========== PRICE CACHING ==========
const priceCache = new Map();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedPrice(key) {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedPrice(key, data) {
  // Clean up expired entries when cache grows large to prevent memory leak
  if (priceCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of priceCache.entries()) {
      if (now - v.timestamp >= PRICE_CACHE_TTL) {
        priceCache.delete(k);
      }
    }
  }
  priceCache.set(key, { data, timestamp: Date.now() });
}

// ========== SERVER TRACKING ==========
const serverStartTime = Date.now();

// PostgreSQL connection
const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// ========== DATABASE CONNECTION MONITORING ==========
pool.on('error', (err, client) => {
  console.error('[DB] ✗ Unexpected pool error:', err.message);
  console.error('[DB] Error code:', err.code);
  console.error('[DB] Error stack:', err.stack);
  if (client) {
    console.error('[DB] Client details:', client);
  }
});

pool.on('connect', () => {
  console.log('[DB] ✓ New client connected to pool');
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
        user_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        set VARCHAR(20),
        set_name VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        purchase_price REAL,
        purchase_date TEXT,
        reorder_type VARCHAR(20) DEFAULT 'Normal',
        image_url TEXT,
        scryfall_id VARCHAR(255),
        folder VARCHAR(255) DEFAULT 'Uncategorized',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS scryfall_id VARCHAR(255)`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS folder VARCHAR(255) DEFAULT 'Uncategorized'`).catch(() => {});
    await pool.query(`ALTER TABLE inventory DROP COLUMN IF EXISTS location`).catch(() => {});
    await pool.query(`ALTER TABLE inventory DROP COLUMN IF EXISTS is_shared_location`).catch(() => {});

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
        cards JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE containers ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE`).catch(() => {});
    await pool.query(`ALTER TABLE containers ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]'`).catch(() => {});
    await pool.query(`ALTER TABLE containers DROP COLUMN IF EXISTS decklist_id`).catch(() => {});
    await pool.query(`ALTER TABLE containers DROP COLUMN IF EXISTS location`).catch(() => {});

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

    // Decks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        source VARCHAR(50),
        source_id VARCHAR(100),
        source_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Deck cards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_cards (
        id SERIAL PRIMARY KEY,
        deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
        card_name VARCHAR(255) NOT NULL,
        quantity INTEGER DEFAULT 1,
        category VARCHAR(100),
        set_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deck_cards_deck_id ON deck_cards(deck_id)`).catch(() => {});

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
  let dbStatus = 'disconnected'; // Default to disconnected for safety
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
  }
  
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const response = {
    ok: dbStatus === 'connected',
    database: dbStatus,
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString()
  };
  
  res.status(response.ok ? 200 : 500).json(response);
});

// ========== PRICES ENDPOINT ==========
app.get('/api/prices/:cardName/:setCode', priceLimiter, async (req, res) => {
  const { cardName, setCode } = req.params;
  const cacheKey = `${cardName.toLowerCase()}_${(setCode || '').toLowerCase()}`;
  
  // Check cache first
  const cachedResult = getCachedPrice(cacheKey);
  if (cachedResult) {
    console.log(`[PRICES] Cache hit for: card="${cardName}", set="${setCode}"`);
    return res.status(200).json(cachedResult);
  }
  
  console.log(`[PRICES] Lookup request: card="${cardName}", set="${setCode}"`);
  
  try {
    let tcgPrice = 'N/A';
    let ckPrice = 'N/A';
    let scryfallRes = null;
    let cardData = null;
    
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
        cardData = await scryfallRes.json();
        const price = parseFloat(cardData.prices?.usd);
        if (price > 0) {
          tcgPrice = `$${price.toFixed(2)}`;
          console.log(`[PRICES] ✓ TCG price found: ${tcgPrice}`);
        }
      } catch (parseErr) {
        console.error(`[PRICES] ✗ Failed to parse Scryfall response:`, parseErr.message);
      }
    }
    
    // Get Card Kingdom price from MTGJSON using the card's Scryfall ID
    if (cardData) {
      try {
        // Scryfall returns the card's unique ID which we can use to look up MTGJSON prices
        const scryfallId = cardData.id;
        if (scryfallId) {
          const ckPriceResult = mtgjsonService.getCardKingdomPriceByScryfallId(scryfallId);
          if (ckPriceResult) {
            ckPrice = ckPriceResult;
            console.log(`[PRICES] ✓ CK price found via MTGJSON: ${ckPrice}`);
          } else {
            console.log(`[PRICES] No CK price found in MTGJSON for Scryfall ID: ${scryfallId}`);
          }
        }
      } catch (err) {
        console.error(`[PRICES] ✗ Failed to get CK price from MTGJSON:`, err.message);
      }
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(result);
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ tcg: 'N/A', ck: 'N/A' });
  }
});

// ========== INVENTORY ENDPOINTS ==========
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, set, set_name, quantity, purchase_price, purchase_date, 
              reorder_type, image_url, scryfall_id, folder, created_at 
       FROM inventory ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[INVENTORY] Error fetching:', error.message);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

app.post('/api/inventory', async (req, res) => {
  const { name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, folder } = req.body;
  
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Card name is required and must be a non-empty string' });
  }
  
  // Quantity is optional but must be a positive integer greater than zero when provided
  if (quantity !== undefined && quantity !== null && (typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity))) {
    return res.status(400).json({ error: 'Quantity must be a positive integer greater than zero when provided' });
  }
  
  // Purchase price is optional but must be a non-negative number when provided
  if (purchase_price !== undefined && purchase_price !== null && (typeof purchase_price !== 'number' || purchase_price < 0)) {
    return res.status(400).json({ error: 'Purchase price must be a non-negative number when provided' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inventory (name, set, set_name, quantity, purchase_price, purchase_date, reorder_type, image_url, folder, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [name, set || null, set_name || null, quantity || 1, purchase_price || null, purchase_date || null, reorder_type || 'normal', image_url || null, folder || 'Uncategorized']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[INVENTORY] Error creating:', error.message);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity, purchase_price, purchase_date, reorder_type, folder } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount++}`);
      values.push(quantity);
    }
    if (purchase_price !== undefined) {
      updates.push(`purchase_price = $${paramCount++}`);
      values.push(purchase_price);
    }
    if (purchase_date !== undefined) {
      updates.push(`purchase_date = $${paramCount++}`);
      values.push(purchase_date);
    }
    if (reorder_type !== undefined) {
      updates.push(`reorder_type = $${paramCount++}`);
      values.push(reorder_type);
    }
    if (folder !== undefined) {
      updates.push(`folder = $${paramCount++}`);
      values.push(folder);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE inventory SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[INVENTORY] Error updating:', error.message);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM inventory WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    res.json({ message: 'Inventory item deleted', item: result.rows[0] });
  } catch (error) {
    console.error('[INVENTORY] Error deleting:', error.message);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
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
  
  // Input validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }
  
  if (!cardList || typeof cardList !== 'string' || cardList.trim().length === 0) {
    return res.status(400).json({ error: 'Card list is required and must be a non-empty string' });
  }
  
  const validSources = ['wholesale', 'tcgplayer', 'cardkingdom', 'local', 'other'];
  if (source !== undefined && source !== null && !validSources.includes(source)) {
    return res.status(400).json({ error: `Source must be one of: ${validSources.join(', ')}` });
  }
  
  const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
  if (status !== undefined && status !== null && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
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

// ========== DECKS ENDPOINTS ==========

// Helper function to parse manual decklist text
function parseManualDecklist(decklistText) {
  if (!decklistText || typeof decklistText !== 'string') return [];
  
  const lines = decklistText.split(/\r?\n/);
  const cards = [];
  let currentCategory = null;
  
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    
    // Check if line is a category header (starts with // or contains no digits)
    if (line.startsWith('//') || line.startsWith('#')) {
      currentCategory = line.replace(/^[/#]+\s*/, '').trim();
      continue;
    }
    
    // Try to match "quantity cardname" or "quantityx cardname" patterns
    const match = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    if (match) {
      const quantity = parseInt(match[1], 10) || 1;
      const cardName = match[2].trim();
      cards.push({
        card_name: cardName,
        quantity,
        category: currentCategory || 'Main Deck',
        set_code: null
      });
    } else if (/[a-zA-Z]/.test(line)) {
      // Line contains letters but no quantity prefix - treat as single card
      // This excludes lines that are purely numeric (which are invalid)
      cards.push({
        card_name: line,
        quantity: 1,
        category: currentCategory || 'Main Deck',
        set_code: null
      });
    }
    // Lines that are purely numeric are skipped as they don't represent valid cards
  }
  
  return cards;
}

// GET /api/decks - List all saved decks
app.get('/api/decks', deckLimiter, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
             COALESCE(SUM(dc.quantity), 0) as card_count
      FROM decks d
      LEFT JOIN deck_cards dc ON d.id = dc.deck_id
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[DECKS] Error fetching decks:', error.message);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

// GET /api/decks/:id - Get a specific deck with its cards
app.get('/api/decks/:id', deckLimiter, async (req, res) => {
  const { id } = req.params;
  
  try {
    const deckResult = await pool.query(
      'SELECT * FROM decks WHERE id = $1',
      [id]
    );
    
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    const cardsResult = await pool.query(
      'SELECT * FROM deck_cards WHERE deck_id = $1 ORDER BY category, card_name',
      [id]
    );
    
    res.json({
      ...deckResult.rows[0],
      cards: cardsResult.rows
    });
  } catch (error) {
    console.error('[DECKS] Error fetching deck:', error.message);
    res.status(500).json({ error: 'Failed to fetch deck' });
  }
});

// POST /api/decks - Create a new deck (manual import)
app.post('/api/decks', deckLimiter, async (req, res) => {
  const { name, description, decklist } = req.body;
  
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Deck name is required and must be a non-empty string' });
  }
  
  if (!decklist || typeof decklist !== 'string' || decklist.trim().length === 0) {
    return res.status(400).json({ error: 'Decklist is required and must be a non-empty string' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create the deck
    const deckResult = await client.query(
      `INSERT INTO decks (name, description, source, created_at, updated_at)
       VALUES ($1, $2, 'manual', NOW(), NOW())
       RETURNING *`,
      [name.trim(), description || null]
    );
    
    const deck = deckResult.rows[0];
    
    // Parse and insert cards
    const cards = parseManualDecklist(decklist);
    
    for (const card of cards) {
      await client.query(
        `INSERT INTO deck_cards (deck_id, card_name, quantity, category, set_code, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [deck.id, card.card_name, card.quantity, card.category, card.set_code]
      );
    }
    
    await client.query('COMMIT');
    
    // Return the deck with cards
    const cardsResult = await pool.query(
      'SELECT * FROM deck_cards WHERE deck_id = $1 ORDER BY category, card_name',
      [deck.id]
    );
    
    res.status(201).json({
      ...deck,
      cards: cardsResult.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[DECKS] Error creating deck:', error.message);
    res.status(500).json({ error: 'Failed to create deck' });
  } finally {
    client.release();
  }
});

// POST /api/decks/import/archidekt - Import deck from Archidekt URL
app.post('/api/decks/import/archidekt', deckLimiter, async (req, res) => {
  const { url } = req.body;
  
  // Input validation
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({ error: 'Archidekt URL is required' });
  }
  
  // Parse deck ID from URL
  // Supports formats like:
  // https://archidekt.com/decks/365563
  // https://archidekt.com/decks/365563/deck-name
  // https://www.archidekt.com/decks/365563/deck-name
  const deckIdMatch = url.match(/archidekt\.com\/decks\/(\d+)/i);
  
  if (!deckIdMatch) {
    return res.status(400).json({ error: 'Invalid Archidekt URL. Expected format: https://archidekt.com/decks/{deckId}' });
  }
  
  const archidektDeckId = deckIdMatch[1];
  
  try {
    // Fetch deck data from Archidekt API
    const archidektApiUrl = `https://archidekt.com/api/decks/${archidektDeckId}/`;
    console.log(`[DECKS] Fetching Archidekt deck: ${archidektApiUrl}`);
    
    const response = await fetch(archidektApiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BigDeck.app/1.0'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Deck not found on Archidekt. Make sure the deck is public.' });
      }
      throw new Error(`Archidekt API returned status ${response.status}`);
    }
    
    const archidektData = await response.json();
    
    if (!archidektData || !archidektData.name) {
      return res.status(400).json({ error: 'Invalid response from Archidekt API' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create the deck
      const deckResult = await client.query(
        `INSERT INTO decks (name, description, source, source_id, source_url, created_at, updated_at)
         VALUES ($1, $2, 'archidekt', $3, $4, NOW(), NOW())
         RETURNING *`,
        [archidektData.name, archidektData.description || null, archidektDeckId, url.trim()]
      );
      
      const deck = deckResult.rows[0];
      
      // Parse and insert cards from Archidekt response
      const archidektCards = archidektData.cards || [];
      
      for (const cardEntry of archidektCards) {
        // Archidekt API provides card name in different locations depending on response format
        // Primary: card.oracleCard.name, Fallback: card.name
        const oracleCardName = cardEntry.card?.oracleCard?.name;
        const directCardName = cardEntry.card?.name;
        const cardName = oracleCardName || directCardName;
        
        if (!cardName) continue;
        
        const quantity = cardEntry.quantity || 1;
        const categories = cardEntry.categories || [];
        const category = categories.length > 0 ? categories[0] : 'Main Deck';
        const setCode = cardEntry.card?.edition?.editioncode || null;
        
        await client.query(
          `INSERT INTO deck_cards (deck_id, card_name, quantity, category, set_code, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [deck.id, cardName, quantity, category, setCode]
        );
      }
      
      await client.query('COMMIT');
      
      // Return the deck with cards
      const cardsResult = await pool.query(
        'SELECT * FROM deck_cards WHERE deck_id = $1 ORDER BY category, card_name',
        [deck.id]
      );
      
      console.log(`[DECKS] Successfully imported Archidekt deck: ${deck.name} (${cardsResult.rows.length} cards)`);
      
      res.status(201).json({
        ...deck,
        cards: cardsResult.rows
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DECKS] Error importing from Archidekt:', error.message);
    res.status(500).json({ error: 'Failed to import deck from Archidekt' });
  }
});

// PUT /api/decks/:id - Update a deck
app.put('/api/decks/:id', deckLimiter, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Deck name must be a non-empty string' });
      }
      updates.push(`name = $${paramCount++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = NOW()');
    values.push(id);
    
    const query = `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DECKS] Error updating deck:', error.message);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// DELETE /api/decks/:id - Delete a deck
app.delete('/api/decks/:id', deckLimiter, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM decks WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    res.json({ message: 'Deck deleted', deck: result.rows[0] });
  } catch (error) {
    console.error('[DECKS] Error deleting deck:', error.message);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// ========== CENTRALIZED ERROR HANDLING ==========
// Placed after all API routes to catch unhandled errors from route handlers
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error('[ERROR] Stack:', err.stack);
  
  // Don't expose internal error details in production
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ========== STARTUP FUNCTION ==========
async function startServer() {
  try {
    console.log('[APP] Initializing database...');
    await initializeDatabase();

    console.log('[APP] Initializing MTGJSON price service...');
    try {
      await mtgjsonService.initialize();
    } catch (error) {
      console.error('[APP] ✗ Failed to initialize MTGJSON price service:', error);
      console.warn('[APP] Continuing startup without MTGJSON price service. Some features may be unavailable.');
    }

    // ========== SERVE STATIC ASSETS ==========
    app.use(express.static('dist'));

    // ========== CATCH-ALL HANDLER - SPA ROUTING ==========
    app.use((req, res) => {
      if (req.path.startsWith('/api/')) {
        console.log(`[404] API endpoint not found: ${req.method} ${req.path}`);
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      // Serve index.html for SPA routes
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });

    // ========== START SERVER ==========
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`[SERVER] ✓ Running on port ${PORT}`);
      console.log('[SERVER] ✓ All systems ready');
    });
  } catch (error) {
    console.error('[APP] ✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
