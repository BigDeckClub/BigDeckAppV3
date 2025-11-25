import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';

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
  return (
    <div className="space-y-6">
      {successMessage && (
        <div className={`rounded-lg p-4 border flex items-center justify-between ${successMessage.includes('Error') ? 'bg-red-900 bg-opacity-30 border-red-500 text-red-200' : 'bg-green-900 bg-opacity-30 border-green-500 text-green-200'}`}>
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            className="ml-4 text-current hover:opacity-70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="card rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-bold mb-4">Add Card to Inventory</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Preferred Set (optional):</label>
            <select
              value={defaultSearchSet}
              onChange={(e) => {
                setDefaultSearchSet(e.target.value);
                localStorage.setItem('defaultSearchSet', e.target.value);
              }}
              className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white mb-4"
            >
              <option value="">Show most recent from inventory</option>
              {allSets.map(set => (
                <option key={set.code} value={set.code}>{set.code} - {set.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search for a card..."
              value={searchQuery}
              onChange={handleSearch}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white placeholder-gray-400"
            />
            
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-slate-600 rounded shadow-lg max-h-64 overflow-y-auto z-10">
                {(() => {
                  const seen = new Set();
                  return searchResults
                    .filter(card => {
                      if (seen.has(card.name)) return false;
                      seen.add(card.name);
                      return true;
                    })
                    .map((card) => (
                      <div
                        key={card.id}
                        onClick={() => selectCard(card)}
                        className="px-4 py-2 hover:bg-purple-700 cursor-pointer border-b border-slate-600"
                      >
                        <div className="font-semibold">{card.name}</div>
                      </div>
                    ));
                })()}
              </div>
            )}
          </div>

          {newEntry.selectedSet && (
            <div className="space-y-2">
              <div className="bg-slate-800 border border-slate-600 rounded p-3">
                <div className="font-semibold">{newEntry.selectedSet.name}</div>
                <div className="text-sm text-slate-300">{newEntry.selectedSet.setName} ({newEntry.selectedSet.set})</div>
              </div>
              {selectedCardSets.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Change Set (if available):</label>
                  <select
                    value={`${newEntry.selectedSet.set}|${newEntry.selectedSet.name}`}
                    onChange={(e) => {
                      const selectedCard = selectedCardSets.find(c => `${c.set}|${c.name}` === e.target.value);
                      if (selectedCard) selectCard(selectedCard);
                    }}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
                  >
                    {selectedCardSets.map((card) => (
                      <option key={`${card.id}`} value={`${card.set}|${card.name}`}>
                        {card.setName} ({card.set})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              min="1"
              value={newEntry.quantity}
              onChange={(e) => setNewEntry({...newEntry, quantity: parseInt(e.target.value)})}
              placeholder="Quantity"
              className="bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
            />
            <input
              type="date"
              value={newEntry.purchaseDate}
              onChange={(e) => setNewEntry({...newEntry, purchaseDate: e.target.value})}
              className="bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              step="0.01"
              value={newEntry.purchasePrice}
              onChange={(e) => setNewEntry({...newEntry, purchasePrice: e.target.value})}
              placeholder="Purchase Price ($)"
              className="bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
            />
            <select
              value={newEntry.reorderType}
              onChange={(e) => setNewEntry({...newEntry, reorderType: e.target.value})}
              className="bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white"
            >
              <option value="normal">Normal</option>
              <option value="land">Land</option>
              <option value="bulk">Bulk</option>
            </select>
          </div>

          <button
            onClick={addCard}
            disabled={!newEntry.selectedSet}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded px-4 py-2 font-semibold transition"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Add Card
          </button>
        </div>
      </div>

      {/* Inventory List */}
      <div className="card rounded-lg p-6 border border-slate-700">
        <h2 className="text-xl font-bold mb-4">Card Inventory</h2>
        <div className="grid gap-4">
          {Object.entries(
            inventory.reduce((acc, item) => {
              if (!acc[item.name]) {
                acc[item.name] = [];
              }
              acc[item.name].push(item);
              return acc;
            }, {})
          ).map(([cardName, items]) => {
            const available = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalInContainers = items.reduce((sum, item) => sum + (parseInt(item.in_containers_qty) || 0), 0);
            const totalQty = available + totalInContainers;
            
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
              <div key={cardName} className="bg-slate-800 border border-slate-600 rounded p-4">
                <div className="flex justify-between items-start mb-3 cursor-pointer" onClick={() => setExpandedCards({...expandedCards, [cardName]: !isExpanded})}>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{cardName}</h3>
                  </div>
                  <div className="text-purple-400">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="bg-slate-800 bg-opacity-50 rounded p-2 border border-slate-700">
                    <div className="text-xs text-slate-400">Total Copies</div>
                    <div className="text-xl font-bold text-teal-300">{totalQty}</div>
                  </div>
                  <div className="bg-slate-800 bg-opacity-50 rounded p-2 border border-slate-700">
                    <div className="text-xs text-slate-400">Available</div>
                    <div className="text-xl font-bold text-green-300">{available}</div>
                  </div>
                  <div className="bg-slate-800 bg-opacity-50 rounded p-2 border border-slate-700">
                    <div className="text-xs text-slate-400">In Containers</div>
                    <div className="text-xl font-bold text-pink-300">{totalInContainers}</div>
                  </div>
                  <div className="bg-slate-800 bg-opacity-50 rounded p-2 border border-slate-700">
                    <div className="text-xs text-slate-400">Avg Price (60d)</div>
                    <div className="text-xl font-bold text-blue-300">${avgPrice.toFixed(2)}</div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-purple-600 pt-4 space-y-2">
                    {items.map((item) => {
                      const isEditing = editingId === item.id;
                      return (
                        <div key={item.id} className="card border border-slate-600 rounded p-3">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="text-sm font-semibold text-slate-100">{item.set_name} ({item.set})</div>
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
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-100">{item.set_name}</div>
                                <div className="grid grid-cols-3 gap-3 mt-1 text-xs">
                                  <div><span className="text-slate-400">Qty:</span> <span className="text-white font-semibold">{item.quantity}</span></div>
                                  <div><span className="text-slate-400">In Containers:</span> <span className="text-white font-semibold">{item.in_containers_qty || 0}</span></div>
                                  <div><span className="text-slate-400">Set:</span> <span className="text-white font-semibold">{item.set}</span></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 ml-4">
                                <div className="flex flex-col items-center gap-2">
                                  <MarketPrices cardName={item.name} setCode={item.set} />
                                  <div className="bg-slate-800 bg-opacity-50 border border-slate-600 rounded px-2 py-1 text-xs">
                                    <div className="text-slate-400">Avg Cost</div>
                                    <div className="font-bold text-green-300">${avgPrice.toFixed(2)}</div>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => startEditingItem(item)}
                                    className="bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs font-semibold"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteInventoryItem(item.id)}
                                    className="bg-red-600 hover:bg-red-700 rounded px-2 py-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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
          })}
          {inventory.length === 0 && <p className="text-slate-400">No cards in inventory yet.</p>}
        </div>
      </div>
    </div>
  );
};
