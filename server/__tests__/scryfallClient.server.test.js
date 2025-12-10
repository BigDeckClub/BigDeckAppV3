import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the scryfallQueue before importing the client so imports use the mock
vi.mock('../utils/scryfallQueue.js', () => {
  const enqueue = vi.fn();
  return { scryfallQueue: { enqueue } };
});

import { scryfallServerClient } from '../utils/scryfallClient.server.js';
import { scryfallQueue } from '../utils/scryfallQueue.js';

describe('server scryfall client', () => {
  beforeEach(() => {
    scryfallQueue.enqueue.mockReset();
  });

  it('getCardByName returns normalized card when queue returns raw card', async () => {
    const raw = {
      name: 'Counterspell',
      id: 'abc-123',
      oracle_id: 'o1',
      set: 'mmq',
      set_name: 'Mercadian Masques',
      collector_number: '24',
      image_uris: { normal: 'https://img' },
    };

    scryfallQueue.enqueue.mockResolvedValue(raw);

    const card = await scryfallServerClient.getCardByName('Counterspell', { exact: true, set: 'mmq' });
    expect(card).toBeTruthy();
    expect(card.name).toBe('Counterspell');
    expect(card.scryfall_id).toBe('abc-123');
    expect(card.set).toBe('mmq');
    expect(card.image_uris).toBeTruthy();
    expect(card.image_uris.normal).toBe('https://img');
  });

  it('batchResolve returns map when queue returns collection', async () => {
    const raw = { name: 'Counterspell', set: 'mmq', id: 'abc-123' };
    scryfallQueue.enqueue.mockResolvedValue({ data: [raw] });

    const map = await scryfallServerClient.batchResolve([{ name: 'Counterspell', set: 'mmq' }]);
    const key = 'counterspell|mmq';
    expect(map[key]).toBeTruthy();
    expect(map[key].name).toBe('Counterspell');
    expect(map[key].scryfall_id).toBe('abc-123');
  });
});
