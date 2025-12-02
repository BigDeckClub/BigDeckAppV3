import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useInventoryState - Custom hook for managing inventory state and operations
 * Extracted from InventoryTab for better code organization
 */
export function useInventoryState({
  inventory,
  setSuccessMessage,
  onLoadInventory,
  setExpandedCards
}) {
  // State management
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createdFolders, setCreatedFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deckInstances, setDeckInstances] = useState([]);
  const [openDecks, setOpenDecks] = useState([]);
  const [openFolders, setOpenFolders] = useState([]);
  const [deckDetailsCache, setDeckDetailsCache] = useState({});
  const [loadingDeckDetails, setLoadingDeckDetails] = useState(false);
  const [draggedTabData, setDraggedTabData] = useState(null);
  const [expandedMissingCards, setExpandedMissingCards] = useState({});
  const [inventorySearch, setInventorySearch] = useState('');
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellModalData, setSellModalData] = useState(null);
  const [folderMetadata, setFolderMetadata] = useState({});
  const [editingFolderName, setEditingFolderName] = useState(null);
  const [editingFolderDesc, setEditingFolderDesc] = useState('');

  // Debounced inventory refresh
  const debouncedTimeoutRef = useRef(null);
  const debouncedLoadInventory = useCallback(() => {
    if (debouncedTimeoutRef.current) clearTimeout(debouncedTimeoutRef.current);
    debouncedTimeoutRef.current = setTimeout(() => {
      if (onLoadInventory) onLoadInventory();
    }, 300);
  }, [onLoadInventory]);

  // Alert handlers
  const toggleAlertHandler = useCallback(async (itemId) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/toggle-alert`, { method: 'POST' });
      await response.json();
      if (onLoadInventory) onLoadInventory();
    } catch (error) {
      console.error('ERROR in toggleAlertHandler:', error);
    }
  }, [onLoadInventory]);

  const setThresholdHandler = useCallback(async (itemId, threshold) => {
    try {
      await fetch(`/api/inventory/${itemId}/set-threshold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold })
      });
      onLoadInventory?.();
    } catch (error) {
      console.error('Error setting threshold:', error);
    }
  }, [onLoadInventory]);

  // Tab reordering
  const reorderTabs = useCallback((sourceType, sourceIndex, destIndex) => {
    if (sourceIndex === destIndex) return;
    if (sourceType === 'folder') {
      const newFolders = [...openFolders];
      const [moved] = newFolders.splice(sourceIndex, 1);
      newFolders.splice(destIndex, 0, moved);
      setOpenFolders(newFolders);
    } else if (sourceType === 'deck') {
      const newDecks = [...openDecks];
      const [moved] = newDecks.splice(sourceIndex, 1);
      newDecks.splice(destIndex, 0, moved);
      setOpenDecks(newDecks);
    }
  }, [openFolders, openDecks]);

  // Load folders from server
  const loadFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/folders');
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

  // Fetch deck instances
  const refreshDeckInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/deck-instances');
      if (response.ok) {
        const data = await response.json();
        setDeckInstances(data);
      }
    } catch (error) {
      // Handle silently
    }
  }, []);

  // Load deck details
  const loadDeckDetails = useCallback(async (deckId, forceRefresh = false) => {
    if (deckDetailsCache[deckId] && !forceRefresh) return;
    setLoadingDeckDetails(true);
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/details`);
      if (response.ok) {
        const data = await response.json();
        setDeckDetailsCache(prev => ({ ...prev, [deckId]: data }));
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
      // Handle silently
    } finally {
      setLoadingDeckDetails(false);
    }
  }, [deckDetailsCache, deckInstances]);

  // Deck tab management
  const closeDeckTab = useCallback((deckId) => {
    const remaining = openDecks.filter(id => id !== deckId);
    setOpenDecks(remaining);
    if (activeTab === `deck-${deckId}`) {
      setActiveTab('all');
    }
  }, [openDecks, activeTab]);

  const openDeckTab = useCallback((deck) => {
    if (activeTab === `deck-${deck.id}`) {
      closeDeckTab(deck.id);
    } else {
      if (!openDecks.includes(deck.id)) {
        setOpenDecks([...openDecks, deck.id]);
      }
      setActiveTab(`deck-${deck.id}`);
      loadDeckDetails(deck.id);
    }
  }, [activeTab, openDecks, loadDeckDetails, closeDeckTab]);

  // Folder tab management
  const openFolderTab = useCallback((folderName) => {
    if (!openFolders.includes(folderName)) {
      setOpenFolders([...openFolders, folderName]);
    }
    setActiveTab(folderName);
  }, [openFolders]);

  const closeFolderTab = useCallback((folderName) => {
    const remaining = openFolders.filter(f => f !== folderName);
    setOpenFolders(remaining);
    if (activeTab === folderName) {
      setActiveTab('all');
    }
    if (selectedFolder === folderName) {
      setSelectedFolder(null);
    }
  }, [openFolders, activeTab, selectedFolder]);

  // Deck operations
  const releaseDeck = useCallback(async (deckId) => {
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/release`, { method: 'POST' });
      if (response.ok) {
        closeDeckTab(deckId);
        setDeckDetailsCache(prev => {
          const updated = { ...prev };
          delete updated[deckId];
          return updated;
        });
        await refreshDeckInstances();
        setSuccessMessage('Deck deleted! Cards returned to unsorted.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('Failed to delete deck');
      }
    } catch (error) {
      alert('Error deleting deck');
    }
  }, [closeDeckTab, refreshDeckInstances, setSuccessMessage]);

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
      // Handle silently
    }
  }, [loadDeckDetails, refreshDeckInstances, debouncedLoadInventory]);

  // Card move operations
  const moveInventoryItemToFolder = useCallback(async (itemId, targetFolder) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) {
        alert('Item not found');
        return;
      }
      setSuccessMessage(`Moved ${item.quantity}x ${item.name} to ${targetFolder}`);
      const response = await fetch(`/api/inventory/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: targetFolder })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update folder');
      }
      if (onLoadInventory) await onLoadInventory();
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
        const response = await fetch(`/api/inventory/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: targetFolder })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update folder');
        }
      }
      if (onLoadInventory) await onLoadInventory();
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
      const removeResponse = await fetch(`/api/deck-instances/${deckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity: quantity })
      });
      if (!removeResponse.ok) throw new Error('Failed to remove card from deck');
      const moveResponse = await fetch(`/api/inventory/${deckCardData.inventory_item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: targetFolder })
      });
      if (!moveResponse.ok) throw new Error('Failed to move card to folder');
      if (onLoadInventory) await onLoadInventory();
      await new Promise(resolve => setTimeout(resolve, 100));
      await loadDeckDetails(deckId, true);
      await refreshDeckInstances();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [onLoadInventory, loadDeckDetails, refreshDeckInstances, setSuccessMessage]);

  const moveCardSkuToDeck = useCallback(async (inventoryItem, deckId, skipRefresh = false, attemptQty = null) => {
    try {
      const deck = deckInstances.find(d => d.id === deckId);
      if (!deck) throw new Error('Deck not found');
      const qtyToUse = attemptQty !== null ? attemptQty : (inventoryItem.quantity || 1);
      setSuccessMessage(`Adding ${qtyToUse}x ${inventoryItem.name} to deck...`);
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
      setSuccessMessage(`Added ${qtyToUse}x ${inventoryItem.name} to deck`);
      if (!skipRefresh) {
        await refreshDeckInstances();
        debouncedLoadInventory();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [deckInstances, deckDetailsCache, refreshDeckInstances, debouncedLoadInventory, setSuccessMessage]);

  const moveCardBetweenDecks = useCallback(async (deckCardData, targetDeckId) => {
    try {
      const sourceDeckId = deckCardData.deck_id;
      if (sourceDeckId === targetDeckId) return;
      const reservationId = deckCardData.id;
      const quantity = deckCardData.quantity_reserved;
      const inventoryItemId = deckCardData.inventory_item_id;
      setSuccessMessage(`Moving card to deck...`);
      const removeResponse = await fetch(`/api/deck-instances/${sourceDeckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity: quantity })
      });
      if (!removeResponse.ok) throw new Error('Failed to remove card from source deck');
      const addResponse = await fetch(`/api/deck-instances/${targetDeckId}/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_item_id: inventoryItemId, quantity: quantity })
      });
      if (!addResponse.ok) throw new Error('Failed to add card to target deck');
      await loadDeckDetails(sourceDeckId, true);
      await loadDeckDetails(targetDeckId, true);
      await refreshDeckInstances();
      debouncedLoadInventory();
      setSuccessMessage(`Card moved to deck`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [loadDeckDetails, refreshDeckInstances, debouncedLoadInventory, setSuccessMessage]);

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
      await refreshDeckInstances();
      debouncedLoadInventory();
      await loadDeckDetails(deckId, true);
      setSuccessMessage(`✅ Added ${added} item(s) to deck`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [inventory, moveCardSkuToDeck, refreshDeckInstances, debouncedLoadInventory, loadDeckDetails, setSuccessMessage]);

  const autoFillMissingCards = useCallback(async (deck, deckId) => {
    try {
      setSuccessMessage('Auto-filling missing cards...');
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
      setSuccessMessage(`✅ Auto-filled ${cardsToAdd.length} card(s) into deck`);
      await loadDeckDetails(deckId, true);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [inventory, deckDetailsCache, moveCardSkuToDeck, loadDeckDetails, setSuccessMessage]);

  // Create folder
  const addCreatedFolder = useCallback(async (folderName) => {
    const trimmedName = folderName.trim();
    if (!createdFolders.includes(trimmedName)) {
      try {
        const response = await fetch('/api/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmedName, description: '' })
        });
        if (response.ok) {
          setCreatedFolders([...createdFolders, trimmedName]);
          setOpenFolders([...openFolders, trimmedName]);
        } else if (response.status === 409) {
          setCreatedFolders([...createdFolders, trimmedName]);
          setOpenFolders([...openFolders, trimmedName]);
        }
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    }
  }, [createdFolders, openFolders]);

  // Effects
  useEffect(() => {
    setExpandedCards({});
  }, [activeTab, selectedFolder, setExpandedCards]);

  return {
    // State
    newFolderName,
    setNewFolderName,
    showCreateFolder,
    setShowCreateFolder,
    createdFolders,
    selectedFolder,
    setSelectedFolder,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    sidebarOpen,
    setSidebarOpen,
    deckInstances,
    openDecks,
    openFolders,
    setOpenFolders,
    deckDetailsCache,
    loadingDeckDetails,
    draggedTabData,
    setDraggedTabData,
    expandedMissingCards,
    setExpandedMissingCards,
    inventorySearch,
    setInventorySearch,
    showSellModal,
    setShowSellModal,
    sellModalData,
    setSellModalData,
    folderMetadata,
    setFolderMetadata,
    editingFolderName,
    setEditingFolderName,
    editingFolderDesc,
    setEditingFolderDesc,
    
    // Handlers
    toggleAlertHandler,
    setThresholdHandler,
    reorderTabs,
    refreshDeckInstances,
    loadDeckDetails,
    openDeckTab,
    closeDeckTab,
    openFolderTab,
    closeFolderTab,
    releaseDeck,
    removeCardFromDeck,
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
