import { createContext, useState, useContext } from "react";
import { fetchCardPrices } from "../lib/fetchCardPrices";

const PriceCacheContext = createContext();

export function PriceCacheProvider({ children }) {
  const [cache, setCache] = useState({});

  async function getPrice(name, setCode) {
    const key = `${name}|${setCode}`;
    const cached = cache[key];

    if (cached) {
      console.log(`[CACHE READ] ${key}:`, cached);
      return cached;
    }

    console.log(`[CACHE MISS] ${key} - fetching from backend...`);
    const result = await fetchCardPrices(name, setCode);
    console.log(`[CACHE WRITE] ${key}:`, result);
    setCache(prev => ({ ...prev, [key]: result }));
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
