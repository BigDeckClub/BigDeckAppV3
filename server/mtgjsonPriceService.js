import { gunzipSync } from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '../.mtgjson-cache.json');
const DATA_URL = 'https://mtgjson.com/api/v5/AllPricesToday.json.gz';

class MTGJSONPriceService {
  constructor() {
    this.prices = new Map();
    this.lastUpdate = null;
  }

  async initialize() {
    console.log('[MTGJSON] Initializing price service...');
    try {
      // Try to load from cache first
      if (fs.existsSync(CACHE_FILE)) {
        const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        if (cached.timestamp && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          this.prices = new Map(cached.prices);
          this.lastUpdate = new Date(cached.timestamp);
          console.log('[MTGJSON] ✓ Loaded prices from cache');
          return;
        }
      }

      // Download fresh data
      await this.downloadPrices();
    } catch (err) {
      console.error('[MTGJSON] ✗ Failed to initialize:', err.message);
      console.log('[MTGJSON] Will proceed with empty cache - prices will fallback to other sources');
    }
  }

  async downloadPrices() {
    try {
      console.log('[MTGJSON] Downloading AllPricesToday.json.gz...');
      const response = await fetch(DATA_URL, { timeout: 30000 });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const decompressed = gunzipSync(buffer);
      const json = JSON.parse(decompressed.toString('utf-8'));

      // Parse the JSON structure and extract Card Kingdom prices
      // MTGJSON structure: { "cardName": { "uuid": {...}, ... }, ... }
      let count = 0;
      for (const cardName in json) {
        const variants = json[cardName];
        for (const uuid in variants) {
          const data = variants[uuid];
          // Card Kingdom prices are in: data.prices.cardkingdom
          if (data.prices?.cardkingdom) {
            this.prices.set(uuid, {
              name: cardName,
              ck: data.prices.cardkingdom,
              tcg: data.prices?.tcgplayer || null
            });
            count++;
          }
        }
      }

      this.lastUpdate = new Date();
      console.log(`[MTGJSON] ✓ Downloaded and parsed ${count} card prices`);

      // Cache to disk
      this.saveCache();
    } catch (err) {
      console.error('[MTGJSON] ✗ Download failed:', err.message);
      throw err;
    }
  }

  saveCache() {
    try {
      const cacheData = {
        timestamp: this.lastUpdate.getTime(),
        prices: Array.from(this.prices.entries())
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData));
      console.log('[MTGJSON] ✓ Saved cache to disk');
    } catch (err) {
      console.error('[MTGJSON] ✗ Failed to save cache:', err.message);
    }
  }

  // Look up price by UUID (from Scryfall)
  getPriceByUUID(uuid) {
    return this.prices.get(uuid);
  }

  // Search by card name (approximate)
  getPriceByName(cardName) {
    // Case-insensitive search
    const lower = cardName.toLowerCase();
    for (const [uuid, data] of this.prices) {
      if (data.name.toLowerCase() === lower) {
        return data;
      }
    }
    return null;
  }

  getStats() {
    return {
      totalPrices: this.prices.size,
      lastUpdate: this.lastUpdate,
      cacheFile: CACHE_FILE
    };
  }
}

export const mtgjsonService = new MTGJSONPriceService();
