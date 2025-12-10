import { describe, it, expect } from 'vitest';
import { mapCardForTile } from '../utils/cardMapper.js';

describe('cardMapper', () => {
  it('maps simple card shape', () => {
    const input = { name: 'Island', quantity: 4, price: 0.25, image_uris: { small: 'http://img' } };
    const out = mapCardForTile(input);
    expect(out.title).toBe('Island');
    expect(out.qty).toBe(4);
    expect(out.cost).toBe(0.25);
    expect(out.coverUrl).toBe('http://img');
  });

  it('handles nested price objects and missing fields', () => {
    const input = { card: { image_uris: { small: 'http://c' } }, prices: { usd: '1.50' }, qty: '2' };
    const out = mapCardForTile(input);
    expect(out.qty).toBe(2);
    expect(out.cost).toBe(1.5);
    expect(out.coverUrl).toBe('http://c');
  });
});
