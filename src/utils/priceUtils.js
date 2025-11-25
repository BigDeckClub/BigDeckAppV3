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
    const normalizedSet = (setCode || '').trim().toUpperCase();
    const response = await fetch(
      `/api/price?name=${encodeURIComponent(cardName)}&set=${encodeURIComponent(normalizedSet)}`
    );
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
  return { tcg: 'N/A', ck: 'N/A' };
};

export const parseDeckslistPrice = (price) => {
  if (!price) return 0;
  const numStr = String(price).replace('$', '').replace(/,/g, '').trim();
  return parseFloat(numStr) || 0;
};

export const calculatePriceWithFallback = (tcgPrice, ckPrice) => {
  const tcgNum = parseDeckslistPrice(tcgPrice);
  if (tcgNum > 0 && parseDeckslistPrice(ckPrice) === 0) {
    return tcgNum * 1.15;
  }
  return parseDeckslistPrice(ckPrice);
};

// Robust price extraction utilities for server-side scraping
export const extractPricesFromText = (text = '') => {
  if (!text) return [];
  
  // Normalize NBSP and other whitespace
  const normalized = text.replace(/\u00A0/g, ' ').trim();
  
  // Regex to capture numbers like:
  // $1,799.99   $1799.99   $0.99   $12.00
  const re = /\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g;
  
  const matches = [];
  let m;
  while ((m = re.exec(normalized)) !== null) {
    matches.push(m[1]); // raw captured like "1,799.99"
  }
  
  // Convert to numbers (strip commas)
  const numeric = matches
    .map(s => parseFloat(s.replace(/,/g, '')))
    .filter(n => !Number.isNaN(n));
  
  return numeric;
};

export const getBestPriceFromText = (text = '') => {
  const prices = extractPricesFromText(text);
  if (!prices.length) return null;
  // filter sensible values (>= 0.01)
  const filtered = prices.filter(p => p >= 0.01 && Number.isFinite(p));
  if (!filtered.length) return null;
  return Math.min(...filtered);
};
