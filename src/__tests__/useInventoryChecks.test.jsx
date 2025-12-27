/**
 * Tests for useInventoryChecks hook
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInventoryChecks } from '../hooks/useInventoryChecks';
import { InventoryProvider } from '../context/InventoryContext';

// Mock inventory data
const mockInventory = [
  {
    id: 1,
    name: 'Sol Ring',
    quantity: '4',
    reserved_quantity: '2',
    purchase_price: '1.50'
  },
  {
    id: 2,
    name: 'Lightning Bolt',
    quantity: '10',
    reserved_quantity: '0',
    purchase_price: '0.50'
  },
  {
    id: 3,
    name: 'Command Tower',
    quantity: '3',
    reserved_quantity: '3',
    purchase_price: '2.00'
  },
  {
    id: 4,
    name: 'Counterspell',
    quantity: '0',
    reserved_quantity: '0',
    purchase_price: '0.75'
  }
];

// Wrapper component that provides inventory context
const wrapper = ({ children }) => (
  <InventoryProvider value={{ inventory: mockInventory }}>
    {children}
  </InventoryProvider>
);

describe('useInventoryChecks', () => {
  describe('checkOwnership()', () => {
    it('should return ownership stats for owned card', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const stats = result.current.checkOwnership('Sol Ring');

      expect(stats).toEqual({
        total: 4,
        reserved: 2,
        available: 2
      });
    });

    it('should return zeros for unowned card', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const stats = result.current.checkOwnership('Black Lotus');

      expect(stats).toEqual({
        total: 0,
        reserved: 0,
        available: 0
      });
    });

    it('should be case-insensitive', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const stats = result.current.checkOwnership('LIGHTNING BOLT');

      expect(stats).toEqual({
        total: 10,
        reserved: 0,
        available: 10
      });
    });

    it('should handle fully reserved cards', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const stats = result.current.checkOwnership('Command Tower');

      expect(stats).toEqual({
        total: 3,
        reserved: 3,
        available: 0
      });
    });
  });

  describe('hasEnoughCopies()', () => {
    it('should return true when enough available copies', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      expect(result.current.hasEnoughCopies('Lightning Bolt', 5)).toBe(true);
    });

    it('should return false when not enough available copies', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      expect(result.current.hasEnoughCopies('Sol Ring', 3)).toBe(false);
    });

    it('should return false for fully reserved cards', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      expect(result.current.hasEnoughCopies('Command Tower', 1)).toBe(false);
    });

    it('should return false for unowned cards', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      expect(result.current.hasEnoughCopies('Mox Diamond', 1)).toBe(false);
    });

    it('should default to quantity 1', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      expect(result.current.hasEnoughCopies('Lightning Bolt')).toBe(true);
    });
  });

  describe('getDeckOwnership()', () => {
    it('should calculate ownership breakdown', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const deckCards = [
        { name: 'Sol Ring', quantity: 1 },        // available: 2, owned
        { name: 'Lightning Bolt', quantity: 1 },  // available: 10, owned
        { name: 'Command Tower', quantity: 1 },   // available: 0, reserved
        { name: 'Black Lotus', quantity: 1 }      // missing
      ];

      const stats = result.current.getDeckOwnership(deckCards);

      expect(stats).toEqual({
        owned: 2,
        reserved: 1,
        missing: 1,
        total: 4
      });
    });

    it('should handle empty deck', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const stats = result.current.getDeckOwnership([]);

      expect(stats).toEqual({
        owned: 0,
        reserved: 0,
        missing: 0,
        total: 0
      });
    });
  });

  describe('getMissingCards()', () => {
    it('should return cards not owned at all', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const deckCards = [
        { name: 'Sol Ring' },           // owned
        { name: 'Command Tower' },      // owned but reserved
        { name: 'Black Lotus' },        // missing
        { name: 'Mox Diamond' }         // missing
      ];

      const missing = result.current.getMissingCards(deckCards);

      expect(missing).toHaveLength(2);
      expect(missing[0].name).toBe('Black Lotus');
      expect(missing[1].name).toBe('Mox Diamond');
    });

    it('should return empty array if all cards owned', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const deckCards = [
        { name: 'Sol Ring' },
        { name: 'Lightning Bolt' }
      ];

      const missing = result.current.getMissingCards(deckCards);

      expect(missing).toHaveLength(0);
    });
  });

  describe('getUnavailableCards()', () => {
    it('should return cards that are missing or reserved', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const deckCards = [
        { name: 'Sol Ring', quantity: 1 },        // available: 2, OK
        { name: 'Lightning Bolt', quantity: 1 },  // available: 10, OK
        { name: 'Command Tower', quantity: 1 },   // available: 0, UNAVAILABLE
        { name: 'Black Lotus', quantity: 1 }      // missing, UNAVAILABLE
      ];

      const unavailable = result.current.getUnavailableCards(deckCards);

      expect(unavailable).toHaveLength(2);
      expect(unavailable.find(c => c.name === 'Command Tower')).toBeDefined();
      expect(unavailable.find(c => c.name === 'Black Lotus')).toBeDefined();
    });

    it('should calculate shortage quantities', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const deckCards = [
        { name: 'Sol Ring', quantity: 5 }  // available: 2, need 3 more
      ];

      const unavailable = result.current.getUnavailableCards(deckCards);

      expect(unavailable).toHaveLength(1);
      expect(unavailable[0].quantity).toBe(3);
    });
  });

  describe('availableCount', () => {
    it('should count cards with available quantity', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      // Sol Ring (available: 2) and Lightning Bolt (available: 10)
      // Command Tower (available: 0) and Counterspell (quantity: 0) excluded
      expect(result.current.availableCount).toBe(2);
    });
  });

  describe('availableInventoryValue', () => {
    it('should calculate total value of available cards', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      // Sol Ring: 2 available * $1.50 = $3.00
      // Lightning Bolt: 10 available * $0.50 = $5.00
      // Total: $8.00
      expect(result.current.availableInventoryValue).toBe(8.00);
    });
  });

  describe('roundedInventoryValue', () => {
    it('should round to nearest $10', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      // $8.00 rounds to $10
      expect(result.current.roundedInventoryValue).toBe(10);
    });
  });

  describe('totalInventoryCount', () => {
    it('should count all cards including reserved', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      // 4 + 10 + 3 + 0 = 17
      expect(result.current.totalInventoryCount).toBe(17);
    });
  });

  describe('uniqueCardCount', () => {
    it('should count unique cards in inventory', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      expect(result.current.uniqueCardCount).toBe(4);
    });
  });

  describe('checkInventoryOnlyViability()', () => {
    it('should return viable when enough available cards', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const viability = result.current.checkInventoryOnlyViability(2);

      expect(viability).toEqual({
        viable: true,
        availableCount: 2,
        requiredCount: 2
      });
    });

    it('should return not viable when not enough cards', () => {
      const { result } = renderHook(() => useInventoryChecks(), { wrapper });

      const viability = result.current.checkInventoryOnlyViability(99);

      expect(viability).toEqual({
        viable: false,
        availableCount: 2,
        requiredCount: 99
      });
    });
  });
});
