import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2, X, ChevronDown, ChevronRight, Grid3X3, List, Menu } from 'lucide-react';
import { usePriceCache } from "../context/PriceCacheContext";

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
  onLoadInventory
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

  // Fetch deck instances on demand
  const refreshDeckInstances = async () => {
    try {
      const response = await fetch('/api/deck-instances');
      if (response.ok) {
        const data = await response.json();
        setDeckInstances(data);
      }
    } catch (error) {
      console.error('Failed to fetch deck instances:', error);
    }
  };

  // Load full details of a deck instance
  const loadDeckDetails = async (deckId, forceRefresh = false) => {
    if (deckDetailsCache[deckId] && !forceRefresh) return; // Already cached
    setLoadingDeckDetails(true);
    try {
      const response = await fetch(`/api/deck-instances/${deckId}/details`);
      if (response.ok) {
        const data = await response.json();
        setDeckDetailsCache(prev => ({ ...prev, [deckId]: data }));
      } else {
        const error = await response.json();
        console.error('Error loading deck details:', error);
      }
    } catch (error) {
      console.error('Failed to load deck details:', error);
    } finally {
      setLoadingDeckDetails(false);
    }
  };

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
        setSelectedDeck(null);
        setDeckDetails(null);
        await refreshDeckInstances();
        setSuccessMessage('Deck deleted! Cards returned to unsorted.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('Failed to delete deck');
      }
    } catch (error) {
      console.error('Failed to delete deck:', error);
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
      console.error('Failed to remove card from deck:', error);
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
      console.error('Failed to reoptimize deck:', error);
      alert('Error reoptimizing deck');
    }
  };

  // Move cards to folder via drag-drop (with optimistic updates)
  const moveCardToFolder = async (cardName, targetFolder) => {
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
          console.error('API error:', error);
          throw new Error(error.error || 'Failed to update folder');
        }
      }
      
      // Refresh inventory to show changes
      if (onLoadInventory) {
        await onLoadInventory();
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to move card:', error);
      setSuccessMessage(`Error moving card: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

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
      console.error('Failed to move card from deck to folder:', error);
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  // Move individual card SKU to deck (with optimistic updates)
  const moveCardSkuToDeck = async (inventoryItem, deckId) => {
    try {
      const deck = deckInstances.find(d => d.id === deckId);
      if (!deck) {
        throw new Error('Deck not found');
      }
      
      // Optimistic update: update deck details cache immediately
      const optimisticReservation = {
        name: inventoryItem.name,
        set: inventoryItem.set,
        quantity_reserved: inventoryItem.quantity,
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
            totalCost: (prev[deckId].totalCost || 0) + (inventoryItem.purchase_price * inventoryItem.quantity || 0)
          }
        }));
      }
      
      // Update deck instances with optimistic count
      const updatedDeckInstances = deckInstances.map(d => 
        d.id === deckId 
          ? { ...d, reserved_count: (d.reserved_count || 0) + 1 }
          : d
      );
      
      // Show immediate feedback
      setSuccessMessage(`Added ${inventoryItem.quantity}x ${inventoryItem.name} to deck`);
      
      // Update API in the background
      const response = await fetch(`/api/deck-instances/${deckId}/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_item_id: inventoryItem.id,
          quantity: inventoryItem.quantity
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add card to deck');
      }
      
      // Refresh deck instances to sync with backend
      await refreshDeckInstances();
      // Refresh inventory to show updated available quantities
      if (onLoadInventory) {
        await onLoadInventory();
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to add card to deck:', error);
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
      if (onLoadInventory) {
        await onLoadInventory();
      }
      
      setSuccessMessage(`Card moved to deck`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to move card between decks:', error);
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
  
  // Group inventory by folder, then by card name
  const groupedByFolder = inventory.reduce((acc, item) => {
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

  
  // Legacy: group by card name for backwards compatibility
  const groupedInventory = inventory.reduce((acc, item) => {
    if (!acc[item.name]) {
      acc[item.name] = [];
    }
    acc[item.name].push(item);
    return acc;
  }, {});
  
  const inStockCards = Object.entries(groupedInventory).filter(([_, items]) => {
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return totalQty > 0;
  });
  
  const outOfStockCards = Object.entries(groupedInventory).filter(([_, items]) => {
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    return totalQty === 0;
  });
  
  const renderCardGroup = ([cardName, items]) => {
    const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
    const available = totalQty - reservedQty;
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const recentItems = items.filter(item => new Date(item.purchase_date) >= sixtyDaysAgo);
    const itemsForAvg = recentItems.length > 0 ? recentItems : items;
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
            e.dataTransfer.setData('cardName', cardName);
            // Also set skuData for deck drops (use first item as representative)
            if (items.length > 0) {
              e.dataTransfer.setData('skuData', JSON.stringify(items[0]));
            }
          }}
          className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 rounded p-1.5 transition-colors flex flex-col h-32 md:h-36 hover:shadow-lg hover:shadow-teal-500/20 cursor-grab active:cursor-grabbing" 
          onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              items.forEach(item => deleteInventoryItem(item.id));
            }}
            className="close-btn absolute top-1 right-1"
            title="Delete all copies"
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
              <div className="text-slate-400 text-[8px] md:text-xs font-semibold">Available</div>
              <div className="text-2xl md:text-3xl font-bold text-green-300 leading-tight">{available}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1 text-center">
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[8px] md:text-xs font-bold">Qty</div>
              <div className={`font-bold text-[10px] md:text-xs ${totalQty === 0 ? 'text-slate-400' : 'text-teal-200'}`}>{totalQty}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[8px] md:text-xs font-bold">Cost</div>
              <div className="font-bold text-[10px] md:text-xs text-blue-200">${avgPrice.toFixed(2)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[8px] md:text-xs font-bold">Total</div>
              <div className="font-bold text-[10px] md:text-xs text-amber-300">${formatTotal(totalValue)}</div>
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
              e.dataTransfer.setData('cardName', cardName);
              if (items.length > 0) {
                e.dataTransfer.setData('skuData', JSON.stringify(items[0]));
              }
            }}
            className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 rounded p-3 transition-colors cursor-grab active:cursor-grabbing hover:shadow-lg hover:shadow-teal-500/20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                items.forEach(item => deleteInventoryItem(item.id));
              }}
              className="close-btn absolute top-1 right-1"
              title="Delete all copies"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 break-words mb-1">{cardName}</h3>
                </div>
                  <div className="flex gap-4 text-xs">
                    <div><span className="text-slate-500">Qty:</span> <span className={`${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'} font-semibold`}>{totalQty}</span></div>
                    <div><span className="text-slate-500">Available:</span> <span className="text-green-300 font-semibold">{available}</span></div>
                    <div><span className="text-slate-500">Cost/ea:</span> <span className="text-blue-300 font-semibold">${avgPrice.toFixed(2)}</span></div>
                    <div><span className="text-slate-500">Total:</span> <span className="text-amber-400 font-semibold">${formatTotal(totalValue)}</span></div>
                  </div>
              </div>
              <div className="text-teal-400 text-sm flex-shrink-0 cursor-pointer" onClick={() => setExpandedCards(isExpanded ? {} : {[cardName]: true})}>
                {isExpanded ? '▼' : '▶'}
              </div>
            </div>
          </div>

          {isExpanded && (
            <div className="bg-slate-800 rounded-lg border border-slate-600 p-3 shadow-lg mt-2">
              <div className="flex flex-wrap gap-3">
                {Object.values(
                  items.reduce((acc, item) => {
                    const setKey = `${item.set || 'unknown'}-${item.set_name || 'unknown'}`;
                    if (!acc[setKey]) {
                      acc[setKey] = [];
                    }
                    acc[setKey].push(item);
                    return acc;
                  }, {})
                ).map((setItems) => {
                  const firstItem = setItems[0];
                  const totalQtyInSet = setItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                  const avgPrice = setItems.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / setItems.length;
                  const isEditing = editingId === firstItem.id;
                  
                  return (
                    <div key={`${firstItem.set}-${firstItem.id}`} className="flex-1 min-w-[160px] bg-slate-700 rounded-lg p-2 border border-slate-500">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <div className="text-xs font-bold text-teal-300 mb-1">{firstItem.set?.toUpperCase() || 'N/A'}</div>
                          <div className="space-y-1">
                            <select value={editForm.folder || 'Uncategorized'} onChange={(e) => setEditForm({...editForm, folder: e.target.value})} className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs">
                              <option value="Uncategorized">Uncategorized</option>
                              {createdFolders.map(folder => (
                                <option key={folder} value={folder}>{folder}</option>
                              ))}
                            </select>
                            <div className="flex gap-1">
                              <input type="number" min="1" placeholder="Qty" value={editForm.quantity} onChange={(e) => setEditForm({...editForm, quantity: e.target.value})} className="w-1/2 bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
                              <input type="number" step="0.01" placeholder="$" value={editForm.purchase_price} onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})} className="w-1/2 bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
                            </div>
                            <input type="date" value={editForm.purchase_date} onChange={(e) => setEditForm({...editForm, purchase_date: e.target.value})} className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
                          </div>
                          <div className="flex gap-1 mt-1">
                            <button onClick={() => updateInventoryItem(firstItem.id)} className="flex-1 bg-green-600 hover:bg-green-700 rounded px-2 py-0.5 text-xs font-semibold">Save</button>
                            <button onClick={() => setEditForm({})} className="flex-1 bg-slate-500 hover:bg-slate-400 rounded px-2 py-0.5 text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center pb-1 border-b border-slate-500">
                            <span className="text-xs font-bold text-teal-300">{firstItem.set?.toUpperCase() || 'N/A'}</span>
                            <span className="text-[9px] text-slate-400 bg-slate-600 px-1 py-0.5 rounded">{setItems.length}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <div><span className="text-slate-400">Qty: </span><span className="text-teal-300 font-bold">{totalQtyInSet}</span></div>
                            <div><span className="text-slate-400">Avg: </span><span className="text-green-300 font-bold">${avgPrice.toFixed(2)}</span></div>
                          </div>
                          {setItems.length > 1 && (
                            <div className="space-y-0.5 max-h-16 overflow-y-auto">
                              {setItems.map((item) => (
                                <div 
                                  key={item.id} 
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('skuData', JSON.stringify(item));
                                  }}
                                  className="text-[9px] text-slate-300 bg-slate-600/50 rounded px-1.5 py-0.5 flex justify-between items-center cursor-grab active:cursor-grabbing hover:bg-slate-600 group"
                                  title="Drag to a deck tab to add"
                                >
                                  <span>{item.quantity}x @ ${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-slate-400">{new Date(item.purchase_date).toLocaleDateString()}</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteInventoryItem(item.id);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-0.5"
                                      title="Delete card - moves to unsorted"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditingItem(firstItem); }}
                            className="w-full text-[9px] text-teal-400 hover:text-teal-300 hover:bg-slate-600 py-0.5 rounded border border-slate-500"
                          >
                            Edit
                          </button>
                        </div>
                      )}
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
                  const setKey = `${item.set || 'unknown'}-${item.set_name || 'unknown'}`;
                  if (!acc[setKey]) {
                    acc[setKey] = [];
                  }
                  acc[setKey].push(item);
                  return acc;
                }, {})
              ).map((setItems) => {
                const firstItem = setItems[0];
                const totalQtyInSet = setItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const avgPrice = setItems.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / setItems.length;
                const isEditing = editingId === firstItem.id;
                
                return (
                  <div key={`${firstItem.set}-${firstItem.id}`} className="flex-1 min-w-[160px] bg-slate-700 rounded-lg p-2 border border-slate-500">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-teal-300 mb-1">{firstItem.set?.toUpperCase() || 'N/A'}</div>
                        <div className="space-y-1">
                          <select value={editForm.folder || 'Uncategorized'} onChange={(e) => setEditForm({...editForm, folder: e.target.value})} className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs">
                            <option value="Uncategorized">Uncategorized</option>
                            {createdFolders.map(folder => (
                              <option key={folder} value={folder}>{folder}</option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <input type="number" min="1" placeholder="Qty" value={editForm.quantity} onChange={(e) => setEditForm({...editForm, quantity: e.target.value})} className="w-1/2 bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
                            <input type="number" step="0.01" placeholder="$" value={editForm.purchase_price} onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})} className="w-1/2 bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
                          </div>
                          <input type="date" value={editForm.purchase_date} onChange={(e) => setEditForm({...editForm, purchase_date: e.target.value})} className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
                        </div>
                        <div className="flex gap-1 mt-1">
                          <button onClick={() => updateInventoryItem(firstItem.id)} className="flex-1 bg-green-600 hover:bg-green-700 rounded px-2 py-0.5 text-xs font-semibold">Save</button>
                          <button onClick={() => setEditForm({})} className="flex-1 bg-slate-500 hover:bg-slate-400 rounded px-2 py-0.5 text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center pb-1 border-b border-slate-500">
                          <span className="text-xs font-bold text-teal-300">{firstItem.set?.toUpperCase() || 'N/A'}</span>
                          <span className="text-[9px] text-slate-400 bg-slate-600 px-1 py-0.5 rounded">{setItems.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <div><span className="text-slate-400">Qty: </span><span className="text-teal-300 font-bold">{totalQtyInSet}</span></div>
                          <div><span className="text-slate-400">Avg: </span><span className="text-green-300 font-bold">${avgPrice.toFixed(2)}</span></div>
                        </div>
                        <div className="space-y-0.5 max-h-16 overflow-y-auto">
                          {setItems.map((item) => (
                            <div key={item.id} className="text-[9px] text-slate-300 bg-slate-600/50 rounded px-1.5 py-0.5 flex justify-between items-center group hover:bg-slate-600 transition-colors">
                              <span>{item.quantity}x @ ${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">{new Date(item.purchase_date).toLocaleDateString()}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteInventoryItem(item.id);
                                  }}
                                  className="text-cyan-400 hover:text-cyan-300 p-0.5 transition-colors"
                                  title="Delete card"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); startEditingItem(firstItem); }}
                          className="w-full text-[9px] text-teal-400 hover:text-teal-300 hover:bg-slate-600 py-0.5 rounded border border-slate-500"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };
  
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
              <div className="text-2xl md:text-3xl font-bold text-green-300 leading-tight">{totalQty}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-1 text-center">
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[8px] md:text-xs font-bold">Cost</div>
              <div className="font-bold text-[10px] md:text-xs text-blue-200">${avgPrice.toFixed(2)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-slate-400 text-[8px] md:text-xs font-bold">Total</div>
              <div className="font-bold text-[10px] md:text-xs text-amber-300">${formatTotal(totalValue)}</div>
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
            const inStockCards = Object.entries(cardsByName).filter(([_, items]) => {
              const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
              const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
              return (totalQty - reservedQty) > 0;
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
                        console.error('Error adding card to deck from sidebar:', err);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors mb-2 ${
                      isDeckOpen
                        ? 'bg-green-600/40 border-l-4 border-green-400'
                        : 'bg-slate-800 border-l-4 border-transparent hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-100">{deck.name}</div>
                    <div className="text-xs text-green-300">
                      {(() => {
                        const decklistTotal = (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
                        const reserved = deck.reserved_count;
                        const missing = Math.max(0, decklistTotal - reserved);
                        const extras = Math.max(0, reserved - decklistTotal);
                        
                        if (missing > 0) {
                          return `${reserved} reserved ${missing} missing`;
                        } else {
                          const displayReserved = decklistTotal > 0 ? decklistTotal : reserved;
                          return `${displayReserved} reserved${extras > 0 ? ` +${extras} extra` : ''}`;
                        }
                      })()}
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

              // Group reservations by card name for grid view
              const groupedReservations = (deckDetails.reservations || []).reduce((acc, res) => {
                const cardName = res.name;
                if (!acc[cardName]) {
                  acc[cardName] = [];
                }
                acc[cardName].push(res);
                return acc;
              }, {});
              const reservationEntries = Object.entries(groupedReservations);

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
                      console.error('Error adding card to deck:', err);
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
                          onClick={() => reoptimizeDeck(deck.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
                          title="Re-optimize for cheapest cards"
                        >
                          🔄
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
                  {deckDetails.missingCards && deckDetails.missingCards.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-400 mb-2">❌ Missing Cards ({deckDetails.missingCount})</h3>
                      <div className="bg-slate-900 rounded p-3 space-y-2 max-h-48 overflow-y-auto">
                        {deckDetails.missingCards.map((missing, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm text-slate-300 bg-slate-800 p-2 rounded">
                            <span className="text-white">{missing.quantity_needed}x {missing.card_name}</span>
                            <span className="text-xs text-slate-500">{missing.set_code}</span>
                          </div>
                        ))}
                      </div>
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
                      {inStockCards.map(renderCardGroup)}
                    </div>
                    {inStockCards.length > 0 && outOfStockCards.length > 0 && (
                      <div className="border-t border-slate-700 pt-4">
                        <h3 className="text-sm font-semibold text-slate-400 mb-3">Out of Stock</h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                          {outOfStockCards.map(renderCardGroup)}
                        </div>
                      </div>
                    )}
                    {outOfStockCards.length > 0 && inStockCards.length === 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                        {outOfStockCards.map(renderCardGroup)}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      {inStockCards.map(renderCardGroup)}
                    </div>
                    {inStockCards.length > 0 && outOfStockCards.length > 0 && (
                      <div className="border-t border-slate-700 pt-4">
                        <h3 className="text-sm font-semibold text-slate-400 mb-2">Out of Stock</h3>
                        <div className="space-y-2">
                          {outOfStockCards.map(renderCardGroup)}
                        </div>
                      </div>
                    )}
                    {outOfStockCards.length > 0 && inStockCards.length === 0 && (
                      <div className="space-y-2">
                        {outOfStockCards.map(renderCardGroup)}
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
                  {Object.entries(groupedByFolder['Uncategorized']).map(renderCardGroup)}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedByFolder['Uncategorized']).map(renderCardGroup)}
                </div>
              )
            ) : (
              <p className="text-slate-400 text-center py-12">No unsorted cards.</p>
            )
          ) : groupedByFolder[activeTab] ? (
            /* Show folder's cards - only include in-stock cards */
            (() => {
              const folderCards = Object.entries(groupedByFolder[activeTab]).filter(([_, items]) => {
                const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
                return (totalQty - reservedQty) > 0;
              });
              return folderCards.length > 0 ? (
                viewMode === 'card' ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                    {folderCards.map(renderCardGroup)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {folderCards.map(renderCardGroup)}
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
