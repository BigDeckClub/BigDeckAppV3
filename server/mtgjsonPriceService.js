import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parser } from 'stream-json';
import { streamValues } from 'stream-json/streamers/StreamValues.js';
import { chain } from 'stream-chain';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_FILE = path.join(__dirname, '..', '.mtgjson-cache.json');
const MTGJSON_PRICES_URL = 'https://mtgjson.com/api/v5/AllPricesToday.json';
const MTGJSON_IDENTIFIERS_URL = 'https://mtgjson.com/api/v5/AllIdentifiers.json';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const PRICES_TIMEOUT_MS = 120000; // 2 minutes for price data
const IDENTIFIERS_TIMEOUT_MS = 300000; // 5 minutes for larger identifiers file

class MtgjsonPriceService {
  constructor() {
    // Maps MTGJSON UUID -> price data
    this.priceData = new Map();
    // Maps Scryfall ID -> MTGJSON UUID
    this.scryfallToMtgjsonMap = new Map();
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
   * Check if the service is ready (has loaded Scryfall->MTGJSON mappings)
   */
  isReady() {
    return this.scryfallToMtgjsonMap.size > 0;
  }

  /**
   * Load cached price data from disk
   */
  async loadCacheFromDisk() {
    try {
      const cacheContent = await fs.readFile(CACHE_FILE, 'utf8');
      const cache = JSON.parse(cacheContent);
      
      if (cache.timestamp && cache.prices) {
        this.lastFetchTime = cache.timestamp;
        this.priceData = new Map(Object.entries(cache.prices));
        if (cache.scryfallMap) {
          this.scryfallToMtgjsonMap = new Map(Object.entries(cache.scryfallMap));
        }
        console.log(`[MTGJSON] Loaded ${this.priceData.size} price entries and ${this.scryfallToMtgjsonMap.size} ID mappings from cache`);
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('[MTGJSON] Failed to load cache from disk:', err.message);
      }
    }
  }

  /**
   * Save price data to disk cache
   */
  async saveCacheToDisk() {
    try {
      const cache = {
        timestamp: this.lastFetchTime,
        prices: Object.fromEntries(this.priceData),
        scryfallMap: Object.fromEntries(this.scryfallToMtgjsonMap)
      };
      await fs.writeFile(CACHE_FILE, JSON.stringify(cache), 'utf8');
      console.log(`[MTGJSON] Saved ${this.priceData.size} price entries and ${this.scryfallToMtgjsonMap.size} ID mappings to cache`);
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
    this.loadPromise = this._fetchAllData();
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * Fetch data from a URL with timeout
   */
  async _fetchWithTimeout(url, timeoutMs = PRICES_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        }
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Internal method to fetch all required data
   */
  async _fetchAllData() {
    try {
      // Fetch prices first
      await this._fetchPriceData();
    } catch (err) {
      console.error('[MTGJSON] Error fetching price data. Will attempt to fetch identifiers and preserve cache:', err.message);
    }
    
    try {
      // Fetch identifiers mapping (this is a larger file, so do it separately)
      await this._fetchIdentifiersData();
    } catch (err) {
      console.error('[MTGJSON] Error fetching identifiers data:', err.message);
    }
    
    // Save combined cache to disk, even if price fetch failed
    try {
      await this.saveCacheToDisk();
    } catch (err) {
      console.error('[MTGJSON] Error saving cache to disk:', err.message);
    }
  }

  /**
   * Internal method to fetch price data
   */
  async _fetchPriceData() {
    console.log('[MTGJSON] Fetching price data from API...');
    
    try {
      const response = await this._fetchWithTimeout(MTGJSON_PRICES_URL, PRICES_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.data) {
        // MTGJSON returns { data: { uuid: priceData, ... }, meta: { ... } }
        this.priceData = new Map(Object.entries(data.data));
        this.lastFetchTime = Date.now();
        
        console.log(`[MTGJSON] ✓ Loaded ${this.priceData.size} price entries`);
      } else {
        console.warn('[MTGJSON] Invalid price response format from API');
      }
    } catch (err) {
      console.error('[MTGJSON] ✗ Failed to fetch price data:', err.message);
      throw err;
    }
  }

  /**
   * Internal method to fetch identifiers mapping using streaming parser
   */
  async _fetchIdentifiersData() {
    console.log('[MTGJSON] Fetching identifiers data from API (streaming parse)...');
    
    try {
      const response = await this._fetchWithTimeout(MTGJSON_IDENTIFIERS_URL, IDENTIFIERS_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Use streaming parser to avoid loading entire file into memory
      const newMap = new Map();
      let processedCount = 0;
      
      return new Promise((resolve, reject) => {
        const pipeline = chain([
          response.body,
          parser(),
          streamValues()
        ]);

        pipeline.on('data', (data) => {
          try {
            // data.value contains { key: mtgjsonUuid, value: cardData }
            const mtgjsonUuid = data.key;
            const cardData = data.value;
            
            const scryfallId = cardData?.identifiers?.scryfallId;
            if (scryfallId && this.priceData.has(mtgjsonUuid)) {
              newMap.set(scryfallId, mtgjsonUuid);
            }
            
            processedCount++;
            if (processedCount % 50000 === 0) {
              console.log(`[MTGJSON] Processed ${processedCount} identifiers...`);
            }
          } catch (err) {
            console.debug('[MTGJSON] Error processing entry:', err.message);
          }
        });

        pipeline.on('end', () => {
          this.scryfallToMtgjsonMap = newMap;
          console.log(`[MTGJSON] ✓ Built ${this.scryfallToMtgjsonMap.size} Scryfall->MTGJSON ID mappings from ${processedCount} total entries`);
          resolve();
        });

        pipeline.on('error', (err) => {
          console.error('[MTGJSON] Stream parsing error:', err.message);
          reject(err);
        });
      });
    } catch (err) {
      console.error('[MTGJSON] ✗ Failed to fetch identifiers data:', err.message);
      // Don't throw - prices can still work without the mapping if we have cached data
    }
  }

  /**
   * Get Card Kingdom retail price for a card by its Scryfall ID
   * @param {string} scryfallId - The Scryfall UUID of the card
   * @returns {string|null} - The formatted price string or null if not found
   */
  getCardKingdomPriceByScryfallId(scryfallId) {
    if (!scryfallId) return null;
    
    // Look up MTGJSON UUID from Scryfall ID
    const mtgjsonUuid = this.scryfallToMtgjsonMap.get(scryfallId);
    if (!mtgjsonUuid) return null;
    
    return this.getCardKingdomPrice(mtgjsonUuid);
  }

  /**
   * Get Card Kingdom retail price for a card by its MTGJSON UUID
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
        // MTGJSON uses ISO date format (YYYY-MM-DD) which sorts lexicographically correctly
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
      console.debug('[MTGJSON] Price parsing error:', err.message);
    }

    return null;
  }

  /**
   * Get numeric Card Kingdom price for a card by its MTGJSON UUID
   * @param {string} uuid - The MTGJSON UUID of the card
   * @returns {number|null} - The price as a number or null if not found
   */
  getCardKingdomPriceNumeric(uuid) {
    if (!uuid) return null;
    const priceEntry = this.priceData.get(uuid);
    if (!priceEntry) return null;
    try {
      const ckPrices = priceEntry.paper?.cardkingdom?.retail?.normal;
      if (ckPrices && typeof ckPrices === 'object') {
        const dates = Object.keys(ckPrices).sort();
        if (dates.length > 0) {
          const price = parseFloat(ckPrices[dates[dates.length - 1]]);
          return !isNaN(price) && price > 0 ? price : null;
        }
      }
    } catch (err) {}
    return null;
  }

  /**
   * Get numeric TCGPlayer price for a card by its MTGJSON UUID
   * @param {string} uuid - The MTGJSON UUID of the card
   * @returns {number|null} - The price as a number or null if not found
   */
  getTCGPlayerPriceNumeric(uuid) {
    if (!uuid) return null;
    const priceEntry = this.priceData.get(uuid);
    if (!priceEntry) return null;
    try {
      const tcgPrices = priceEntry.paper?.tcgplayer?.retail?.normal;
      if (tcgPrices && typeof tcgPrices === 'object') {
        const dates = Object.keys(tcgPrices).sort();
        if (dates.length > 0) {
          const price = parseFloat(tcgPrices[dates[dates.length - 1]]);
          return !isNaN(price) && price > 0 ? price : null;
        }
      }
    } catch (err) {}
    return null;
  }

  /**
   * Get Card Kingdom and TCGPlayer prices by Scryfall ID
   * @param {string} scryfallId - The Scryfall UUID of the card
   * @returns {object} - { cardkingdom: number|null, tcgplayer: number|null }
   */
  getPricesByScryfallId(scryfallId) {
    if (!scryfallId) return { cardkingdom: null, tcgplayer: null };
    const mtgjsonUuid = this.scryfallToMtgjsonMap.get(scryfallId);
    if (!mtgjsonUuid) return { cardkingdom: null, tcgplayer: null };
    return {
      cardkingdom: this.getCardKingdomPriceNumeric(mtgjsonUuid),
      tcgplayer: this.getTCGPlayerPriceNumeric(mtgjsonUuid)
    };
  }
}

// Export a singleton instance
export const mtgjsonService = new MtgjsonPriceService();
