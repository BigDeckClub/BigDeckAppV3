import { createContext, useState, useContext, useRef, useEffect } from "react";
import { fetchCardPrices } from "../lib/fetchCardPrices";

const PriceCacheContext = createContext();

// Cache TTL configuration
const SOFT_TTL_MS = 1000 * 60 * 10; // 10 minutes - return cached, refresh in background
const HARD_TTL_MS = 1000 * 60 * 60; // 1 hour - always fetch from backend
const STORAGE_KEY = "mtg-card-price-cache";

export function PriceCacheProvider({ children }) {
  const [cache, setCache] = useState({});
  const [metrics, setMetrics] = useState({ hits: 0, misses: 0, inflightHits: 0 });
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
      console.warn("Failed to hydrate cache from localStorage:", err);
    }
  }, []);

  // Persist cache to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.warn("Failed to persist cache to localStorage:", err);
    }
  }, [cache]);

  function getPrice(name, setCode) {
    const key = `${name}|${setCode}`;
    const now = Date.now();

    // Check cache with TTL logic
    if (cache[key]) {
      const { tcg, ck, fetchedAt } = cache[key];
      const age = now - (fetchedAt || 0);

      // Soft TTL: return cached, refresh in background if stale
      if (age < SOFT_TTL_MS) {
        setMetrics(m => ({ ...m, hits: m.hits + 1 }));
        return Promise.resolve({ tcg, ck });
      }

      // Between soft and hard TTL: return cached but trigger background refresh
      if (age < HARD_TTL_MS) {
        setMetrics(m => ({ ...m, hits: m.hits + 1 }));
        // Trigger background refresh if not already scheduled
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

    // Hard expired or cache miss: fetch from backend
    setMetrics(m => ({ ...m, misses: m.misses + 1 }));

    // Check if already fetching (dedupe concurrent requests)
    if (inflightRef.current[key]) {
      setMetrics(m => ({ ...m, inflightHits: m.inflightHits + 1 }));
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
        console.error(`Price fetch error for ${key}:`, err);
        const fallback = { tcg: "N/A", ck: "N/A", fetchedAt: Date.now() };
        setCache(prev => ({ ...prev, [key]: fallback }));
        delete inflightRef.current[key];
        return fallback;
      });

    inflightRef.current[key] = promise;
    return promise;
  }

  function clearCache() {
    setCache({});
    localStorage.removeItem(STORAGE_KEY);
  }

  function getMetrics() {
    return metrics;
  }

  return (
    <PriceCacheContext.Provider value={{ getPrice, clearCache, getMetrics }}>
      {children}
    </PriceCacheContext.Provider>
  );
}

export function usePriceCache() {
  return useContext(PriceCacheContext);
}
