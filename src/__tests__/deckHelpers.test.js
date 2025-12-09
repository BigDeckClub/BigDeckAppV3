import { describe, it, expect } from 'vitest';
import { normalizeName, computeCompletion } from '../utils/deckHelpers';

describe('deckHelpers.normalizeName', () => {
  it('strips punctuation, parentheticals, and normalizes whitespace/case', () => {
    const input = '  Liliana, Dreadhorde General (Foil)  ';
    const out = normalizeName(input);
    // parenthetical content is removed by normalizeName
    expect(out).toBe('liliana dreadhorde general');
  });

  it('handles empty/undefined safely', () => {
    expect(normalizeName()).toBe('');
    expect(normalizeName('')).toBe('');
  });
});

describe('deckHelpers.computeCompletion', () => {
  it('computes total/owned/missing/completion correctly for full matches', () => {
    const cards = [
      { name: 'Shock', quantity: 4 },
      { name: 'Lightning Bolt', quantity: 2 },
    ];
    const inventory = {
      'shock': 4,
      'lightning bolt': 2,
    };

    const stats = computeCompletion(cards, inventory);
    expect(stats.totalCards).toBe(6);
    expect(stats.totalMissing).toBe(0);
    expect(stats.ownedCount).toBe(6);
    expect(stats.completionPercentage).toBe(100);
  });

  it('computes missing quantities when inventory insufficient', () => {
    const cards = [
      { name: 'Card A', quantity: 4 },
      { name: 'Card B', quantity: 2 },
    ];
    const inventory = {
      'card a': 3, // missing 1
      'card b': 0, // missing 2
    };

    const stats = computeCompletion(cards, inventory);
    expect(stats.totalCards).toBe(6);
    expect(stats.totalMissing).toBe(3);
    expect(stats.ownedCount).toBe(3);
    expect(Math.round(stats.completionPercentage)).toBe(50);
  });

  it('handles absent inventory entries as zero availability', () => {
    const cards = [{ name: 'Unknown Card', quantity: 3 }];
    const inventory = {};
    const stats = computeCompletion(cards, inventory);
    expect(stats.totalMissing).toBe(3);
    expect(stats.completionPercentage).toBe(0);
  });
});
