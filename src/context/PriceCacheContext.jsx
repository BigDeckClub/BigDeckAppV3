import { createContext, useState, useContext, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchCardPrices } from "../lib/fetchCardPrices";

const PriceCacheContext = createContext();

// Cache TTL configuration
const SOFT_TTL_MS = 1000 * 60 * 10; // 10 minutes - return cached, refresh in background
const HARD_TTL_MS = 1000 * 60 * 60; // 1 hour - always fetch from backend
const STORAGE_KEY = "mtg-card-price-cache";

/**
 * PriceCacheProvider
 * Provides price caching functionality with localStorage persistence
 * and request deduplication for optimal performance.
 */
export function PriceCacheProvider({ children }) {
  const [cache, setCache] = useState({});
  const inflightRef = useRef({});
  const backgroundRefreshRef = useRef(new Set());

  // Hydrate cache from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCache(parsed);
      }
    } catch (err) {
      console.warn("[PriceCache] Failed to hydrate from localStorage:", err.message);
    }
  }, []);

  // Persist cache to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.warn("[PriceCache] Failed to persist to localStorage:", err.message);
    }
  }, [cache]);

  /**
   * Get price for a card, using cache when available
   * @param {string} name - Card name
   * @param {string} setCode - Set code
   * @returns {Promise<{tcg: string, ck: string}>}
   */
  function getPrice(name, setCode) {
    const key = `${name}|${setCode}`;
    const now = Date.now();

    // Check cache with TTL logic
    if (cache[key]) {
      const { tcg, ck, fetchedAt } = cache[key];
      const age = now - (fetchedAt || 0);

      // Soft TTL: return cached, refresh in background if stale
      if (age < SOFT_TTL_MS) {
        return Promise.resolve({ tcg, ck });
      }

      // Between soft and hard TTL: return cached but trigger background refresh
      if (age < HARD_TTL_MS) {
        if (!backgroundRefreshRef.current.has(key)) {
          backgroundRefreshRef.current.add(key);
          fetchCardPrices(name, setCode)
            .then(result => {
              setCache(prev => ({
                ...prev,
                [key]: { ...result, fetchedAt: Date.now() },
              }));
            })
            .finally(() => {
              backgroundRefreshRef.current.delete(key);
            });
        }
        return Promise.resolve({ tcg, ck });
      }
    }

    // Check if already fetching (dedupe concurrent requests)
    if (inflightRef.current[key]) {
      return inflightRef.current[key];
    }

    // Start new fetch
    const promise = fetchCardPrices(name, setCode)
      .then(result => {
        const entry = { ...result, fetchedAt: Date.now() };
        setCache(prev => ({ ...prev, [key]: entry }));
        delete inflightRef.current[key];
        return result;
      })
      .catch(err => {
        console.error("[PriceCache] Fetch failed:", err.message);
        const fallback = { tcg: "N/A", ck: "N/A", fetchedAt: Date.now() };
        setCache(prev => ({ ...prev, [key]: fallback }));
        delete inflightRef.current[key];
        return fallback;
      });

    inflightRef.current[key] = promise;
    return promise;
  }

  /**
   * Clear all cached prices
   */
  function clearCache() {
    setCache({});
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <PriceCacheContext.Provider value={{ getPrice, clearCache }}>
      {children}
    </PriceCacheContext.Provider>
  );
}

/**
 * Hook to access price cache functionality
 * @returns {{getPrice: Function, clearCache: Function}}
 */
export function usePriceCache() {
  return useContext(PriceCacheContext);
}

PriceCacheProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
