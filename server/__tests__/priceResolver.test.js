import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock mtgjsonService and scryfall client before importing resolver
vi.mock('../mtgjsonPriceService.js', () => ({
  mtgjsonService: {
    isReady: () => true,
    initialize: async () => {},
    getPricesByScryfallId: (id) => ({ cardkingdom: 2.5, tcgplayer: 1.75 }),
    getCardKingdomPriceByScryfallId: (id) => '$2.50'
  }
}));

vi.mock('../utils/scryfallClient.server.js', () => ({
  scryfallServerClient: {
    getCardByName: async () => ({ prices: { usd: '1.00' } })
  }
}));

// Mock cache helpers to avoid interference
vi.mock('../utils/index.js', () => ({
  getCachedPrice: () => null,
  setCachedPrice: () => {}
}));

import { getCardPrices } from '../utils/priceResolver.js';

describe('priceResolver', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns mtgjson prices when available', async () => {
    const res = await getCardPrices({ scryfall_id: 'abc' });
    expect(res.source).toBe('mtgjson');
    expect(res.ck).toBe('$2.50');
    expect(res.tcg).toBe('$1.75');
  });

  it('falls back to scryfall when mtgjson missing', async () => {
    // Remock mtgjson service to be not ready
    vi.doMock('../mtgjsonPriceService.js', () => ({
      mtgjsonService: {
        isReady: () => false,
        initialize: async () => { throw new Error('no mtgjson'); }
      }
    }));
    // Remock scryfall client
    vi.doMock('../utils/scryfallClient.server.js', () => ({
      scryfallServerClient: { getCardByName: async () => ({ prices: { usd: '3.21' } }) }
    }));

    const { getCardPrices: getCardPricesReloaded } = await import('../utils/priceResolver.js');
    const res = await getCardPricesReloaded({ name: 'Lightning Bolt', set: 'M10' });
    expect(res.source).toBe('scryfall');
    expect(res.tcg).toBe('$3.21');
  });
});
