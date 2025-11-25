import { createContext, useState, useContext, useRef, useEffect } from "react";
import PropTypes from "prop-types";
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

    console.log("[PriceCacheContext] getPrice called for:", { name, setCode, key });

    // Check cache with TTL logic
    if (cache[key]) {
      const { tcg, ck, fetchedAt } = cache[key];
      const age = now - (fetchedAt || 0);

      console.log("[PriceCacheContext] Cache hit for", key, "age:", age, "data:", { tcg, ck });

      // Soft TTL: return cached, refresh in background if stale
      if (age < SOFT_TTL_MS) {
        setMetrics(m => ({ ...m, hits: m.hits + 1 }));
        console.log("[PriceCacheContext] Returning cached (fresh):", { tcg, ck });
        return Promise.resolve({ tcg, ck });
      }

      // Between soft and hard TTL: return cached but trigger background refresh
      if (age < HARD_TTL_MS) {
        setMetrics(m => ({ ...m, hits: m.hits + 1 }));
        console.log("[PriceCacheContext] Returning cached (stale, bg refresh):", { tcg, ck });
        // Trigger background refresh if not already scheduled
        if (!backgroundRefreshRef.current.has(key)) {
          backgroundRefreshRef.current.add(key);
          fetchCardPrices(name, setCode)
            .then(result => {
              console.log("[PriceCacheContext] Background refresh result:", result);
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
    console.log("[PriceCacheContext] Cache miss or expired for", key, "fetching from backend");
    setMetrics(m => ({ ...m, misses: m.misses + 1 }));

    // Check if already fetching (dedupe concurrent requests)
    if (inflightRef.current[key]) {
      console.log("[PriceCacheContext] Request already in flight for", key);
      setMetrics(m => ({ ...m, inflightHits: m.inflightHits + 1 }));
      return inflightRef.current[key];
    }

    // Start new fetch
    console.log("[PriceCacheContext] Starting new fetch for", key);
    const promise = fetchCardPrices(name, setCode)
      .then(result => {
        console.log("[PriceCacheContext] Fetch succeeded for", key, "result:", result);
        const entry = { ...result, fetchedAt: Date.now() };
        setCache(prev => ({ ...prev, [key]: entry }));
        delete inflightRef.current[key];
        return result;
      })
      .catch(err => {
        console.error(`[PriceCacheContext] Fetch failed for ${key}:`, err);
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

PriceCacheProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
