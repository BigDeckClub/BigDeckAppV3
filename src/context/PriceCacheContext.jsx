import { createContext, useState, useContext, useRef } from "react";
import { fetchCardPrices } from "../lib/fetchCardPrices";

const PriceCacheContext = createContext();

export function PriceCacheProvider({ children }) {
  const [cache, setCache] = useState({});
  const inflightRef = useRef({}); // Track in-flight requests to dedupe

  function getPrice(name, setCode) {
    const key = `${name}|${setCode}`;

    // Check cache first
    if (cache[key]) {
      console.log(`[CACHE READ] ${key}:`, cache[key]);
      return Promise.resolve(cache[key]);
    }

    // Check if already fetching this card (dedupe concurrent requests)
    if (inflightRef.current[key]) {
      console.log(`[CACHE DEDUPE] ${key} - request already in flight`);
      return inflightRef.current[key];
    }

    // Start new fetch
    console.log(`[CACHE MISS] ${key} - fetching from backend...`);
    const promise = fetchCardPrices(name, setCode)
      .then(result => {
        console.log(`[CACHE WRITE] ${key}:`, result);
        // Only write to cache after backend responds
        setCache(prev => ({ ...prev, [key]: result }));
        // Clean up inflight tracker
        delete inflightRef.current[key];
        return result;
      })
      .catch(err => {
        console.error(`[CACHE ERROR] ${key}:`, err);
        const fallback = { tcg: "N/A", ck: "N/A" };
        setCache(prev => ({ ...prev, [key]: fallback }));
        delete inflightRef.current[key];
        return fallback;
      });

    inflightRef.current[key] = promise;
    return promise;
  }

  return (
    <PriceCacheContext.Provider value={{ getPrice }}>
      {children}
    </PriceCacheContext.Provider>
  );
}

export function usePriceCache() {
  return useContext(PriceCacheContext);
}
