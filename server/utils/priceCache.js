// ========== PRICE CACHING ==========
const priceCache = new Map();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedPrice(key) {
  const cached = priceCache.get(key);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

export function setCachedPrice(key, data) {
  // Clean up expired entries when cache grows large to prevent memory leak
  if (priceCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of priceCache.entries()) {
      if (now - v.timestamp >= PRICE_CACHE_TTL) {
        priceCache.delete(k);
      }
    }
  }
  priceCache.set(key, { data, timestamp: Date.now() });
}
