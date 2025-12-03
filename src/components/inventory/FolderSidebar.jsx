import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Plus, X, DollarSign } from 'lucide-react';

/**
 * FolderSidebar - Left sidebar with folder and deck navigation
 * Extracted from InventoryTab for better component organization
 */
export const FolderSidebar = memo(function FolderSidebar({
  sidebarOpen,
  setSidebarOpen,
  showCreateFolder,
  setShowCreateFolder,
  newFolderName,
  setNewFolderName,
  addCreatedFolder,
  setSelectedFolder,
  setSuccessMessage,
  createdFolders,
  groupedByFolder,
  inventorySearch,
  selectedFolder,
  closeFolderTab,
  openFolderTab,
  moveInventoryItemToFolder,
  moveCardFromDeckToFolder,
  moveCardToFolder,
  deckInstances,
  openDecks,
  openDeckTab,
  moveCardBetweenDecks,
  moveCardSkuToDeck,
  setShowSellModal,
  setSellModalData
}) {
  return (
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
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  const folderNameToCreate = newFolderName.trim();
                  const success = await addCreatedFolder(folderNameToCreate);
                  if (success) {
                    setNewFolderName('');
                    setShowCreateFolder(false);
                    setSelectedFolder(folderNameToCreate);
                  }
                }
                if (e.key === 'Escape') {
                  setNewFolderName('');
                  setShowCreateFolder(false);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (newFolderName.trim()) {
                    const folderNameToCreate = newFolderName.trim();
                    const success = await addCreatedFolder(folderNameToCreate);
                    if (success) {
                      setNewFolderName('');
                      setShowCreateFolder(false);
                      setSelectedFolder(folderNameToCreate);
                    }
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
          const uniqueCards = inStockCards.length;
          const totalAvailableCards = inStockCards.reduce((sum, [_, items]) => {
            return sum + items.reduce((itemSum, item) => {
              const available = (item.quantity || 0) - (parseInt(item.reserved_quantity) || 0);
              return itemSum + Math.max(0, available);
            }, 0);
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
                <div className="text-xs text-teal-300">{totalAvailableCards} available • {uniqueCards} {uniqueCards === 1 ? 'unique' : 'unique'}</div>
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
                      // Handle silently
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
  );
});

FolderSidebar.propTypes = {
  sidebarOpen: PropTypes.bool.isRequired,
  setSidebarOpen: PropTypes.func.isRequired,
  showCreateFolder: PropTypes.bool.isRequired,
  setShowCreateFolder: PropTypes.func.isRequired,
  newFolderName: PropTypes.string.isRequired,
  setNewFolderName: PropTypes.func.isRequired,
  addCreatedFolder: PropTypes.func.isRequired,
  setSelectedFolder: PropTypes.func.isRequired,
  setSuccessMessage: PropTypes.func.isRequired,
  createdFolders: PropTypes.array.isRequired,
  groupedByFolder: PropTypes.object.isRequired,
  inventorySearch: PropTypes.string.isRequired,
  selectedFolder: PropTypes.string,
  closeFolderTab: PropTypes.func.isRequired,
  openFolderTab: PropTypes.func.isRequired,
  moveInventoryItemToFolder: PropTypes.func.isRequired,
  moveCardFromDeckToFolder: PropTypes.func.isRequired,
  moveCardToFolder: PropTypes.func.isRequired,
  deckInstances: PropTypes.array.isRequired,
  openDecks: PropTypes.array.isRequired,
  openDeckTab: PropTypes.func.isRequired,
  moveCardBetweenDecks: PropTypes.func.isRequired,
  moveCardSkuToDeck: PropTypes.func.isRequired,
  setShowSellModal: PropTypes.func.isRequired,
  setSellModalData: PropTypes.func.isRequired
};

export default FolderSidebar;
