import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithAuth } from '../utils/apiClient';
import { useTabState } from './useTabState';
import { useDeckInstanceState } from './useDeckInstanceState';
import { useUIState } from './useUIState';

/**
 * useInventoryState - Custom hook for managing inventory state and operations
 * Refactored to use sub-hooks for better code organization
 */
export function useInventoryState({
  inventory,
  setSuccessMessage,
  onLoadInventory,
  setExpandedCards
}) {
  // Sub-hooks for organized state management
  const tabState = useTabState();
  const uiState = useUIState();
  const deckState = useDeckInstanceState({ onLoadInventory, setSuccessMessage });

  // Folder state (needs to sync with tabState)
  const [createdFolders, setCreatedFolders] = useState([]);

  // Load folders from server
  const loadFolders = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/folders');
      if (response.ok) {
        const data = await response.json();
        setCreatedFolders(data.map(f => f.name));
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Alert handlers
  const toggleAlertHandler = useCallback(async (itemId) => {
    try {
      const response = await fetchWithAuth(`/api/inventory/${itemId}/toggle-alert`, { method: 'POST' });
      await response.json();
      onLoadInventory?.();
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  }, [onLoadInventory]);

  const setThresholdHandler = useCallback(async (itemId, threshold) => {
    try {
      await fetchWithAuth(`/api/inventory/${itemId}/set-threshold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold })
      });
      onLoadInventory?.();
    } catch (error) {
      console.error('Error setting threshold:', error);
    }
  }, [onLoadInventory]);

  // Enhanced deck tab opener with details loading
  const openDeckTab = useCallback((deck) => {
    if (tabState.activeTab === `deck-${deck.id}`) {
      tabState.closeDeckTab(deck.id);
    } else {
      tabState.openDeckTab(deck.id);
      deckState.loadDeckDetails(deck.id);
    }
  }, [tabState, deckState]);

  // Enhanced folder tab closer with selection cleanup
  const closeFolderTab = useCallback((folderName) => {
    tabState.closeFolderTab(folderName);
    if (uiState.selectedFolder === folderName) {
      uiState.setSelectedFolder(null);
    }
  }, [tabState, uiState]);

  // Deck operations
  const releaseDeck = useCallback(async (deckId) => {
    await deckState.releaseDeck(deckId, () => tabState.closeDeckTab(deckId));
  }, [deckState, tabState]);

  // Card move operations
  const moveInventoryItemToFolder = useCallback(async (itemId, targetFolder) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) {
        alert('Item not found');
        return;
      }
      setSuccessMessage(`Moved ${item.quantity}x ${item.name} to ${targetFolder}`);
      const response = await fetchWithAuth(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: targetFolder })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update folder');
      }
      await onLoadInventory?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error moving item: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [inventory, onLoadInventory, setSuccessMessage]);

  const moveCardToFolder = useCallback(async (cardName, targetFolder) => {
    try {
      const cardItems = inventory.filter(item => item.name === cardName);
      if (cardItems.length === 0) {
        alert('Card not found');
        return;
      }
      setSuccessMessage(`Moved "${cardName}" to ${targetFolder}`);
      for (const item of cardItems) {
        const response = await fetchWithAuth(`/api/inventory/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: targetFolder })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update folder');
        }
      }
      await onLoadInventory?.();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error moving card: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [inventory, onLoadInventory, setSuccessMessage]);

  const moveCardFromDeckToFolder = useCallback(async (deckCardData, targetFolder) => {
    try {
      const deckId = deckCardData.deck_id;
      const reservationId = deckCardData.id;
      const quantity = deckCardData.quantity_reserved;
      setSuccessMessage(`Moved card to ${targetFolder}`);

      const removeResponse = await fetchWithAuth(`/api/deck-instances/${deckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity })
      });
      if (!removeResponse.ok) throw new Error('Failed to remove card from deck');

      const moveResponse = await fetchWithAuth(`/api/inventory/${deckCardData.inventory_item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: targetFolder })
      });
      if (!moveResponse.ok) throw new Error('Failed to move card to folder');

      await onLoadInventory?.();
      await new Promise(resolve => setTimeout(resolve, 100));
      await deckState.loadDeckDetails(deckId, true);
      await deckState.refreshDeckInstances();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [onLoadInventory, deckState, setSuccessMessage]);

  const moveCardSkuToDeck = useCallback(async (inventoryItem, deckId, skipRefresh = false, attemptQty = null) => {
    const deck = deckState.deckInstances.find(d => d.id === deckId);
    if (!deck) {
      setSuccessMessage('Error: Deck not found');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    const qtyToUse = attemptQty ?? (inventoryItem.quantity || 1);
    setSuccessMessage(`Adding ${qtyToUse}x ${inventoryItem.name} to deck...`);

    const result = await deckState.addCardToDeck(inventoryItem, deckId, qtyToUse);

    if (result.success) {
      setSuccessMessage(`Added ${result.quantity}x ${inventoryItem.name} to deck`);
      if (!skipRefresh) {
        await deckState.refreshDeckInstances();
        deckState.debouncedLoadInventory();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } else {
      setSuccessMessage(`Error: ${result.error}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [deckState, setSuccessMessage]);

  const moveCardBetweenDecks = useCallback(async (deckCardData, targetDeckId) => {
    try {
      const sourceDeckId = deckCardData.deck_id;
      if (sourceDeckId === targetDeckId) return;

      const reservationId = deckCardData.id;
      const quantity = deckCardData.quantity_reserved;
      const inventoryItemId = deckCardData.inventory_item_id;
      setSuccessMessage(`Moving card to deck...`);

      const removeResponse = await fetchWithAuth(`/api/deck-instances/${sourceDeckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity })
      });
      if (!removeResponse.ok) throw new Error('Failed to remove card from source deck');

      const addResponse = await fetchWithAuth(`/api/deck-instances/${targetDeckId}/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_item_id: inventoryItemId, quantity })
      });
      if (!addResponse.ok) throw new Error('Failed to add card to target deck');

      await deckState.loadDeckDetails(sourceDeckId, true);
      await deckState.loadDeckDetails(targetDeckId, true);
      await deckState.refreshDeckInstances();
      deckState.debouncedLoadInventory();
      setSuccessMessage(`Card moved to deck`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [deckState, setSuccessMessage]);

  // Auto-fill operations
  const autoFillSingleCard = useCallback(async (decklistCard, needed, deckId) => {
    try {
      setSuccessMessage(`Auto-filling ${needed}x ${decklistCard.name}...`);
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

      await deckState.refreshDeckInstances();
      deckState.debouncedLoadInventory();
      await deckState.loadDeckDetails(deckId, true);
      setSuccessMessage(`✅ Added ${added} item(s) to deck`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [inventory, moveCardSkuToDeck, deckState, setSuccessMessage]);

  const autoFillMissingCards = useCallback(async (deck, deckId) => {
    try {
      setSuccessMessage('Auto-filling missing cards...');
      const cardsToAdd = [];
      const deckDetails = deckState.deckDetailsCache[deckId];

      for (const decklistCard of (deck.cards || [])) {
        const reservedQty = (inventory || [])
          .filter(i => i.name.toLowerCase() === decklistCard.name.toLowerCase())
          .reduce((sum, i) => {
            const reserved = (deckDetails?.reservations || [])
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

      setSuccessMessage(`✅ Auto-filled ${cardsToAdd.length} card(s) into deck`);
      await deckState.loadDeckDetails(deckId, true);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [inventory, deckState, moveCardSkuToDeck, setSuccessMessage]);

  // Create folder
  const addCreatedFolder = useCallback(async (folderName) => {
    const trimmedName = folderName.trim();
    if (!createdFolders.includes(trimmedName)) {
      try {
        const response = await fetchWithAuth('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, description: '' })
        });
        if (response.ok || response.status === 409) {
          setCreatedFolders(prev => [...prev, trimmedName]);
          tabState.setOpenFolders(prev => [...prev, trimmedName]);
        }
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    }
  }, [createdFolders, tabState]);

  // Effects
  useEffect(() => {
    setExpandedCards({});
  }, [tabState.activeTab, uiState.selectedFolder, setExpandedCards]);

  // Return combined state and handlers
  return {
    // Tab state
    activeTab: tabState.activeTab,
    setActiveTab: tabState.setActiveTab,
    openDecks: tabState.openDecks,
    openFolders: tabState.openFolders,
    setOpenFolders: tabState.setOpenFolders,
    draggedTabData: tabState.draggedTabData,
    setDraggedTabData: tabState.setDraggedTabData,
    reorderTabs: tabState.reorderTabs,
    openFolderTab: tabState.openFolderTab,

    // UI state
    viewMode: uiState.viewMode,
    setViewMode: uiState.setViewMode,
    sidebarOpen: uiState.sidebarOpen,
    setSidebarOpen: uiState.setSidebarOpen,
    inventorySearch: uiState.inventorySearch,
    setInventorySearch: uiState.setInventorySearch,
    selectedFolder: uiState.selectedFolder,
    setSelectedFolder: uiState.setSelectedFolder,
    newFolderName: uiState.newFolderName,
    setNewFolderName: uiState.setNewFolderName,
    showCreateFolder: uiState.showCreateFolder,
    setShowCreateFolder: uiState.setShowCreateFolder,
    editingFolderName: uiState.editingFolderName,
    setEditingFolderName: uiState.setEditingFolderName,
    editingFolderDesc: uiState.editingFolderDesc,
    setEditingFolderDesc: uiState.setEditingFolderDesc,
    folderMetadata: uiState.folderMetadata,
    setFolderMetadata: uiState.setFolderMetadata,
    showSellModal: uiState.showSellModal,
    setShowSellModal: uiState.setShowSellModal,
    sellModalData: uiState.sellModalData,
    setSellModalData: uiState.setSellModalData,

    // Deck state
    deckInstances: deckState.deckInstances,
    deckDetailsCache: deckState.deckDetailsCache,
    loadingDeckDetails: deckState.loadingDeckDetails,
    expandedMissingCards: deckState.expandedMissingCards,
    setExpandedMissingCards: deckState.setExpandedMissingCards,
    refreshDeckInstances: deckState.refreshDeckInstances,
    loadDeckDetails: deckState.loadDeckDetails,
    removeCardFromDeck: deckState.removeCardFromDeck,

    // Folder state
    createdFolders,

    // Handlers
    toggleAlertHandler,
    setThresholdHandler,
    openDeckTab,
    closeDeckTab: tabState.closeDeckTab,
    closeFolderTab,
    releaseDeck,
    moveInventoryItemToFolder,
    moveCardToFolder,
    moveCardFromDeckToFolder,
    moveCardSkuToDeck,
    moveCardBetweenDecks,
    autoFillSingleCard,
    autoFillMissingCards,
    addCreatedFolder
  };
}

export default useInventoryState;
