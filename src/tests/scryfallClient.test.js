import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeCard, getImageUrl } from '../utils/scryfallClient';

describe('scryfallClient helpers', () => {
  it('normalizeCard returns expected minimal shape and getImageUrl uses image_uris', () => {
    const raw = {
      name: 'Lightning Bolt',
      id: 'abc-123',
      oracle_id: 'oracle-1',
      set: '2xm',
      set_name: 'Double Masters',
      collector_number: '117',
      image_uris: { small: 'small.jpg', normal: 'normal.jpg' },
      card_faces: null,
      prices: { usd: '2.50' },
      color_identity: ['R'],
      cmc: 1,
      type_line: 'Instant',
      rarity: 'uncommon',
      purchase_uris: { tcgplayer: 'https://tcg' }
    };

    const n = normalizeCard(raw);
    expect(n).toMatchObject({
      name: 'Lightning Bolt',
      scryfall_id: 'abc-123',
      oracle_id: 'oracle-1',
      set: '2xm',
      set_name: 'Double Masters',
      collector_number: '117',
      prices: { usd: '2.50' },
      color_identity: ['R'],
      mana_value: 1,
      type_line: 'Instant',
      rarity: 'uncommon',
    });

    const url = getImageUrl(n, { version: 'normal' });
    expect(url).toBe('normal.jpg');
  });

  it('getImageUrl falls back to card_faces image when image_uris missing', () => {
    const raw = {
      name: 'Transform Card',
      id: 'face-1',
      card_faces: [ { image_uris: { normal: 'face-normal.jpg' } } ]
    };
    const n = normalizeCard(raw);
    const url = getImageUrl(n, { version: 'normal' });
    expect(url).toBe('face-normal.jpg');
  });
});
