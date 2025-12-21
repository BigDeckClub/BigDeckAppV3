const cacheKey = 'scryfall_card_cache_v1';

let memoryCache = new Map();

// Load from localStorage if available (best-effort)
try {
  const raw = localStorage.getItem(cacheKey);
  if (raw) {
    const obj = JSON.parse(raw);
    memoryCache = new Map(Object.entries(obj));
  }
} catch (e) {
  // ignore
}

const saveCache = () => {
  try {
    const obj = Object.fromEntries(memoryCache);
    localStorage.setItem(cacheKey, JSON.stringify(obj));
  } catch (e) {
    // ignore
  }
};

// Fetch card by exact name (optionally with set) from Scryfall
async function fetchCardByName(name, setCode) {
  if (!name) return null;
  const params = new URLSearchParams();
  params.set('exact', name);
  if (setCode && setCode.toLowerCase() !== 'unknown') params.set('set', setCode);
  const url = `https://api.scryfall.com/cards/named?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name,
      scryfall_id: data.id,
      color_identity: data.color_identity || [],
      mana_value: data.mana_value ?? data.cmc ?? 0
    };
  } catch (e) {
    return null;
  }
}

// Public API: ensure metadata for a list of card descriptors {name, set}
export async function ensureCardMetadata(cards = []) {
  const results = {};
  // Basic sequential fetch to be kinder to Scryfall; skip items already cached
  for (const c of cards) {
    const key = `${(c.name || '').toLowerCase().trim()}|${(c.set || '').toLowerCase().trim()}`;
    if (memoryCache.has(key)) {
      results[key] = JSON.parse(memoryCache.get(key));
      continue;
    }
    const meta = await fetchCardByName(c.name, c.set);
    if (meta) {
      memoryCache.set(key, JSON.stringify(meta));
      results[key] = meta;
      // persist periodically
      if (memoryCache.size % 10 === 0) saveCache();
    }
  }
  saveCache();
  return results;
}

export function getCachedMetadata(name, setCode) {
  const key = `${(name || '').toLowerCase().trim()}|${(setCode || '').toLowerCase().trim()}`;
  if (!memoryCache.has(key)) return null;
  try { return JSON.parse(memoryCache.get(key)); } catch (e) { return null; }
}

export default {
  ensureCardMetadata,
  getCachedMetadata
};
