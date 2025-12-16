/**
 * Generic caching utilities for the application
 * Replaces duplicate Map-based caching patterns across hooks
 */

/**
 * Create a simple in-memory cache with optional TTL
 * @param {Object} options - Cache options
 * @param {number} options.maxSize - Maximum number of entries (default: 1000)
 * @param {number} options.ttl - Time to live in ms (default: 0 = no expiry)
 * @returns {Object} - Cache instance with get, set, has, delete, clear methods
 */
export function createCache(options = {}) {
  const { maxSize = 1000, ttl = 0 } = options;
  const cache = new Map();
  const timestamps = new Map();

  const isExpired = (key) => {
    if (ttl === 0) return false;
    const timestamp = timestamps.get(key);
    return timestamp && Date.now() - timestamp > ttl;
  };

  const evictOldest = () => {
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
      timestamps.delete(oldestKey);
    }
  };

  return {
    get(key) {
      if (isExpired(key)) {
        cache.delete(key);
        timestamps.delete(key);
        return undefined;
      }
      return cache.get(key);
    },

    set(key, value) {
      evictOldest();
      cache.set(key, value);
      if (ttl > 0) {
        timestamps.set(key, Date.now());
      }
      return this;
    },

    has(key) {
      if (isExpired(key)) {
        cache.delete(key);
        timestamps.delete(key);
        return false;
      }
      return cache.has(key);
    },

    delete(key) {
      timestamps.delete(key);
      return cache.delete(key);
    },

    clear() {
      cache.clear();
      timestamps.clear();
    },

    get size() {
      return cache.size;
    },

    keys() {
      return cache.keys();
    },

    values() {
      return cache.values();
    },

    entries() {
      return cache.entries();
    }
  };
}

/**
 * Create a cache that automatically fetches missing values
 * @param {Function} fetcher - Async function to fetch value for a key
 * @param {Object} options - Cache options (same as createCache)
 * @returns {Object} - Cache instance with getOrFetch method
 */
export function createFetchingCache(fetcher, options = {}) {
  const cache = createCache(options);
  const pending = new Map();

  return {
    ...cache,

    /**
     * Get value from cache or fetch if missing
     * @param {string} key - Cache key
     * @param {*} fetchArg - Argument to pass to fetcher (defaults to key)
     * @returns {Promise<*>} - Cached or fetched value
     */
    async getOrFetch(key, fetchArg = key) {
      // Return cached value if available
      if (cache.has(key)) {
        return cache.get(key);
      }

      // Return pending promise if already fetching
      if (pending.has(key)) {
        return pending.get(key);
      }

      // Fetch and cache
      const promise = fetcher(fetchArg)
        .then(value => {
          cache.set(key, value);
          pending.delete(key);
          return value;
        })
        .catch(error => {
          pending.delete(key);
          throw error;
        });

      pending.set(key, promise);
      return promise;
    },

    /**
     * Batch fetch multiple keys
     * @param {string[]} keys - Array of cache keys
     * @param {Function} batchFetcher - Function that fetches multiple values
     * @returns {Promise<Map>} - Map of key -> value
     */
    async batchGetOrFetch(keys, batchFetcher) {
      const results = new Map();
      const missing = [];

      // Check cache for each key
      for (const key of keys) {
        if (cache.has(key)) {
          results.set(key, cache.get(key));
        } else {
          missing.push(key);
        }
      }

      // Fetch missing values in batch
      if (missing.length > 0 && batchFetcher) {
        const fetched = await batchFetcher(missing);
        for (const [key, value] of fetched) {
          cache.set(key, value);
          results.set(key, value);
        }
      }

      return results;
    }
  };
}

/**
 * React hook for using a cache with component lifecycle
 * @param {Function} fetcher - Async function to fetch value
 * @param {Object} options - Cache options
 * @returns {Function} - Hook that returns [value, loading, error, refresh]
 */
export function useCachedValue(key, fetcher, options = {}) {
  const { enabled = true, ...cacheOptions } = options;

  // This is a factory - actual hook implementation would use useState/useEffect
  // For now, return a simple memoized fetcher
  return fetcher;
}

// Pre-configured caches for common use cases
export const cardSearchCache = createCache({ maxSize: 500, ttl: 5 * 60 * 1000 }); // 5 min TTL
export const colorIdentityCache = createCache({ maxSize: 2000 }); // No TTL, persist for session
export const priceCache = createCache({ maxSize: 1000, ttl: 15 * 60 * 1000 }); // 15 min TTL
