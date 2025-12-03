import { useState, useCallback, useRef } from 'react';
import { useToast, TOAST_TYPES } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

/**
 * useDeckReservations - Custom hook for deck reservation logic
 * Extracted from InventoryTab for better code organization
 */
export function useDeckReservations({ inventory, onLoadInventory }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  // Deck state
  const [deckInstances, setDeckInstances] = useState([]);
  const [openDecks, setOpenDecks] = useState([]);
  const [deckDetailsCache, setDeckDetailsCache] = useState({});
  const [loadingDeckDetails, setLoadingDeckDetails] = useState(false);
  const [expandedMissingCards, setExpandedMissingCards] = useState({});

  // Debounced inventory refresh to prevent excessive API calls
  const debouncedTimeoutRef = useRef(null);
  const debouncedLoadInventory = useCallback(() => {
    if (debouncedTimeoutRef.current) clearTimeout(debouncedTimeoutRef.current);
    debouncedTimeoutRef.current = setTimeout(() => {
      if (onLoadInventory) onLoadInventory();
    }, 300);
  }, [onLoadInventory]);

  // Fetch deck instances on demand
  const refreshDeckInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/deck-instances');
      if (response.ok) {
        const data = await response.json();
        setDeckInstances(data);
      }
    } catch (error) {
      console.error('Error fetching deck instances:', error);
    }
  }, []);

  // Load full details of a deck instance
  const loadDeckDetails = useCallback(async (deckId, forceRefresh = false) => {
    if (deckDetailsCache[deckId] && !forceRefresh) return;
    setLoadingDeckDetails(true);
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/details`);
      if (response.ok) {
        const data = await response.json();
        setDeckDetailsCache(prev => ({ ...prev, [deckId]: data }));
        // Expand missing cards section if there are missing cards
        const deck = deckInstances.find(d => d.id === deckId);
        if (deck) {
          const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
          const actualMissingCount = Math.max(0, decklistTotal - (data.reservedCount || 0));
          if (actualMissingCount > 0) {
            setExpandedMissingCards(prev => ({ ...prev, [deckId]: true }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading deck details:', error);
    } finally {
      setLoadingDeckDetails(false);
    }
  }, [deckDetailsCache, deckInstances]);

  // Close a deck tab
  const closeDeckTab = useCallback((deckId, activeTab, setActiveTab) => {
    setOpenDecks(prev => prev.filter(id => id !== deckId));
    if (activeTab === `deck-${deckId}`) {
      setActiveTab('all');
    }
  }, []);

  // Open a deck in a new tab (or close if already active - toggle behavior)
  const openDeckTab = useCallback((deck, activeTab, setActiveTab) => {
    if (activeTab === `deck-${deck.id}`) {
      // If this deck is already active, close it (toggle behavior like folders)
      closeDeckTab(deck.id, activeTab, setActiveTab);
    } else {
      // Otherwise, open it
      if (!openDecks.includes(deck.id)) {
        setOpenDecks(prev => [...prev, deck.id]);
      }
      setActiveTab(`deck-${deck.id}`);
      loadDeckDetails(deck.id);
    }
  }, [openDecks, loadDeckDetails, closeDeckTab]);

  // Release deck and return cards to inventory
  const releaseDeck = useCallback(async (deckId, activeTab, setActiveTab) => {
    const deck = deckInstances.find(d => d.id === deckId);
    const confirmed = await confirm({
      title: 'Delete Deck',
      message: `Are you sure you want to delete "${deck?.name || 'this deck'}"? Cards will be returned to Unsorted.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/release`, {
        method: 'POST'
      });
      if (response.ok) {
        closeDeckTab(deckId, activeTab, setActiveTab);
        setDeckDetailsCache(prev => {
          const updated = { ...prev };
          delete updated[deckId];
          return updated;
        });
        await refreshDeckInstances();
        showToast('Deck deleted! Cards returned to unsorted.', TOAST_TYPES.SUCCESS);
      } else {
        showToast('Failed to delete deck', TOAST_TYPES.ERROR);
      }
    } catch (error) {
      showToast('Error deleting deck', TOAST_TYPES.ERROR);
    }
  }, [deckInstances, closeDeckTab, refreshDeckInstances, showToast, confirm]);

  // Remove card from deck reservation
  const removeCardFromDeck = useCallback(async (deckId, reservationId, quantity = 1) => {
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity: quantity })
      });
      if (response.ok) {
        await loadDeckDetails(deckId, true);
        await refreshDeckInstances();
        debouncedLoadInventory();
      }
    } catch (error) {
      console.error('Error removing card from deck:', error);
    }
  }, [loadDeckDetails, refreshDeckInstances, debouncedLoadInventory]);

  // Reoptimize deck to find cheapest cards
  const reoptimizeDeck = useCallback(async (deckId) => {
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/reoptimize`, {
        method: 'POST'
      });
      if (response.ok) {
        const result = await response.json();
        await loadDeckDetails(deckId);
        await refreshDeckInstances();
        showToast(`Deck reoptimized! ${result.reservedCount} cards reserved.`, TOAST_TYPES.SUCCESS);
      } else {
        showToast('Failed to reoptimize deck', TOAST_TYPES.ERROR);
      }
    } catch (error) {
      showToast('Error reoptimizing deck', TOAST_TYPES.ERROR);
    }
  }, [loadDeckDetails, refreshDeckInstances, showToast]);

  // Move individual card SKU to deck (with retry for quantity conflicts)
  const moveCardSkuToDeck = useCallback(async (inventoryItem, deckId, skipRefresh = false, attemptQty = null) => {
    try {
      const deck = deckInstances.find(d => d.id === deckId);
      if (!deck) {
        throw new Error('Deck not found');
      }
      
      const qtyToUse = attemptQty !== null ? attemptQty : (inventoryItem.quantity || 1);
      
      const response = await fetch(`/api/deck-instances/${deckId}/add-card`, {
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
          return moveCardSkuToDeck(inventoryItem, deckId, skipRefresh, qtyToUse - 1);
        }
        throw new Error(errorData.error || 'Failed to add card to deck');
      }
      
      // Only update UI after API succeeds
      const optimisticReservation = {
        name: inventoryItem.name,
        set: inventoryItem.set,
        quantity_reserved: qtyToUse,
        purchase_price: inventoryItem.purchase_price,
        original_folder: inventoryItem.folder
      };
      
      if (deckDetailsCache[deckId]) {
        setDeckDetailsCache(prev => ({
          ...prev,
          [deckId]: {
            ...prev[deckId],
            reservations: [...(prev[deckId].reservations || []), optimisticReservation],
            reservedCount: (prev[deckId].reservedCount || 0) + 1,
            totalCost: (prev[deckId].totalCost || 0) + (inventoryItem.purchase_price * qtyToUse || 0)
          }
        }));
      }
      
      showToast(`Added ${qtyToUse}x ${inventoryItem.name} to deck`, TOAST_TYPES.SUCCESS);
      
      if (!skipRefresh) {
        await refreshDeckInstances();
        debouncedLoadInventory();
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [deckInstances, deckDetailsCache, refreshDeckInstances, debouncedLoadInventory, showToast]);

  // Auto-fill a single card type from inventory (oldest and cheapest first)
  const autoFillSingleCard = useCallback(async (decklistCard, needed, deckId) => {
    try {
      showToast(`Auto-filling ${needed}x ${decklistCard.name}...`, TOAST_TYPES.INFO);
      
      const matchingItems = (inventory || [])
        .filter(i => {
          const nameMatch = i.name.toLowerCase() === decklistCard.name.toLowerCase();
          const available = (i.quantity || 0) - (i.reserved_quantity || 0);
          return nameMatch && available > 0;
        })
        .sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return (parseFloat(a.purchase_price) || 999) - (parseFloat(b.purchase_price) || 999);
        });
      
      let added = 0;
      let stillNeeded = needed;
      for (const item of matchingItems) {
        if (stillNeeded <= 0) break;
        const available = (item.quantity || 0) - (item.reserved_quantity || 0);
        const qtyToAdd = Math.min(stillNeeded, available);
        if (qtyToAdd > 0) {
          await moveCardSkuToDeck({ ...item, quantity: qtyToAdd }, deckId, true);
          added++;
          stillNeeded -= qtyToAdd;
        }
      }
      
      await refreshDeckInstances();
      debouncedLoadInventory();
      await loadDeckDetails(deckId, true);
      showToast(`✅ Added ${added} item(s) to deck`, TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [inventory, moveCardSkuToDeck, refreshDeckInstances, debouncedLoadInventory, loadDeckDetails, showToast]);

  // Auto-fill missing cards from inventory (oldest and cheapest first)
  const autoFillMissingCards = useCallback(async (deck, deckId) => {
    try {
      showToast('Auto-filling missing cards...', TOAST_TYPES.INFO);
      
      const cardsToAdd = [];
      for (const decklistCard of (deck.cards || [])) {
        const reservedQty = (inventory || [])
          .filter(i => i.name.toLowerCase() === decklistCard.name.toLowerCase())
          .reduce((sum, i) => {
            const reserved = (deckDetailsCache[deckId]?.reservations || [])
              .filter(r => r.name.toLowerCase() === i.name.toLowerCase())
              .reduce((s, r) => s + parseInt(r.quantity_reserved || 0), 0);
            return sum + reserved;
          }, 0);
        
        const needed = (decklistCard.quantity || 1) - reservedQty;
        if (needed <= 0) continue;
        
        const matchingItems = (inventory || [])
          .filter(i => {
            const nameMatch = i.name.toLowerCase() === decklistCard.name.toLowerCase();
            const available = (i.quantity || 0) - (i.reserved_quantity || 0);
            return nameMatch && available > 0;
          })
          .sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return (parseFloat(a.purchase_price) || 999) - (parseFloat(b.purchase_price) || 999);
          });
        
        let stillNeeded = needed;
        for (const item of matchingItems) {
          if (stillNeeded <= 0) break;
          const available = (item.quantity || 0) - (item.reserved_quantity || 0);
          const qtyToAdd = Math.min(stillNeeded, available);
          if (qtyToAdd > 0) {
            cardsToAdd.push({ ...item, quantity: qtyToAdd });
            stillNeeded -= qtyToAdd;
          }
        }
      }
      
      for (const card of cardsToAdd) {
        await moveCardSkuToDeck(card, deckId);
      }
      
      showToast(`✅ Auto-filled ${cardsToAdd.length} card(s) into deck`, TOAST_TYPES.SUCCESS);
      await loadDeckDetails(deckId, true);
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [inventory, deckDetailsCache, moveCardSkuToDeck, loadDeckDetails, showToast]);

  // Move card from one deck to another
  const moveCardBetweenDecks = useCallback(async (deckCardData, targetDeckId) => {
    try {
      const sourceDeckId = deckCardData.deck_id;
      if (sourceDeckId === targetDeckId) {
        return;
      }

      const reservationId = deckCardData.id;
      const quantity = deckCardData.quantity_reserved;
      const inventoryItemId = deckCardData.inventory_item_id;
      
      const removeResponse = await fetch(`/api/deck-instances/${sourceDeckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity: quantity })
      });
      
      if (!removeResponse.ok) {
        throw new Error('Failed to remove card from source deck');
      }
      
      const addResponse = await fetch(`/api/deck-instances/${targetDeckId}/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_item_id: inventoryItemId, quantity: quantity })
      });
      
      if (!addResponse.ok) {
        throw new Error('Failed to add card to target deck');
      }
      
      await loadDeckDetails(sourceDeckId, true);
      await loadDeckDetails(targetDeckId, true);
      await refreshDeckInstances();
      debouncedLoadInventory();
      
      showToast('Card moved to deck', TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [loadDeckDetails, refreshDeckInstances, debouncedLoadInventory, showToast]);

  // Move card from deck to folder
  const moveCardFromDeckToFolder = useCallback(async (deckCardData, targetFolder) => {
    try {
      const deckId = deckCardData.deck_id;
      const reservationId = deckCardData.id;
      const quantity = deckCardData.quantity_reserved;
      
      const removeResponse = await fetch(`/api/deck-instances/${deckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity: quantity })
      });
      
      if (!removeResponse.ok) {
        throw new Error('Failed to remove card from deck');
      }
      
      const moveResponse = await fetch(`/api/inventory/${deckCardData.inventory_item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: targetFolder })
      });
      
      if (!moveResponse.ok) {
        throw new Error('Failed to move card to folder');
      }
      
      // Show success toast after both API calls succeed
      showToast(`Moved card to ${targetFolder}`, TOAST_TYPES.SUCCESS);
      
      if (onLoadInventory) {
        await onLoadInventory();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadDeckDetails(deckId, true);
      await refreshDeckInstances();
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [onLoadInventory, loadDeckDetails, refreshDeckInstances, showToast]);

  return {
    // State
    deckInstances,
    openDecks,
    setOpenDecks,
    deckDetailsCache,
    setDeckDetailsCache,
    loadingDeckDetails,
    expandedMissingCards,
    setExpandedMissingCards,
    
    // Operations
    refreshDeckInstances,
    loadDeckDetails,
    openDeckTab,
    closeDeckTab,
    releaseDeck,
    removeCardFromDeck,
    reoptimizeDeck,
    moveCardSkuToDeck,
    autoFillSingleCard,
    autoFillMissingCards,
    moveCardBetweenDecks,
    moveCardFromDeckToFolder,
    debouncedLoadInventory
  };
}

export default useDeckReservations;
