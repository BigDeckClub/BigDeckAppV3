import { createContext, useState, useContext } from "react";
import { fetchCardPrices } from "../lib/fetchCardPrices";

const PriceCacheContext = createContext();

export function PriceCacheProvider({ children }) {
  const [cache, setCache] = useState({});

  async function getPrice(name, setCode) {
    const key = `${name}|${setCode}`;
    const cached = cache[key];

    if (cached) return cached;

    const result = await fetchCardPrices(name, setCode);
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
