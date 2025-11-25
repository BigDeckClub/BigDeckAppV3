import { createContext, useState, useContext } from "react";
import { fetchCardPrices } from "../lib/fetchCardPrices";

const PriceCacheContext = createContext();

export function PriceCacheProvider({ children }) {
  const [cache, setCache] = useState({});

  async function getPrice(name, setCode) {
    const key = `${name}|${setCode}`;
    const cached = cache[key];

    console.log(`[PriceCacheContext] getPrice called with key: "${key}"`);
    console.log(`[PriceCacheContext] Cache keys exist:`, Object.keys(cache));
    
    if (cached) {
      console.log(`[PriceCacheContext] Found in cache:`, cached);
      return cached;
    }

    console.log(`[PriceCacheContext] Not in cache, fetching from backend...`);
    const result = await fetchCardPrices(name, setCode);
    console.log(`[PriceCacheContext] Backend returned:`, result);
    
    setCache(prev => {
      const updated = { ...prev, [key]: result };
      console.log(`[PriceCacheContext] Stored in cache with key "${key}":`, result);
      return updated;
    });
    
    return result;
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
