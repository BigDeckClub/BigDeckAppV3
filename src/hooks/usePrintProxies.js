/**
 * Print Proxies Hook
 * Handles proxy card generation and printing
 */

import { useCallback } from 'react';
import { useToast, TOAST_TYPES } from '../context/ToastContext';
import { useInventoryChecks } from './useInventoryChecks';

/**
 * Hook for managing proxy printing
 * @returns {Object} Print functions and state
 */
export function usePrintProxies() {
  const { showToast } = useToast();
  const { checkOwnership } = useInventoryChecks();

  /**
   * Print proxies for specified cards
   * @param {Array} deckCards - All cards in the deck
   * @param {string} mode - Print mode: 'all' | 'missing' | 'unavailable'
   * @returns {Promise<void>}
   */
  const printProxies = useCallback(async (deckCards, mode) => {
    if (!deckCards || deckCards.length === 0) {
      showToast('No cards to print!', TOAST_TYPES.INFO);
      return;
    }

    let cardsToPrint;

    switch (mode) {
      case 'all':
        // Print all cards in the deck
        cardsToPrint = deckCards;
        break;

      case 'missing':
        // Print only cards with total quantity less than needed (never owned)
        cardsToPrint = deckCards
          .filter(card => {
            const { total } = checkOwnership(card.name);
            const neededQty = card.quantity || 1;
            return total < neededQty;
          })
          .map(card => {
            const { total } = checkOwnership(card.name);
            const neededQty = card.quantity || 1;
            return {
              ...card,
              quantity: neededQty - total // Only print what's missing
            };
          });
        break;

      case 'unavailable':
        // Print cards that are missing OR reserved (unavailable)
        cardsToPrint = deckCards
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
              quantity: neededQty - available // Print unavailable quantity
            };
          });
        break;

      default:
        showToast('Invalid print mode', TOAST_TYPES.ERROR);
        return;
    }

    if (!cardsToPrint || cardsToPrint.length === 0) {
      showToast('No cards to print!', TOAST_TYPES.INFO);
      return;
    }

    const totalCardsToPrint = cardsToPrint.reduce((sum, c) => sum + (c.quantity || 1), 0);

    try {
      showToast(`Generating ${totalCardsToPrint} proxy cards...`, TOAST_TYPES.INFO);

      // Dynamic import to reduce bundle size
      const { generateProxyPDF } = await import('../utils/proxyGenerator');
      await generateProxyPDF(cardsToPrint);

      showToast('Proxy PDF generated successfully!', TOAST_TYPES.SUCCESS);
    } catch (error) {
      console.error('Failed to generate proxies', error);
      showToast('Failed to generate proxies. Please try again.', TOAST_TYPES.ERROR);
      throw error;
    }
  }, [checkOwnership, showToast]);

  /**
   * Calculate print cost for cards
   * @param {Array} deckCards - Cards to print
   * @param {string} mode - Print mode
   * @param {number} pricePerCard - Price per proxy card (default: $0.25)
   * @returns {Object} Cost breakdown { cardCount, totalCost, pricePerCard }
   */
  const calculatePrintCost = useCallback((deckCards, mode, pricePerCard = 0.25) => {
    if (!deckCards || deckCards.length === 0) {
      return { cardCount: 0, totalCost: 0, pricePerCard };
    }

    let cardCount = 0;

    switch (mode) {
      case 'all':
        cardCount = deckCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
        break;

      case 'missing':
        cardCount = deckCards
          .filter(card => {
            const { total } = checkOwnership(card.name);
            const neededQty = card.quantity || 1;
            return total < neededQty;
          })
          .reduce((sum, card) => {
            const { total } = checkOwnership(card.name);
            const neededQty = card.quantity || 1;
            return sum + (neededQty - total);
          }, 0);
        break;

      case 'unavailable':
        cardCount = deckCards
          .filter(card => {
            const { available } = checkOwnership(card.name);
            const neededQty = card.quantity || 1;
            return available < neededQty;
          })
          .reduce((sum, card) => {
            const { available } = checkOwnership(card.name);
            const neededQty = card.quantity || 1;
            return sum + (neededQty - available);
          }, 0);
        break;

      default:
        break;
    }

    return {
      cardCount,
      totalCost: cardCount * pricePerCard,
      pricePerCard
    };
  }, [checkOwnership]);

  /**
   * Get printable cards for a specific mode
   * @param {Array} deckCards - All deck cards
   * @param {string} mode - Print mode
   * @returns {Array} Cards that would be printed
   */
  const getPrintableCards = useCallback((deckCards, mode) => {
    if (!deckCards || deckCards.length === 0) {
      return [];
    }

    switch (mode) {
      case 'all':
        return deckCards;

      case 'missing':
        return deckCards.filter(card => {
          const { total } = checkOwnership(card.name);
          const neededQty = card.quantity || 1;
          return total < neededQty;
        });

      case 'unavailable':
        return deckCards.filter(card => {
          const { available } = checkOwnership(card.name);
          const neededQty = card.quantity || 1;
          return available < neededQty;
        });

      default:
        return [];
    }
  }, [checkOwnership]);

  return {
    printProxies,
    calculatePrintCost,
    getPrintableCards
  };
}
