import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2, X, ChevronDown, ChevronRight, Grid3X3, List, Menu, Wand2, DollarSign } from 'lucide-react';
import { usePriceCache } from "../context/PriceCacheContext";
import { CardGroup } from './inventory/CardGroup';
import { SellModal } from './SellModal';

// Simple normalize functions
const normalizeCardName = (name) => (name || "").trim();
const normalizeSetCode = (code) => (code || "").trim().toUpperCase();

export const InventoryTab = ({
  inventory,
  successMessage,
  setSuccessMessage,
  newEntry,
  setNewEntry,
  selectedCardSets,
  allSets,
  defaultSearchSet,
  setDefaultSearchSet,
  searchQuery,
  setSearchQuery,
  searchResults,
  showDropdown,
  setShowDropdown,
  selectCard,
  addCard,
  expandedCards,
  setExpandedCards,
  editingId,
  editForm,
  setEditForm,
  startEditingItem,
  updateInventoryItem,
  deleteInventoryItem,
  handleSearch,
  deckRefreshTrigger,
  onLoadInventory,
  onSell
}) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createdFolders, setCreatedFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unsorted', folder name, or 'deck-{id}'
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [deckInstances, setDeckInstances] = useState([]);
  const [openDecks, setOpenDecks] = useState([]); // Array of deck IDs that are open
  const [openFolders, setOpenFolders] = useState([]); // Array of folder names that are open as tabs
  const [deckDetailsCache, setDeckDetailsCache] = useState({}); // Cache deck details by ID
  const [loadingDeckDetails, setLoadingDeckDetails] = useState(false);
  const [draggedTabData, setDraggedTabData] = useState(null); // {type: 'folder'|'deck', name|id, index}
  const [expandedMissingCards, setExpandedMissingCards] = useState({}); // Track which decks have missing cards expanded
  const [inventorySearch, setInventorySearch] = useState(''); // Search filter for inventory
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellModalData, setSellModalData] = useState(null);

  // Debounced inventory refresh to prevent excessive API calls
  const debouncedTimeoutRef = React.useRef(null);
  const debouncedLoadInventory = useCallback(() => {
    if (debouncedTimeoutRef.current) clearTimeout(debouncedTimeoutRef.current);
    debouncedTimeoutRef.current = setTimeout(() => {
      if (onLoadInventory) onLoadInventory();
    }, 300);
  }, [onLoadInventory]);

  // Reorder tabs when drag ends
  const reorderTabs = (sourceType, sourceIndex, destIndex) => {
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
  };

  // Load created folders from localStorage
  useEffect(() => {
    const savedFolders = localStorage.getItem('createdFolders');
    if (savedFolders) {
      setCreatedFolders(JSON.parse(savedFolders));
    }
  }, []);

  // Fetch deck instances on demand (memoized)
  const refreshDeckInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/deck-instances');
      if (response.ok) {
        const data = await response.json();
        setDeckInstances(data);
      }
    } catch (error) {

    }
  }, []);

  // Load full details of a deck instance (memoized)
  const loadDeckDetails = useCallback(async (deckId, forceRefresh = false) => {
    if (deckDetailsCache[deckId] && !forceRefresh) return; // Already cached
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
      } else {
        const error = await response.json();

      }
    } catch (error) {

    } finally {
      setLoadingDeckDetails(false);
    }
  }, [deckDetailsCache, deckInstances]);

  // Open a deck in a new tab
  const openDeckTab = (deck) => {
    if (!openDecks.includes(deck.id)) {
      setOpenDecks([...openDecks, deck.id]);
    }
    setActiveTab(`deck-${deck.id}`);
    loadDeckDetails(deck.id);
  };

  // Close a deck tab
  const closeDeckTab = (deckId) => {
    const remaining = openDecks.filter(id => id !== deckId);
    setOpenDecks(remaining);
    // Switch to 'all' if this was the active tab
    if (activeTab === `deck-${deckId}`) {
      setActiveTab('all');
    }
  };

  // Open a folder in a new tab
  const openFolderTab = (folderName) => {
    if (!openFolders.includes(folderName)) {
      setOpenFolders([...openFolders, folderName]);
    }
    setActiveTab(folderName);
  };

  // Close a folder tab
  const closeFolderTab = (folderName) => {
    const remaining = openFolders.filter(f => f !== folderName);
    setOpenFolders(remaining);
    if (activeTab === folderName) {
      setActiveTab('all');
    }
    if (selectedFolder === folderName) {
      setSelectedFolder(null);
    }
  };

  // Release deck and return cards to inventory
  const releaseDeck = async (deckId) => {
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/release`, {
        method: 'POST'
      });
      if (response.ok) {
        // Close the deck tab if it's open
        closeDeckTab(deckId);
        // Clear cached details for this deck
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
  };

  // Remove card from deck reservation
  const removeCardFromDeck = async (deckId, reservationId, quantity = 1) => {
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity: quantity })
      });
      if (response.ok) {
        await loadDeckDetails(deckId, true); // Force refresh to get latest data
        await refreshDeckInstances();
      }
    } catch (error) {

    }
  };

  // Reoptimize deck to find cheapest cards
  const reoptimizeDeck = async (deckId) => {
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/reoptimize`, {
        method: 'POST'
      });
      if (response.ok) {
        const result = await response.json();
        await loadDeckDetails(deckId);
        await refreshDeckInstances();
        setSuccessMessage(`Deck reoptimized! ${result.reservedCount} cards reserved.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('Failed to reoptimize deck');
      }
    } catch (error) {

      alert('Error reoptimizing deck');
    }
  };

  // Move cards to folder via drag-drop (with optimistic updates) (memoized)
  const moveCardToFolder = useCallback(async (cardName, targetFolder) => {
    try {
      const cardItems = inventory.filter(item => item.name === cardName);
      if (cardItems.length === 0) {
        alert('Card not found');
        return;
      }
      
      // Show the change immediately
      setSuccessMessage(`Moved "${cardName}" to ${targetFolder}`);
      
      // Update API in the background
      let hasError = false;
      for (const item of cardItems) {
        const response = await fetch(`/api/inventory/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: targetFolder })
        });
        if (!response.ok) {
          hasError = true;
          const error = await response.json();

          throw new Error(error.error || 'Failed to update folder');
        }
      }
      
      // Refresh inventory to show changes
      if (onLoadInventory) {
        await onLoadInventory();
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {

      setSuccessMessage(`Error moving card: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [inventory, onLoadInventory, setSuccessMessage]);

  // Move card from deck to folder
  const moveCardFromDeckToFolder = async (deckCardData, targetFolder) => {
    try {
      const deckId = deckCardData.deck_id;
      const reservationId = deckCardData.id;
      const quantity = deckCardData.quantity_reserved;
      
      // Show the change immediately
      setSuccessMessage(`Moved card to ${targetFolder}`);
      
      // First remove the card from the deck (which moves it to Uncategorized)
      const removeResponse = await fetch(`/api/deck-instances/${deckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity: quantity })
      });
      
      if (!removeResponse.ok) {
        throw new Error('Failed to remove card from deck');
      }
      
      // Then move it to the target folder
      const moveResponse = await fetch(`/api/inventory/${deckCardData.inventory_item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: targetFolder })
      });
      
      if (!moveResponse.ok) {
        throw new Error('Failed to move card to folder');
      }
      
      // Refresh both deck and inventory - ensure inventory is fully loaded
      if (onLoadInventory) {
        await onLoadInventory();
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure state updates
      await loadDeckDetails(deckId, true);
      await refreshDeckInstances();
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {

      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  // Move individual card SKU to deck (with retry for quantity conflicts)
  const moveCardSkuToDeck = async (inventoryItem, deckId, skipRefresh = false, attemptQty = null) => {
    try {
      const deck = deckInstances.find(d => d.id === deckId);
      if (!deck) {
        throw new Error('Deck not found');
      }
      
      // Use attempted quantity if provided (for retries), otherwise use item's full quantity
      const qtyToUse = attemptQty !== null ? attemptQty : (inventoryItem.quantity || 1);
      
      // Show immediate feedback
      setSuccessMessage(`Adding ${qtyToUse}x ${inventoryItem.name} to deck...`);
      
      // Make API call first (no optimistic update until success)
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
        // If not enough available, retry with 1 less quantity (accounts for cards reserved in other decks)
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
      
      setSuccessMessage(`Added ${qtyToUse}x ${inventoryItem.name} to deck`);
      
      // Only refresh immediately if not called from auto-fill (which does its own refresh)
      if (!skipRefresh) {
        await refreshDeckInstances();
        debouncedLoadInventory();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {

      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  // Auto-fill a single card type from inventory (oldest and cheapest first)
  const autoFillSingleCard = async (decklistCard, needed, deckId) => {
    try {
      setSuccessMessage(`Auto-filling ${needed}x ${decklistCard.name}...`);
      
      // Find matching inventory items, sorted by date (oldest first) then price (cheapest first)
      const matchingItems = (inventory || [])
        .filter(i => {
          const nameMatch = i.name.toLowerCase() === decklistCard.name.toLowerCase();
          const available = (i.quantity || 0) - (i.reserved_quantity || 0);
          return nameMatch && available > 0;
        })
        .sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          if (dateA !== dateB) return dateA - dateB; // Oldest first
          return (parseFloat(a.purchase_price) || 999) - (parseFloat(b.purchase_price) || 999); // Cheapest first
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
      
      // Single refresh after all cards are added
      await refreshDeckInstances();
      debouncedLoadInventory();
      await loadDeckDetails(deckId, true);
      setSuccessMessage(`✅ Added ${added} item(s) to deck`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {

      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  // Auto-fill missing cards from inventory (oldest and cheapest first)
  const autoFillMissingCards = async (deck, deckId) => {
    try {
      setSuccessMessage('Auto-filling missing cards...');
      
      // For each card in the decklist
      const cardsToAdd = [];
      for (const decklistCard of (deck.cards || [])) {
        // Find how many are already reserved
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
        
        // Find matching inventory items, sorted by date (oldest first) then price (cheapest first)
        const matchingItems = (inventory || [])
          .filter(i => {
            const nameMatch = i.name.toLowerCase() === decklistCard.name.toLowerCase();
            const available = (i.quantity || 0) - (i.reserved_quantity || 0);
            return nameMatch && available > 0;
          })
          .sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            if (dateA !== dateB) return dateA - dateB; // Oldest first
            return (parseFloat(a.purchase_price) || 999) - (parseFloat(b.purchase_price) || 999); // Cheapest first
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
      
      // Add all cards to deck
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
  };

  // Move card from one deck to another
  const moveCardBetweenDecks = async (deckCardData, targetDeckId) => {
    try {
      const sourceDeckId = deckCardData.deck_id;
      if (sourceDeckId === targetDeckId) {
        return; // Same deck, do nothing
      }

      const reservationId = deckCardData.id;
      const quantity = deckCardData.quantity_reserved;
      const inventoryItemId = deckCardData.inventory_item_id;
      
      // Show immediate feedback
      setSuccessMessage(`Moving card to deck...`);
      
      // Remove from source deck
      const removeResponse = await fetch(`/api/deck-instances/${sourceDeckId}/remove-card`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, quantity: quantity })
      });
      
      if (!removeResponse.ok) {
        throw new Error('Failed to remove card from source deck');
      }
      
      // Add to target deck
      const addResponse = await fetch(`/api/deck-instances/${targetDeckId}/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_item_id: inventoryItemId, quantity: quantity })
      });
      
      if (!addResponse.ok) {
        throw new Error('Failed to add card to target deck');
      }
      
      // Refresh both decks
      await loadDeckDetails(sourceDeckId, true);
      await loadDeckDetails(targetDeckId, true);
      await refreshDeckInstances();
      // Use debounced refresh for inventory
      debouncedLoadInventory();
      
      setSuccessMessage(`Card moved to deck`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {

      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  // Initial load and refresh of deck instances
  useEffect(() => {
    refreshDeckInstances();
  }, [deckRefreshTrigger]);

  // Collapse all cards when switching tabs or folders
  useEffect(() => {
    setExpandedCards({});
  }, [activeTab, selectedFolder]);

  // Save created folders to localStorage
  const addCreatedFolder = (folderName) => {
    const trimmedName = folderName.trim();
    if (!createdFolders.includes(trimmedName)) {
      const updated = [...createdFolders, trimmedName];
      setCreatedFolders(updated);
      setOpenFolders([...openFolders, trimmedName]); // Add to open tabs when created
      localStorage.setItem('createdFolders', JSON.stringify(updated));
    }
  };
  
  // Group inventory by folder, then by card name (memoized)
  const groupedByFolder = useMemo(() => {
    return inventory.reduce((acc, item) => {
      const folder = item.folder || 'Uncategorized';
      if (!acc[folder]) {
        acc[folder] = {};
      }
      if (!acc[folder][item.name]) {
        acc[folder][item.name] = [];
      }
      acc[folder][item.name].push(item);
      return acc;
    }, {});
  }, [inventory]);

  
  // Legacy: group by card name for backwards compatibility (memoized)
  const groupedInventory = useMemo(() => {
    return inventory.reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = [];
      }
      acc[item.name].push(item);
      return acc;
    }, {});
  }, [inventory]);
  
  // Memoize in-stock and out-of-stock card lists with search filtering
  const { inStockCards, outOfStockCards } = useMemo(() => {
    const entries = Object.entries(groupedInventory);
    const inStock = entries.filter(([cardName, items]) => {
      const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      return matchesSearch && totalQty > 0;
    });
    const outOfStock = entries.filter(([cardName, items]) => {
      const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      return matchesSearch && totalQty === 0;
    });
    return { inStockCards: inStock, outOfStockCards: outOfStock };
  }, [groupedInventory, inventorySearch]);
  
  // Render function for deck cards using same grid structure as inventory
  const renderDeckCardGroup = ([cardName, items]) => {
    const totalQty = items.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
    
    const itemsForAvg = items;
    let avgPrice = 0;
    if (itemsForAvg.length > 0) {
      const totalPrice = itemsForAvg.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0);
      avgPrice = totalPrice / itemsForAvg.length;
    }
    
    const totalValue = totalQty * avgPrice;
    const formatTotal = (value) => {
      return value >= 100 ? value.toFixed(0) : value.toFixed(2);
    };
    
    const isExpanded = expandedCards[cardName];
    
    return (
      <div key={cardName}>
        {/* Card View */}
        {viewMode === 'card' ? (
        <div 
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            const deckId = openDecks.find(id => `deck-${id}` === activeTab);
            const deckCardData = {
              ...items[0],
              deck_id: deckId
            };
            e.dataTransfer.setData('deckCardData', JSON.stringify(deckCardData));
          }}
          className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-green-600 hover:border-green-400 rounded p-1.5 transition-colors flex flex-col h-32 md:h-36 hover:shadow-lg hover:shadow-green-500/20 cursor-grab active:cursor-grabbing" 
          onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const deckId = openDecks.find(id => `deck-${id}` === activeTab);
              items.forEach(item => removeCardFromDeck(deckId, item.id, item.quantity_reserved));
            }}
            className="close-btn absolute top-1 right-1"
            title="Remove all from deck"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="text-center px-1 cursor-pointer flex items-center justify-center gap-1 mb-1">
            <h3 className="text-[11px] md:text-sm font-bold text-slate-100 line-clamp-2 break-words flex-1">
              {cardName.split('//')[0].trim()}
            </h3>
          </div>
          
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="text-center">
              <div className="text-slate-400 text-[8px] md:text-xs font-semibold">Reserved</div>
              <div className="text-xl md:text-2xl font-bold text-green-300 leading-tight">{totalQty}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1 text-center">
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[8px] md:text-xs font-bold">Cost</div>
              <div className="font-bold text-[9px] md:text-[10px] text-blue-200">${avgPrice.toFixed(2)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[8px] md:text-xs font-bold">Total</div>
              <div className="font-bold text-[9px] md:text-[10px] text-amber-300">${formatTotal(totalValue)}</div>
            </div>
          </div>
        </div>
        ) : (
        <div>
          {/* List View */}
          <div 
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              const deckId = openDecks.find(id => `deck-${id}` === activeTab);
              const deckCardData = {
                ...items[0],
                deck_id: deckId
              };
              e.dataTransfer.setData('deckCardData', JSON.stringify(deckCardData));
            }}
            className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-green-600 hover:border-green-400 rounded p-3 transition-colors cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-green-500/20"
            onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const deckId = openDecks.find(id => `deck-${id}` === activeTab);
                items.forEach(item => removeCardFromDeck(deckId, item.id, item.quantity_reserved));
              }}
              className="close-btn absolute top-1 right-1"
              title="Remove all from deck"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 cursor-pointer">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 break-words mb-1">{cardName}</h3>
                </div>
              </div>
              <div className="flex gap-4 text-xs">
                <div><span className="text-slate-500">Reserved:</span> <span className="text-green-300 font-semibold">{totalQty}</span></div>
                <div><span className="text-slate-500">Cost/ea:</span> <span className="text-blue-300 font-semibold">${avgPrice.toFixed(2)}</span></div>
                <div><span className="text-slate-500">Total:</span> <span className="text-amber-400 font-semibold">${formatTotal(totalValue)}</span></div>
              </div>
              <div className="text-green-400 text-sm flex-shrink-0">
                {isExpanded ? '▼' : '▶'}
              </div>
            </div>
          </div>

          {isExpanded && (
            <div className="bg-slate-800 rounded-lg border border-slate-600 p-3 shadow-lg mt-2">
              <div className="flex flex-wrap gap-3">
                {Object.values(
                  items.reduce((acc, item) => {
                    const setKey = `${item.set || 'unknown'}`;
                    if (!acc[setKey]) {
                      acc[setKey] = [];
                    }
                    acc[setKey].push(item);
                    return acc;
                  }, {})
                ).map((setItems) => {
                  const firstItem = setItems[0];
                  const totalQtyInSet = setItems.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
                  const avgSetPrice = setItems.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / setItems.length;
                  
                  return (
                    <div key={`${firstItem.set}-${firstItem.id}`} className="flex-1 min-w-[160px] bg-slate-700 rounded-lg p-2 border border-slate-500">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-500">
                          <span className="text-xs font-bold text-green-300">{firstItem.set?.toUpperCase() || 'N/A'}</span>
                          <span className="text-[9px] text-slate-400 bg-slate-600 px-1 py-0.5 rounded">{setItems.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <div><span className="text-slate-400">Qty: </span><span className="text-green-300 font-bold">{totalQtyInSet}</span></div>
                          <div><span className="text-slate-400">Avg: </span><span className="text-blue-300 font-bold">${avgSetPrice.toFixed(2)}</span></div>
                        </div>
                        <div className="space-y-0.5 max-h-16 overflow-y-auto">
                          {setItems.map((item) => (
                            <div 
                              key={item.id} 
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.effectAllowed = 'move';
                                const deckId = openDecks.find(id => `deck-${id}` === activeTab);
                                const deckCardData = {
                                  ...item,
                                  deck_id: deckId
                                };
                                e.dataTransfer.setData('deckCardData', JSON.stringify(deckCardData));
                              }}
                              className="text-[9px] text-slate-300 bg-slate-600/50 rounded px-1.5 py-0.5 flex justify-between items-center group hover:bg-slate-600 transition-colors cursor-grab active:cursor-grabbing">
                              <span>{item.quantity_reserved}x @ ${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">{item.original_folder}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const deckId = openDecks.find(id => `deck-${id}` === activeTab);
                                    removeCardFromDeck(deckId, item.id);
                                  }}
                                  className="close-btn"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        )}
        {isExpanded && viewMode === 'card' && (
          <div className="bg-slate-800 rounded-lg border border-slate-600 p-3 shadow-lg mt-2">
            <div className="flex flex-wrap gap-3">
              {Object.values(
                items.reduce((acc, item) => {
                  const setKey = `${item.set || 'unknown'}`;
                  if (!acc[setKey]) {
                    acc[setKey] = [];
                  }
                  acc[setKey].push(item);
                  return acc;
                }, {})
              ).map((setItems) => {
                const firstItem = setItems[0];
                const totalQtyInSet = setItems.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
                const avgSetPrice = setItems.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / setItems.length;
                
                return (
                  <div key={`${firstItem.set}-${firstItem.id}`} className="flex-1 min-w-[160px] bg-slate-700 rounded-lg p-2 border border-slate-500">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center pb-1 border-b border-slate-500">
                        <span className="text-xs font-bold text-green-300">{firstItem.set?.toUpperCase() || 'N/A'}</span>
                        <span className="text-[9px] text-slate-400 bg-slate-600 px-1 py-0.5 rounded">{setItems.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <div><span className="text-slate-400">Qty: </span><span className="text-green-300 font-bold">{totalQtyInSet}</span></div>
                        <div><span className="text-slate-400">Avg: </span><span className="text-blue-300 font-bold">${avgSetPrice.toFixed(2)}</span></div>
                      </div>
                      <div className="space-y-0.5 max-h-16 overflow-y-auto">
                        {setItems.map((item) => (
                          <div 
                            key={item.id} 
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = 'move';
                              const deckId = openDecks.find(id => `deck-${id}` === activeTab);
                              const deckCardData = {
                                ...item,
                                deck_id: deckId
                              };
                              e.dataTransfer.setData('deckCardData', JSON.stringify(deckCardData));
                            }}
                            className="text-[9px] text-slate-300 bg-slate-600/50 rounded px-1.5 py-0.5 flex justify-between items-center group hover:bg-slate-600 transition-colors cursor-grab active:cursor-grabbing">
                            <span>{item.quantity_reserved}x @ ${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">{item.original_folder}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const deckId = openDecks.find(id => `deck-${id}` === activeTab);
                                  removeCardFromDeck(deckId, item.id, item.quantity_reserved);
                                }}
                                className="close-btn"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-6 min-h-screen bg-slate-900">
      {successMessage && successMessage.includes('Error') && (
        <div className="fixed top-4 right-4 z-50 rounded-lg p-4 border flex items-center justify-between bg-red-900 bg-opacity-30 border-red-500 text-red-200">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            className="ml-4 text-current hover:opacity-70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-6 right-6 md:hidden z-40 bg-teal-600 hover:bg-teal-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="Toggle Sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* LEFT SIDEBAR - Folders */}
      <div className={`fixed md:static left-0 w-64 flex-shrink-0 space-y-4 h-full overflow-y-auto bg-slate-900 md:bg-transparent z-30 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Folder List */}
        <div className="rounded-lg p-4 border-2 border-teal-500/50 bg-gradient-to-br from-slate-900/50 to-slate-800/50 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thumb-rounded">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-teal-300">📁 Folders</h3>
            {!showCreateFolder && (
              <button
                onClick={() => setShowCreateFolder(true)}
                className="text-teal-300 hover:text-teal-200 transition-colors"
                title="New Folder"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {showCreateFolder && (
            <div className="flex flex-col gap-2 pb-3 border-b border-slate-700">
              <input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-slate-800 border border-teal-600 rounded px-3 py-2 text-white placeholder-gray-400 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    addCreatedFolder(newFolderName);
                    setNewFolderName('');
                    setShowCreateFolder(false);
                    setSelectedFolder(newFolderName.trim());
                    setSuccessMessage(`Folder "${newFolderName.trim()}" created!`);
                    setTimeout(() => setSuccessMessage(''), 3000);
                  }
                  if (e.key === 'Escape') {
                    setNewFolderName('');
                    setShowCreateFolder(false);
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      addCreatedFolder(newFolderName);
                      setNewFolderName('');
                      setShowCreateFolder(false);
                      setSelectedFolder(newFolderName.trim());
                      setSuccessMessage(`Folder "${newFolderName.trim()}" created!`);
                      setTimeout(() => setSuccessMessage(''), 3000);
                    }
                  }}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-xs font-semibold transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setNewFolderName('');
                    setShowCreateFolder(false);
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded text-xs transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          
          {/* Created Folders */}
          {createdFolders.map((folderName) => {
            const cardsByName = groupedByFolder[folderName] || {};
            const inStockCards = Object.entries(cardsByName).filter(([cardName, items]) => {
              const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
              const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
              const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
              return matchesSearch && (totalQty - reservedQty) > 0;
            });
            const totalCards = inStockCards.length;
            const isSelected = selectedFolder === folderName;
            
            return (
              <button
                key={folderName}
                onClick={() => {
                  if (isSelected) {
                    closeFolderTab(folderName);
                  } else {
                    setSelectedFolder(folderName);
                    openFolderTab(folderName);
                  }
                  setSidebarOpen(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('bg-teal-700/60', 'border-teal-300');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-teal-700/60', 'border-teal-300');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('bg-teal-700/60', 'border-teal-300');
                  const cardName = e.dataTransfer.getData('cardName');
                  const deckCardDataStr = e.dataTransfer.getData('deckCardData');
                  if (deckCardDataStr) {
                    const deckCardData = JSON.parse(deckCardDataStr);
                    moveCardFromDeckToFolder(deckCardData, folderName);
                  } else if (cardName) {
                    moveCardToFolder(cardName, folderName);
                  }
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-teal-600/40 border-l-4 border-teal-400'
                    : 'bg-slate-800 border-l-4 border-transparent hover:bg-slate-700'
                }`}
              >
                <div className="font-medium text-sm text-slate-100">{folderName}</div>
                <div className="text-xs text-teal-300">{totalCards} {totalCards === 1 ? 'card' : 'cards'}</div>
              </button>
            );
          })}

          {/* Other Folders */}
          {Object.entries(groupedByFolder)
            .filter(([folder]) => folder !== 'Uncategorized' && !createdFolders.includes(folder))
            .map(([folder, cardsByName]) => {
              const folderInStockCards = Object.entries(cardsByName).filter(([_, items]) => {
                const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                return totalQty > 0;
              });
              const isSelected = selectedFolder === folder;
              
              return (
                <button
                  key={folder}
                  onClick={() => {
                    if (isSelected) {
                      closeFolderTab(folder);
                    } else {
                      setSelectedFolder(folder);
                      openFolderTab(folder);
                    }
                    setSidebarOpen(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-teal-700/60', 'border-teal-300');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-teal-700/60', 'border-teal-300');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('bg-teal-700/60', 'border-teal-300');
                    const cardName = e.dataTransfer.getData('cardName');
                    const deckCardDataStr = e.dataTransfer.getData('deckCardData');
                    if (deckCardDataStr) {
                      const deckCardData = JSON.parse(deckCardDataStr);
                      moveCardFromDeckToFolder(deckCardData, folder);
                    } else if (cardName) {
                      moveCardToFolder(cardName, folder);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-teal-600/40 border-l-4 border-teal-400'
                      : 'bg-slate-800 border-l-4 border-transparent hover:bg-slate-700'
                  }`}
                >
                  <div className="font-medium text-sm text-slate-100">{folder}</div>
                  <div className="text-xs text-teal-300">{folderInStockCards.length} {folderInStockCards.length === 1 ? 'card' : 'cards'}</div>
                </button>
              );
            })}

          {/* Decks Section */}
          {deckInstances.length > 0 && (
            <div className="pt-3 border-t border-slate-700 mt-3">
              <h3 className="text-sm font-semibold text-teal-300 mb-2">🎴 Decks</h3>
              {deckInstances.map((deck) => {
                const isDeckOpen = openDecks.includes(deck.id);
                const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
                // Use the higher of decklist total or reserved count (in case cards were added via drag-drop)
                const totalCards = Math.max(decklistTotal, deck.reserved_count);
                return (
                  <button
                    key={`deck-${deck.id}`}
                    onClick={() => openDeckTab(deck)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-green-700/60', 'border-green-300');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-green-700/60', 'border-green-300');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.classList.remove('bg-green-700/60', 'border-green-300');
                      try {
                        const deckCardDataStr = e.dataTransfer.getData('deckCardData');
                        const skuDataStr = e.dataTransfer.getData('skuData');
                        
                        if (deckCardDataStr) {
                          const deckCardData = JSON.parse(deckCardDataStr);
                          moveCardBetweenDecks(deckCardData, deck.id);
                        } else if (skuDataStr) {
                          const skuData = JSON.parse(skuDataStr);
                          moveCardSkuToDeck(skuData, deck.id);
                        }
                      } catch (err) {

                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors mb-2 ${
                      isDeckOpen
                        ? 'bg-green-600/40 border-l-4 border-green-400'
                        : 'bg-slate-800 border-l-4 border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-100">{deck.name}</div>
                    <div className="text-xs flex flex-wrap gap-1">
                      {(() => {
                        const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
                        const reserved = deck.reserved_count;
                        const missing = Math.max(0, decklistTotal - reserved);
                        const extras = Math.max(0, reserved - decklistTotal);
                        
                        if (missing > 0) {
                          return (
                            <>
                              <span className="text-green-300">{reserved} reserved</span>
                              <span className="text-red-400">{missing} missing</span>
                            </>
                          );
                        } else {
                          const displayReserved = decklistTotal > 0 ? decklistTotal : reserved;
                          return (
                            <>
                              <span className="text-green-300">{displayReserved} reserved</span>
                              {extras > 0 && <span className="text-purple-400">+{extras} extra</span>}
                            </>
                          );
                        }
                      })()}
                    </div>
                    <div className="text-xs text-amber-300 mt-1">
                      Cost: ${(parseFloat(deck.total_cost) || 0).toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* RIGHT CONTENT - Cards or Deck Details */}
      <div className="flex-1 pb-24 md:pb-6 px-4 md:px-6">
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search inventory by card name..."
            value={inventorySearch}
            onChange={(e) => setInventorySearch(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-colors"
          />
        </div>

        {/* Tabs and View Mode */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 border-b border-slate-700 pb-4 items-start md:items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto flex-wrap">
            <button
              onClick={() => { setActiveTab('all'); setSidebarOpen(false); }}
              className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'text-teal-300 border-b-2 border-teal-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              All Cards
            </button>
            <button
              onClick={() => { setActiveTab('unsorted'); setSidebarOpen(false); }}
              className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors whitespace-nowrap ${
                activeTab === 'unsorted'
                  ? 'text-teal-300 border-b-2 border-teal-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Unsorted
            </button>
            
            {/* Folder Tabs */}
            {openFolders.map((folderName, index) => (
              <div 
                key={`folder-tab-${folderName}`}
                className="flex items-center group"
                draggable
                onDragStart={(e) => {
                  setDraggedTabData({type: 'folder', index});
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedTabData?.type === 'folder') {
                    e.currentTarget.classList.add('opacity-50');
                  }
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('opacity-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('opacity-50');
                  if (draggedTabData?.type === 'folder') {
                    reorderTabs('folder', draggedTabData.index, index);
                    setDraggedTabData(null);
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab(folderName)}
                  className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors whitespace-nowrap cursor-grab active:cursor-grabbing ${
                    activeTab === folderName
                      ? 'text-teal-300 border-b-2 border-teal-400'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  📁 {folderName}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const remaining = openFolders.filter(f => f !== folderName);
                    setOpenFolders(remaining);
                    if (activeTab === folderName) {
                      setActiveTab('all');
                    }
                  }}
                  className="ml-1 close-btn fade-in-btn"
                  title="Close folder"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Deck Tabs */}
            {openDecks.map((deckId, index) => {
              const deck = deckInstances.find(d => d.id === deckId);
              if (!deck) return null;
              return (
                <div 
                  key={`deck-tab-${deckId}`} 
                  className="flex items-center"
                  draggable
                  onDragStart={(e) => {
                    setDraggedTabData({type: 'deck', index});
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedTabData?.type === 'deck') {
                      e.currentTarget.classList.add('opacity-50');
                    }
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('opacity-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('opacity-50');
                    if (draggedTabData?.type === 'deck') {
                      reorderTabs('deck', draggedTabData.index, index);
                      setDraggedTabData(null);
                    }
                  }}
                >
                  <button
                    onClick={() => setActiveTab(`deck-${deckId}`)}
                    className={`px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors whitespace-nowrap cursor-grab active:cursor-grabbing ${
                      activeTab === `deck-${deckId}`
                        ? 'text-green-300 border-b-2 border-green-400'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {deck.name}
                  </button>
                  <button
                    onClick={() => closeDeckTab(deckId)}
                    className="ml-1 close-btn"
                    title="Close deck"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'card'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300'
              }`}
              title="Card View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Deck Details View */}
        {activeTab.startsWith('deck-') && deckDetailsCache[openDecks.find(id => `deck-${id}` === activeTab)] && (
          <div className="space-y-4">
            {(() => {
              const deckId = openDecks.find(id => `deck-${id}` === activeTab);
              const deck = deckInstances.find(d => d.id === deckId);
              const deckDetails = deckDetailsCache[deckId];
              if (!deck || !deckDetails) return null;

              // Calculate actual missing cards based on decklist
              const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
              const actualMissingCount = Math.max(0, decklistTotal - (deckDetails.reservedCount || 0));

              // Group reservations by card name for grid view
              const groupedReservations = (deckDetails.reservations || []).reduce((acc, res) => {
                const cardName = res.name;
                if (!acc[cardName]) {
                  acc[cardName] = [];
                }
                acc[cardName].push(res);
                return acc;
              }, {});
              const reservationEntries = Object.entries(groupedReservations).filter(([cardName]) => 
                inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase())
              );

              return (
                <div 
                  className="space-y-4"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('opacity-50');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('opacity-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('opacity-50');
                    try {
                      const skuData = JSON.parse(e.dataTransfer.getData('skuData'));
                      moveCardSkuToDeck(skuData, deckId);
                    } catch (err) {

                    }
                  }}
                >
                  {/* Deck Header */}
                  <div className="bg-slate-800 rounded-lg border border-slate-600 p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-green-300">{deck.name}</h2>
                        <p className="text-sm text-slate-400">{deck.format}</p>
                        {deckDetails.originalDecklist && (
                          <p className="text-sm text-cyan-400 mt-1">
                            From: <span className="font-semibold">{deckDetails.originalDecklist.name}</span> ({deckDetails.originalDecklist.cardCount} cards)
                          </p>
                        )}
                        {deckDetails.totalCost > 0 && (
                          <p className="text-sm text-green-400 font-semibold mt-1">Total Cost: ${deckDetails.totalCost?.toFixed(2) || '0.00'}</p>
                        )}
                        <p className="text-sm text-slate-400 mt-1">
                          {deckDetails.reservedCount} reserved
                          {deckDetails.extraCount > 0 && <span className="text-blue-400">, +{deckDetails.extraCount} extra</span>}
                          {deckDetails.missingCount > 0 && <span className="text-yellow-400"> {deckDetails.missingCount} missing</span>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => autoFillMissingCards(deck, deck.id)}
                          className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded transition-colors flex items-center"
                          title="Auto-fill missing cards from inventory (oldest & cheapest first)"
                        >
                          <Wand2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSellModalData({
                              itemType: 'deck',
                              itemId: deck.id,
                              itemName: deck.name,
                              purchasePrice: parseFloat(deckDetails.totalCost) || 0
                            });
                            setShowSellModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-500 text-white p-2 rounded transition-colors flex items-center"
                          title="Sell deck and track profit"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => releaseDeck(deck.id)}
                          className="close-btn p-2"
                          title="Delete deck and return cards to unsorted"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reserved Cards Grid */}
                  {reservationEntries.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-green-400 mb-3">✅ Reserved Cards ({deckDetails.reservedCount})</h3>
                      {viewMode === 'card' ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                          {reservationEntries.map(renderDeckCardGroup)}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {reservationEntries.map(renderDeckCardGroup)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Missing Cards */}
                  {actualMissingCount > 0 && (
                    <div>
                      <button
                        onClick={() => setExpandedMissingCards(prev => ({
                          ...prev,
                          [deckId]: !prev[deckId]
                        }))}
                        className="w-full flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <h3 className="text-lg font-semibold text-yellow-400">❌ Missing Cards ({actualMissingCount})</h3>
                        <ChevronDown className={`w-5 h-5 text-yellow-400 transition-transform ${expandedMissingCards[deckId] ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedMissingCards[deckId] && (
                        <div className="bg-slate-900 rounded-b-lg p-3 space-y-2 max-h-48 overflow-y-auto mt-2">
                          <div className="text-sm text-slate-300 p-2">
                            <div className="mb-2 font-semibold text-teal-300">Cards needed to complete this deck:</div>
                            {(deck.cards || []).map((card, idx) => {
                              // Find how many of this card are reserved
                              const reservedQty = (deckDetails.reservations || [])
                                .filter(r => r.name.toLowerCase() === card.name.toLowerCase())
                                .reduce((sum, r) => sum + parseInt(r.quantity_reserved || 0), 0);
                              const needed = Math.max(0, (card.quantity || 1) - reservedQty);
                              if (needed === 0) return null;
                              const matchesSearch = inventorySearch === '' || card.name.toLowerCase().includes(inventorySearch.toLowerCase());
                              if (!matchesSearch) return null;
                              return (
                                <div key={idx} className="flex justify-between items-center text-sm bg-slate-800 p-2 rounded mb-1">
                                  <div className="flex-1">
                                    <span className="text-white">{needed}x {card.name}</span>
                                    <span className="text-xs text-slate-500 ml-2">{card.set || 'Unknown'}</span>
                                  </div>
                                  <button
                                    onClick={() => autoFillSingleCard(card, needed, deck.id)}
                                    className="bg-teal-600 hover:bg-teal-500 text-white p-1 rounded transition-colors flex items-center ml-2"
                                    title="Auto-fill this card from inventory"
                                  >
                                    <Wand2 className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            }).filter(Boolean)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Regular Inventory View */}
        {!activeTab.startsWith('deck-') && (
          <div className={viewMode === 'card' ? 'space-y-4' : 'space-y-2'}>
          {activeTab === 'all' ? (
            /* Show all cards - masterlist */
            Object.keys(groupedInventory).length > 0 ? (
              <>
                {viewMode === 'card' ? (
                  <>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                      {inStockCards.map(([cardName, items]) => (
                        <CardGroup
                          key={cardName}
                          cardName={cardName}
                          items={items}
                          viewMode={viewMode}
                          expandedCards={expandedCards}
                          setExpandedCards={setExpandedCards}
                          editingId={editingId}
                          editForm={editForm}
                          setEditForm={setEditForm}
                          startEditingItem={startEditingItem}
                          updateInventoryItem={updateInventoryItem}
                          deleteInventoryItem={deleteInventoryItem}
                          createdFolders={createdFolders}
                        />
                      ))}
                    </div>
                    {inStockCards.length > 0 && outOfStockCards.length > 0 && (
                      <div className="border-t border-slate-700 pt-4">
                        <h3 className="text-sm font-semibold text-slate-400 mb-3">Out of Stock</h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                          {outOfStockCards.map(([cardName, items]) => (
                            <CardGroup
                              key={cardName}
                              cardName={cardName}
                              items={items}
                              viewMode={viewMode}
                              expandedCards={expandedCards}
                              setExpandedCards={setExpandedCards}
                              editingId={editingId}
                              editForm={editForm}
                              setEditForm={setEditForm}
                              startEditingItem={startEditingItem}
                              updateInventoryItem={updateInventoryItem}
                              deleteInventoryItem={deleteInventoryItem}
                              createdFolders={createdFolders}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {outOfStockCards.length > 0 && inStockCards.length === 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                        {outOfStockCards.map(([cardName, items]) => (
                          <CardGroup
                            key={cardName}
                            cardName={cardName}
                            items={items}
                            viewMode={viewMode}
                            expandedCards={expandedCards}
                            setExpandedCards={setExpandedCards}
                            editingId={editingId}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            startEditingItem={startEditingItem}
                            updateInventoryItem={updateInventoryItem}
                            deleteInventoryItem={deleteInventoryItem}
                            createdFolders={createdFolders}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      {inStockCards.map(([cardName, items]) => (
                        <CardGroup
                          key={cardName}
                          cardName={cardName}
                          items={items}
                          viewMode={viewMode}
                          expandedCards={expandedCards}
                          setExpandedCards={setExpandedCards}
                          editingId={editingId}
                          editForm={editForm}
                          setEditForm={setEditForm}
                          startEditingItem={startEditingItem}
                          updateInventoryItem={updateInventoryItem}
                          deleteInventoryItem={deleteInventoryItem}
                          createdFolders={createdFolders}
                        />
                      ))}
                    </div>
                    {inStockCards.length > 0 && outOfStockCards.length > 0 && (
                      <div className="border-t border-slate-700 pt-4">
                        <h3 className="text-sm font-semibold text-slate-400 mb-2">Out of Stock</h3>
                        <div className="space-y-2">
                          {outOfStockCards.map(([cardName, items]) => (
                            <CardGroup
                              key={cardName}
                              cardName={cardName}
                              items={items}
                              viewMode={viewMode}
                              expandedCards={expandedCards}
                              setExpandedCards={setExpandedCards}
                              editingId={editingId}
                              editForm={editForm}
                              setEditForm={setEditForm}
                              startEditingItem={startEditingItem}
                              updateInventoryItem={updateInventoryItem}
                              deleteInventoryItem={deleteInventoryItem}
                              createdFolders={createdFolders}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {outOfStockCards.length > 0 && inStockCards.length === 0 && (
                      <div className="space-y-2">
                        {outOfStockCards.map(([cardName, items]) => (
                          <CardGroup
                            key={cardName}
                            cardName={cardName}
                            items={items}
                            viewMode={viewMode}
                            expandedCards={expandedCards}
                            setExpandedCards={setExpandedCards}
                            editingId={editingId}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            startEditingItem={startEditingItem}
                            updateInventoryItem={updateInventoryItem}
                            deleteInventoryItem={deleteInventoryItem}
                            createdFolders={createdFolders}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-slate-400 text-center py-12">No cards in inventory yet. Add some from the Imports tab!</p>
            )
          ) : activeTab === 'unsorted' ? (
            /* Show unsorted cards */
            groupedByFolder['Uncategorized'] && Object.keys(groupedByFolder['Uncategorized']).length > 0 ? (
              viewMode === 'card' ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                  {Object.entries(groupedByFolder['Uncategorized']).filter(([cardName]) => inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase())).map(([cardName, items]) => (
                    <CardGroup
                      key={cardName}
                      cardName={cardName}
                      items={items}
                      viewMode={viewMode}
                      expandedCards={expandedCards}
                      setExpandedCards={setExpandedCards}
                      editingId={editingId}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      startEditingItem={startEditingItem}
                      updateInventoryItem={updateInventoryItem}
                      deleteInventoryItem={deleteInventoryItem}
                      createdFolders={createdFolders}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedByFolder['Uncategorized']).filter(([cardName]) => inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase())).map(([cardName, items]) => (
                    <CardGroup
                      key={cardName}
                      cardName={cardName}
                      items={items}
                      viewMode={viewMode}
                      expandedCards={expandedCards}
                      setExpandedCards={setExpandedCards}
                      editingId={editingId}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      startEditingItem={startEditingItem}
                      updateInventoryItem={updateInventoryItem}
                      deleteInventoryItem={deleteInventoryItem}
                      createdFolders={createdFolders}
                    />
                  ))}
                </div>
              )
            ) : (
              <p className="text-slate-400 text-center py-12">No unsorted cards.</p>
            )
          ) : groupedByFolder[activeTab] ? (
            /* Show folder's cards - only include in-stock cards */
            (() => {
              const folderCards = Object.entries(groupedByFolder[activeTab]).filter(([cardName, items]) => {
                const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
                const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
                return matchesSearch && (totalQty - reservedQty) > 0;
              });
              return folderCards.length > 0 ? (
                viewMode === 'card' ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                    {folderCards.map(([cardName, items]) => (
                      <CardGroup
                        key={cardName}
                        cardName={cardName}
                        items={items}
                        viewMode={viewMode}
                        expandedCards={expandedCards}
                        setExpandedCards={setExpandedCards}
                        editingId={editingId}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        startEditingItem={startEditingItem}
                        updateInventoryItem={updateInventoryItem}
                        deleteInventoryItem={deleteInventoryItem}
                        createdFolders={createdFolders}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {folderCards.map(([cardName, items]) => (
                      <CardGroup
                        key={cardName}
                        cardName={cardName}
                        items={items}
                        viewMode={viewMode}
                        expandedCards={expandedCards}
                        setExpandedCards={setExpandedCards}
                        editingId={editingId}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        startEditingItem={startEditingItem}
                        updateInventoryItem={updateInventoryItem}
                        deleteInventoryItem={deleteInventoryItem}
                        createdFolders={createdFolders}
                      />
                    ))}
                  </div>
                )
              ) : (
                <p className="text-slate-400 text-center py-12">No cards in this folder.</p>
              );
            })()
          ) : (
            <p className="text-slate-400 text-center py-12">Select a view to display cards.</p>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

InventoryTab.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    set: PropTypes.string,
    quantity: PropTypes.number,
    purchaseDate: PropTypes.string,
    purchasePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    reorderType: PropTypes.string,
  })).isRequired,
  successMessage: PropTypes.string,
  setSuccessMessage: PropTypes.func.isRequired,
  newEntry: PropTypes.object.isRequired,
  setNewEntry: PropTypes.func.isRequired,
  selectedCardSets: PropTypes.array.isRequired,
  allSets: PropTypes.array.isRequired,
  defaultSearchSet: PropTypes.string,
  setDefaultSearchSet: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  setSearchQuery: PropTypes.func.isRequired,
  searchResults: PropTypes.array.isRequired,
  showDropdown: PropTypes.bool.isRequired,
  setShowDropdown: PropTypes.func.isRequired,
  selectCard: PropTypes.func.isRequired,
  addCard: PropTypes.func.isRequired,
  expandedCards: PropTypes.object.isRequired,
  setExpandedCards: PropTypes.func.isRequired,
  editingId: PropTypes.string,
  editForm: PropTypes.object.isRequired,
  setEditForm: PropTypes.func.isRequired,
  startEditingItem: PropTypes.func.isRequired,
  updateInventoryItem: PropTypes.func.isRequired,
  deleteInventoryItem: PropTypes.func.isRequired,
  handleSearch: PropTypes.func.isRequired,
};
