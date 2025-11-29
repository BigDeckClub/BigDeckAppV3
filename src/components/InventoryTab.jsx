import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [expandedSets, setExpandedSets] = useState({}); // Track expansion of individual sets within cards

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
    
    const isExpanded = expandedCards[cardName];
    
    return (
      <div key={cardName} className="space-y-2">
        {/* Card Name Thumbnail - Smaller */}
        <div 
          className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-600 hover:border-teal-500 rounded p-2 transition-colors cursor-pointer flex flex-col justify-between h-36 hover:shadow-lg hover:shadow-teal-500/20" 
          onClick={() => setExpandedCards({...expandedCards, [cardName]: !isExpanded})}
        >
          <div className="text-center text-[8px] px-1">
            <h3 className="text-xs font-bold text-slate-100 line-clamp-2 break-words">{cardName}</h3>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-slate-500 text-[8px] mb-0.5">Available</div>
              <div className="text-3xl font-bold text-green-300">{available}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1 w-full text-center text-[8px]">
            <div>
              <div className="text-slate-500 text-[6px]">Qty</div>
              <div className={`font-bold ${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'}`}>{totalQty}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[6px]">Cost/ea</div>
              <div className="font-bold text-blue-300">${avgPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[6px]">Total $</div>
              <div className="font-bold text-amber-400">${(totalQty * avgPrice).toFixed(2)}</div>
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              const isEditing = editingId === firstItem.id;
              
              return (
                <div key={`${firstItem.set}-${firstItem.id}`} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 rounded-lg p-4 transition-colors">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-100">{firstItem.set_name} ({firstItem.set})</div>
                      <div>
                        <label className="text-xs text-slate-400">Folder</label>
                        <input
                          type="text"
                          placeholder="e.g. Modern, Standard, Bulk"
                          value={editForm.folder || ''}
                          onChange={(e) => setEditForm({...editForm, folder: e.target.value || 'Uncategorized'})}
                          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm mb-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-400">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={editForm.quantity}
                            onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Price</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.purchase_price}
                            onChange={(e) => setEditForm({...editForm, purchase_price: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Date</label>
                          <input
                            type="date"
                            value={editForm.purchase_date}
                            onChange={(e) => setEditForm({...editForm, purchase_date: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Type</label>
                          <select
                            value={editForm.reorder_type}
                            onChange={(e) => setEditForm({...editForm, reorder_type: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                          >
                            <option value="normal">Normal</option>
                            <option value="land">Land</option>
                            <option value="bulk">Bulk</option>
                          </select>
                        </div>
                        </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => updateInventoryItem(firstItem.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 rounded px-3 py-1 text-sm font-semibold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditForm({})}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-3 py-1 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="flex flex-col gap-2 cursor-pointer hover:bg-slate-800/50 p-2 rounded transition-colors"
                        onClick={() => setExpandedSets({...expandedSets, [`${firstItem.set}-${cardName}`]: !expandedSets[`${firstItem.set}-${cardName}`]})}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1">
                              <span>{expandedSets[`${firstItem.set}-${cardName}`] ? '▼' : '▶'}</span>
                              <span className="line-clamp-2 break-words">{firstItem.set_name} ({setItems.length})</span>
                            </div>
                            <div className="flex gap-3 mt-1 text-xs">
                              <div><span className="text-slate-500">Qty:</span> <span className="text-teal-300 font-semibold">{totalQtyInSet}</span></div>
                              <div><span className="text-slate-500">Price:</span> <span className="text-blue-300 font-semibold">${(setItems.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / setItems.length).toFixed(2)}</span></div>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingItem(firstItem);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteInventoryItem(firstItem.id);
                              }}
                              className="bg-red-600 hover:bg-red-700 rounded px-2 py-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedSets[`${firstItem.set}-${cardName}`] && (
                        <div className="ml-2 pt-1 border-l border-slate-700 space-y-1">
                          {setItems.map((item) => (
                            <div key={item.id} className="bg-slate-900/40 rounded p-1.5 text-xs space-y-0.5">
                              <div className="text-slate-100">
                                <span className="text-slate-500">Qty:</span> {item.quantity} | <span className="text-slate-500">$</span>{parseFloat(item.purchase_price || 0).toFixed(2)}
                              </div>
                              <div className="text-slate-500 text-[10px]">
                                {new Date(item.purchase_date).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex gap-6 min-h-screen">
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

      {/* LEFT SIDEBAR - Folders */}
      <div className="w-64 flex-shrink-0 space-y-4">
        <div className="rounded-lg p-4 border-2 border-teal-600/60 bg-gradient-to-br from-teal-900/20 to-teal-800/10 sticky top-4">
          {!showCreateFolder ? (
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-2 text-teal-300 hover:text-teal-200 font-semibold transition-colors w-full"
            >
              <Plus className="w-4 h-4" />
              New Folder
            </button>
          ) : (
            <div className="flex flex-col gap-2">
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
        </div>

        {/* Folder List */}
        <div className="rounded-lg p-4 border-2 border-teal-500/50 bg-gradient-to-br from-slate-900/50 to-slate-800/50 space-y-2 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-semibold text-teal-300 mb-3">📁 Folders</h3>
          
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

      {/* RIGHT CONTENT - Cards */}
      <div className="flex-1 pb-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-teal-300 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            All Cards
          </button>
          <button
            onClick={() => setActiveTab('unsorted')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'unsorted'
                ? 'text-teal-300 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Unsorted
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === 'all' ? (
            /* Show all cards - masterlist */
            Object.keys(groupedInventory).length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {inStockCards.map(renderCardGroup)}
                </div>
                {inStockCards.length > 0 && outOfStockCards.length > 0 && (
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-sm font-semibold text-slate-400 mb-3">Out of Stock</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {outOfStockCards.map(renderCardGroup)}
                    </div>
                  </div>
                )}
                {outOfStockCards.length > 0 && inStockCards.length === 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {outOfStockCards.map(renderCardGroup)}
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-400 text-center py-12">No cards in inventory yet. Add some from the Imports tab!</p>
            )
          ) : activeTab === 'unsorted' ? (
            /* Show unsorted cards */
            groupedByFolder['Uncategorized'] && Object.keys(groupedByFolder['Uncategorized']).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(groupedByFolder['Uncategorized']).map(renderCardGroup)}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-12">No unsorted cards.</p>
            )
          ) : (
            /* Show selected folder's cards */
            groupedByFolder[selectedFolder] && Object.keys(groupedByFolder[selectedFolder]).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(groupedByFolder[selectedFolder]).map(renderCardGroup)}
              </div>
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
