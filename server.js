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

function classifyVariant(rawName, cardName) {
  const blacklist = DEFAULT_BLACKLIST;
  const name = normalizeName(rawName);
  const target = normalizeName(cardName).trim();

  if (name === target) return 'normal';

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
        
        const productPrices = [];
        
        products.each((i, el) => {
          let nameEl = $(el).find('a').first();
          if (nameEl.length === 0) nameEl = $(el).find('.product-name, .item-title, [class*="name"]').first();
          
          let priceEl = $(el).find('span.stylePrice').first();
          if (priceEl.length === 0) priceEl = $(el).find('span.price, div.price, [class*="price"]').first();
          
          let name = nameEl.length > 0 ? nameEl.text().trim().toLowerCase() : '';
          let rawPrice = priceEl.length > 0 ? priceEl.text().trim() : '';
          
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
          
          const target = cardName.toLowerCase();
          if (name && name.includes(target)) {
            const numericPrice = rawPrice ? extractNumericPrice(rawPrice) : 0;
            
            if (isValidPrice(numericPrice)) {
              const variant = classifyVariant(name, cardName);
              const rank = getVariantRank(variant);
              productPrices.push({ price: numericPrice, variant, rank, name });
              console.log(`      ✓ Valid match found: $${numericPrice.toFixed(2)} [${variant}]`);
            }
          }
        });
        
        if (productPrices.length > 0) {
          const best = productPrices.sort((a, b) => {
            if (a.rank !== b.rank) return a.rank - b.rank;
            return a.price - b.price;
          })[0];
          
          ckPrice = `$${best.price.toFixed(2)}`;
          console.log(`  [DEBUG] Found ${productPrices.length} matching products`);
          console.log(`  ✓ Best match: ${best.name} [${best.variant}] = ${ckPrice}`);
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
