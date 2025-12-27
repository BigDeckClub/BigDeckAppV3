/**
 * Inventory Checks Hook
 * Provides utilities for checking card ownership and availability
 */

import { useMemo, useCallback } from 'react';
import { useInventory } from '../context/InventoryContext';

/**
 * Hook for checking card ownership and availability
 * @returns {Object} Inventory check functions and stats
 */
export function useInventoryChecks() {
  const { inventory } = useInventory();

  /**
   * Check ownership and availability for a specific card
   * @param {string} cardName - Name of the card to check
   * @returns {Object} Ownership stats { total, reserved, available }
   */
  const checkOwnership = useCallback((cardName) => {
    const found = inventory.find(c =>
      c.name.toLowerCase() === cardName.toLowerCase()
    );

    if (!found) {
      return { total: 0, reserved: 0, available: 0 };
    }

    const total = parseInt(found.quantity) || 0;
    const reserved = parseInt(found.reserved_quantity) || 0;
    const available = total - reserved;

    return { total, reserved, available };
  }, [inventory]);

  /**
   * Check if user owns at least the required quantity
   * @param {string} cardName - Name of the card
   * @param {number} requiredQty - Required quantity
   * @returns {boolean} True if user owns enough copies
   */
  const hasEnoughCopies = useCallback((cardName, requiredQty = 1) => {
    const { available } = checkOwnership(cardName);
    return available >= requiredQty;
  }, [checkOwnership]);

  /**
   * Calculate how many cards in deck are owned
   * @param {Array} deckCards - Array of deck cards
   * @returns {Object} Ownership breakdown { owned, missing, reserved }
   */
  const getDeckOwnership = useCallback((deckCards = []) => {
    const stats = {
      owned: 0,
      missing: 0,
      reserved: 0,
      total: deckCards.length
    };

    for (const card of deckCards) {
      const { total, reserved, available } = checkOwnership(card.name);
      const neededQty = card.quantity || 1;

      if (available >= neededQty) {
        stats.owned++;
      } else if (total > 0) {
        stats.reserved++;
      } else {
        stats.missing++;
      }
    }

    return stats;
  }, [checkOwnership]);

  /**
   * Get list of cards user doesn't own
   * @param {Array} deckCards - Array of deck cards
   * @returns {Array} Cards user doesn't own
   */
  const getMissingCards = useCallback((deckCards = []) => {
    return deckCards.filter(card => {
      const { total } = checkOwnership(card.name);
      return total === 0;
    });
  }, [checkOwnership]);

  /**
   * Get list of cards that are unavailable (missing OR reserved)
   * @param {Array} deckCards - Array of deck cards
   * @returns {Array} Unavailable cards with shortage quantities
   */
  const getUnavailableCards = useCallback((deckCards = []) => {
    return deckCards
      .filter(card => {
        const { available } = checkOwnership(card.name);
        const neededQty = card.quantity || 1;
        return available < neededQty;
      })
      .map(card => {
        const { available } = checkOwnership(card.name);
        const neededQty = card.quantity || 1;
        return {
          ...card,
          name: card.name,
          quantity: neededQty - available
        };
      });
  }, [checkOwnership]);

  /**
   * Calculate total available inventory count
   */
  const availableCount = useMemo(() => {
    return inventory.filter(c => {
      const total = parseInt(c.quantity) || 0;
      const reserved = parseInt(c.reserved_quantity) || 0;
      return (total - reserved) > 0;
    }).length;
  }, [inventory]);

  /**
   * Calculate total value of available inventory
   */
  const availableInventoryValue = useMemo(() => {
    return inventory.reduce((total, card) => {
      const qty = parseInt(card.quantity) || 0;
      const reserved = parseInt(card.reserved_quantity) || 0;
      const available = qty - reserved;
      const price = parseFloat(card.purchase_price) || 0;
      return total + (available * price);
    }, 0);
  }, [inventory]);

  /**
   * Calculate rounded inventory value (nearest $10)
   */
  const roundedInventoryValue = useMemo(() => {
    return Math.round(availableInventoryValue / 10) * 10;
  }, [availableInventoryValue]);

  /**
   * Calculate total inventory count (including reserved)
   */
  const totalInventoryCount = useMemo(() => {
    return inventory.reduce((sum, card) => {
      return sum + (parseInt(card.quantity) || 0);
    }, 0);
  }, [inventory]);

  /**
   * Calculate unique card count
   */
  const uniqueCardCount = useMemo(() => {
    return inventory.length;
  }, [inventory]);

  /**
   * Check if inventory-only mode is viable
   * @param {number} minimumCards - Minimum cards required
   * @returns {Object} Viability check { viable, availableCount, requiredCount }
   */
  const checkInventoryOnlyViability = useCallback((minimumCards = 99) => {
    const viable = availableCount >= minimumCards;
    return {
      viable,
      availableCount,
      requiredCount: minimumCards
    };
  }, [availableCount]);

  return {
    // Core functions
    checkOwnership,
    hasEnoughCopies,
    getDeckOwnership,
    getMissingCards,
    getUnavailableCards,

    // Inventory stats
    availableCount,
    availableInventoryValue,
    roundedInventoryValue,
    totalInventoryCount,
    uniqueCardCount,

    // Helpers
    checkInventoryOnlyViability
  };
}
