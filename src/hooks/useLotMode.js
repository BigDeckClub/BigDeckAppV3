import { useState, useMemo, useCallback } from 'react';
import { api } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

/**
 * Calculate per-card cost for a lot
 */
const calculatePerCardCost = (totalCost, totalCards) => {
  const cost = parseFloat(totalCost);
  if (totalCards > 0 && !isNaN(cost) && cost > 0) {
    return cost / totalCards;
  }
  return 0;
};

/**
 * useLotMode - Manages lot mode state for batch card entry
 * Extracted from useRapidEntry for better separation of concerns
 */
export function useLotMode({ onCardsAdded, onReset }) {
  // Lot mode state
  const [lotModeEnabled, setLotModeEnabled] = useState(false);
  const [lotName, setLotName] = useState('');
  const [lotTotalCost, setLotTotalCost] = useState('');
  const [lotCards, setLotCards] = useState([]);
  const [lotSubmitting, setLotSubmitting] = useState(false);
  const [lotError, setLotError] = useState(null);

  // Calculate lot totals (memoized)
  const lotTotalCards = useMemo(() =>
    lotCards.reduce((sum, card) => sum + (card.quantity || 1), 0),
    [lotCards]
  );

  const lotPerCardCost = useMemo(() =>
    calculatePerCardCost(lotTotalCost, lotTotalCards),
    [lotTotalCost, lotTotalCards]
  );

  // Add a card to the lot
  const addCardToLot = useCallback((cardData) => {
    setLotCards(prev => [...prev, cardData]);
  }, []);

  // Add multiple cards to the lot
  const addCardsToLot = useCallback((cards) => {
    setLotCards(prev => [...prev, ...cards]);
  }, []);

  // Remove a card from the lot
  const removeCardFromLot = useCallback((index) => {
    setLotCards(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all cards from the lot
  const clearLot = useCallback(() => {
    setLotCards([]);
  }, []);

  // Submit the lot to the server
  const submitLot = useCallback(async () => {
    if (lotCards.length === 0) {
      return { success: false, error: 'No cards in lot' };
    }

    setLotSubmitting(true);
    setLotError(null);

    try {
      // Create the lot
      const parsedCost = lotTotalCost ? parseFloat(lotTotalCost) : null;
      const lotData = await api.post(API_ENDPOINTS.LOTS, {
        name: lotName || 'Unnamed Lot',
        total_cost: parsedCost,
        card_count: lotTotalCards,
      });

      // Add all cards to the lot
      await api.post(`${API_ENDPOINTS.LOTS}/${lotData.id}/cards`, {
        cards: lotCards,
      });

      // Notify parent of added cards
      const addedCards = lotCards.map(card => ({
        cardName: card.name,
        quantity: card.quantity,
        price: parseFloat(lotPerCardCost.toFixed(2)),
      }));
      onCardsAdded?.(addedCards);

      // Reset lot state
      setLotCards([]);
      setLotName('');
      setLotTotalCost('');

      // Notify parent to reset
      onReset?.();

      return { success: true, lotId: lotData.id, cardCount: lotCards.length };
    } catch (error) {
      console.error('Error submitting lot:', error);
      const errorMessage = error.message || error.data?.error || 'Failed to submit lot. Please try again.';
      setLotError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLotSubmitting(false);
    }
  }, [lotCards, lotTotalCost, lotName, lotTotalCards, lotPerCardCost, onCardsAdded, onReset]);

  // Toggle lot mode
  const toggleLotMode = useCallback(() => {
    setLotModeEnabled(prev => !prev);
  }, []);

  // Enable lot mode
  const enableLotMode = useCallback(() => {
    setLotModeEnabled(true);
  }, []);

  // Disable lot mode
  const disableLotMode = useCallback(() => {
    setLotModeEnabled(false);
  }, []);

  return {
    // State
    lotModeEnabled,
    setLotModeEnabled,
    lotName,
    setLotName,
    lotTotalCost,
    setLotTotalCost,
    lotCards,
    lotSubmitting,
    lotError,
    setLotError,

    // Computed
    lotTotalCards,
    lotPerCardCost,

    // Actions
    addCardToLot,
    addCardsToLot,
    removeCardFromLot,
    clearLot,
    submitLot,
    toggleLotMode,
    enableLotMode,
    disableLotMode,
  };
}

export default useLotMode;
