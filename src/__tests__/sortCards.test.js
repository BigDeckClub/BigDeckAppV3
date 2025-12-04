import { describe, it, expect } from 'vitest';
import { 
  sortCards, 
  sortDeckCards, 
  getTotalQuantity, 
  getAveragePrice, 
  getTotalValue,
  getSetCodeForSorting,
  getDateAdded
} from '../utils/sortCards';

describe('sortCards utility', () => {
  // Sample test data
  const testCards = [
    ['Brainstorm', [
      { quantity: 4, purchase_price: 2.50, set: 'ice', created_at: '2024-01-15T10:00:00Z' },
      { quantity: 2, purchase_price: 3.00, set: 'ema', created_at: '2024-02-20T10:00:00Z' }
    ]],
    ['Lightning Bolt', [
      { quantity: 10, purchase_price: 1.00, set: 'alpha', created_at: '2024-03-01T10:00:00Z' }
    ]],
    ['Force of Will', [
      { quantity: 1, purchase_price: 75.00, set: 'all', created_at: '2023-12-01T10:00:00Z' }
    ]],
    ['Dark Ritual', [
      { quantity: 8, purchase_price: 0.50, set: 'lea', created_at: '2024-01-01T10:00:00Z' }
    ]]
  ];

  describe('getTotalQuantity', () => {
    it('should calculate total quantity across items', () => {
      expect(getTotalQuantity(testCards[0][1])).toBe(6); // Brainstorm: 4 + 2
      expect(getTotalQuantity(testCards[1][1])).toBe(10); // Lightning Bolt: 10
    });

    it('should return 0 for empty array', () => {
      expect(getTotalQuantity([])).toBe(0);
    });

    it('should handle items with missing quantity', () => {
      const items = [{ purchase_price: 1.00 }, { quantity: 5 }];
      expect(getTotalQuantity(items)).toBe(5);
    });

    it('should handle items with null quantity', () => {
      const items = [{ quantity: null }, { quantity: 3 }];
      expect(getTotalQuantity(items)).toBe(3);
    });
  });

  describe('getAveragePrice', () => {
    it('should calculate average price across items', () => {
      const avg = getAveragePrice(testCards[0][1]); // (2.50 + 3.00) / 2 = 2.75
      expect(avg).toBeCloseTo(2.75);
    });

    it('should return 0 for empty array', () => {
      expect(getAveragePrice([])).toBe(0);
    });

    it('should handle items with missing purchase_price', () => {
      const items = [{ quantity: 1 }, { purchase_price: 10.00 }];
      expect(getAveragePrice(items)).toBeCloseTo(5); // (0 + 10) / 2 = 5
    });

    it('should handle items with null purchase_price', () => {
      const items = [{ purchase_price: null }, { purchase_price: 8.00 }];
      expect(getAveragePrice(items)).toBeCloseTo(4); // (0 + 8) / 2 = 4
    });

    it('should handle string purchase_price values', () => {
      const items = [{ purchase_price: '5.50' }];
      expect(getAveragePrice(items)).toBeCloseTo(5.5);
    });
  });

  describe('getTotalValue', () => {
    it('should calculate total value (price * quantity) across items', () => {
      // Brainstorm: (2.50 * 4) + (3.00 * 2) = 10 + 6 = 16
      expect(getTotalValue(testCards[0][1])).toBeCloseTo(16);
    });

    it('should handle items with missing values', () => {
      const items = [
        { quantity: 5 }, // no price
        { purchase_price: 10.00 } // no quantity
      ];
      expect(getTotalValue(items)).toBe(0); // 5*0 + 10*0 = 0
    });
  });

  describe('getSetCodeForSorting', () => {
    it('should return set code as lowercase string', () => {
      expect(getSetCodeForSorting(testCards[0][1])).toBe('ice');
    });

    it('should handle object set format with editioncode', () => {
      const items = [{ set: { editioncode: 'MH1', mtgoCode: 'mh1' } }];
      expect(getSetCodeForSorting(items)).toBe('mh1');
    });

    it('should handle object set format with only mtgoCode', () => {
      const items = [{ set: { mtgoCode: 'MH2' } }];
      expect(getSetCodeForSorting(items)).toBe('mh2');
    });

    it('should return empty string for empty array', () => {
      expect(getSetCodeForSorting([])).toBe('');
    });

    it('should return empty string for missing set', () => {
      const items = [{ quantity: 1 }];
      expect(getSetCodeForSorting(items)).toBe('');
    });

    it('should return empty string for null set', () => {
      const items = [{ set: null }];
      expect(getSetCodeForSorting(items)).toBe('');
    });

    it('should handle empty string set', () => {
      const items = [{ set: '' }];
      expect(getSetCodeForSorting(items)).toBe('');
    });

    it('should handle whitespace-only set', () => {
      const items = [{ set: '   ' }];
      expect(getSetCodeForSorting(items)).toBe('   ');
    });
  });

  describe('getDateAdded', () => {
    it('should return the latest date from items', () => {
      const date = getDateAdded(testCards[0][1]);
      expect(date.getTime()).toBe(new Date('2024-02-20T10:00:00Z').getTime());
    });

    it('should return epoch date for empty array', () => {
      const date = getDateAdded([]);
      expect(date.getTime()).toBe(0);
    });

    it('should handle items with missing created_at', () => {
      const items = [
        { quantity: 1 },
        { created_at: '2024-01-01T10:00:00Z' }
      ];
      const date = getDateAdded(items);
      expect(date.getTime()).toBe(new Date('2024-01-01T10:00:00Z').getTime());
    });

    it('should handle items with null created_at', () => {
      const items = [
        { created_at: null },
        { created_at: '2024-06-15T10:00:00Z' }
      ];
      const date = getDateAdded(items);
      expect(date.getTime()).toBe(new Date('2024-06-15T10:00:00Z').getTime());
    });

    it('should return epoch date when all items have no created_at', () => {
      const items = [{ quantity: 1 }, { quantity: 2 }];
      const date = getDateAdded(items);
      expect(date.getTime()).toBe(0);
    });

    it('should handle invalid date strings gracefully', () => {
      const items = [
        { created_at: 'invalid-date' },
        { created_at: '2024-01-01T10:00:00Z' }
      ];
      const date = getDateAdded(items);
      // Invalid date becomes NaN, filtered out, so we get the valid one
      expect(date.getTime()).toBe(new Date('2024-01-01T10:00:00Z').getTime());
    });
  });

  describe('sortCards', () => {
    it('should sort by name ascending', () => {
      const sorted = sortCards(testCards, 'name', 'asc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Brainstorm', 'Dark Ritual', 'Force of Will', 'Lightning Bolt'
      ]);
    });

    it('should sort by name descending', () => {
      const sorted = sortCards(testCards, 'name', 'desc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Lightning Bolt', 'Force of Will', 'Dark Ritual', 'Brainstorm'
      ]);
    });

    it('should sort by price ascending', () => {
      const sorted = sortCards(testCards, 'price', 'asc');
      // Dark Ritual: 0.50, Lightning Bolt: 1.00, Brainstorm: 2.75, Force of Will: 75.00
      expect(sorted.map(([name]) => name)).toEqual([
        'Dark Ritual', 'Lightning Bolt', 'Brainstorm', 'Force of Will'
      ]);
    });

    it('should sort by price descending', () => {
      const sorted = sortCards(testCards, 'price', 'desc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Force of Will', 'Brainstorm', 'Lightning Bolt', 'Dark Ritual'
      ]);
    });

    it('should sort by quantity ascending', () => {
      const sorted = sortCards(testCards, 'quantity', 'asc');
      // Force of Will: 1, Brainstorm: 6, Dark Ritual: 8, Lightning Bolt: 10
      expect(sorted.map(([name]) => name)).toEqual([
        'Force of Will', 'Brainstorm', 'Dark Ritual', 'Lightning Bolt'
      ]);
    });

    it('should sort by quantity descending', () => {
      const sorted = sortCards(testCards, 'quantity', 'desc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Lightning Bolt', 'Dark Ritual', 'Brainstorm', 'Force of Will'
      ]);
    });

    it('should sort by set ascending', () => {
      const sorted = sortCards(testCards, 'set', 'asc');
      // all < alpha < ice < lea
      expect(sorted.map(([name]) => name)).toEqual([
        'Force of Will', 'Lightning Bolt', 'Brainstorm', 'Dark Ritual'
      ]);
    });

    it('should sort by dateAdded descending (newest first)', () => {
      const sorted = sortCards(testCards, 'dateAdded', 'desc');
      // Lightning Bolt (Mar), Brainstorm (Feb), Dark Ritual (Jan), Force of Will (Dec)
      expect(sorted.map(([name]) => name)).toEqual([
        'Lightning Bolt', 'Brainstorm', 'Dark Ritual', 'Force of Will'
      ]);
    });

    it('should sort by dateAdded ascending (oldest first)', () => {
      const sorted = sortCards(testCards, 'dateAdded', 'asc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Force of Will', 'Dark Ritual', 'Brainstorm', 'Lightning Bolt'
      ]);
    });

    it('should handle empty array', () => {
      expect(sortCards([], 'name', 'asc')).toEqual([]);
    });

    it('should handle null input', () => {
      expect(sortCards(null, 'name', 'asc')).toBeNull();
    });

    it('should not mutate the original array', () => {
      const original = [...testCards];
      sortCards(testCards, 'name', 'asc');
      expect(testCards).toEqual(original);
    });

    it('should use name as default sort when invalid field provided', () => {
      const sorted = sortCards(testCards, 'invalid', 'asc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Brainstorm', 'Dark Ritual', 'Force of Will', 'Lightning Bolt'
      ]);
    });
  });

  describe('sortDeckCards', () => {
    const deckCards = [
      ['Brainstorm', [
        { quantity_reserved: 3, purchase_price: 2.50, set: 'ice' }
      ]],
      ['Force of Will', [
        { quantity_reserved: 1, purchase_price: 75.00, set: 'all' }
      ]],
      ['Lightning Bolt', [
        { quantity_reserved: 4, purchase_price: 1.00, set: 'alpha' }
      ]]
    ];

    it('should sort deck cards by name', () => {
      const sorted = sortDeckCards(deckCards, 'name', 'asc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Brainstorm', 'Force of Will', 'Lightning Bolt'
      ]);
    });

    it('should sort deck cards by quantity (reserved)', () => {
      const sorted = sortDeckCards(deckCards, 'quantity', 'desc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Lightning Bolt', 'Brainstorm', 'Force of Will'
      ]);
    });

    it('should sort deck cards by price', () => {
      const sorted = sortDeckCards(deckCards, 'price', 'desc');
      expect(sorted.map(([name]) => name)).toEqual([
        'Force of Will', 'Brainstorm', 'Lightning Bolt'
      ]);
    });

    it('should handle empty array', () => {
      expect(sortDeckCards([], 'name', 'asc')).toEqual([]);
    });

    it('should handle null input', () => {
      expect(sortDeckCards(null, 'name', 'asc')).toBeNull();
    });
  });
});
