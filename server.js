import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';
import { load } from 'cheerio';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';
import mtgjsonService from './server/mtgjson-service.js';

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
  windowMs: 60 * 1000,  // 60 second window
  max: 100              // Requests per window
});

// PostgreSQL connection
const dbUrl = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// ========== DATABASE SCHEMA INITIALIZATION ==========
// Create all required tables if they don't exist
async function initializeDatabase() {
  try {
    // Inventory table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
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
    // Add missing columns for existing databases
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT`).catch(() => {});
    await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS scryfall_id VARCHAR(255)`).catch(() => {});

    // Decklists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS decklists (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        decklist TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Containers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS containers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        decklist_id INTEGER REFERENCES decklists(id) ON DELETE SET NULL,
        cards JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Add cards column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE containers 
      ADD COLUMN IF NOT EXISTS cards JSONB DEFAULT '[]'
    `).catch(() => {}); // Ignore if column already exists

    // Container items table - relational storage for container contents
    await pool.query(`
      CREATE TABLE IF NOT EXISTS container_items (
        id SERIAL PRIMARY KEY,
        container_id INTEGER REFERENCES containers(id) ON DELETE CASCADE,
        inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
        printing_id INTEGER,
        quantity INTEGER DEFAULT 1
      )
    `);
    // Add printing_id column if it doesn't exist (for existing databases)
    await pool.query(`ALTER TABLE container_items ADD COLUMN IF NOT EXISTS printing_id INTEGER`).catch(() => {});

    // Deck items table - parsed decklist cards
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deck_items (
        id SERIAL PRIMARY KEY,
        decklist_id INTEGER REFERENCES decklists(id) ON DELETE CASCADE,
        printing_id INTEGER,
        card_name VARCHAR(255),
        set_code VARCHAR(10),
        quantity INTEGER DEFAULT 1,
        is_sideboard BOOLEAN DEFAULT FALSE
      )
    `);

    // Sales table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        container_id INTEGER,
        decklist_id INTEGER,
        decklist_name VARCHAR(255),
        sale_price DECIMAL(10,2),
        cost_basis DECIMAL(10,2),
        sold_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT
      )
    `);

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
  } catch (err) {
    console.error('[DB] ✗ Failed to initialize database:', err);
  }
}

// Initialize database on startup
initializeDatabase();

// Initialize MTGJSON price service on startup
mtgjsonService.initialize().catch(err => {
  console.error('[SERVER] Failed to initialize MTGJSON service:', err.message);
});

// Refresh MTGJSON prices daily (run check every hour)
setInterval(() => {
  mtgjsonService.refreshDaily().catch(err => {
    console.error('[SERVER] Daily refresh failed:', err.message);
  });
}, 60 * 60 * 1000);

// ========== PARSER: Plain-text decklist to card objects ==========
/**
 * Parse a plain-text decklist into an array of card objects.
 * Examples: "2 lightning bolt", "1 Sol Ring (EOC)", "3 Swamp - SPM"
 * Returns: [{ name: "lightning bolt", set: "EOC" | "", qty: 2 }, ...]
 */
function parseDecklistTextToCards(deckText) {
  if (!deckText || typeof deckText !== "string") return [];

  const lines = deckText.split(/\r?\n/);
  const cards = [];

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Match qty and name: "2 Lightning Bolt" or "1 Sol Ring"
    const qtyNameMatch = line.match(/^\s*(\d+)\s+(.+)$/);
    let qty = 1;
    let rest = line;
    if (qtyNameMatch) {
      qty = parseInt(qtyNameMatch[1], 10) || 1;
      rest = qtyNameMatch[2].trim();
    }

    let name = rest;
    let set = "";

    // Extract set from (SET) format
    const parenMatch = rest.match(/^(.*?)\s*\(\s*([^)]+)\s*\)\s*$/);
    if (parenMatch) {
      name = parenMatch[1].trim();
      set = parenMatch[2].trim();
    } else {
      // Extract set from " - SET" or " | SET" format
      const sepMatch = rest.match(/^(.*?)\s*(?:[-|]\s*)([A-Za-z0-9]+)\s*$/);
      if (sepMatch) {
        name = sepMatch[1].trim();
        set = sepMatch[2].trim();
      } else {
        // Fallback: trailing uppercase token is set code
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

/**
 * Enrich decklist cards with inventory linkage.
 * For each card in decklist, find matching inventory items and allocate qty.
 */
async function enrichCardsWithInventory(deckCards, pool) {
  const enriched = [];
  
  for (const card of deckCards) {
    let remainingQty = card.qty;
    
    // Find inventory items matching this card (by name, prefer matching set if specified)
    const query = card.set 
      ? `SELECT id, name, set, quantity, set_name, purchase_price FROM inventory WHERE LOWER(name) = LOWER($1) AND UPPER(set) = UPPER($2) ORDER BY id`
      : `SELECT id, name, set, quantity, set_name, purchase_price FROM inventory WHERE LOWER(name) = LOWER($1) ORDER BY id`;
    
    const params = card.set ? [card.name, card.set] : [card.name];
    const { rows } = await pool.query(query, params);
    
    // Allocate from available inventory
    for (const invItem of rows) {
      if (remainingQty <= 0) break;
      
      const allocate = Math.min(remainingQty, invItem.quantity);
      if (allocate > 0) {
        enriched.push({
          name: invItem.name,
          set: invItem.set || card.set,
          set_name: invItem.set_name,
          quantity_used: allocate,
          purchase_price: invItem.purchase_price,
          inventoryId: invItem.id
        });
        remainingQty -= allocate;
      }
    }
    
    // If not all cards found in inventory, still add them (qty will show 0 for unavailable)
    if (remainingQty > 0) {
      enriched.push({
        name: card.name,
        set: card.set,
        set_name: null,
        quantity_used: 0,
        purchase_price: null,
        inventoryId: null
      });
    }
  }
  
  return enriched;
}

// ========== INPUT VALIDATION SCHEMAS ==========
const inventorySchema = Joi.object({
  cardName: Joi.string().min(1).max(255).required(),
  setCode: Joi.string().max(20).allow(null),
  quantity: Joi.number().integer().min(0).required(),
  tcgPrice: Joi.number().min(0).allow(null),
  ckPrice: Joi.number().min(0).allow(null)
});

const containerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  cards: Joi.array().items(
    Joi.object({
      inventoryId: Joi.number().integer().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).required()
});

const decklistSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  cards: Joi.array().items(
    Joi.object({
      cardName: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).required()
});

const settingsSchema = Joi.object({
  reorderType: Joi.string().valid('Bulk', 'Land', 'Normal').required()
});

// ========== FETCH WITH TIMEOUT + RETRY ==========
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchRetry(url, options = {}, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options, 8000);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}

// ============== EDITION EXTRACTOR ==============
function normalizeEditionName(name) {
  if (!name) return null;
  return name.toLowerCase().trim().replace(/[_-]/g, ' ');
}

function extractEditionFromUrl(url) {
  try {
    if (!url) return null;
    // normalize, drop query/hash
    const clean = url.split('?')[0].split('#')[0].toLowerCase();

    // Primary pattern: /mtg/<edition>/<card>
    let m = clean.match(/\/mtg\/([^\/]+)\/?/);
    if (m && m[1]) {
      return normalizeEditionName(m[1].replace(/[-_]/g, ' '));
    }

    // Secondary pattern: /catalog/product/<edition-slug>-<card>-<id> or /product/<edition>/<slug>
    m = clean.match(/\/product[s]?\//) || clean.match(/\/catalog\/product\//);
    if (m) {
      // try to extract everything after /product or /catalog/product
      const after = clean.split(m[0])[1];
      if (after) {
        const slug = after.split('/')[0];
        if (slug) return normalizeEditionName(slug.replace(/[-_]/g, ' '));
      }
    }

    // Tertiary: many CK pages embed edition as the first path segment after domain
    const parts = clean.replace(/^https?:\/\/[^\/]+/,'').split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'mtg') {
      return normalizeEditionName(parts[1]);
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Extract product URL with specific fallback order
function extractProductUrl($, productElem) {
  // 1. Anchors with /mtg/ in href (most reliable)
  let href = $(productElem).find('a[href*="/mtg/"]').attr('href');
  if (!href) {
    // 2. check common data attributes
    href = $(productElem).attr('data-href') ||
           $(productElem).attr('data-product-href') ||
           $(productElem).attr('data-url') ||
           $(productElem).attr('href');
  }

  // 3. Title link inside product card (specific class)
  if (!href) {
    href = $(productElem).find('.productCard__title a, .product-card__title a, .card-title a').attr('href');
  }

  // 4. Fallback: first anchor tag
  if (!href) {
    href = $(productElem).find('a').attr('href');
  }

  if (!href) return null;

  // Resolve relative hrefs to absolute using Card Kingdom base
  try {
    const base = 'https://www.cardkingdom.com';
    // If already absolute, new URL will succeed; if relative, new URL(base, href) resolves it.
    const abs = new URL(href, base).href;
    return abs;
  } catch (e) {
    return href;
  }
}

// Extract edition from DOM-based sources (fallback only, URL extraction should be primary)
function extractEditionFromHtml(el, $) {
  // FALLBACK 1: Try to find set icon with title attribute
  const setIcon = $(el).find('span[class*="set-icon"], .set-icon, [class*="symbol"]').first();
  if (setIcon.length > 0) {
    const title = setIcon.attr('title');
    if (title && title.length > 0) {
      return normalizeEditionName(title);
    }
  }
  
  // FALLBACK 2: Try data-* attributes
  const edition = $(el).attr('data-expansion') || $(el).attr('data-edition');
  if (edition) {
    return normalizeEditionName(edition);
  }
  
  // FALLBACK 3: Extract edition text from nearby <td> or <span> nodes
  const setCell = $(el).find('.set, .variant, .productSet, .productDetailSet, .text-muted').first();
  if (setCell.length > 0) {
    const editionText = setCell.text().trim();
    if (editionText && editionText.length > 0 && editionText.length < 100) {
      return normalizeEditionName(editionText);
    }
  }
  
  // FALLBACK 4: Parse JSON from React data attributes
  try {
    const reactPropsStr = $(el).attr('data-react-props') || $(el).attr('data-props');
    if (reactPropsStr) {
      const props = JSON.parse(reactPropsStr);
      if (props.printed_set || props.edition || props.set) {
        return normalizeEditionName(props.printed_set || props.edition || props.set);
      }
    }
  } catch (e) {
    // JSON parse failed, continue to next fallback
  }
  
  return null;
}

// ============== VARIANT CLASSIFIER ==============
const DEFAULT_BLACKLIST = [
  'showcase','show case','show-case','alternate art','alternate','alt-art','alt art','alt',
  'extended art','extended-art','extended','borderless','border-less','border less',
  'artist','art series','art-series','variant','variant art','premium',
  'secret lair','secret-lair','promo','judge promo','judge','fnm','f.n.m','prerelease',
  'foil','etched','etched foil','super foil','super-foil','foil stamped','holo','hyperfoil',
  'collector','collector edition','collector-edition','oversized','oversized card',
  'special edition','special-edition','limited edition','limited-edition','retro frame',
  'retro','masterpiece','artist series'
];

// ============== EDITION SAFELIST FOR NORMAL PRINTINGS ==============
const NORMAL_EDITIONS = [
  "Commander 2013",
  "Commander 2014",
  "Commander 2016",
  "Commander 2018",
  "Commander 2020",
  "Commander 2021",
  "Commander 2022",
  "Commander Masters",
  "Commander Anthology",
  "From the Vault: Relics",
  "Magic 2010",
  "Magic 2011",
  "Magic 2012",
  "Magic 2013",
  "Magic 2014",
  "Magic 2015",
  "Magic Origins",
  "Secret Lair Drop Series",
  "Judge Gift Cards",
  "2010 core set",
  "2011 core set",
  "2012 core set",
  "2013 core set",
  "2014 core set",
  "2015 core set",
];

const SET_CODE_CANDIDATE = /^[A-Z0-9]{2,5}$/;

function normalizeName(name) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u2013\u2014–—]/g, '-')
    .replace(/[^a-z0-9\-\(\)\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============== EDITION-BASED PRODUCT CLASSIFIER ==============
// New classification system: name parentheses + edition safelist
// WHITELIST ONLY - anything not explicitly safelisted is special
function classifyProduct(name, edition) {
  const normalized = name.toLowerCase();

  // Case 1 — any parentheses always indicate variant/special
  if (/\(.+\)/.test(normalized)) return "special";

  // Case 2 — edition MUST be in whitelist to be normal
  // If no edition or edition not in whitelist → special
  if (!edition) {
    return "special";
  }

  const edLower = edition.toLowerCase();
  
  // Check if edition matches any safelisted standard printing
  const isInWhitelist = NORMAL_EDITIONS.some(e => {
    const eLower = e.toLowerCase();
    return edLower === eLower || edLower.startsWith(eLower + " ");
  });

  if (isInWhitelist) {
    return "normal";
  }

  // Case 3 — edition not in whitelist → special (safe default)
  return "special";
}

// This is the primary classifier - determines if edition is "special" or "set"
function classifyEdition(ed) {
  if (!ed) return "special"; // no metadata → likely variant

  const e = ed.toLowerCase();

  // SPECIAL VARIANT EDITIONS (never "set")
  if (
    e.includes("commander") ||
    e.includes("secret lair") ||
    e.includes("showcase") ||
    e.includes("retro") ||
    e.includes("extended") ||
    e.includes("premium") ||
    e.includes("variant") ||
    e.includes("collector")
  ) {
    return "special";
  }

  // STANDARD SET PRINTINGS
  if (
    e.includes("core set") ||
    /^m[0-9]{2}\b/.test(e) ||        // M10, M11, M12, etc.
    /^[0-9]{4}\b/.test(e) ||        // 2011, 2012, etc.
    /alpha|beta|unlimited|revised/.test(e) ||
    /arabian|legends|antiquities/.test(e) ||
    /tempest|mirage|ice age|invasion|urza/.test(e) ||
    /onslaught|lorwyn|shadowmoor|zendikar/.test(e) ||
    /modern masters|eternal masters/.test(e)
  ) {
    return "set";
  }

  // DEFAULT: TREAT AS A NORMAL SET
  return "set";
}

// List of variant/special edition names in Card Kingdom's data
const SPECIAL_EDITIONS = [
  'showcase', 'secret lair', 'special edition', 'extended art', 'borderless',
  'alternate art', 'collector', 'retro frame', 'masterpiece', 'artist series',
  'commander deck', 'commander', 'variants', 'limited edition', 'premium'
];

// List of core/standard edition keywords that indicate normal printings
const STANDARD_EDITIONS = [
  'core set', 'magic', 'edition', 'alpha', 'beta', 'unlimited', 'revised'
];

// Basic lands - always pick lowest non-foil price
const BASIC_LANDS = ['plains', 'island', 'swamp', 'mountain', 'forest'];

function isBasicLand(cardName) {
  return BASIC_LANDS.includes(cardName.toLowerCase().trim());
}

function isSpecialEdition(editionName) {
  if (!editionName) return false;
  const lower = editionName.toLowerCase();
  return SPECIAL_EDITIONS.some(special => lower.includes(special));
}

// Enhanced variant classifier that uses edition metadata
function classifyVariantWithEdition(rawName, cardName, editionMetadata) {
  const blacklist = DEFAULT_BLACKLIST;
  const name = normalizeName(rawName);
  const target = normalizeName(cardName).trim();

  // --- If we have edition metadata from HTML, use it for better classification ---
  if (editionMetadata) {
    const edLower = editionMetadata.toLowerCase();
    
    // Check blacklist keywords in edition name
    for (const kw of blacklist) {
      if (edLower.includes(kw)) {
        if (kw.includes('foil')) return 'foil';
        if (kw.includes('etched')) return 'etched';
        if (kw.includes('promo') || kw.includes('judge')) return 'promo';
        if (isSpecialEdition(edLower)) return 'special';
      }
    }

    // If edition metadata exists and isn't special, classify as "set" (standard edition)
    if (!isSpecialEdition(edLower)) {
      return 'set'; // Real edition metadata = standard edition
    }
    
    return 'special';
  }

  // --- Fallback to text-based classification if no edition metadata ---
  if (name === target) {
    const hasEditionMarkers = /\([\w\d]+\)|\bfoil\b|\bpromo\b|\betched\b/i.test(rawName);
    if (!hasEditionMarkers) {
      return 'special'; // Bare match without edition markers is ambiguous
    }
    return 'normal';
  }

  const parenMatch = rawName.match(/\(([^)]+)\)\s*$/);
  if (parenMatch && name.startsWith(target)) {
    const token = parenMatch[1].trim().toUpperCase();
    if (SET_CODE_CANDIDATE.test(token)) {
      const tokLower = token.toLowerCase();
      if (!blacklist.some(b => tokLower.includes(b))) {
        return 'set';
      }
    }
  }

  for (const kw of blacklist) {
    if (name.includes(kw)) {
      if (kw.includes('foil') && kw.includes('etched')) return 'etched';
      if (kw.includes('etched')) return 'etched';
      if (kw.includes('foil')) return 'foil';
      if (kw.includes('promo') || kw.includes('judge') || kw.includes('fnm') || kw.includes('prerelease'))
        return 'promo';
      return 'special';
    }
  }

  if (name.startsWith(target)) {
    const tail = name.slice(target.length).trim();
    if (tail.length > 0) {
      const tokens = tail.split(/[\s\-–—:()]+/).filter(Boolean);
      if (tokens.length >= 2) return 'special';
      if (tokens.length === 1 && SET_CODE_CANDIDATE.test(tokens[0].toUpperCase())) {
        return 'set';
      }
      if (tokens.length === 1) {
        const word = tokens[0].toLowerCase();
        if (word && word.length > 0 && !word.match(/^[0-9]+$/)) {
          return 'special';
        }
      }
    }
  }

  if (name.includes(target)) {
    return 'normal';
  }

  return 'premium';
}

// Backwards-compatible wrapper
function classifyVariant(rawName, cardName) {
  return classifyVariantWithEdition(rawName, cardName, null);
}

// ============== PRICE-BASED HEURISTICS ==============
function isSuspiciouslyCheap(baseCardName, normalizedName, price) {
  const cheapThresholds = {
    "lightning bolt": 2.20,
    "sol ring": 2.20,
  };

  const key = baseCardName.toLowerCase().trim();
  const limit = cheapThresholds[key];

  if (!limit) return false;
  return price < limit;
}

function isSuspiciouslyExpensive(baseCardName, price) {
  const expensiveThresholds = {
    "lightning bolt": 50,
    "sol ring": 50,
  };

  const key = baseCardName.toLowerCase().trim();
  const limit = expensiveThresholds[key];

  if (!limit) return false;
  return price > limit;
}

function isSuspiciousByOrdering(index, firstNormalIndex) {
  if (firstNormalIndex == null) return false;
  return index > firstNormalIndex;
}

function shouldPromoteSetOverNormal(setPrice, normalPrice) {
  if (setPrice == null || normalPrice == null) return false;
  const ratio = normalPrice / setPrice;
  return ratio >= 3;
}

function classifyVariantEnhanced(raw, index, firstNormalIndex, cardName, globalPriceContext) {
  const base = classifyVariantWithEdition(raw.name, cardName, raw.edition);
  const price = raw.price;
  const lowestNormal = globalPriceContext?.lowestNormalPrice ?? null;

  // --- CASE 1: Use base classification if no context yet ---
  if (lowestNormal === null) {
    return base;
  }

  // --- CASE 2: Set promotion logic (fixed Swamp) ---
  if (base === "set") {
    if (shouldPromoteSetOverNormal(price, lowestNormal)) {
      return "normal";
    }
  }

  // --- CASE 3: Price sanity heuristics (Lightning Bolt/Sol Ring regression fix) ---

  // Helper thresholds
  const tooExpensive = price > lowestNormal * 1.6;   // configurable
  const veryCheap    = price < lowestNormal * 0.4;   // configurable

  // 3A: A "normal" candidate that is way more expensive should NOT be treated as normal
  if (base === "normal" && tooExpensive) {
    return "special"; // previously worked logic
  }

  // 3B: A "special/set" candidate that is extremely cheap should be promoted
  if ((base === "set" || base === "special") && veryCheap) {
    return "normal";
  }

  // If no special rules apply, keep the base result
  return base;
}

// ============== PRICE PARSING ==============
function isValidPrice(price) {
  return price > 0.05 && price < 500;
}

function extractNumericPrice(priceStr) {
  if (!priceStr) return 0;
  return parseFloat(priceStr.replace(/[$,]/g, '')) || 0;
}

function extractPricesFromText(text = '') {
  if (!text) return [];
  const normalized = text.replace(/\u00A0/g, ' ').trim();
  const re = /\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g;
  const matches = [];
  let m;
  while ((m = re.exec(normalized)) !== null) {
    matches.push(m[1]);
  }
  return matches.map(s => parseFloat(s.replace(/,/g, ''))).filter(n => !Number.isNaN(n));
}

const EDITION_PRIORITY = ["normal", "set", "promo", "special", "foil", "etched", "premium"];

function getVariantRank(variant) {
  const idx = EDITION_PRIORITY.indexOf(variant);
  return idx >= 0 ? idx : EDITION_PRIORITY.length;
}

// ============== HELPERS ==============
function handleDbError(err, res) {
  console.error('[DB ERROR] Full error:', err);
  console.error('[DB ERROR] Message:', err.message);
  console.error('[DB ERROR] Code:', err.code);
  console.error('[DB ERROR] Detail:', err.detail);
  console.error('[DB ERROR] Constraint:', err.constraint);
  
  // Check for connection errors
  if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
    console.error('[DB ERROR] ✗ Cannot resolve database host. Check DATABASE_URL is set correctly.');
    return res.status(500).json({ 
      error: `Database connection failed: ${err.message}. Check that DATABASE_URL environment variable is configured.` 
    });
  }
  
  // Provide more specific error messages
  if (err.code === '23505') {
    return res.status(400).json({ error: `Duplicate entry: ${err.detail || err.message}` });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: `Foreign key violation: ${err.detail || err.message}` });
  }
  if (err.code === '22P02') {
    return res.status(400).json({ error: `Invalid input syntax: ${err.message}` });
  }
  if (err.code === '23502') {
    return res.status(400).json({ error: `Missing required field: ${err.column || err.message}` });
  }
  
  res.status(500).json({ error: `Database error: ${err.message}` });
}

// ========== ACTIVITY LOGGING HELPER ==========
async function recordActivity(action, details = null) {
  try {
    await pool.query(
      `INSERT INTO usage_history (action, created_at, details)
       VALUES ($1, NOW(), $2)`,
      [action, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    console.error(`[ACTIVITY] ❌ Error logging activity: ${err.message}`);
  }
}

// ============== ROUTES ==============
// Using new modular schema with container_items table instead of JSONB

app.get('/api/inventory', async (req, res) => {
  try {
    // Fetch all inventory items with printing relation if available
    const invResult = await pool.query(`
      SELECT 
        i.*,
        p.image_uri_small as printing_image_small,
        p.image_uri_normal as printing_image_normal
      FROM inventory i
      LEFT JOIN printings p ON i.printing_id = p.id
      ORDER BY i.name
    `);
    
    // For each inventory item, calculate how many cards are in active containers
    // Using container_items table instead of JSONB
    const enriched = await Promise.all(invResult.rows.map(async (item) => {
      const containerResult = await pool.query(
        `SELECT COALESCE(SUM(ci.quantity), 0)::int as in_containers 
         FROM container_items ci
         WHERE ci.inventory_id = $1`,
        [item.id]
      );
      const quantity_in_containers = parseInt(containerResult.rows?.[0]?.in_containers || 0, 10);
      return {
        ...item,
        quantity_in_containers,
        quantity_available: Math.max(0, item.quantity - quantity_in_containers)
      };
    }));
    
    res.json(enriched);
  } catch (err) {
    console.error('Inventory query error:', err.message);
    res.json([]);
  }
});

app.post('/api/inventory', async (req, res) => {
  const { name, set, set_name, quantity, purchase_price, purchase_date, image_url, reorder_type } = req.body;
  
  try {
    // Validate required field: name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Card name is required' });
    }
    
    // VALIDATION: Parse and validate quantity as positive integer
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ 
        error: 'Quantity must be a positive integer',
        received: quantity 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO inventory 
       (name, set, set_name, quantity, purchase_price, purchase_date, image_url, reorder_type, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
       RETURNING *`,
      [
        name, 
        set, 
        set_name || null,
        parsedQuantity, 
        purchase_price || null, 
        purchase_date || new Date().toISOString().split('T')[0],
        image_url || null,
        reorder_type || 'normal'
      ]
    );
    
    const inventoryId = result.rows[0].id;
    
    // Log activity
    await recordActivity(
      `Added ${parsedQuantity}x ${name} (${set}) to inventory`,
      { name, set, quantity: parsedQuantity, purchase_price, inventory_id: inventoryId }
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Inventory insert error:', err);
    handleDbError(err, res);
  }
});


