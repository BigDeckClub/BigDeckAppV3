import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2, X, ChevronDown, ChevronRight, Package } from 'lucide-react';
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
  MarketPrices,
  handleSearch
}) => {
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});
  
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
    const available = items.reduce((sum, item) => sum + item.quantity_available, 0);
    const totalInContainers = items.reduce((sum, item) => sum + (parseInt(item.quantity_in_containers) || 0), 0);
    
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
      <div key={cardName} className={`bg-slate-800 border rounded-lg p-3 sm:p-4 ${totalQty === 0 ? 'border-slate-700 opacity-75' : 'border-slate-600'}`}>
        <div className="flex justify-between items-center mb-2 sm:mb-3 cursor-pointer" onClick={() => setExpandedCards({...expandedCards, [cardName]: !isExpanded})}>
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex-1 pr-2">{cardName}</h3>
          <div className="text-teal-400 text-sm">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 sm:mb-3">
          <div className="bg-slate-800 bg-opacity-50 rounded p-2 sm:p-2 border border-slate-700">
            <div className="text-[10px] sm:text-xs text-slate-400">Total Copies</div>
            <div className={`text-lg sm:text-xl font-bold ${totalQty === 0 ? 'text-slate-500' : 'text-teal-300'}`}>{totalQty}</div>
          </div>
          <div className="bg-slate-800 bg-opacity-50 rounded p-2 sm:p-2 border border-slate-700">
            <div className="text-[10px] sm:text-xs text-slate-400">Available</div>
            <div className="text-lg sm:text-xl font-bold text-green-300">{available}</div>
          </div>
          <div className="bg-slate-800 bg-opacity-50 rounded p-2 sm:p-2 border border-slate-700">
            <div className="text-[10px] sm:text-xs text-slate-400">In Containers</div>
            <div className="text-lg sm:text-xl font-bold text-pink-300">{totalInContainers}</div>
          </div>
          <div className="bg-slate-800 bg-opacity-50 rounded p-2 sm:p-2 border border-slate-700">
            <div className="text-[10px] sm:text-xs text-slate-400">Avg Price (60d)</div>
            <div className="text-lg sm:text-xl font-bold text-blue-300">${avgPrice.toFixed(2)}</div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="border-t border-teal-600/50 pt-3 sm:pt-4 space-y-2">
            {items.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <div key={item.id} className="card border border-slate-600 rounded p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-100">{item.set_name} ({item.set})</div>
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
                        <div>
                          <label className="text-xs text-slate-400">Location</label>
                          <input
                            type="text"
                            value={editForm.location || ""}
                            onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                            placeholder="e.g. Shelf A"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => updateInventoryItem(item.id)}
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
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-100">{item.set_name}</div>
                        <div className="text-xs text-teal-300 mb-1">{item.location && `📍 ${item.location}`}{item.is_shared_location && ' (Shared)'}</div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-1 text-xs">
                          <div><span className="text-slate-400">Total:</span> <span className="text-white font-semibold">{item.quantity}</span></div>
                          <div><span className="text-slate-400">In Cont:</span> <span className="text-white font-semibold">{item.quantity_in_containers || 0}</span></div>
                          <div><span className="text-slate-400">Avail:</span> <span className="text-white font-semibold">{item.quantity_available || 0}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 sm:ml-4">
                        <MarketPrices cardName={item.name} setCode={item.set} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingItem(item);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 rounded px-3 py-2 sm:px-2 sm:py-1 text-sm min-h-[36px] sm:min-h-0"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteInventoryItem(item.id);
                          }}
                          className="bg-red-600 hover:bg-red-700 rounded px-3 py-2 sm:px-2 sm:py-1 min-h-[36px] sm:min-h-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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
    <div className="space-y-6">
      {successMessage && successMessage.includes('Error') && (
        <div className="rounded-lg p-4 border flex items-center justify-between bg-red-900 bg-opacity-30 border-red-500 text-red-200">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            className="ml-4 text-current hover:opacity-70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Inventory List - By Folder */}
      <div className="card rounded-lg p-4 sm:p-6 border border-slate-700">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Card Inventory</h2>
        <div className="space-y-4">
          {Object.entries(groupedByFolder).map(([folder, cardsByName]) => {
            const folderInStockCards = Object.entries(cardsByName).filter(([_, items]) => {
              const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
              return totalQty > 0;
            });
            
            const folderOutOfStockCards = Object.entries(cardsByName).filter(([_, items]) => {
              const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
              return totalQty === 0;
            });
            
            const isFolderExpanded = expandedFolders[folder];
            const totalInFolder = folderInStockCards.length;
            
            return (
              <div key={folder} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedFolders({...expandedFolders, [folder]: !isFolderExpanded})}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-teal-400">{isFolderExpanded ? '▼' : '▶'}</span>
                    <h3 className="font-semibold text-slate-100">{folder}</h3>
                    <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">
                      {totalInFolder} {totalInFolder === 1 ? 'card' : 'cards'}
                    </span>
                  </div>
                </button>
                
                {isFolderExpanded && (
                  <div className="p-4 border-t border-slate-700 bg-slate-800/30">
                    <div className="grid gap-4">
                      {folderInStockCards.map(renderCardGroup)}
                      {folderInStockCards.length === 0 && folderOutOfStockCards.length > 0 && (
                        <p className="text-slate-400 text-sm">All cards in this folder are out of stock.</p>
                      )}
                      {folderOutOfStockCards.map(renderCardGroup)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {Object.keys(groupedByFolder).length === 0 && (
            <p className="text-slate-400">No cards in inventory yet.</p>
          )}
        </div>
      </div>
      
      {/* Out of Stock Section - Collapsible */}
      {outOfStockCards.length > 0 && (
        <div className="card rounded-lg border border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowOutOfStock(!showOutOfStock)}
            className="w-full p-4 sm:p-6 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-300">Out of Stock</h2>
              <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-sm">
                {outOfStockCards.length} {outOfStockCards.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            {showOutOfStock ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>
          
          {showOutOfStock && (
            <div className="p-4 sm:p-6 pt-0 sm:pt-0 border-t border-slate-700">
              <div className="grid gap-4 mt-4">
                {outOfStockCards.map(renderCardGroup)}
              </div>
            </div>
          )}
        </div>
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
  MarketPrices: PropTypes.func.isRequired,
  handleSearch: PropTypes.func.isRequired,
};
