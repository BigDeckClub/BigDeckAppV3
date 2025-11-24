const API_BASE = '/api';
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours

// Shared price fetching utility
export const fetchPriceFromCache = (cache, cardName, setCode) => {
  const cacheKey = `${cardName}|${setCode}`;
  const cached = cache[cacheKey];
  
  if (cached) {
    const now = Date.now();
    if (now - (cached.timestamp || 0) < CACHE_DURATION_MS) {
      return cached;
    }
  }
  return null;
};

export const fetchCardPrices = async (cardName, setCode) => {
  try {
    const response = await fetch(`${API_BASE}/prices/${encodeURIComponent(cardName)}/${setCode}`);
    if (response.ok) {
      const priceData = await response.json();
      return {
        tcg: priceData.tcg || 'N/A',
        ck: priceData.ck || 'N/A',
        timestamp: Date.now()
      };
    }
  } catch (error) {
    // Silently handle errors
  }
  return { tcg: 'N/A', ck: 'N/A', timestamp: Date.now() };
};

export const parseDeckslistPrice = (price) => {
  if (!price) return 0;
  const numStr = String(price).replace('$', '').trim();
  return parseFloat(numStr) || 0;
};

export const calculatePriceWithFallback = (tcgPrice, ckPrice) => {
  const tcgNum = parseDeckslistPrice(tcgPrice);
  if (tcgNum > 0 && parseDeckslistPrice(ckPrice) === 0) {
    return tcgNum * 1.15;
  }
  return parseDeckslistPrice(ckPrice);
};