app.delete('/api/inventory/:id', async (req, res) => {
  const inventoryId = parseInt(req.params.id, 10);
  
  try {
    // Check if this inventory item is involved in actual sales (via containers that were sold)
    const salesCheck = await pool.query(
      `SELECT COUNT(*) as count FROM container_items ci
       JOIN containers c ON ci.container_id = c.id
       JOIN sales s ON s.container_id = c.id
       WHERE ci.inventory_id = $1`,
      [inventoryId]
    );
    const salesCount = parseInt(salesCheck.rows[0].count, 10);
    
    if (salesCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete inventory item that has been sold. Sales history must be preserved.',
        salesCount
      });
    }
    
    // First, clean up any orphaned purchase_history records (from legacy data)
    await pool.query('DELETE FROM purchase_history WHERE inventory_id = $1', [inventoryId]);
    
    // Then delete the inventory item
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING id', [inventoryId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    
    // Log activity
    await recordActivity(`Deleted inventory item id=${inventoryId}`, { inventory_id: inventoryId });
    
    res.json({ success: true, id: inventoryId });
  } catch (err) {
    console.error(`[DELETE] Error deleting inventory id=${inventoryId}:`, err.message);
    handleDbError(err, res);
  }
});

// ========== PUT /api/inventory/:id - UPDATE AN INVENTORY ITEM ==========
app.put('/api/inventory/:id', async (req, res) => {
  const inventoryId = parseInt(req.params.id, 10);
  const { quantity, purchase_price, purchase_date, reorder_type } = req.body;
  
  try {
    // Validate quantity
    if (quantity !== undefined) {
      const parsedQty = parseInt(quantity, 10);
      if (isNaN(parsedQty) || parsedQty < 0) {
        return res.status(400).json({ 
          error: 'Quantity must be a non-negative integer',
          received: quantity
        });
      }
    }
    
    // Validate purchase_price
    if (purchase_price !== undefined) {
      const parsedPrice = parseFloat(purchase_price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ 
          error: 'Purchase price must be a non-negative number',
          received: purchase_price
        });
      }
    }
    
    // Validate purchase_date (must be ISO date format)
    if (purchase_date !== undefined && purchase_date !== null && purchase_date !== '') {
      if (!purchase_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.warn(`[UPDATE] Invalid purchase_date format: ${purchase_date}`);
        return res.status(400).json({ 
          error: 'Purchase date must be in YYYY-MM-DD format',
          received: purchase_date
        });
      }
    }
    
    // Validate reorder_type
    if (reorder_type !== undefined && reorder_type !== null) {
      if (typeof reorder_type !== 'string' || reorder_type.trim() === '') {
        console.warn(`[UPDATE] Invalid reorder_type: ${reorder_type}`);
        return res.status(400).json({ 
          error: 'Reorder type must be a valid string',
          received: reorder_type
        });
      }
    }
    
    // First check if inventory exists
    const checkResult = await pool.query('SELECT id FROM inventory WHERE id = $1', [inventoryId]);
    if (checkResult.rows.length === 0) {
      console.warn(`[UPDATE] Inventory not found: id=${inventoryId}`);
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    // Build dynamic UPDATE query based on provided fields
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (quantity !== undefined) {
      fields.push(`quantity = $${paramIndex}`);
      values.push(parseInt(quantity, 10));
      paramIndex++;
    }
    if (purchase_price !== undefined) {
      fields.push(`purchase_price = $${paramIndex}`);
      values.push(purchase_price === null ? null : parseFloat(purchase_price));
      paramIndex++;
    }
    if (purchase_date !== undefined) {
      fields.push(`purchase_date = $${paramIndex}`);
      values.push(purchase_date === null || purchase_date === '' ? null : purchase_date);
      paramIndex++;
    }
    if (reorder_type !== undefined) {
      fields.push(`reorder_type = $${paramIndex}`);
      values.push(reorder_type === null ? null : reorder_type);
      paramIndex++;
    }
    
    // If no fields to update, return error
    if (fields.length === 0) {
      console.warn(`[UPDATE] No fields provided to update: id=${inventoryId}`);
      return res.status(400).json({ error: 'No fields to update provided' });
    }
    
    // Add id as final parameter
    values.push(inventoryId);
    
    // Execute update
    const updateQuery = `UPDATE inventory SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Update failed: no rows returned' });
    }
    
    const updatedItem = result.rows[0];
    
    // Log activity
    await recordActivity(
      `Updated inventory: ${updatedItem.name} (${updatedItem.set})`,
      { id: inventoryId, quantity, purchase_price, purchase_date, reorder_type }
    );
    
    res.json(updatedItem);
  } catch (err) {
    console.error(`[UPDATE] Error updating inventory id=${inventoryId}:`, err.message);
    handleDbError(err, res);
  }
});

// ========== USAGE HISTORY ROUTES ==========
app.get('/api/usage-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await pool.query(
      `SELECT id, action, created_at, details
       FROM usage_history
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('[ACTIVITY] ❌ Query error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity history' });
  }
});

