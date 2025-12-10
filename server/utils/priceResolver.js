import { mtgjsonService } from '../mtgjsonPriceService.js';
import { scryfallServerClient } from './scryfallClient.server.js';
import { getCachedPrice, setCachedPrice } from './index.js';

/**
 * Resolve prices for a card, preferring MTGJSON marketplace prices, falling back to Scryfall USD.
 * @param {{name?:string,set?:string,scryfall_id?:string}} opts
 * @returns {{tcg: string|null, ck: string|null, source: 'mtgjson'|'scryfall'|'none'}}
 */
export async function getCardPrices({ name, set, scryfall_id } = {}) {
  const cacheKey = scryfall_id ? `scry_${scryfall_id}` : `${(name||'').toLowerCase()}_${(set||'').toLowerCase()}`;

  const cached = getCachedPrice(cacheKey);
  if (cached) return { ...cached, source: cached.source || 'none' };

  // Check if MTGJSON service is ready (do not attempt to initialize here —
  // initialization should happen once at server startup). If it's not ready,
  // we'll fall back to Scryfall per-request to avoid repeated expensive loads.
  const mtgReady = mtgjsonService.isReady?.() ?? false;

  let tcg = null;
  let ck = null;
  let source = 'none';

  if (scryfall_id && mtgReady) {
    try {
      const prices = mtgjsonService.getPricesByScryfallId(scryfall_id);
      if (prices?.tcgplayer) {
        tcg = `$${Number(prices.tcgplayer).toFixed(2)}`;
      }
      if (prices?.cardkingdom) {
        ck = `$${Number(prices.cardkingdom).toFixed(2)}`;
      }

      if (tcg || ck) source = 'mtgjson';
    } catch (err) {
      console.error('[PRICE-RESOLVER] MTGJSON numeric lookup error:', err?.message || err);
    }

    // Try formatted CK string if numeric not present
    if (!ck) {
      try {
        const formatted = mtgjsonService.getCardKingdomPriceByScryfallId(scryfall_id);
        if (formatted) {
          ck = formatted;
          source = source || 'mtgjson';
        }
      } catch (err) {
        console.debug('[PRICE-RESOLVER] MTGJSON CK formatted lookup error:', err?.message || err);
      }
    }
  }

  // If no MTGJSON result, try Scryfall USD as fallback
  if ((!tcg && !ck) && name) {
    try {
      const card = await scryfallServerClient.getCardByName(name, { exact: true, set });
      const usd = card?.prices?.usd ?? null;
      if (usd) {
        tcg = `$${parseFloat(usd).toFixed(2)}`;
        source = source === 'mtgjson' ? 'mtgjson' : 'scryfall';
      }
    } catch (err) {
      console.error('[PRICE-RESOLVER] Scryfall fallback error:', err?.message || err);
    }
  }

  const result = { tcg: tcg ?? null, ck: ck ?? null, source: source || 'none' };
  // Cache result (uses existing TTL from priceCache)
  try {
    setCachedPrice(cacheKey, result);
  } catch (err) {
    console.debug('[PRICE-RESOLVER] Cache set failed:', err?.message || err);
  }

  return result;
}

export default { getCardPrices };
