/**
 * Frontend-friendly Scryfall client helpers
 *
 * Provides helpers to query Scryfall with sensible defaults, timeouts,
 * retries and normalized output used across the app.
 */
import { EXTERNAL_APIS } from '../config/api';

// Defaults
const DEFAULT_TIMEOUT = 8000; // ms
const DEFAULT_RETRIES = 2;

/**
 * Fetch with timeout and simple retry logic.
 * @param {string} url
 * @param {RequestInit} opts
 * @param {number} retries
 * @param {number} timeoutMs
 */
async function fetchWithTimeout(url, opts = {}, retries = DEFAULT_RETRIES, timeoutMs = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) {
      // allow retry on server errors
      if (retries > 0 && res.status >= 500) {
        return fetchWithTimeout(url, opts, retries - 1, timeoutMs);
      }
      return res;
    }
    return res;
  } catch (err) {
    if (retries > 0) return fetchWithTimeout(url, opts, retries - 1, timeoutMs);
    throw err;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Normalize a Scryfall card object into the minimal app shape.
 * @param {Object} raw
 * @returns {Object}
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
    color_identity: raw.color_identity || raw.color_identity || [],
    mana_value: raw.cmc ?? raw.mana_value ?? 0,
    type_line: raw.type_line || null,
    rarity: raw.rarity || null,
    purchase_uris: raw.purchase_uris || null,
  };
}

/**
 * Get best image url for a normalized card object.
 * @param {Object} card - normalized or raw scryfall object
 * @param {Object} opts
 * @param {string} opts.version - image version: 'small'|'normal'|'large'
 */
export function getImageUrl(card, { version = 'normal' } = {}) {
  if (!card) return null;
  // If it's a raw Scryfall object (not normalized), try to use known shapes
  const imgs = card.image_uris || (card.card_faces && card.card_faces[0] && card.card_faces[0].image_uris);
  if (imgs) {
    if (imgs[version]) return imgs[version];
    if (imgs.normal) return imgs.normal;
    if (imgs.small) return imgs.small;
    if (imgs.large) return imgs.large;
  }
  // Fallback to constructing image URL by id
  const id = card.scryfall_id || card.id || card.scryfallId || null;
  if (id) return `${EXTERNAL_APIS.SCRYFALL}/cards/${id}?format=image&version=${version}`;
  return null;
}

/**
 * Resolve a single card by name via Scryfall named endpoint.
 * @param {string} name
 * @param {{exact?:boolean,set?:string}} options
 */
export async function getCardByName(name, { exact = true, set } = {}) {
  if (!name) return null;
  const params = new URLSearchParams();
  params.set(exact ? 'exact' : 'fuzzy', name);
  if (set) params.set('set', set);
  const url = `${EXTERNAL_APIS.SCRYFALL}/cards/named?${params.toString()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const raw = await res.json();
  return normalizeCard(raw);
}

/**
 * Search cards via Scryfall search endpoint and return normalized list
 * @param {string} query
 * @param {Object} options
 */
export async function searchCards(query, options = {}) {
  if (!query) return [];
  const params = new URLSearchParams();
  params.set('q', query);
  if (options.unique) params.set('unique', options.unique);
  const url = `${EXTERNAL_APIS.SCRYFALL}/cards/search?${params.toString()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return [];
  const data = await res.json();
  const list = (data.data || []).map(normalizeCard);
  return list;
}

/**
 * Batch resolve many identifiers using Scryfall /cards/collection endpoint.
 * Accepts identifiers in the form required by Scryfall e.g. [{collector_number, set}, {id:...}, {name:..., set:...}]
 * Falls back to individual lookups if collection endpoint fails.
 * @param {Array<Object>} identifiers
 */
export async function batchResolve(identifiers = []) {
  if (!Array.isArray(identifiers) || identifiers.length === 0) return {};
  const url = `${EXTERNAL_APIS.SCRYFALL}/cards/collection`;
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers })
    });
    if (res.ok) {
      const data = await res.json();
      // Scryfall returns {data: [...]}
      const map = {};
      (data.data || []).forEach((c) => {
        const key = `${(c.name||'').toLowerCase().trim()}|${(c.set||'').toLowerCase().trim()}`;
        map[key] = normalizeCard(c);
      });
      return map;
    }
  } catch (e) {
    // ignore and fallback
  }
  // Fallback: resolve individually
  const results = {};
  for (const id of identifiers) {
    // prefer name-based resolution when name is provided
    if (id.name) {
      const card = await getCardByName(id.name, { exact: true, set: id.set });
      const key = `${(id.name||'').toLowerCase().trim()}|${(id.set||'').toLowerCase().trim()}`;
      results[key] = card;
    }
  }
  return results;
}

const scryfallClient = {
  getCardByName,
  searchCards,
  batchResolve,
  getImageUrl,
  normalizeCard,
};

export default scryfallClient;
