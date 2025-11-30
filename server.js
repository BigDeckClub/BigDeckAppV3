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
        format VARCHAR(50) DEFAULT 'Casual',
        description TEXT,
        cards JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS format VARCHAR(50) DEFAULT 'Casual'`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]'`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS description TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS decklist_id INTEGER`).catch(() => {});
    await pool.query(`ALTER TABLE decks ADD COLUMN IF NOT EXISTS is_deck_instance BOOLEAN DEFAULT FALSE`).catch(() => {});

    // Deck reservations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_reservations (
        id SERIAL PRIMARY KEY,
        deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
        inventory_item_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
        quantity_reserved INTEGER NOT NULL,
        original_folder VARCHAR(255),
        reserved_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Deck missing cards table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_missing_cards (
        id SERIAL PRIMARY KEY,
        deck_id INTEGER REFERENCES decks(id) ON DELETE CASCADE,
        card_name VARCHAR(255) NOT NULL,
        set_code VARCHAR(20),
        quantity_needed INTEGER NOT NULL
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
      `SELECT i.id, i.name, i.set, i.set_name, i.quantity, i.purchase_price, i.purchase_date, 
              i.reorder_type, i.image_url, i.scryfall_id, i.folder, i.created_at,
              COALESCE(
                (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
              ) as reserved_quantity
       FROM inventory i ORDER BY i.name ASC`
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

// ========== ANALYTICS ENDPOINTS ==========
app.get('/api/analytics/market-values', async (req, res) => {
  try {
    const result = await pool.query('SELECT scryfall_id, quantity FROM inventory WHERE scryfall_id IS NOT NULL');
    const items = result.rows || [];
    
    let cardkingdomTotal = 0;
    let tcgplayerTotal = 0;
    
    for (const item of items) {
      const prices = mtgjsonService.getPricesByScryfallId(item.scryfall_id);
      if (prices.cardkingdom) cardkingdomTotal += prices.cardkingdom * (item.quantity || 0);
      if (prices.tcgplayer) tcgplayerTotal += prices.tcgplayer * (item.quantity || 0);
    }
    
    res.json({ cardkingdom: cardkingdomTotal, tcgplayer: tcgplayerTotal });
  } catch (error) {
    console.error('[ANALYTICS] Error calculating market values:', error.message);
    res.json({ cardkingdom: 0, tcgplayer: 0 });
  }
});

app.get('/api/analytics/card-metrics', async (req, res) => {
  try {
    // Total cards and unique cards
    const totalResult = await pool.query('SELECT COUNT(*) as unique_count, SUM(quantity) as total_count FROM inventory');
    const totalRow = totalResult.rows[0];
    const totalCards = parseInt(totalRow.total_count) || 0;
    const uniqueCards = parseInt(totalRow.unique_count) || 0;
    
    // Cards purchased in last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const purchasedResult = await pool.query(
      'SELECT SUM(quantity) as count FROM inventory WHERE purchase_date >= $1',
      [sixtyDaysAgo.toISOString().split('T')[0]]
    );
    const purchasedLast60d = parseInt(purchasedResult.rows[0].count) || 0;
    
    res.json({
      totalCards,
      totalAvailable: totalCards,
      uniqueCards,
      totalSoldLast60d: 0,
      totalPurchasedLast60d: purchasedLast60d,
      lifetimeTotalCards: totalCards
    });
  } catch (error) {
    console.error('[ANALYTICS] Error calculating card metrics:', error.message);
    res.json({
      totalCards: 0,
      totalAvailable: 0,
      uniqueCards: 0,
      totalSoldLast60d: 0,
      totalPurchasedLast60d: 0,
      lifetimeTotalCards: 0
    });
  }
});

// ========== DECKS ENDPOINTS ==========
app.get('/api/decks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM decks 
      WHERE is_deck_instance = FALSE OR is_deck_instance IS NULL
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[DECKS] Error fetching decks:', error.message);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

app.post('/api/decks', async (req, res) => {
  const { name, format, description } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Deck name is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO decks (name, format, description, cards, is_deck_instance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())
       RETURNING *`,
      [name, format || 'Casual', description || '', '[]']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('[DECKS] Error creating deck:', error.message);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

app.put('/api/decks/:id', async (req, res) => {
  const { id } = req.params;
  const { name, format, description, cards } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (format !== undefined) {
      updates.push(`format = $${paramCount++}`);
      values.push(format);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (cards !== undefined) {
      updates.push(`cards = $${paramCount++}`);
      values.push(JSON.stringify(cards));
    }
    
    updates.push(`updated_at = NOW()`);
    
    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
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

app.delete('/api/decks/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM decks WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    res.json({ message: 'Deck deleted', deck: result.rows[0] });
  } catch (error) {
    console.error('[DECKS] Error deleting deck:', error.message);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// ========== DECK INSTANCES (Two-Tier System) ==========

// GET all deck instances
app.get('/api/deck-instances', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*,
        (SELECT COALESCE(SUM(dr.quantity_reserved), 0) FROM deck_reservations dr WHERE dr.deck_id = d.id) as reserved_count,
        (SELECT COALESCE(SUM(dm.quantity_needed), 0) FROM deck_missing_cards dm WHERE dm.deck_id = d.id) as missing_count
      FROM decks d
      WHERE d.is_deck_instance = TRUE
      ORDER BY d.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('[DECKS] Error fetching deck instances:', error.message);
    res.status(500).json({ error: 'Failed to fetch deck instances' });
  }
});

// GET full details of a deck instance
app.get('/api/deck-instances/:id/details', async (req, res) => {
  const { id } = req.params;
  
  try {
    const deckResult = await pool.query('SELECT * FROM decks WHERE id = $1 AND is_deck_instance = TRUE', [id]);
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck instance not found' });
    }
    const deck = deckResult.rows[0];
    
    const reservationsResult = await pool.query(`
      SELECT dr.*, i.name, i.set, i.purchase_price, i.folder as original_folder, i.quantity as inventory_quantity
      FROM deck_reservations dr
      JOIN inventory i ON dr.inventory_item_id = i.id
      WHERE dr.deck_id = $1
      ORDER BY i.name, i.purchase_price ASC
    `, [id]);
    
    const missingResult = await pool.query(`
      SELECT * FROM deck_missing_cards WHERE deck_id = $1 ORDER BY card_name
    `, [id]);
    
    // Calculate totals with proper type conversion
    let totalCost = 0;
    let reservedCount = 0;
    reservationsResult.rows.forEach(r => {
      const qty = parseInt(r.quantity_reserved) || 0;
      const price = parseFloat(r.purchase_price) || 0;
      totalCost += qty * price;
      reservedCount += qty;
    });
    
    let missingCount = 0;
    missingResult.rows.forEach(m => {
      missingCount += parseInt(m.quantity_needed) || 0;
    });
    
    res.json({
      deck: deck,
      reservations: reservationsResult.rows,
      missingCards: missingResult.rows,
      totalCost: totalCost,
      reservedCount: reservedCount,
      missingCount: missingCount
    });
  } catch (error) {
    console.error('[DECKS] Error fetching deck details:', error.message);
    res.status(500).json({ error: 'Failed to fetch deck details' });
  }
});

// POST copy decklist to inventory (create deck instance)
app.post('/api/decks/:id/copy-to-inventory', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  try {
    const decklistResult = await pool.query('SELECT * FROM decks WHERE id = $1', [id]);
    if (decklistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Decklist not found' });
    }
    const decklist = decklistResult.rows[0];
    const cards = decklist.cards || [];
    
    const deckName = name || decklist.name;
    const newDeckResult = await pool.query(
      `INSERT INTO decks (name, format, description, cards, decklist_id, is_deck_instance, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())
       RETURNING *`,
      [deckName, decklist.format, decklist.description, JSON.stringify(cards), id]
    );
    const newDeck = newDeckResult.rows[0];
    
    const reservations = [];
    const missingCards = [];
    
    for (const card of cards) {
      const cardName = card.name;
      const quantityNeeded = card.quantity || 1;
      
      const inventoryResult = await pool.query(`
        SELECT i.*, 
          COALESCE(i.quantity, 0) - COALESCE(
            (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
          ) as available_quantity
        FROM inventory i
        WHERE LOWER(TRIM(i.name)) = LOWER(TRIM($1))
          AND COALESCE(i.quantity, 0) - COALESCE(
            (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
          ) > 0
        ORDER BY COALESCE(i.purchase_price, 999999) ASC
      `, [cardName]);
      
      let remainingNeeded = quantityNeeded;
      
      for (const invItem of inventoryResult.rows) {
        if (remainingNeeded <= 0) break;
        
        const availableQty = invItem.available_quantity;
        const reserveQty = Math.min(remainingNeeded, availableQty);
        
        if (reserveQty > 0) {
          reservations.push({
            deck_id: newDeck.id,
            inventory_item_id: invItem.id,
            quantity_reserved: reserveQty,
            original_folder: invItem.folder || 'Uncategorized'
          });
          remainingNeeded -= reserveQty;
        }
      }
      
      if (remainingNeeded > 0) {
        missingCards.push({
          deck_id: newDeck.id,
          card_name: cardName,
          set_code: card.set || null,
          quantity_needed: remainingNeeded
        });
      }
    }
    
    for (const reservation of reservations) {
      await pool.query(
        `INSERT INTO deck_reservations (deck_id, inventory_item_id, quantity_reserved, original_folder)
         VALUES ($1, $2, $3, $4)`,
        [reservation.deck_id, reservation.inventory_item_id, reservation.quantity_reserved, reservation.original_folder]
      );
    }
    
    for (const missing of missingCards) {
      await pool.query(
        `INSERT INTO deck_missing_cards (deck_id, card_name, set_code, quantity_needed)
         VALUES ($1, $2, $3, $4)`,
        [missing.deck_id, missing.card_name, missing.set_code, missing.quantity_needed]
      );
    }
    
    res.status(201).json({
      deck: newDeck,
      reservations: reservations,
      missingCards: missingCards,
      totalCards: cards.reduce((sum, c) => sum + (c.quantity || 1), 0),
      reservedCount: reservations.reduce((sum, r) => sum + r.quantity_reserved, 0),
      missingCount: missingCards.reduce((sum, m) => sum + m.quantity_needed, 0)
    });
  } catch (error) {
    console.error('[DECKS] Error copying to inventory:', error.message);
    res.status(500).json({ error: 'Failed to copy deck to inventory' });
  }
});

// POST add card to deck instance
app.post('/api/deck-instances/:id/add-card', async (req, res) => {
  const { id } = req.params;
  const { inventory_item_id, quantity } = req.body;
  
  try {
    const invResult = await pool.query(`
      SELECT i.*, 
        COALESCE(i.quantity, 0) - COALESCE(
          (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
        ) as available_quantity
      FROM inventory i WHERE i.id = $1
    `, [inventory_item_id]);
    
    if (invResult.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    const invItem = invResult.rows[0];
    if (invItem.available_quantity < quantity) {
      return res.status(400).json({ error: 'Not enough available quantity' });
    }
    
    const existingRes = await pool.query(
      'SELECT * FROM deck_reservations WHERE deck_id = $1 AND inventory_item_id = $2',
      [id, inventory_item_id]
    );
    
    if (existingRes.rows.length > 0) {
      await pool.query(
        'UPDATE deck_reservations SET quantity_reserved = quantity_reserved + $1 WHERE deck_id = $2 AND inventory_item_id = $3',
        [quantity, id, inventory_item_id]
      );
    } else {
      await pool.query(
        `INSERT INTO deck_reservations (deck_id, inventory_item_id, quantity_reserved, original_folder)
         VALUES ($1, $2, $3, $4)`,
        [id, inventory_item_id, quantity, invItem.folder || 'Uncategorized']
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DECKS] Error adding card:', error.message);
    res.status(500).json({ error: 'Failed to add card' });
  }
});

// DELETE remove card from deck instance
app.delete('/api/deck-instances/:id/remove-card', async (req, res) => {
  const { id } = req.params;
  const { reservation_id, quantity } = req.body;
  
  try {
    const resResult = await pool.query('SELECT * FROM deck_reservations WHERE id = $1 AND deck_id = $2', [reservation_id, id]);
    
    if (resResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    const reservation = resResult.rows[0];
    
    if (quantity >= reservation.quantity_reserved) {
      await pool.query('DELETE FROM deck_reservations WHERE id = $1', [reservation_id]);
    } else {
      await pool.query(
        'UPDATE deck_reservations SET quantity_reserved = quantity_reserved - $1 WHERE id = $2',
        [quantity, reservation_id]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DECKS] Error removing card:', error.message);
    res.status(500).json({ error: 'Failed to remove card' });
  }
});

// POST release entire deck instance
app.post('/api/deck-instances/:id/release', async (req, res) => {
  const { id } = req.params;
  
  try {
    await pool.query('DELETE FROM deck_reservations WHERE deck_id = $1', [id]);
    await pool.query('DELETE FROM deck_missing_cards WHERE deck_id = $1', [id]);
    await pool.query('DELETE FROM decks WHERE id = $1 AND is_deck_instance = TRUE', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[DECKS] Error releasing deck:', error.message);
    res.status(500).json({ error: 'Failed to release deck' });
  }
});

// POST reoptimize deck instance
app.post('/api/deck-instances/:id/reoptimize', async (req, res) => {
  const { id } = req.params;
  
  try {
    const deckResult = await pool.query('SELECT * FROM decks WHERE id = $1 AND is_deck_instance = TRUE', [id]);
    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    const deck = deckResult.rows[0];
    const cards = deck.cards || [];
    
    await pool.query('DELETE FROM deck_reservations WHERE deck_id = $1', [id]);
    await pool.query('DELETE FROM deck_missing_cards WHERE deck_id = $1', [id]);
    
    const reservations = [];
    const missingCards = [];
    
    for (const card of cards) {
      const cardName = card.name;
      const quantityNeeded = card.quantity || 1;
      
      const inventoryResult = await pool.query(`
        SELECT i.*, 
          COALESCE(i.quantity, 0) - COALESCE(
            (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
          ) as available_quantity
        FROM inventory i
        WHERE LOWER(TRIM(i.name)) = LOWER(TRIM($1))
          AND COALESCE(i.quantity, 0) - COALESCE(
            (SELECT SUM(dr.quantity_reserved) FROM deck_reservations dr WHERE dr.inventory_item_id = i.id), 0
          ) > 0
        ORDER BY COALESCE(i.purchase_price, 999999) ASC
      `, [cardName]);
      
      let remainingNeeded = quantityNeeded;
      
      for (const invItem of inventoryResult.rows) {
        if (remainingNeeded <= 0) break;
        
        const availableQty = invItem.available_quantity;
        const reserveQty = Math.min(remainingNeeded, availableQty);
        
        if (reserveQty > 0) {
          reservations.push({
            deck_id: id,
            inventory_item_id: invItem.id,
            quantity_reserved: reserveQty,
            original_folder: invItem.folder || 'Uncategorized'
          });
          remainingNeeded -= reserveQty;
        }
      }
      
      if (remainingNeeded > 0) {
        missingCards.push({
          deck_id: id,
          card_name: cardName,
          set_code: card.set || null,
          quantity_needed: remainingNeeded
        });
      }
    }
    
    for (const reservation of reservations) {
      await pool.query(
        `INSERT INTO deck_reservations (deck_id, inventory_item_id, quantity_reserved, original_folder)
         VALUES ($1, $2, $3, $4)`,
        [reservation.deck_id, reservation.inventory_item_id, reservation.quantity_reserved, reservation.original_folder]
      );
    }
    
    for (const missing of missingCards) {
      await pool.query(
        `INSERT INTO deck_missing_cards (deck_id, card_name, set_code, quantity_needed)
         VALUES ($1, $2, $3, $4)`,
        [missing.deck_id, missing.card_name, missing.set_code, missing.quantity_needed]
      );
    }
    
    res.json({
      success: true,
      reservedCount: reservations.reduce((sum, r) => sum + r.quantity_reserved, 0),
      missingCount: missingCards.reduce((sum, m) => sum + m.quantity_needed, 0)
    });
  } catch (error) {
    console.error('[DECKS] Error reoptimizing:', error.message);
    res.status(500).json({ error: 'Failed to reoptimize deck' });
  }
});

// PUT update deck instance metadata
app.put('/api/deck-instances/:id', async (req, res) => {
  const { id } = req.params;
  const { name, format, description } = req.body;
  
  try {
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (format !== undefined) {
      updates.push(`format = $${paramCount++}`);
      values.push(format);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE decks SET ${updates.join(', ')} WHERE id = $${paramCount} AND is_deck_instance = TRUE RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('[DECKS] Error updating deck:', error.message);
    res.status(500).json({ error: 'Failed to update deck' });
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
