import { useState, useCallback, useRef } from 'react';
import { fetchWithAuth } from '../utils/apiClient';

/**
 * useDeckInstanceState - Manages deck instance state and operations
 * Extracted from useInventoryState for better separation of concerns
 */
export function useDeckInstanceState({ onLoadInventory, setSuccessMessage }) {
  const [deckInstances, setDeckInstances] = useState([]);
  const [deckDetailsCache, setDeckDetailsCache] = useState({});
  const [loadingDeckDetails, setLoadingDeckDetails] = useState(false);
  const [expandedMissingCards, setExpandedMissingCards] = useState({});

  // Debounced inventory refresh
  const debouncedTimeoutRef = useRef(null);
  const debouncedLoadInventory = useCallback(() => {
    if (debouncedTimeoutRef.current) clearTimeout(debouncedTimeoutRef.current);
    debouncedTimeoutRef.current = setTimeout(() => {
      onLoadInventory?.();
    }, 300);
  }, [onLoadInventory]);

  // Fetch deck instances
  const refreshDeckInstances = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/deck-instances');
      if (response.ok) {
        const data = await response.json();
        setDeckInstances(data);
      }
    } catch (error) {
      console.error('Error fetching deck instances:', error);
    }
  }, []);

  // Load deck details
  const loadDeckDetails = useCallback(async (deckId, forceRefresh = false) => {
    if (deckDetailsCache[deckId] && !forceRefresh) return deckDetailsCache[deckId];
    setLoadingDeckDetails(true);
    try {
      const response = await fetchWithAuth(`/api/deck-instances/${deckId}/details`);
      if (response.ok) {
        const data = await response.json();
        setDeckDetailsCache(prev => ({ ...prev, [deckId]: data }));

        // Auto-expand missing cards if any
        const deck = deckInstances.find(d => d.id === deckId);
        if (deck) {
          const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
          const actualMissingCount = Math.max(0, decklistTotal - (data.reservedCount || 0));
          if (actualMissingCount > 0) {
            setExpandedMissingCards(prev => ({ ...prev, [deckId]: true }));
          }
        }
        return data;
      }
    } catch (error) {
      console.error('Error loading deck details:', error);
    } finally {
      setLoadingDeckDetails(false);
    }
    return null;
  }, [deckDetailsCache, deckInstances]);

  // Release (delete) a deck
  const releaseDeck = useCallback(async (deckId, onClose) => {
    try {
      const response = await fetchWithAuth(`/api/deck-instances/${deckId}/release`, { method: 'POST' });
      if (response.ok) {
        onClose?.();
        setDeckDetailsCache(prev => {
          const updated = { ...prev };
          delete updated[deckId];
          return updated;
        });
        await refreshDeckInstances();
        setSuccessMessage?.('Deck deleted! Cards returned to unsorted.');
        setTimeout(() => setSuccessMessage?.(''), 3000);
        return true;
      } else {
        alert('Failed to delete deck');
        return false;
      }
    } catch (error) {
      alert('Error deleting deck');
      return false;
    }
  }, [refreshDeckInstances, setSuccessMessage]);

  // Remove a card from deck
  const removeCardFromDeck = useCallback(async (deckId, reservationId, quantity = 1) => {
    try {
      const response = await fetchWithAuth(`/api/deck-instances/${deckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity })
      });
      if (response.ok) {
        await loadDeckDetails(deckId, true);
        await refreshDeckInstances();
        debouncedLoadInventory();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing card from deck:', error);
      return false;
    }
  }, [loadDeckDetails, refreshDeckInstances, debouncedLoadInventory]);

  // Add a card to deck
  const addCardToDeck = useCallback(async (inventoryItem, deckId, quantity = null) => {
    try {
      const qtyToUse = quantity ?? (inventoryItem.quantity || 1);
      const response = await fetchWithAuth(`/api/deck-instances/${deckId}/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_item_id: inventoryItem.id,
          quantity: qtyToUse
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.includes('Not enough available') && qtyToUse > 1) {
          // Retry with one less
          return addCardToDeck(inventoryItem, deckId, qtyToUse - 1);
        }
        throw new Error(errorData.error || 'Failed to add card to deck');
      }

      // Optimistic update
      const optimisticReservation = {
        name: inventoryItem.name,
        set: inventoryItem.set,
        quantity_reserved: qtyToUse,
        purchase_price: inventoryItem.purchase_price,
        original_folder: inventoryItem.folder
      };

      setDeckDetailsCache(prev => {
        if (!prev[deckId]) return prev;
        return {
          ...prev,
          [deckId]: {
            ...prev[deckId],
            reservations: [...(prev[deckId].reservations || []), optimisticReservation],
            reservedCount: (prev[deckId].reservedCount || 0) + qtyToUse,
            totalCost: (prev[deckId].totalCost || 0) + (inventoryItem.purchase_price * qtyToUse || 0)
          }
        };
      });

      return { success: true, quantity: qtyToUse };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  // Clear cache for a specific deck
  const clearDeckCache = useCallback((deckId) => {
    setDeckDetailsCache(prev => {
      const updated = { ...prev };
      delete updated[deckId];
      return updated;
    });
  }, []);

  return {
    // State
    deckInstances,
    deckDetailsCache,
    loadingDeckDetails,
    expandedMissingCards,
    setExpandedMissingCards,

    // Actions
    refreshDeckInstances,
    loadDeckDetails,
    releaseDeck,
    removeCardFromDeck,
    addCardToDeck,
    clearDeckCache,
    debouncedLoadInventory
  };
}

export default useDeckInstanceState;
