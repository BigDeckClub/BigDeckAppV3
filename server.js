import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pkg from 'pg';
import { load } from 'cheerio';

const { Pool } = pkg;
const app = express();

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
  "Commander",
  "Commander 2014",
  "Commander 2016",
  "Commander 2018",
  "Commander 2020",
  "Commander 2021",
  "Commander 2022",
  "Commander Masters",
  "Commander Anthology",
  "From the Vault: Relics",
  "Magic 2014",
  "Magic 2015",
  "Secret Lair Drop Series",
  "Judge Gift Cards",
  "Magic Origins",
  "Core Set",
  "Starter Commander Deck",
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
  console.error('DB Error:', err);
  res.status(500).json({ error: 'Database error' });
}

// ============== ROUTES ==============
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Inventory query error:', err.message);
    res.json([]);
  }
});

app.post('/api/inventory', async (req, res) => {
  const { cardName, setCode, quantity, tcgPrice, ckPrice } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO inventory (card_name, set_code, quantity, tcg_price, ck_price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cardName, setCode, quantity, tcgPrice, ckPrice]
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

app.get('/api/decklists', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM decklists ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.post('/api/decklists', async (req, res) => {
  const { name, format, deckData, totalCost } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO decklists (name, format, deck_data, total_cost) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, format, JSON.stringify(deckData), totalCost]
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

app.get('/api/containers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM containers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Containers query error:', err.message);
    res.json([]);
  }
});

app.post('/api/containers', async (req, res) => {
  const { name, cards, containerCost } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO containers (name, cards, container_cost, sold) VALUES ($1, $2, $3, FALSE) RETURNING *',
      [name, JSON.stringify(cards), containerCost]
    );
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

app.post('/api/containers/:id/sell', async (req, res) => {
  const { salePrice } = req.body;
  try {
    const containerResult = await pool.query('SELECT cards FROM containers WHERE id = $1', [req.params.id]);
    if (containerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const cards = containerResult.rows[0].cards;
    for (const card of cards) {
      await pool.query(
        'UPDATE inventory SET quantity = quantity - $1 WHERE id = $2',
        [card.quantity, card.inventoryId]
      );
    }

    const saleResult = await pool.query(
      'INSERT INTO sales (container_id, sale_price) VALUES ($1, $2) RETURNING *',
      [req.params.id, salePrice]
    );

    await pool.query('UPDATE containers SET is_active = FALSE WHERE id = $1', [req.params.id]);

    res.json(saleResult.rows[0]);
  } catch (err) {
    console.error('Sell container error:', err.message);
    res.status(500).json({ error: 'Failed to sell container' });
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sales ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Sales query error:', err.message);
    res.json([]);
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
app.get('/api/prices/:cardName/:setCode', async (req, res) => {
  const { cardName, setCode } = req.params;
  
  console.log(`\n=== PRICE REQUEST: ${cardName} (${setCode}) ===`);
  
  try {
    // Scryfall TCG price
    const scryfallUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&set=${setCode.toLowerCase()}`;
    const scryfallRes = await fetch(scryfallUrl);
    
    let tcgPrice = 'N/A';
    if (scryfallRes.ok) {
      const card = await scryfallRes.json();
      const price = parseFloat(card.prices?.usd);
      if (price > 0) {
        tcgPrice = `$${price.toFixed(2)}`;
        console.log(`✓ Scryfall TCG price: ${tcgPrice}`);
      }
    } else {
      console.log(`✗ Scryfall lookup failed for ${cardName} (${setCode})`);
    }
    
    // Card Kingdom price
    let ckPrice = 'N/A';
    
    try {
      const ckSearchUrl = `https://www.cardkingdom.com/catalog/search?search=header&filter%5Bname%5D=${encodeURIComponent(cardName)}`;
      
      console.log(`Fetching CK: ${ckSearchUrl}`);
      
      const ckRes = await fetch(ckSearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        }
      });
      
      if (ckRes.ok) {
        const html = await ckRes.text();
        const $ = load(html);
        
        console.log(`  [DEBUG] Scraping products for: ${cardName}`);
        
        const productSelectors = [
          'div.productCard', 'li.productCard', 'div.product', 'div.card-listing',
          '.catalog-item', 'a[data-product-id]', 'div[class*="product"]'
        ];
        
        let products = [];
        for (const sel of productSelectors) {
          const els = $(sel);
          if (els.length > 0) {
            console.log(`    ✓ Found ${els.length} elements for selector "${sel}"`);
            products = els;
            break;
          }
        }
        
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
        
        if (debugEditions.length > 0) {
          console.log(`   [EDITION DEBUG] Found editions: ${debugEditions.slice(0, 5).join(', ')}`);
        } else {
          console.log(`   [EDITION DEBUG] No editions extracted from any products`);
        }
        
        // Debug: check edition extraction success rate
        const nullEditionProducts = rawProducts.filter(p => !p.edition);
        console.log(`   [DEBUG] products without edition: ${nullEditionProducts.length}/${rawProducts.length}`);
        if (nullEditionProducts.length > 0 && nullEditionProducts.length <= 5) {
          console.log(`   [DEBUG URLS] null edition items: ${nullEditionProducts.slice(0, 5).map(p => `"${p.name}" (${p.url || 'no-url'})`).join(', ')}`);
        }

        // PASS 2: Determine baseline price from "set" edition types only
        let baselinePrice = null;
        const setCandidates = [];
        
        for (const p of rawProducts) {
          const editionType = classifyEdition(p.edition);
          const cond = (p.condition || "unknown").toUpperCase();
        
          // Only include "set" editions, skip HP/MP condition
          if (editionType !== "set") continue;
          if (cond === "HP" || cond === "MP") continue;
          
          setCandidates.push(p.price);
        }
        
        if (setCandidates.length > 0) {
          setCandidates.sort((a, b) => a - b);
          baselinePrice = setCandidates[0]; // cheapest legitimate set edition
        } else {
          // Fallback: pick median price among non-special-looking items (exclude clear variant keywords)
          const fallbackCandidates = rawProducts
            .filter(p => {
              const nameLower = (p.name || '').toLowerCase();
              // exclude clear variant names contained in the product name
              if (DEFAULT_BLACKLIST.some(kw => nameLower.includes(kw))) return false;
              // exclude poor conditions
              const cond = (p.condition || "unknown").toUpperCase();
              if (cond === "HP" || cond === "MP") return false;
              return isValidPrice(p.price);
            })
            .map(p => p.price)
            .sort((a, b) => a - b);

          if (fallbackCandidates.length > 0) {
            // choose the median (more robust than absolute cheapest)
            const mid = Math.floor((fallbackCandidates.length - 1) / 2);
            baselinePrice = fallbackCandidates[mid];
            console.log(`   [FALLBACK BASELINE] using median fallback price: $${baselinePrice.toFixed(2)} from ${fallbackCandidates.length} candidates`);
          } else {
            baselinePrice = null;
          }
        }
        
        const globalPriceContext = { lowestNormalPrice: baselinePrice };
        
        // Condition rank for sorting (higher = better)
        const conditionRank = { 'NM': 0, 'LP': 1, 'MP': 2, 'HP': 3, 'unknown': 4 };
        
        // PASS 3: Final classification using corrected logic
        const productPrices = [];
        
        // For Sol Ring/Lightning Bolt: log full product names for debugging
        const isSolRing = cardName.toLowerCase().includes('sol ring');
        const isLightningBolt = cardName.toLowerCase().includes('lightning bolt');
        
        for (const p of rawProducts) {
          const cond = (p.condition || "unknown").toUpperCase();
          
          // Skip poor condition
          if (cond === "HP" || cond === "MP") continue;
          
          // NEW: Edition-based classification using safelist
          // This correctly handles ambiguous plain names (like "sol ring") by checking edition metadata
          const variant = classifyProduct(p.name, p.edition);
          
          const rank = getVariantRank(variant);
          productPrices.push({ 
            price: p.price, 
            variant, 
            rank, 
            name: p.name,
            quantity: p.quantity,
            condition: p.condition
          });
          
          // Debug logging for Sol Ring/Lightning Bolt to see full product names
          if (isSolRing || isLightningBolt) {
            console.log(`      ✓ $${p.price.toFixed(2)} [${variant}] - "${p.name}"`);
          } else {
            console.log(`      ✓ Valid match found: $${p.price.toFixed(2)} [${variant}] (${p.condition}, qty: ${p.quantity})`);
          }
        }
        
        if (productPrices.length > 0) {
          const best = productPrices.sort((a, b) => {
            // 1. Primary: Sort by rank (variant type - normal before special)
            if (a.rank !== b.rank) return a.rank - b.rank;
            // 2. Secondary: Higher quantity first
            if (a.quantity !== b.quantity) return b.quantity - a.quantity;
            // 3. Tertiary: Better condition first (NM > LP > MP > HP)
            const aCondRank = conditionRank[a.condition] ?? 99;
            const bCondRank = conditionRank[b.condition] ?? 99;
            if (aCondRank !== bCondRank) return aCondRank - bCondRank;
            // 4. Final: Lowest price
            return a.price - b.price;
          })[0];
          
          ckPrice = `$${best.price.toFixed(2)}`;
          console.log(`  [DEBUG] Found ${productPrices.length} matching products`);
          console.log(`  ✓ Best match: ${best.name} [${best.variant}] ${best.condition} (qty: ${best.quantity}) = ${ckPrice}`);
        }
      }
    } catch (ckError) {
      console.log(`✗ CK fetch failed: ${ckError.message}`);
    }
    
    console.log(`Final result: TCG=${tcgPrice}, CK=${ckPrice}\n`);
    
    res.json({ tcg: tcgPrice, ck: ckPrice });
    
  } catch (error) {
    console.error('Price fetch error:', error);
    res.json({ tcg: 'N/A', ck: 'N/A' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
