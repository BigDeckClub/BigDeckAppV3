import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Plus, X, Trash2, Folder } from 'lucide-react';
import { DeckSidebar } from './DeckSidebar';
import { useConfirm } from '../../context/ConfirmContext';

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
  setSellModalData,
  emptyTrash
}) {
  const { confirm } = useConfirm();
  return (
    <div className={`fixed md:static left-0 w-64 flex-shrink-0 space-y-4 h-full overflow-y-auto bg-slate-900 md:bg-transparent z-30 transition-transform duration-300 md:px-0 px-4 md:pl-8 md:pt-16 pt-20 ${
      sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      {/* Folder List */}
      <div className="rounded-lg p-4 border-2 border-teal-500/40 bg-gradient-to-br from-slate-800/60 to-slate-900/40 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thumb-rounded shadow-xl shadow-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-teal-300 flex items-center gap-1.5">
            <Folder className="w-4 h-4" />
            Folders
          </h3>
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
                  setNewFolderName('');
                  setShowCreateFolder(false);
                  const success = await addCreatedFolder(folderNameToCreate);
                  if (success) {
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
                    setNewFolderName('');
                    setShowCreateFolder(false);
                    const success = await addCreatedFolder(folderNameToCreate);
                    if (success) {
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
          .filter(([folder]) => folder !== 'Uncategorized' && folder !== 'Trash' && !createdFolders.includes(folder))
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

        {/* Trash Folder Section */}
        {(() => {
          const cardsByName = groupedByFolder['Trash'] || {};
          const trashCards = Object.entries(cardsByName).filter(([cardName, items]) => {
            const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
            const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            return matchesSearch && totalQty > 0;
          });
          const uniqueCards = trashCards.length;
          const totalTrashCards = trashCards.reduce((sum, [_, items]) => {
            return sum + items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
          }, 0);
          const isSelected = selectedFolder === 'Trash';

          // Only show trash section if there are items in trash
          if (totalTrashCards === 0 && !isSelected) return null;

          const handleEmptyTrash = async (e) => {
            e.stopPropagation();
            const confirmed = await confirm({
              title: 'Empty Trash?',
              message: `This will permanently delete ${totalTrashCards} card${totalTrashCards !== 1 ? 's' : ''} from ${uniqueCards} unique card${uniqueCards !== 1 ? 's' : ''}. This action cannot be undone.`,
              confirmText: 'Empty Trash',
              cancelText: 'Cancel',
              variant: 'danger'
            });
            if (confirmed && emptyTrash) {
              await emptyTrash();
            }
          };

          return (
            <div key="Trash" className="mt-4 pt-4 border-t border-slate-700">
              <button
                onClick={() => {
                  if (isSelected) {
                    closeFolderTab('Trash');
                  } else {
                    setSelectedFolder('Trash');
                    openFolderTab('Trash');
                  }
                  setSidebarOpen(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('bg-red-700/60', 'border-red-300');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-red-700/60', 'border-red-300');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove('bg-red-700/60', 'border-red-300');
                  const inventoryItemId = e.dataTransfer.getData('inventoryItemId');
                  const cardName = e.dataTransfer.getData('cardName');
                  const deckCardDataStr = e.dataTransfer.getData('deckCardData');
                  if (inventoryItemId) {
                    moveInventoryItemToFolder(parseInt(inventoryItemId), 'Trash');
                  } else if (deckCardDataStr) {
                    const deckCardData = JSON.parse(deckCardDataStr);
                    moveCardFromDeckToFolder(deckCardData, 'Trash');
                  } else if (cardName) {
                    moveCardToFolder(cardName, 'Trash');
                  }
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors flex-1 ${
                  isSelected
                    ? 'bg-red-600/40 border-l-4 border-red-400'
                    : 'bg-gradient-to-r from-red-900/30 to-slate-800/50 border-l-4 border-transparent hover:from-red-800/40 hover:to-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span className="font-medium text-sm text-red-200">Trash</span>
                  </div>
                  {totalTrashCards > 0 && (
                    <button
                      onClick={handleEmptyTrash}
                      className="text-xs px-2 py-1 bg-red-600/50 hover:bg-red-600 text-red-100 rounded transition-colors"
                      title="Empty Trash"
                    >
                      Empty
                    </button>
                  )}
                </div>
                <div className="text-xs text-red-300 mt-1">{totalTrashCards} {totalTrashCards === 1 ? 'card' : 'cards'} • {uniqueCards} unique</div>
              </button>
            </div>
          );
        })()}

        {/* Decks Section */}
        <DeckSidebar
          deckInstances={deckInstances}
          openDecks={openDecks}
          openDeckTab={openDeckTab}
          moveCardBetweenDecks={moveCardBetweenDecks}
          moveCardSkuToDeck={moveCardSkuToDeck}
          setShowSellModal={setShowSellModal}
          setSellModalData={setSellModalData}
        />
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
  setSellModalData: PropTypes.func.isRequired,
  emptyTrash: PropTypes.func
};

export default FolderSidebar;
