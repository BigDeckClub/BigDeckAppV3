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
  handleSearch
}) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [createdFolders, setCreatedFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'unsorted', or folder name
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle

  // Load created folders from localStorage
  useEffect(() => {
    const savedFolders = localStorage.getItem('createdFolders');
    if (savedFolders) {
      setCreatedFolders(JSON.parse(savedFolders));
    }
  }, []);

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
    const available = totalQty;
    
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
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 rounded p-1.5 transition-colors flex flex-col h-32 md:h-36 hover:shadow-lg hover:shadow-teal-500/20" 
          onClick={() => setExpandedCards({...expandedCards, [cardName]: !isExpanded})}
        >
          <div className="text-center px-1 cursor-pointer">
            <h3 className="text-[10px] md:text-xs font-bold text-slate-100 line-clamp-2 break-words">{cardName}</h3>
          </div>
          
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="text-center">
              <div className="text-slate-500 text-[7px] md:text-[8px]">Available</div>
              <div className="text-2xl md:text-3xl font-bold text-green-300 leading-tight">{available}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1 text-center text-[7px] md:text-[8px]">
            <div className="space-y-0.5">
              <div className="text-slate-500">Qty</div>
              <div className={`font-semibold ${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'}`}>{totalQty}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-slate-500">Cost</div>
              <div className="font-semibold text-blue-300">${avgPrice.toFixed(2)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-slate-500">Total</div>
              <div className="font-semibold text-amber-400">${formatTotal(totalValue)}</div>
            </div>
          </div>
        </div>
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
                          <input type="text" placeholder="Folder" value={editForm.folder || ''} onChange={(e) => setEditForm({...editForm, folder: e.target.value || 'Uncategorized'})} className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
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
                              <div key={item.id} className="text-[9px] text-slate-300 bg-slate-600/50 rounded px-1.5 py-0.5 flex justify-between">
                                <span>{item.quantity}x @ ${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                                <span className="text-slate-400">{new Date(item.purchase_date).toLocaleDateString()}</span>
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
        ) : (
        <div>
          {/* List View */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 rounded p-3 transition-colors cursor-pointer hover:shadow-lg hover:shadow-teal-500/20">
            <div className="flex items-center justify-between gap-4" onClick={() => setExpandedCards({...expandedCards, [cardName]: !isExpanded})}>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-100 break-words mb-1">{cardName}</h3>
                <div className="flex gap-4 text-xs">
                  <div><span className="text-slate-500">Qty:</span> <span className={`${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'} font-semibold`}>{totalQty}</span></div>
                  <div><span className="text-slate-500">Available:</span> <span className="text-green-300 font-semibold">{available}</span></div>
                  <div><span className="text-slate-500">Cost/ea:</span> <span className="text-blue-300 font-semibold">${avgPrice.toFixed(2)}</span></div>
                  <div><span className="text-slate-500">Total:</span> <span className="text-amber-400 font-semibold">${formatTotal(totalValue)}</span></div>
                </div>
              </div>
              <div className="text-teal-400 text-sm flex-shrink-0">
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
                            <input type="text" placeholder="Folder" value={editForm.folder || ''} onChange={(e) => setEditForm({...editForm, folder: e.target.value || 'Uncategorized'})} className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-0.5 text-white text-xs" />
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
                                <div key={item.id} className="text-[9px] text-slate-300 bg-slate-600/50 rounded px-1.5 py-0.5 flex justify-between">
                                  <span>{item.quantity}x @ ${parseFloat(item.purchase_price || 0).toFixed(2)}</span>
                                  <span className="text-slate-400">{new Date(item.purchase_date).toLocaleDateString()}</span>
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
      <div className={`fixed md:static left-0 w-64 flex-shrink-0 space-y-4 h-full md:h-auto overflow-y-auto md:overflow-visible bg-slate-900 md:bg-transparent z-30 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Folder List */}
        <div className="rounded-lg p-4 border-2 border-teal-500/50 bg-gradient-to-br from-slate-900/50 to-slate-800/50 space-y-3 max-h-96 overflow-y-auto">
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
            const totalCards = Object.keys(cardsByName).length;
            const isSelected = selectedFolder === folderName;
            
            return (
              <button
                key={folderName}
                onClick={() => setSelectedFolder(isSelected ? null : folderName)}
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
                  onClick={() => setSelectedFolder(isSelected ? null : folder)}
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
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* RIGHT CONTENT - Cards */}
      <div className="flex-1 pb-24 md:pb-6 px-2 md:px-0">
        {/* Tabs and View Mode */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 border-b border-slate-700 pb-4 items-start md:items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => { setActiveTab('all'); setSidebarOpen(false); }}
              className={`flex-1 md:flex-none px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-teal-300 border-b-2 border-teal-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              All Cards
            </button>
            <button
              onClick={() => { setActiveTab('unsorted'); setSidebarOpen(false); }}
              className={`flex-1 md:flex-none px-3 md:px-4 py-2 text-sm md:text-base font-medium transition-colors ${
                activeTab === 'unsorted'
                  ? 'text-teal-300 border-b-2 border-teal-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Unsorted
            </button>
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
          ) : (
            /* Show selected folder's cards */
            groupedByFolder[selectedFolder] && Object.keys(groupedByFolder[selectedFolder]).length > 0 ? (
              viewMode === 'card' ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                  {Object.entries(groupedByFolder[selectedFolder]).map(renderCardGroup)}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(groupedByFolder[selectedFolder]).map(renderCardGroup)}
                </div>
              )
            ) : (
              <p className="text-slate-400 text-center py-12">No cards in this folder yet.</p>
            )
          )}
        </div>
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
