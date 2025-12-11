import { scryfallQueue } from './scryfallQueue.js';

const SCRYFALL_BASE = 'https://api.scryfall.com';

/**
 * Minimal normalization of Scryfall card objects for server use.
 * Mirrors frontend normalizeCard shape used elsewhere in the app.
 */
export function normalizeCard(raw = {}) {
  if (!raw) return null;
  const image_uris = raw.image_uris || (raw.card_faces && raw.card_faces[0] && raw.card_faces[0].image_uris) || null;
  return {
    name: raw.name || null,
    scryfall_id: raw.id || raw.scryfall_id || null,
    oracle_id: raw.oracle_id || null,
    set: raw.set || raw.set_code || null,
    set_name: raw.set_name || null,
    collector_number: raw.collector_number || null,
    image_uris: image_uris || null,
    card_faces: raw.card_faces || null,
    prices: raw.prices || null,
    color_identity: raw.color_identity || [],
    mana_value: raw.cmc ?? raw.mana_value ?? 0,
    type_line: raw.type_line || null,
    rarity: raw.rarity || null,
    purchase_uris: raw.purchase_uris || null,
  };
}

/**
 * Resolve a single card by name using the Scryfall named endpoint.
 * Uses the shared `scryfallQueue.enqueue` to respect rate limiting.
 * @param {string} name
 * @param {{exact?:boolean,set?:string}} options
 */
export async function getCardByName(name, { exact = true, set } = {}) {
  if (!name) return null;
  const params = new URLSearchParams();
  params.set(exact ? 'exact' : 'fuzzy', name);
  if (set) params.set('set', set);
  const url = `${SCRYFALL_BASE}/cards/named?${params.toString()}`;

  const result = await scryfallQueue.enqueue(async () => {
    try {
      const res = await fetch(url);
      if (!res || !res.ok) return null;
      return res.json();
    } catch (err) {
      return null;
    }
  });

  if (!result) return null;
  return normalizeCard(result);
}

/**
 * Batch resolve identifiers via Scryfall /cards/collection using the queue.
 * Returns a map keyed by `${name}|${set}` (lowercase) => normalized card
 * Falls back to individual lookups when collection endpoint fails.
 * @param {Array<Object>} identifiers
 */
export async function batchResolve(identifiers = []) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) return {};
  const url = `${SCRYFALL_BASE}/cards/collection`;

  const result = await scryfallQueue.enqueue(async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers })
      });
      if (!res || !res.ok) return null;
      return res.json();
    } catch (err) {
      return null;
    }
  });

  if (result && Array.isArray(result.data)) {
    const map = {};
    for (const c of result.data) {
      const key = `${(c.name || '').toLowerCase().trim()}|${(c.set || '').toLowerCase().trim()}`;
      map[key] = normalizeCard(c);
    }
    return map;
  }

  // Fallback: resolve individually by name when possible
  const results = {};
  for (const id of identifiers) {
    if (id.name) {
      const card = await getCardByName(id.name, { exact: true, set: id.set });
      const key = `${(id.name || '').toLowerCase().trim()}|${(id.set || '').toLowerCase().trim()}`;
      results[key] = card;
    }
  }
  return results;
}

export const scryfallServerClient = {
  getCardByName,
  batchResolve,
  normalizeCard,
};

export default scryfallServerClient;
