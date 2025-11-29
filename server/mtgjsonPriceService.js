import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '..', '.mtgjson-cache.json');
const MTGJSON_PRICES_URL = 'https://mtgjson.com/api/v5/AllPricesToday.json';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

class MtgjsonPriceService {
  constructor() {
    this.priceData = new Map();
    this.lastFetchTime = null;
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Initialize the service by loading cached data or fetching fresh data
   */
  async initialize() {
    await this.loadCacheFromDisk();
    
    // If cache is stale or empty, refresh in background
    if (this.isCacheStale()) {
      this.refreshPriceData().catch(err => {
        console.error('[MTGJSON] Background refresh failed:', err.message);
      });
    }
  }

  /**
   * Check if the cache is stale (older than CACHE_DURATION_MS)
   */
  isCacheStale() {
    if (!this.lastFetchTime) return true;
    return Date.now() - this.lastFetchTime > CACHE_DURATION_MS;
  }

  /**
   * Load cached price data from disk
   */
  async loadCacheFromDisk() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const cacheContent = fs.readFileSync(CACHE_FILE, 'utf8');
        const cache = JSON.parse(cacheContent);
        
        if (cache.timestamp && cache.prices) {
          this.lastFetchTime = cache.timestamp;
          this.priceData = new Map(Object.entries(cache.prices));
          console.log(`[MTGJSON] Loaded ${this.priceData.size} price entries from cache`);
        }
      }
    } catch (err) {
      console.error('[MTGJSON] Failed to load cache from disk:', err.message);
    }
  }

  /**
   * Save price data to disk cache
   */
  async saveCacheToDisk() {
    try {
      const cache = {
        timestamp: this.lastFetchTime,
        prices: Object.fromEntries(this.priceData)
      };
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8');
      console.log(`[MTGJSON] Saved ${this.priceData.size} price entries to cache`);
    } catch (err) {
      console.error('[MTGJSON] Failed to save cache to disk:', err.message);
    }
  }

  /**
   * Fetch fresh price data from MTGJSON API
   */
  async refreshPriceData() {
    if (this.isLoading) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this._fetchPriceData();
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Internal method to fetch price data
   */
  async _fetchPriceData() {
    console.log('[MTGJSON] Fetching price data from API...');
    
    try {
      const response = await fetch(MTGJSON_PRICES_URL, {
        timeout: 60000,
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.data) {
        // MTGJSON returns { data: { uuid: priceData, ... }, meta: { ... } }
        this.priceData = new Map(Object.entries(data.data));
        this.lastFetchTime = Date.now();
        
        console.log(`[MTGJSON] ✓ Loaded ${this.priceData.size} price entries`);
        
        // Save to disk cache
        await this.saveCacheToDisk();
      } else {
        console.warn('[MTGJSON] Invalid response format from API');
      }
    } catch (err) {
      console.error('[MTGJSON] ✗ Failed to fetch price data:', err.message);
      throw err;
    }
  }

  /**
   * Get Card Kingdom retail price for a card by its UUID
   * @param {string} uuid - The MTGJSON UUID of the card
   * @returns {string|null} - The formatted price string or null if not found
   */
  getCardKingdomPrice(uuid) {
    if (!uuid) return null;
    
    const priceEntry = this.priceData.get(uuid);
    if (!priceEntry) return null;

    // MTGJSON price structure: { paper: { cardkingdom: { retail: { normal: { date: price } } } } }
    try {
      const ckPrices = priceEntry.paper?.cardkingdom?.retail?.normal;
      if (ckPrices && typeof ckPrices === 'object') {
        // Get the most recent price (last date in the object)
        const dates = Object.keys(ckPrices).sort();
        if (dates.length > 0) {
          const latestDate = dates[dates.length - 1];
          const price = parseFloat(ckPrices[latestDate]);
          if (!isNaN(price) && price > 0) {
            return `$${price.toFixed(2)}`;
          }
        }
      }
    } catch (err) {
      // Price lookup failed, return null
    }

    return null;
  }

  /**
   * Get Card Kingdom price using card name and set code
   * This is a fallback method that searches through all prices
   * @param {string} cardName - The card name
   * @param {string} setCode - The set code
   * @returns {string|null} - The formatted price string or null if not found
   */
  getCardKingdomPriceByNameAndSet(cardName, setCode) {
    // This method would require additional card data (name/set to UUID mapping)
    // For now, we rely on UUID lookup via Scryfall's identifiers
    return null;
  }
}

// Export a singleton instance
export const mtgjsonService = new MtgjsonPriceService();