app.post('/api/usage-history', async (req, res) => {
  try {
    const { action, details } = req.body;
    
    if (!action || typeof action !== 'string') {
      return res.status(400).json({ error: 'Action is required and must be a string' });
    }
    
    const result = await pool.query(
      `INSERT INTO usage_history (action, created_at, details)
       VALUES ($1, NOW(), $2)
       RETURNING *`,
      [action, details ? JSON.stringify(details) : null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ACTIVITY] ❌ Error:', err.message);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

app.get('/api/decklists', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM decklists ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.post('/api/decklists', async (req, res) => {
  const { name, decklist } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO decklists (name, decklist) VALUES ($1, $2) RETURNING *',
      [name, decklist]
    );
    
    // Log activity
    const decklistId = result.rows[0].id;
    await recordActivity(`Created decklist: ${name}`, { name, decklist_id: decklistId });
    
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

app.get('/api/containers', async (req, res) => {
  try {
    console.log('[CONTAINERS GET] Fetching all containers');
    
    // Fetch containers (no longer relying on JSONB cards field)
    const containersResult = await pool.query(
      'SELECT id, name, decklist_id, created_at FROM containers ORDER BY created_at DESC'
    );
    
    // For each container, fetch its items from container_items table
    const containersWithItems = await Promise.all(
      containersResult.rows.map(async (container) => {
        const itemsResult = await pool.query(
          `SELECT 
            ci.id as container_item_id,
            ci.inventory_id as "inventoryId",
            ci.printing_id as "printingId",
            ci.quantity as quantity_used,
            i.name,
            i.set,
            i.set_name,
            i.purchase_price
          FROM container_items ci
          LEFT JOIN inventory i ON ci.inventory_id = i.id
          WHERE ci.container_id = $1
          ORDER BY ci.id`,
          [container.id]
        );
        return {
          ...container,
          // Return items as 'cards' for backward compatibility with frontend
          cards: itemsResult.rows
        };
      })
    );
    
    console.log(`[CONTAINERS GET] ✅ Retrieved ${containersWithItems.length} containers`);
    res.json(containersWithItems);
  } catch (err) {
    console.error('Containers query error:', err.message);
    res.json([]);
  }
});

app.post('/api/containers', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, decklist_id, cards } = req.body;
    
    console.log(`[CONTAINER] Creating container: name="${name}", decklist_id=${decklist_id}, cards_provided=${Array.isArray(cards)}`);

    // If client provided explicit cards array, use it
    let cardsArray = Array.isArray(cards) ? cards : null;
    
    if (cardsArray) {
      console.log(`[CONTAINER] Using provided cards array with ${cardsArray.length} cards`);
    }

    // Otherwise, if decklist_id provided, fetch decklist text, parse it, and enrich with inventory
    if (!cardsArray && decklist_id) {
      const { rows } = await client.query('SELECT decklist FROM decklists WHERE id = $1', [decklist_id]);
      const deckText = rows?.[0]?.decklist || "";
      const parsedCards = parseDecklistTextToCards(deckText);
      cardsArray = await enrichCardsWithInventory(parsedCards, client);
      console.log(`[CONTAINER] Parsed decklist with ${parsedCards.length} cards, enriched to ${cardsArray.length} inventory allocations`);
    }

    // Fallback to empty array
    if (!Array.isArray(cardsArray)) cardsArray = [];

    // ✅ CRITICAL: Do NOT decrement inventory when creating containers
    // REASON: Containers are temporary; they should not affect permanent inventory records
    // DESIGN: 
    //   - inventory.quantity = total cards purchased (permanent)
    //   - quantity_in_containers = calculated dynamically from active containers
    //   - quantity_available = quantity - quantity_in_containers
    // RULE: inventory.quantity ONLY changes when:
    //   1. A container is SOLD (then inventory decrements + records sale)
    //   2. The item is directly EDITED by user
    // RESULT: purchase_history remains intact forever
    
    console.log(`[CONTAINER] Starting INSERT: ${cardsArray.length} cards, no inventory decrements`);

    // Insert container (no longer storing cards as JSONB)
    const { rows } = await client.query(
      'INSERT INTO containers (name, decklist_id) VALUES ($1, $2) RETURNING id',
      [name, decklist_id]
    );
    
    const containerId = rows[0].id;
    
    // Insert container items into container_items table (new relational schema)
    for (const card of cardsArray) {
      const inventoryId = card.inventoryId ? parseInt(card.inventoryId, 10) : null;
      const printingId = card.printingId ? parseInt(card.printingId, 10) : null;
      const quantity = card.quantity_used || card.quantity || 1;
      
      await client.query(
        `INSERT INTO container_items (container_id, inventory_id, printing_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [containerId, inventoryId || null, printingId || null, quantity]
      );
    }
    
    console.log(`[CONTAINER] ✅ Created container id=${containerId} with ${cardsArray.length} items in container_items table. Inventory UNCHANGED.`);
    
    await client.query('COMMIT');
    
    // Log activity
    await recordActivity(`Created container: ${name}`, { container_id: containerId, name });
    
    res.status(201).json({ id: containerId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[CONTAINER] ❌ Creation error:', err.message);
    res.status(500).json({ error: 'Failed to create container' });
  } finally {
    client.release();
  }
});

// Get container items/cards
app.get('/api/containers/:id/items', async (req, res) => {
  const containerId = parseInt(req.params.id, 10);
  
  if (isNaN(containerId)) {
    return res.status(400).json({ error: 'Invalid container ID' });
  }
  
  try {
    console.log(`[CONTAINERS GET ITEMS] Fetching items for container id=${containerId}`);
    
    // Check if container exists
    const containerCheck = await pool.query(
      'SELECT id FROM containers WHERE id = $1',
      [containerId]
    );
    
    if (containerCheck.rows.length === 0) {
      console.warn(`[CONTAINERS GET ITEMS] Container not found: id=${containerId}`);
      return res.status(404).json({ error: 'Container not found' });
    }
    
    // Fetch items from container_items table
    const result = await pool.query(
      `SELECT 
        ci.id as container_item_id,
        ci.inventory_id as "inventoryId",
        ci.printing_id as "printingId",
        ci.quantity as quantity_used,
        i.name,
        i.set,
        i.set_name,
        i.purchase_price
      FROM container_items ci
      LEFT JOIN inventory i ON ci.inventory_id = i.id
      WHERE ci.container_id = $1
      ORDER BY ci.id`,
      [containerId]
    );
    
    console.log(`[CONTAINERS GET ITEMS] ✅ Retrieved ${result.rows.length} items`);
    res.json(result.rows);
  } catch (err) {
    console.error('Container items error:', err);
    res.json([]);
  }
});

// Delete container
app.delete('/api/containers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid container ID' });
    }
    const result = await pool.query('DELETE FROM containers WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Container delete error:', err);
    res.status(500).json({ error: 'Failed to delete container' });
  }
});

// ========== SELL CONTAINER (USING NEW MODULAR SCHEMA) ==========
app.post('/api/containers/:id/sell', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { salePrice } = req.body;
    
    // Validate sale price
    const parsedPrice = parseFloat(salePrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ 
        error: 'Invalid sale price', 
        received: salePrice 
      });
    }

    await client.query('BEGIN');
    console.log(`[SELL] Transaction started`);

    // Get container details
    const containerResult = await client.query(
      'SELECT id, name, decklist_id FROM containers WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    
    if (containerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      console.log(`[SELL] ❌ Container not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Container not found' });
    }

    const container = containerResult.rows[0];

    // Fetch container items from container_items table
    const itemsResult = await client.query(
      `SELECT 
        ci.inventory_id as "inventoryId",
        ci.quantity as quantity_used
      FROM container_items ci
      WHERE ci.container_id = $1`,
      [container.id]
    );
    const items = itemsResult.rows;

    console.log(`[SELL CONTAINER] ID: ${container.id}, Name: ${container.name}, Decklist: ${container.decklist_id}, Items: ${items.length}, Price: $${parsedPrice}`);

    // Decrement inventory for each container item
    for (const item of items) {
      if (item.inventoryId && item.quantity_used > 0) {
        const updateResult = await client.query(
          `UPDATE inventory 
           SET quantity = GREATEST(0, quantity - $1)
           WHERE id = $2
           RETURNING id, quantity`,
          [item.quantity_used, item.inventoryId]
        );
        
        if (updateResult.rows.length > 0) {
          console.log(`[SELL] ✅ Inventory decremented: id=${updateResult.rows[0].id}, new_qty=${updateResult.rows[0].quantity}`);
        }
      }
    }

    // Delete container (container_items will be deleted via ON DELETE CASCADE)
    await client.query('DELETE FROM containers WHERE id = $1', [container.id]);
    console.log(`[SELL] ✅ Container deleted: id=${container.id}`);

    // Insert sale record AFTER deleting container (avoids FK cascade issues)
    const saleResult = await client.query(
      `INSERT INTO sales (
        container_id, 
        sale_price, 
        sold_date, 
        decklist_id,
        created_at
      ) VALUES ($1, $2, NOW(), $3, NOW()) 
      RETURNING *`,
      [container.id, parsedPrice, container.decklist_id]
    );

    if (!saleResult.rows[0]) {
      throw new Error('Sale insert returned no data');
    }

    const sale = saleResult.rows[0];
    console.log(`[SALE INSERTED] ID: ${sale.id}, Container: ${container.name}, Price: $${parsedPrice}`);

    // Verify sale exists before commit
    const verifyResult = await client.query(
      'SELECT id, container_id, sale_price FROM sales WHERE id = $1',
      [sale.id]
    );
    
    if (verifyResult.rows.length === 0) {
      throw new Error(`Sale ${sale.id} not found after insert - transaction issue`);
    }
    
    console.log(`[SALE VERIFIED] Sale ${sale.id} exists in transaction`);

    // Commit transaction
    await client.query('COMMIT');
    console.log(`[SELL] ✅ Transaction committed`);

    // CRITICAL: Verify sale persisted after commit
    const postCommitVerify = await pool.query(
      'SELECT id, container_id, sale_price, sold_date FROM sales WHERE id = $1',
      [sale.id]
    );
    
    if (postCommitVerify.rows.length === 0) {
      console.error(`[SELL] ❌ CRITICAL: Sale ${sale.id} NOT FOUND after commit!`);
      return res.status(500).json({ 
        error: 'Sale was not persisted', 
        saleId: sale.id 
      });
    }
    
    console.log(`[SALE RECORDED] Container: ${container.name}, Price: $${parsedPrice}, Sale ID: ${sale.id} ✅ PERSISTED`);
    
    // Log the sale activity
    await recordActivity(
      `Sold container: ${container.name} for $${parsedPrice}`,
      { container_id: container.id, container_name: container.name, sale_price: parsedPrice, sale_id: sale.id }
    );
    
    // Return the sale data
    res.json({
      ...sale,
      container_name: container.name
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SELL] ❌ Transaction rolled back:', err);
    console.error('[SELL] Error stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to sell container', 
      details: err.message 
    });
  } finally {
    client.release();
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    console.log('[GET SALES] Fetching sales records...');
    
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
    
    console.log(`[GET SALES] ✅ Found ${result.rows.length} sales records`);
    
    if (result.rows.length > 0) {
      console.log(`[GET SALES] Sample record:`, JSON.stringify(result.rows[0], null, 2));
    }
    
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
    console.error('[GET SALES] ❌ Query error:', err);
    console.error('[GET SALES] Error stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to fetch sales',
      details: err.message 
    });
  }
});

// ========== DEBUG ENDPOINT (Temporary) ==========
app.get('/api/debug/sales', async (req, res) => {
  try {
    // Check table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'sales'
      ORDER BY ordinal_position
    `);
    
    // Check foreign key constraints
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = 'sales'
    `);
    
    // Check sales count
    const count = await pool.query('SELECT COUNT(*) as total FROM sales');
    
    // Get recent sales
    const recentSales = await pool.query(`
      SELECT * FROM sales 
      ORDER BY COALESCE(sold_date, created_at) DESC 
      LIMIT 5
    `);
    
    res.json({
      columns: tableInfo.rows,
      constraints: constraints.rows,
      total_sales: parseInt(count.rows[0].total),
      recent_sales: recentSales.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get('/api/analytics/total-purchases-60days', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COALESCE(SUM(purchase_price * quantity), 0) as total_spent
      FROM purchase_history
      WHERE to_timestamp(purchase_date, 'YYYY-MM-DD') >= NOW() - INTERVAL '60 days'
    `);
    res.json({ totalSpent: parseFloat(result.rows[0]?.total_spent || 0) });
  } catch (err) {
    console.error('Total purchases query error:', err);
    res.json({ totalSpent: 0 });
  }
});

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

// ============== PRICE SCRAPING ==============

// NEW ENDPOINT — query parameter version for frontend compatibility
app.get('/api/price', async (req, res) => {
  const name = req.query.name;
  const set = req.query.set;

  if (!name) {
    return res.status(400).json({ error: "Missing 'name' query parameter" });
  }

  // Forward to the existing path-based endpoint via local fetch
  try {
    const url = `http://localhost:3000/api/prices/${encodeURIComponent(name)}/${encodeURIComponent(set || '')}`;
    const result = await fetch(url);
    const data = await result.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Price lookup failed", details: err.message });
  }
});

app.get('/api/prices/:cardName/:setCode', priceLimiter, async (req, res) => {
  const { cardName, setCode } = req.params;
  
  try {
    // Scryfall TCG price
    const scryfallUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${setCode.toLowerCase()}`;
    const scryfallRes = await fetchRetry(scryfallUrl);
    
    let tcgPrice = 'N/A';
    if (scryfallRes.ok) {
      const card = await scryfallRes.json();
      const price = parseFloat(card.prices?.usd);
      if (price > 0) {
        tcgPrice = `$${price.toFixed(2)}`;
      }
    }
    
    // ==================== CARD KINGDOM SCRAPE ====================
    let ckPrice = 'N/A';
    
    try {
      const ckSearchUrl = `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${encodeURIComponent(cardName)}`;
      
      
      const response = await fetchRetry(ckSearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Referer': 'https://www.cardkingdom.com/'
        }
      });
      
      if (!response) {
        // Silent fail - will return N/A
      } else if (!response.ok) {
        // Silent fail - will return N/A
      } else {
        const html = await response.text();
        
        if (html && html.length > 50 && !html.includes("captcha") && !html.includes("verify you are human")) {
          const $ = load(html);
          const products = $('div[class*="product"]');
          
          if (products.length > 0) {
            // PASS 1: Extract raw products (with edition metadata)
            let rawProducts = [];
            const target = cardName.toLowerCase();
            let debugEditions = [];
            
            products.each((i, el) => {
              let nameEl = $(el).find('a').first();
              if (nameEl.length === 0) nameEl = $(el).find('.product-name, .item-title, [class*="name"]').first();
              
              let priceEl = $(el).find('span.stylePrice').first();
              if (priceEl.length === 0) priceEl = $(el).find('span.price, div.price, [class*="price"]').first();
              
              let name = nameEl.length > 0 ? nameEl.text().trim().toLowerCase() : '';
              let rawPrice = priceEl.length > 0 ? priceEl.text().trim() : '';
              
              // Extract edition: URL first (authoritative), then fallback to DOM
              let edition = null;
              const productUrl = extractProductUrl($, el);
              if (productUrl) {
                edition = extractEditionFromUrl(productUrl);
              }
              if (!edition) {
                edition = extractEditionFromHtml(el, $);
              }
              
              // Extract quantity and condition (NM preferred)
              let quantity = 0;
              let condition = 'unknown';
              
              // Look for "In Stock: X" or quantity text
              const stockText = $(el).text();
              const qtyMatch = stockText.match(/(?:in\s+stock|qty|quantity)[\s:]*(\d+)/i);
              if (qtyMatch) {
                quantity = parseInt(qtyMatch[1]) || 0;
              }
              
              // Look for condition indicators (NM > LP > MP)
              if (stockText.match(/\bNM\b|\bnear\s+mint\b/i)) {
                condition = 'NM';
              } else if (stockText.match(/\bLP\b|\blight\s+play\b/i)) {
                condition = 'LP';
              } else if (stockText.match(/\bMP\b|\bmoderate\s+play\b/i)) {
                condition = 'MP';
              } else if (stockText.match(/\bHP\b|\bheavy\s+play\b/i)) {
                condition = 'HP';
              }
              
              if (edition) {
                debugEditions.push(`${name}: ${edition}`);
              }
              
              if (!rawPrice) {
                const productHtml = $(el).html();
                const prices = extractPricesFromText(productHtml);
                if (prices.length > 0) {
                  const bestPrice = Math.min(...prices.filter(p => isValidPrice(p)));
                  if (bestPrice && Number.isFinite(bestPrice)) {
                    rawPrice = `$${bestPrice.toFixed(2)}`;
                  }
                }
              }
              
              if (name && name.includes(target)) {
                const numericPrice = rawPrice ? extractNumericPrice(rawPrice) : 0;
                if (isValidPrice(numericPrice)) {
                  const productUrl = extractProductUrl($, el);
                  rawProducts.push({ 
                    name, 
                    price: numericPrice, 
                    edition, 
                    quantity,
                    condition,
                    url: productUrl,
                    index: rawProducts.length 
                  });
                }
              }
            });
            
            // PASS 2: Determine baseline price from "set" edition types only
            let baselinePrice = null;
            const setCandidates = [];
            
            for (const p of rawProducts) {
              const editionType = classifyEdition(p.edition);
              const cond = (p.condition || "unknown").toUpperCase();
            
              if (editionType !== "set") continue;
              if (cond === "HP" || cond === "MP") continue;
              
              setCandidates.push(p.price);
            }
            
            if (setCandidates.length > 0) {
              setCandidates.sort((a, b) => a - b);
              baselinePrice = setCandidates[0];
            } else {
              const fallbackCandidates = rawProducts
                .filter(p => {
                  const nameLower = (p.name || '').toLowerCase();
                  if (DEFAULT_BLACKLIST.some(kw => nameLower.includes(kw))) return false;
                  const cond = (p.condition || "unknown").toUpperCase();
                  if (cond === "HP" || cond === "MP") return false;
                  return isValidPrice(p.price);
                })
                .map(p => p.price)
                .sort((a, b) => a - b);

              if (fallbackCandidates.length > 0) {
                const mid = Math.floor((fallbackCandidates.length - 1) / 2);
                baselinePrice = fallbackCandidates[mid];
              } else {
                baselinePrice = null;
              }
            }
            
            const globalPriceContext = { lowestNormalPrice: baselinePrice };
            const conditionRank = { 'NM': 0, 'LP': 1, 'MP': 2, 'HP': 3, 'unknown': 4 };
            
            // PASS 3: Final classification using corrected logic
            const productPrices = [];
            const isSolRing = cardName.toLowerCase().includes('sol ring');
            const isLightningBolt = cardName.toLowerCase().includes('lightning bolt');
            const isBasicLandCard = isBasicLand(cardName);
            
            for (const p of rawProducts) {
              const cond = (p.condition || "unknown").toUpperCase();
              if (cond === "HP" || cond === "MP") continue;
              
              let variant;
              if (isBasicLandCard) {
                const nameLower = (p.name || '').toLowerCase();
                const isFoil = nameLower.includes('foil');
                variant = isFoil ? 'basicland-foil' : 'basicland-normal';
              } else {
                variant = classifyProduct(p.name, p.edition);
              }
              
              const rank = getVariantRank(variant);
              productPrices.push({ 
                price: p.price, 
                variant, 
                rank, 
                name: p.name,
                quantity: p.quantity,
                condition: p.condition,
                edition: p.edition
              });
            }
            
            if (productPrices.length > 0) {
              const best = productPrices.sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                if (a.quantity !== b.quantity) return b.quantity - a.quantity;
                const aCondRank = conditionRank[a.condition] ?? 99;
                const bCondRank = conditionRank[b.condition] ?? 99;
                if (aCondRank !== bCondRank) return aCondRank - bCondRank;
                return a.price - b.price;
              })[0];
              
              ckPrice = `$${best.price.toFixed(2)}`;
            }
          }
        }
      }
    } catch (err) {
      // Silent error - will return N/A
    }
    
    // ==================== MTGJSON FALLBACK ====================
    // If CK scrape failed, try MTGJSON
    if (ckPrice === 'N/A') {
      try {
        // Fetch card from Scryfall to get UUID
        const scryfallUuidUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${setCode.toLowerCase()}`;
        const uuidRes = await fetchRetry(scryfallUuidUrl);
        
        if (uuidRes.ok) {
          const card = await uuidRes.json();
          const uuid = card.id;
          
          // Look up in MTGJSON cache
          if (uuid) {
            const mtgjsonPrice = mtgjsonService.getRetailPriceByUUID(uuid);
            if (mtgjsonPrice && mtgjsonPrice > 0) {
              ckPrice = `$${mtgjsonPrice.toFixed(2)}`;
              console.log(`[PRICES] Using MTGJSON fallback for ${cardName}: $${mtgjsonPrice.toFixed(2)}`);
            }
          }
        }
      } catch (err) {
        // Silent error - ckPrice remains N/A
      }
    }
    
    const responseData = { tcg: tcgPrice, ck: ckPrice };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(responseData);
    
  } catch (error) {
    const fallbackResponse = { tcg: 'N/A', ck: 'N/A' };
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json(fallbackResponse);
  }
});

// ========== TEST ENDPOINT - SIMPLIFIED ==========
app.get('/api/prices-test/:cardName/:setCode', priceLimiter, (req, res) => {
  const { cardName, setCode } = req.params;
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ 
    tcg: "$1.23", 
    ck: "$2.34",
    source: "test-endpoint",
    timestamp: new Date().toISOString()
  });
});

// ========== HEALTH CHECK ENDPOINT ==========
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down...');
  await pool.end();
  process.exit(0);
});

// ========== STATIC FILES FOR PRODUCTION ==========
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, { 
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// ========== SPA CATCH-ALL (must be last) ==========
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) console.error('[SPA] Error serving index.html:', err);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] ✓ Running on port ${PORT}`);
  console.log(`[SERVER] ✓ Static files served from ${distPath}`);
});
