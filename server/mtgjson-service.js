import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MTGJSONPriceService {
  constructor() {
    this.prices = {}; // UUID -> { cardkingdom_retail, cardkingdom_buylist }
    this.lastUpdated = null;
    this.isLoading = false;
    this.cacheDir = path.join(__dirname, '..', '.cache');
    this.cacheFile = path.join(this.cacheDir, 'mtgjson-prices.json');
  }

  async initialize() {
    console.log('[MTGJSON] Initializing price service...');
    
    try {
      // Try to load from cache first
      if (fs.existsSync(this.cacheFile)) {
        try {
          const cached = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
          this.prices = cached.prices || {};
          this.lastUpdated = cached.lastUpdated;
          console.log(`[MTGJSON] ✓ Loaded ${Object.keys(this.prices).length} prices from cache (${new Date(this.lastUpdated).toISOString()})`);
          return;
        } catch (err) {
          console.log('[MTGJSON] Cache file corrupted, will download fresh data');
        }
      }

      // Download fresh data
      await this.downloadAndParsePrices();
    } catch (err) {
      console.error('[MTGJSON] ✗ Failed to initialize:', err.message);
    }
  }

  async downloadAndParsePrices() {
    if (this.isLoading) {
      console.log('[MTGJSON] Already loading, skipping...');
      return;
    }

    this.isLoading = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      console.log('[MTGJSON] Downloading AllPricesToday.json.gz from MTGJSON...');
      const url = 'https://mtgjson.com/api/v5/AllPricesToday.json.gz';
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Accept-Encoding': 'gzip' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get the gzipped buffer
      const buffer = await response.arrayBuffer();
      const gzipBuffer = Buffer.from(buffer);

      console.log(`[MTGJSON] Downloaded ${(gzipBuffer.length / 1024 / 1024).toFixed(2)}MB, decompressing...`);

      // Decompress
      const jsonBuffer = gunzipSync(gzipBuffer);
      const jsonStr = jsonBuffer.toString('utf8');
      const allPrices = JSON.parse(jsonStr);

      // Extract Card Kingdom prices indexed by UUID
      this.prices = {};
      let count = 0;

      for (const [uuid, priceData] of Object.entries(allPrices)) {
        if (!priceData.paper?.cardkingdom) continue;

        const ckData = priceData.paper.cardkingdom;
        const todayKey = new Date().toISOString().split('T')[0];

        // Extract retail price (buying from players)
        let retailPrice = null;
        if (ckData.retail?.normal) {
          const prices = Object.values(ckData.retail.normal);
          if (prices.length > 0) {
            retailPrice = parseFloat(prices[0]);
          }
        }

        // Extract buylist price (selling to Card Kingdom)
        let buylistPrice = null;
        if (ckData.buylist?.normal) {
          const prices = Object.values(ckData.buylist.normal);
          if (prices.length > 0) {
            buylistPrice = parseFloat(prices[0]);
          }
        }

        if (retailPrice || buylistPrice) {
          this.prices[uuid] = {
            retail: retailPrice,
            buylist: buylistPrice
          };
          count++;
        }
      }

      this.lastUpdated = new Date().toISOString();
      console.log(`[MTGJSON] ✓ Parsed ${count} Card Kingdom prices`);

      // Save to cache
      await this.saveCache();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error('[MTGJSON] ✗ Download timeout after 2 minutes');
      } else {
        console.error('[MTGJSON] ✗ Failed to download/parse:', err.message);
      }
    } finally {
      clearTimeout(timeout);
      this.isLoading = false;
    }
  }

  async saveCache() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify({
        prices: this.prices,
        lastUpdated: this.lastUpdated
      }, null, 2));
      console.log(`[MTGJSON] ✓ Saved cache with ${Object.keys(this.prices).length} prices`);
    } catch (err) {
      console.error('[MTGJSON] ✗ Failed to save cache:', err.message);
    }
  }

  getPriceByUUID(uuid) {
    return this.prices[uuid] || null;
  }

  getRetailPriceByUUID(uuid) {
    const price = this.prices[uuid];
    return price?.retail || null;
  }

  async refreshDaily() {
    const now = new Date();
    const lastUpdate = this.lastUpdated ? new Date(this.lastUpdated) : null;

    // Check if we should refresh (at least 24 hours old or never updated)
    if (!lastUpdate || (now - lastUpdate) > 24 * 60 * 60 * 1000) {
      console.log('[MTGJSON] Running daily refresh...');
      await this.downloadAndParsePrices();
    }
  }

  getStats() {
    return {
      loaded: Object.keys(this.prices).length,
      lastUpdated: this.lastUpdated,
      isLoading: this.isLoading
    };
  }
}

export default new MTGJSONPriceService();
