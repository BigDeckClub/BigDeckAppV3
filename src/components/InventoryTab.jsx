import React, { useEffect, useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Menu, Trash2 } from 'lucide-react';
import { 
  Breadcrumb,
  CardGrid, 
  InventorySearchBar, 
  InventoryTabs, 
  DeckDetailView,
  FolderSidebar,
  FolderView
} from './inventory';
import { SellModal } from './SellModal';
import { useFolderOperations } from '../hooks/useFolderOperations';
import { useDeckReservations } from '../hooks/useDeckReservations';
import { useConfirm } from '../context/ConfirmContext';
import { useApi } from '../hooks/useApi';
import { useInventory } from '../context/InventoryContext';

/**
 * InventoryTab - Main inventory management component
 * Refactored to use smaller sub-components and custom hooks for maintainability
 */
export const InventoryTab = ({
  successMessage,
  setSuccessMessage,
  expandedCards,
  setExpandedCards,
  deckRefreshTrigger,
  onSell
}) => {
  const { confirm } = useConfirm();
  const { post } = useApi();
  
  // Get inventory state and operations from context
  const {
    inventory,
    loadInventory,
    editingId,
    editForm,
    setEditForm,
    startEditingItem,
    updateInventoryItem,
    deleteInventoryItem,
    permanentlyDeleteItem,
    restoreFromTrash,
    emptyTrash,
  } = useInventory();
  
  // UI State
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState('card');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draggedTabData, setDraggedTabData] = useState(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellModalData, setSellModalData] = useState(null);

  // Folder operations hook
  const folderOps = useFolderOperations({ inventory, onLoadInventory: loadInventory });
  // Deck operations hook
  const deckOps = useDeckReservations({ inventory, onLoadInventory: loadInventory });

  // Centralized handlers for low inventory alerts
  const toggleAlertHandler = useCallback(async (itemId) => {
    try {
      await post(`/inventory/${itemId}/toggle-alert`);
      loadInventory?.();
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  }, [post, loadInventory]);

  const setThresholdHandler = useCallback(async (itemId, threshold) => {
    try {
      await post(`/inventory/${itemId}/set-threshold`, { threshold });
      loadInventory?.();
    } catch (error) {
      console.error('Error setting threshold:', error);
    }
  }, [post, loadInventory]);

  // Reorder tabs when drag ends
  const reorderTabs = useCallback((sourceType, sourceIndex, destIndex) => {
    if (sourceIndex === destIndex) return;
    if (sourceType === 'folder') {
      const newFolders = [...folderOps.openFolders];
      const [moved] = newFolders.splice(sourceIndex, 1);
      newFolders.splice(destIndex, 0, moved);
      folderOps.setOpenFolders(newFolders);
    } else if (sourceType === 'deck') {
      const newDecks = [...deckOps.openDecks];
      const [moved] = newDecks.splice(sourceIndex, 1);
      newDecks.splice(destIndex, 0, moved);
      deckOps.setOpenDecks(newDecks);
    }
  }, [folderOps.openFolders, folderOps.setOpenFolders, deckOps.openDecks, deckOps.setOpenDecks]);

  // Tab management wrappers
  const handleOpenFolderTab = useCallback((folderName) => {
    folderOps.openFolderTab(folderName);
    setActiveTab(folderName);
  }, [folderOps]);

  const handleCloseFolderTab = useCallback((folderName) => {
    folderOps.closeFolderTab(folderName, activeTab, setActiveTab);
  }, [folderOps, activeTab]);

  const handleOpenDeckTab = useCallback((deck) => {
    deckOps.openDeckTab(deck, activeTab, setActiveTab);
  }, [deckOps, activeTab]);

  const handleCloseDeckTab = useCallback((deckId) => {
    deckOps.closeDeckTab(deckId, activeTab, setActiveTab);
  }, [deckOps, activeTab]);

  const handleReleaseDeck = useCallback(async (deckId) => {
    await deckOps.releaseDeck(deckId, activeTab, setActiveTab);
  }, [deckOps, activeTab]);

  const handleDeleteFolder = useCallback(async (folderName) => {
    await folderOps.deleteFolder(folderName, activeTab, setActiveTab);
  }, [folderOps, activeTab]);

  // Initial load and refresh of deck instances
  useEffect(() => {
    deckOps.refreshDeckInstances();
  }, [deckRefreshTrigger, deckOps.refreshDeckInstances]);

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
    // Exclude items in Trash folder from "all cards" view
    return filteredInventory
      .filter(item => item.folder !== 'Trash')
      .reduce((acc, item) => {
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
    permanentlyDeleteItem,
    restoreFromTrash,
    createdFolders: folderOps.createdFolders,
    onToggleLowInventory: toggleAlertHandler,
    onSetThreshold: setThresholdHandler
  };

  // Get current deck for deck detail view
  const currentDeckId = deckOps.openDecks.find(id => `deck-${id}` === activeTab);
  const currentDeck = deckOps.deckInstances.find(d => d.id === currentDeckId);
  const currentDeckDetails = deckOps.deckDetailsCache[currentDeckId];

  // Navigation path for breadcrumb
  const navigationPath = useMemo(() => {
    if (activeTab === 'all') {
      return [{ label: 'All Cards', tab: 'all' }];
    }
    if (activeTab === 'Trash') {
      return [
        { label: 'All Cards', tab: 'all' },
        { label: 'Trash', tab: 'Trash' }
      ];
    }
    if (activeTab.startsWith('deck-')) {
      const deckId = activeTab.replace('deck-', '');
      const deck = deckOps.deckInstances.find(d => String(d.id) === deckId);
      return [
        { label: 'Decks', tab: 'all' },
        { label: deck?.name || 'Deck', tab: activeTab }
      ];
    }
    // Folder tab
    return [
      { label: 'All Cards', tab: 'all' },
      { label: activeTab === 'Uncategorized' ? 'Unsorted' : activeTab, tab: activeTab }
    ];
  }, [activeTab, deckOps.deckInstances]);

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = useCallback((tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  }, []);

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
      <FolderSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        showCreateFolder={folderOps.showCreateFolder}
        setShowCreateFolder={folderOps.setShowCreateFolder}
        newFolderName={folderOps.newFolderName}
        setNewFolderName={folderOps.setNewFolderName}
        addCreatedFolder={folderOps.addCreatedFolder}
        setSelectedFolder={folderOps.setSelectedFolder}
        createdFolders={folderOps.createdFolders}
        groupedByFolder={groupedByFolder}
        inventorySearch={inventorySearch}
        selectedFolder={folderOps.selectedFolder}
        closeFolderTab={handleCloseFolderTab}
        openFolderTab={handleOpenFolderTab}
        moveInventoryItemToFolder={folderOps.moveInventoryItemToFolder}
        moveCardFromDeckToFolder={deckOps.moveCardFromDeckToFolder}
        moveCardToFolder={folderOps.moveCardToFolder}
        deckInstances={deckOps.deckInstances}
        openDecks={deckOps.openDecks}
        openDeckTab={handleOpenDeckTab}
        moveCardBetweenDecks={deckOps.moveCardBetweenDecks}
        moveCardSkuToDeck={deckOps.moveCardSkuToDeck}
        setShowSellModal={setShowSellModal}
        setSellModalData={setSellModalData}
        emptyTrash={emptyTrash}
      />

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

        <Breadcrumb
          navigationPath={navigationPath}
          onNavigate={handleBreadcrumbNavigate}
        />

        <InventoryTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openFolders={folderOps.openFolders}
          setOpenFolders={folderOps.setOpenFolders}
          openDecks={deckOps.openDecks}
          deckInstances={deckOps.deckInstances}
          closeDeckTab={handleCloseDeckTab}
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
            expandedMissingCards={deckOps.expandedMissingCards}
            setExpandedMissingCards={deckOps.setExpandedMissingCards}
            openDecks={deckOps.openDecks}
            activeTab={activeTab}
            removeCardFromDeck={deckOps.removeCardFromDeck}
            autoFillMissingCards={deckOps.autoFillMissingCards}
            autoFillSingleCard={deckOps.autoFillSingleCard}
            releaseDeck={handleReleaseDeck}
            moveCardSkuToDeck={deckOps.moveCardSkuToDeck}
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
            ) : activeTab === 'Trash' ? (
              (() => {
                const folderData = groupedByFolder['Trash'] || {};
                const trashCards = Object.entries(folderData).filter(([cardName, items]) => {
                  const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
                  const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
                  return matchesSearch && totalQty > 0;
                });
                const trashStats = Object.entries(folderData).reduce((acc, [_, items]) => {
                  const totalQty = items.reduce((s, item) => s + (item.quantity || 0), 0);
                  if (totalQty > 0) {
                    acc.uniqueCount++;
                    acc.totalCount += totalQty;
                    acc.totalCost += items.reduce((s, item) => s + ((item.purchase_price || 0) * (item.quantity || 0)), 0);
                  }
                  return acc;
                }, { uniqueCount: 0, totalCount: 0, totalCost: 0 });
                
                return (
                  <>
                    <div className="bg-gradient-to-br from-red-900/30 to-slate-800 rounded-lg p-4 mb-4 border border-red-600/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trash2 className="w-6 h-6 text-red-400" />
                          <div>
                            <h2 className="text-xl font-bold text-red-200">Trash</h2>
                            <p className="text-sm text-red-300">
                              {trashStats.totalCount} {trashStats.totalCount === 1 ? 'card' : 'cards'} • {trashStats.uniqueCount} unique • ${trashStats.totalCost.toFixed(2)} value
                            </p>
                          </div>
                        </div>
                        {trashStats.totalCount > 0 && (
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: 'Empty Trash?',
                                message: `This will permanently delete ${trashStats.totalCount} card${trashStats.totalCount !== 1 ? 's' : ''} from ${trashStats.uniqueCount} unique card${trashStats.uniqueCount !== 1 ? 's' : ''}. This action cannot be undone.`,
                                confirmText: 'Empty Trash',
                                cancelText: 'Cancel',
                                variant: 'danger'
                              });
                              if (confirmed && emptyTrash) {
                                await emptyTrash();
                              }
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
                          >
                            Empty Trash
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-red-400 mt-2">
                        Items in Trash can be restored or permanently deleted. Hover over cards to see options.
                      </p>
                    </div>
                    {trashCards.length > 0 ? (
                      <CardGrid cards={trashCards} {...cardGridProps} isTrashView={true} />
                    ) : (
                      <p className="text-slate-400 text-center py-12">Trash is empty.</p>
                    )}
                  </>
                );
              })()
            ) : folderOps.createdFolders.includes(activeTab) || Object.keys(groupedByFolder).includes(activeTab) ? (
              <FolderView
                folderName={activeTab}
                groupedByFolder={groupedByFolder}
                inventorySearch={inventorySearch}
                cardGridProps={cardGridProps}
                folderOps={folderOps}
                setSellModalData={setSellModalData}
                setShowSellModal={setShowSellModal}
                onDeleteFolder={handleDeleteFolder}
              />
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
  successMessage: PropTypes.string,
  setSuccessMessage: PropTypes.func.isRequired,
  expandedCards: PropTypes.object.isRequired,
  setExpandedCards: PropTypes.func.isRequired,
  deckRefreshTrigger: PropTypes.number,
  onSell: PropTypes.func
};

export default InventoryTab;
