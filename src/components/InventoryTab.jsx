import React, { useEffect, useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2, X, ChevronDown, ChevronRight, Grid3X3, List, Menu, Wand2, DollarSign } from 'lucide-react';
import { usePriceCache } from "../context/PriceCacheContext";
import { useToast, TOAST_TYPES } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { 
  CardGrid, 
  InventorySearchBar, 
  InventoryTabs, 
  DeckDetailView,
  FolderHeader 
} from './inventory';
import { SellModal } from './SellModal';
import { useInventoryState } from '../hooks/useInventoryState';
import { api } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

/**
 * InventoryTab - Main inventory management component
 * Refactored to use smaller sub-components and custom hooks for maintainability
 */
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
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  
  const [expandedFolders, setExpandedFolders] = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createdFolders, setCreatedFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', folder name, or 'deck-{id}'
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
  const [folderMetadata, setFolderMetadata] = useState({}); // Store folder descriptions and metadata
  const [editingFolderName, setEditingFolderName] = useState(null);
  const [editingFolderDesc, setEditingFolderDesc] = useState('');

  // Debounced inventory refresh to prevent excessive API calls
  const debouncedTimeoutRef = React.useRef(null);
  const debouncedLoadInventory = useCallback(() => {
    if (debouncedTimeoutRef.current) clearTimeout(debouncedTimeoutRef.current);
    debouncedTimeoutRef.current = setTimeout(() => {
      if (onLoadInventory) onLoadInventory();
    }, 300);
  }, [onLoadInventory]);

  // Centralized handlers for low inventory alerts
  const toggleAlertHandler = useCallback(async (itemId) => {
    try {
      const data = await api.post(`${API_ENDPOINTS.INVENTORY}/${itemId}/toggle-alert`);
      if (onLoadInventory) {
        onLoadInventory();
      }
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  }, [onLoadInventory]);

  const setThresholdHandler = useCallback(async (itemId, threshold) => {
    try {
      await api.post(`${API_ENDPOINTS.INVENTORY}/${itemId}/set-threshold`, { threshold });
      onLoadInventory?.();
    } catch (error) {
      console.error('Error setting threshold:', error);
    }
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

  // Load created folders from server
  const loadFolders = useCallback(async () => {
    try {
      const data = await api.get(API_ENDPOINTS.FOLDERS);
      setCreatedFolders(data.map(f => f.name));
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Add a new folder and persist to server
  const addCreatedFolder = useCallback(async (folderName) => {
    const trimmedName = folderName.trim();
    if (!trimmedName) return;
    
    if (createdFolders.includes(trimmedName)) {
      showToast('A folder with this name already exists', TOAST_TYPES.ERROR);
      return;
    }
    
    try {
      const data = await api.post(API_ENDPOINTS.FOLDERS, { name: trimmedName });
      setCreatedFolders(prev => [...prev, data.name || trimmedName]);
    } catch (error) {
      showToast(`Error creating folder: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [showToast, createdFolders]);

  // Fetch deck instances on demand (memoized)
  const refreshDeckInstances = useCallback(async () => {
    try {
      const data = await api.get(API_ENDPOINTS.DECK_INSTANCES);
      setDeckInstances(data);
    } catch (error) {
      // Silent failure
    }
  }, []);

  // Load full details of a deck instance (memoized)
  const loadDeckDetails = useCallback(async (deckId, forceRefresh = false) => {
    if (deckDetailsCache[deckId] && !forceRefresh) return; // Already cached
    setLoadingDeckDetails(true);
    try {
      const data = await api.get(`${API_ENDPOINTS.DECK_INSTANCES}/${deckId}/details`);
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
    } catch (error) {
      // Silent failure
    } finally {
      setLoadingDeckDetails(false);
    }
  }, [deckDetailsCache, deckInstances]);

  // Open a deck in a new tab (or close if already active - toggle behavior)
  const openDeckTab = (deck) => {
    if (activeTab === `deck-${deck.id}`) {
      // If this deck is already active, close it (toggle behavior like folders)
      closeDeckTab(deck.id);
    } else {
      // Otherwise, open it
      if (!openDecks.includes(deck.id)) {
        setOpenDecks([...openDecks, deck.id]);
      }
      setActiveTab(`deck-${deck.id}`);
      loadDeckDetails(deck.id);
    }
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
    const deck = deckInstances.find(d => d.id === deckId);
    const confirmed = await confirm({
      title: 'Delete Deck',
      message: `Are you sure you want to delete "${deck?.name || 'this deck'}"? Cards will be returned to Unsorted.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      await api.post(`${API_ENDPOINTS.DECK_INSTANCES}/${deckId}/release`);
      // Close the deck tab if it's open
      closeDeckTab(deckId);
      // Clear cached details for this deck
      setDeckDetailsCache(prev => {
        const updated = { ...prev };
        delete updated[deckId];
        return updated;
      });
      await refreshDeckInstances();
      showToast('Deck deleted! Cards returned to unsorted.', TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast('Error deleting deck', TOAST_TYPES.ERROR);
    }
  };

  // Remove card from deck reservation
  const removeCardFromDeck = async (deckId, reservationId, quantity = 1) => {
    try {
      await api.delete(`${API_ENDPOINTS.DECK_INSTANCES}/${deckId}/remove-card`);
      await loadDeckDetails(deckId, true); // Force refresh to get latest data
      await refreshDeckInstances();
      debouncedLoadInventory(); // Refresh main inventory to show returned cards in Unsorted
    } catch (error) {
      // Silent failure
    }
  };

  // Reoptimize deck to find cheapest cards
  const reoptimizeDeck = async (deckId) => {
    try {
      const result = await api.post(`${API_ENDPOINTS.DECK_INSTANCES}/${deckId}/reoptimize`);
      await loadDeckDetails(deckId);
      await refreshDeckInstances();
      showToast(`Deck reoptimized! ${result.reservedCount} cards reserved.`, TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast('Error reoptimizing deck', TOAST_TYPES.ERROR);
    }
  };

  // Move a single inventory item to folder (memoized)
  const moveInventoryItemToFolder = useCallback(async (itemId, targetFolder) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) {
        showToast('Item not found', TOAST_TYPES.ERROR);
        return;
      }
      
      // Show the change immediately
      showToast(`Moved ${item.quantity}x ${item.name} to ${targetFolder}`, TOAST_TYPES.SUCCESS);
      
      // Update API
      await api.put(`${API_ENDPOINTS.INVENTORY}/${itemId}`, { folder: targetFolder });
      
      // Refresh inventory to show changes
      if (onLoadInventory) {
        await onLoadInventory();
      }
    } catch (error) {
      showToast(`Error moving item: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [inventory, onLoadInventory, showToast]);

  // Move cards to folder via drag-drop (with optimistic updates) (memoized)
  const moveCardToFolder = useCallback(async (cardName, targetFolder) => {
    try {
      const cardItems = inventory.filter(item => item.name === cardName);
      if (cardItems.length === 0) {
        showToast('Card not found', TOAST_TYPES.ERROR);
        return;
      }
      
      // Show the change immediately
      showToast(`Moved "${cardName}" to ${targetFolder}`, TOAST_TYPES.SUCCESS);
      
      // Update API in the background
      for (const item of cardItems) {
        await api.put(`${API_ENDPOINTS.INVENTORY}/${item.id}`, { folder: targetFolder });
      }
      
      // Refresh inventory to show changes
      if (onLoadInventory) {
        await onLoadInventory();
      }
    } catch (error) {
      showToast(`Error moving card: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [inventory, onLoadInventory, showToast]);

  // Move card from deck to folder
  const moveCardFromDeckToFolder = async (deckCardData, targetFolder) => {
    try {
      const deckId = deckCardData.deck_id;
      const reservationId = deckCardData.id;
      const quantity = deckCardData.quantity_reserved;
      
      // Show the change immediately
      showToast(`Moved card to ${targetFolder}`, TOAST_TYPES.SUCCESS);
      
      // First remove the card from the deck (which moves it to Uncategorized)
      await api.delete(`${API_ENDPOINTS.DECK_INSTANCES}/${deckId}/remove-card`);
      
      // Then move it to the target folder
      await api.put(`${API_ENDPOINTS.INVENTORY}/${deckCardData.inventory_item_id}`, { folder: targetFolder });
      
      // Refresh both deck and inventory - ensure inventory is fully loaded
      if (onLoadInventory) {
        await onLoadInventory();
      }
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure state updates
      await loadDeckDetails(deckId, true);
      await refreshDeckInstances();
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
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
      
      // Make API call first (no optimistic update until success)
      try {
        await api.post(`${API_ENDPOINTS.DECK_INSTANCES}/${deckId}/add-card`, {
          inventory_item_id: inventoryItem.id,
          quantity: qtyToUse
        });
      } catch (addError) {
        // If not enough available, retry with 1 less quantity (accounts for cards reserved in other decks)
        if (addError.message?.includes('Not enough available') && qtyToUse > 1) {
          return moveCardSkuToDeck(inventoryItem, deckId, skipRefresh, qtyToUse - 1);
        }
        throw addError;
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
      
      // Only refresh immediately if not called from auto-fill (which does its own refresh)
      if (!skipRefresh) {
        await refreshDeckInstances();
        debouncedLoadInventory();
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    }
  };

  // Auto-fill a single card type from inventory (oldest and cheapest first)
  const autoFillSingleCard = async (decklistCard, needed, deckId) => {
    try {
      showToast(`Auto-filling ${needed}x ${decklistCard.name}...`, TOAST_TYPES.INFO);
      
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
      showToast(`✅ Added ${added} item(s) to deck`, TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    }
  };

  // Auto-fill missing cards from inventory (oldest and cheapest first)
  const autoFillMissingCards = async (deck, deckId) => {
    try {
      showToast('Auto-filling missing cards...', TOAST_TYPES.INFO);
      
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
      
      showToast(`✅ Auto-filled ${cardsToAdd.length} card(s) into deck`, TOAST_TYPES.SUCCESS);
      await loadDeckDetails(deckId, true);
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
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
      
      // Remove from source deck
      await api.delete(`${API_ENDPOINTS.DECK_INSTANCES}/${sourceDeckId}/remove-card`);
      
      // Add to target deck
      await api.post(`${API_ENDPOINTS.DECK_INSTANCES}/${targetDeckId}/add-card`, { 
        inventory_item_id: inventoryItemId, 
        quantity: quantity 
      });
      
      // Refresh both decks
      await loadDeckDetails(sourceDeckId, true);
      await loadDeckDetails(targetDeckId, true);
      await refreshDeckInstances();
      // Use debounced refresh for inventory
      debouncedLoadInventory();
      
      showToast('Card moved to deck', TOAST_TYPES.SUCCESS);
    } catch (error) {
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    }
  };

  // Initial load and refresh of deck instances
  useEffect(() => {
    refreshDeckInstances();
  }, [deckRefreshTrigger, refreshDeckInstances]);

  // Memoized data
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => (item.quantity || 0) > 0);
  }, [inventory]);

  const groupedByFolder = useMemo(() => {
    return filteredInventory.reduce((acc, item) => {
      const folder = item.folder || 'Uncategorized';
      if (!acc[folder]) acc[folder] = {};
      if (!acc[folder][item.name]) acc[folder][item.name] = [];
      acc[folder][item.name].push(item);
      return acc;
    }, {});
  }, [filteredInventory]);

  const groupedInventory = useMemo(() => {
    return filteredInventory.reduce((acc, item) => {
      if (!acc[item.name]) acc[item.name] = [];
      acc[item.name].push(item);
      return acc;
    }, {});
  }, [filteredInventory]);

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

  // Common CardGrid props
  const cardGridProps = {
    viewMode,
    expandedCards,
    setExpandedCards,
    editingId,
    editForm,
    setEditForm,
    startEditingItem,
    updateInventoryItem,
    deleteInventoryItem,
    createdFolders,
    onToggleLowInventory: toggleAlertHandler,
    onSetThreshold: setThresholdHandler
  };

  // Get current deck for deck detail view
  const currentDeckId = openDecks.find(id => `deck-${id}` === activeTab);
  const currentDeck = deckInstances.find(d => d.id === currentDeckId);
  const currentDeckDetails = deckDetailsCache[currentDeckId];

  return (
    <div className="flex gap-6 min-h-screen bg-slate-900 max-w-7xl mx-auto w-full">
      {/* Error Message Toast */}
      {successMessage && successMessage.includes('Error') && (
        <div className="fixed top-4 right-4 z-50 rounded-lg p-4 border flex items-center justify-between bg-red-900 bg-opacity-30 border-red-500 text-red-200">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="ml-4 text-current hover:opacity-70">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-8 right-8 md:hidden z-40 bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white p-4 rounded-full shadow-2xl shadow-teal-500/40 transition-all active:scale-90 min-w-14 min-h-14 flex items-center justify-center"
        title="Toggle Sidebar"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* LEFT SIDEBAR - Folders */}
      <div className={`fixed md:static left-0 w-64 flex-shrink-0 space-y-4 h-full overflow-y-auto bg-slate-900 md:bg-transparent z-30 transition-transform duration-300 md:px-0 px-4 md:pl-8 md:pt-16 pt-20 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Folder List */}
        <div className="rounded-lg p-4 border-2 border-teal-500/40 bg-gradient-to-br from-slate-800/60 to-slate-900/40 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thumb-rounded shadow-xl shadow-slate-900/50">
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
                    showToast(`Folder "${newFolderName.trim()}" created!`, TOAST_TYPES.SUCCESS);
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
                      showToast(`Folder "${newFolderName.trim()}" created!`, TOAST_TYPES.SUCCESS);
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
          
          {/* Unsorted Folder - for cards without a folder (DEFAULT TO TOP) */}
          {(() => {
            const cardsByName = groupedByFolder['Uncategorized'] || {};
            const inStockCards = Object.entries(cardsByName).filter(([cardName, items]) => {
              const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
              const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
              const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
              return matchesSearch && (totalQty - reservedQty) > 0;
            });
            const uniqueCards = inStockCards.length;
            const totalAvailableCards = inStockCards.reduce((sum, [_, items]) => {
              return sum + items.reduce((itemSum, item) => {
                const available = (item.quantity || 0) - (parseInt(item.reserved_quantity) || 0);
                return itemSum + Math.max(0, available);
              }, 0);
            }, 0);
            const isSelected = selectedFolder === 'Uncategorized';
            
            return (
              <div key="Unsorted">
                <button
                  onClick={() => {
                    if (isSelected) {
                      closeFolderTab('Uncategorized');
                    } else {
                      setSelectedFolder('Uncategorized');
                      openFolderTab('Uncategorized');
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
                    const inventoryItemId = e.dataTransfer.getData('inventoryItemId');
                    const cardName = e.dataTransfer.getData('cardName');
                    const deckCardDataStr = e.dataTransfer.getData('deckCardData');
                    if (inventoryItemId) {
                      moveInventoryItemToFolder(parseInt(inventoryItemId), 'Uncategorized');
                    } else if (deckCardDataStr) {
                      const deckCardData = JSON.parse(deckCardDataStr);
                      moveCardFromDeckToFolder(deckCardData, 'Uncategorized');
                    } else if (cardName) {
                      moveCardToFolder(cardName, 'Uncategorized');
                    }
                  }}
                  className={`w-full text-left p-3 rounded-t-lg transition-colors flex-1 ${
                    isSelected
                      ? 'bg-teal-600/40 border-l-4 border-teal-400'
                      : 'bg-slate-800 border-l-4 border-transparent hover:bg-slate-700'
                  }`}
                >
                  <div className="font-medium text-sm text-slate-100">Unsorted</div>
                  <div className="text-xs text-teal-300">{totalAvailableCards} available • {uniqueCards} unique {uniqueCards === 1 ? 'card' : 'cards'}</div>
                </button>
              </div>
            );
          })()}

          {/* Created Folders */}
          {createdFolders.map((folderName) => {
            const cardsByName = groupedByFolder[folderName] || {};
            const inStockCards = Object.entries(cardsByName).filter(([cardName, items]) => {
              const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
              const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
              const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
              return matchesSearch && (totalQty - reservedQty) > 0;
            });
            const uniqueCards = inStockCards.length;
            const totalAvailableCards = inStockCards.reduce((sum, [_, items]) => {
              return sum + items.reduce((itemSum, item) => {
                const available = (item.quantity || 0) - (parseInt(item.reserved_quantity) || 0);
                return itemSum + Math.max(0, available);
              }, 0);
            }, 0);
            const folderCost = Object.values(cardsByName).reduce((sum, items) => {
              return sum + items.reduce((s, item) => s + ((item.purchase_price || 0) * (item.quantity || 0)), 0);
            }, 0);
            const isSelected = selectedFolder === folderName;
            
            return (
              <div key={folderName}>
                <button
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
                    const inventoryItemId = e.dataTransfer.getData('inventoryItemId');
                    const cardName = e.dataTransfer.getData('cardName');
                    const deckCardDataStr = e.dataTransfer.getData('deckCardData');
                    if (inventoryItemId) {
                      moveInventoryItemToFolder(parseInt(inventoryItemId), folderName);
                    } else if (deckCardDataStr) {
                      const deckCardData = JSON.parse(deckCardDataStr);
                      moveCardFromDeckToFolder(deckCardData, folderName);
                    } else if (cardName) {
                      moveCardToFolder(cardName, folderName);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-t-lg transition-colors flex-1 ${
                    isSelected
                      ? 'bg-teal-600/40 border-l-4 border-teal-400'
                      : 'bg-slate-800 border-l-4 border-transparent hover:bg-slate-700'
                  }`}
                >
                  <div className="font-medium text-sm text-slate-100">{folderName}</div>
                  <div className="text-xs text-teal-300">{totalAvailableCards} available • {uniqueCards} unique {uniqueCards === 1 ? 'card' : 'cards'}</div>
                </button>
              </div>
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
              const uniqueCards = folderInStockCards.length;
              const totalAvailableCards = folderInStockCards.reduce((sum, [_, items]) => {
                return sum + items.reduce((itemSum, item) => {
                  const available = (item.quantity || 0) - (parseInt(item.reserved_quantity) || 0);
                  return itemSum + Math.max(0, available);
                }, 0);
              }, 0);
              const folderCost = Object.values(cardsByName).reduce((sum, items) => {
                return sum + items.reduce((s, item) => s + ((item.purchase_price || 0) * (item.quantity || 0)), 0);
              }, 0);
              const isSelected = selectedFolder === folder;
              
              return (
                <div key={folder}>
                  <button
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
                      const inventoryItemId = e.dataTransfer.getData('inventoryItemId');
                      const cardName = e.dataTransfer.getData('cardName');
                      const deckCardDataStr = e.dataTransfer.getData('deckCardData');
                      if (inventoryItemId) {
                        moveInventoryItemToFolder(parseInt(inventoryItemId), folder);
                      } else if (deckCardDataStr) {
                        const deckCardData = JSON.parse(deckCardDataStr);
                        moveCardFromDeckToFolder(deckCardData, folder);
                      } else if (cardName) {
                        moveCardToFolder(cardName, folder);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-300 border-l-4 ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-600/50 to-cyan-600/30 border-l-teal-400 shadow-md shadow-teal-500/10'
                        : 'bg-gradient-to-r from-slate-700/50 to-slate-800/50 border-l-transparent hover:from-slate-600/50 hover:to-slate-700/50 hover:shadow-md hover:shadow-slate-600/20'
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-100">{folder}</div>
                    <div className="text-xs text-teal-300">{folderInStockCards.length} {folderInStockCards.length === 1 ? 'card' : 'cards'}</div>
                  </button>
                </div>
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
                const deckCost = parseFloat(deck.total_cost) || 0;
                return (
                  <div
                    key={`deck-${deck.id}`}
                    className={`group text-left p-2.5 rounded-lg transition-all duration-200 mb-1.5 border-l-4 cursor-pointer ${
                      isDeckOpen
                        ? 'bg-gradient-to-r from-green-600/40 to-green-700/30 border-l-4 border-green-400 shadow-md shadow-green-500/10'
                        : 'bg-gradient-to-r from-slate-700 to-slate-800 border-l-4 border-transparent hover:from-slate-600 hover:to-slate-700 hover:shadow-md hover:shadow-slate-600/20'
                    }`}
                    onClick={() => openDeckTab(deck)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('bg-green-700/60', 'border-green-300');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget?.classList?.remove('bg-green-700/60', 'border-green-300');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget?.classList?.remove('bg-green-700/60', 'border-green-300');
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
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 text-left">
                        <div className="font-medium text-sm text-slate-100">{deck.name}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSellModalData({
                            itemType: 'deck',
                            itemId: deck.id,
                            itemName: deck.name,
                            purchasePrice: deckCost
                          });
                          setShowSellModal(true);
                        }}
                        className="ml-2 text-green-400 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-green-200 hover:scale-125 hover:drop-shadow-lg"
                        title="Sell this deck"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    </div>
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
                      Cost: ${deckCost.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 pb-24 md:pb-6 px-4 md:px-8 md:ml-0 pt-16">
        <InventorySearchBar
          inventorySearch={inventorySearch}
          setInventorySearch={setInventorySearch}
        />

        <InventoryTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openFolders={openFolders}
          setOpenFolders={setOpenFolders}
          openDecks={openDecks}
          deckInstances={deckInstances}
          closeDeckTab={closeDeckTab}
          viewMode={viewMode}
          setViewMode={setViewMode}
          setSidebarOpen={setSidebarOpen}
          draggedTabData={draggedTabData}
          setDraggedTabData={setDraggedTabData}
          reorderTabs={reorderTabs}
        />

        {/* Deck Details View */}
        {activeTab.startsWith('deck-') && currentDeckDetails && (
          <DeckDetailView
            deck={currentDeck}
            deckDetails={currentDeckDetails}
            viewMode={viewMode}
            inventorySearch={inventorySearch}
            expandedCards={expandedCards}
            setExpandedCards={setExpandedCards}
            expandedMissingCards={expandedMissingCards}
            setExpandedMissingCards={setExpandedMissingCards}
            openDecks={openDecks}
            activeTab={activeTab}
            removeCardFromDeck={removeCardFromDeck}
            autoFillMissingCards={autoFillMissingCards}
            autoFillSingleCard={autoFillSingleCard}
            releaseDeck={releaseDeck}
            moveCardSkuToDeck={moveCardSkuToDeck}
            setSellModalData={setSellModalData}
            setShowSellModal={setShowSellModal}
          />
        )}

        {/* Regular Inventory View */}
        {!activeTab.startsWith('deck-') && (
          <div className={viewMode === 'card' ? 'space-y-4' : 'space-y-2'}>
            {activeTab === 'all' ? (
              Object.keys(groupedInventory).length > 0 ? (
                <>
                  <CardGrid cards={inStockCards} {...cardGridProps} />
                  {inStockCards.length > 0 && outOfStockCards.length > 0 && (
                    <div className="border-t border-slate-700 pt-4">
                      <h3 className="text-sm font-semibold text-slate-400 mb-3">Out of Stock</h3>
                      <CardGrid cards={outOfStockCards} {...cardGridProps} />
                    </div>
                  )}
                  {outOfStockCards.length > 0 && inStockCards.length === 0 && (
                    <CardGrid cards={outOfStockCards} {...cardGridProps} />
                  )}
                </>
              ) : (
                <p className="text-slate-400 text-center py-12">No cards in inventory yet. Add some from the Imports tab!</p>
              )
            ) : createdFolders.includes(activeTab) || Object.keys(groupedByFolder).includes(activeTab) ? (
              (() => {
                const folderData = groupedByFolder[activeTab] || {};
                const folderCards = Object.entries(folderData).filter(([cardName, items]) => {
                  const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
                  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                  const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
                  return matchesSearch && (totalQty - reservedQty) > 0;
                });
                const availableCardsStats = Object.entries(folderData).reduce((acc, [_, items]) => {
                  const totalQty = items.reduce((s, item) => s + (item.quantity || 0), 0);
                  const reservedQty = items.reduce((s, item) => s + (parseInt(item.reserved_quantity) || 0), 0);
                  const availableQty = totalQty - reservedQty;
                  if (availableQty > 0) {
                    acc.uniqueCount++;
                    acc.totalCount += availableQty;
                    acc.totalCost += items.reduce((s, item) => s + ((item.purchase_price || 0) * (item.quantity || 0)), 0);
                  }
                  return acc;
                }, { uniqueCount: 0, totalCount: 0, totalCost: 0 });
                const folderDesc = folderMetadata[activeTab]?.description || '';
                
                return (
                  <>
                    <FolderHeader
                      folderName={activeTab}
                      folderDesc={folderDesc}
                      totalCards={availableCardsStats.totalCount}
                      uniqueCards={availableCardsStats.uniqueCount}
                      totalCost={availableCardsStats.totalCost}
                      editingFolderName={editingFolderName}
                      setEditingFolderName={setEditingFolderName}
                      editingFolderDesc={editingFolderDesc}
                      setEditingFolderDesc={setEditingFolderDesc}
                      setFolderMetadata={setFolderMetadata}
                      setSellModalData={setSellModalData}
                      setShowSellModal={setShowSellModal}
                    />
                    {folderCards.length > 0 ? (
                      <CardGrid cards={folderCards} {...cardGridProps} />
                    ) : (
                      <p className="text-slate-400 text-center py-12">No cards in this folder.</p>
                    )}
                  </>
                );
              })()
            ) : (
              <p className="text-slate-400 text-center py-12">Select a view to display cards.</p>
            )}
          </div>
        )}
      </div>

      {/* Sell Modal */}
      {sellModalData && (
        <SellModal
          isOpen={showSellModal}
          itemName={sellModalData.itemName}
          purchasePrice={sellModalData.purchasePrice}
          itemType={sellModalData.itemType}
          deckId={sellModalData.itemId}
          onClose={() => {
            setShowSellModal(false);
            setSellModalData(null);
          }}
          onSell={async (saleData) => {
            await onSell(saleData);
            setShowSellModal(false);
            setSellModalData(null);
          }}
        />
      )}
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

export default InventoryTab;
