import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { X, Menu } from 'lucide-react';
import { 
  CardGrid, 
  FolderSidebar, 
  InventorySearchBar, 
  InventoryTabs, 
  DeckDetailView,
  FolderHeader 
} from './inventory';
import { SellModal } from './SellModal';
import { useInventoryState } from '../hooks/useInventoryState';

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
  // Use custom hook for all inventory state and operations
  const inventoryState = useInventoryState({
    inventory,
    setSuccessMessage,
    onLoadInventory,
    setExpandedCards
  });

  // Destructure state and handlers from custom hook
  const {
    newFolderName, setNewFolderName,
    showCreateFolder, setShowCreateFolder,
    createdFolders,
    selectedFolder, setSelectedFolder,
    activeTab, setActiveTab,
    viewMode, setViewMode,
    sidebarOpen, setSidebarOpen,
    deckInstances,
    openDecks,
    openFolders, setOpenFolders,
    deckDetailsCache,
    draggedTabData, setDraggedTabData,
    expandedMissingCards, setExpandedMissingCards,
    inventorySearch, setInventorySearch,
    showSellModal, setShowSellModal,
    sellModalData, setSellModalData,
    folderMetadata, setFolderMetadata,
    editingFolderName, setEditingFolderName,
    editingFolderDesc, setEditingFolderDesc,
    toggleAlertHandler, setThresholdHandler,
    reorderTabs, refreshDeckInstances,
    openDeckTab, closeDeckTab,
    openFolderTab, closeFolderTab,
    releaseDeck, removeCardFromDeck,
    moveInventoryItemToFolder, moveCardToFolder,
    moveCardFromDeckToFolder, moveCardSkuToDeck,
    moveCardBetweenDecks,
    autoFillSingleCard, autoFillMissingCards,
    addCreatedFolder
  } = inventoryState;

  // Refresh deck instances on trigger
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

      {/* Sidebar */}
      <FolderSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        showCreateFolder={showCreateFolder}
        setShowCreateFolder={setShowCreateFolder}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        addCreatedFolder={addCreatedFolder}
        setSelectedFolder={setSelectedFolder}
        setSuccessMessage={setSuccessMessage}
        createdFolders={createdFolders}
        groupedByFolder={groupedByFolder}
        inventorySearch={inventorySearch}
        selectedFolder={selectedFolder}
        closeFolderTab={closeFolderTab}
        openFolderTab={openFolderTab}
        moveInventoryItemToFolder={moveInventoryItemToFolder}
        moveCardFromDeckToFolder={moveCardFromDeckToFolder}
        moveCardToFolder={moveCardToFolder}
        deckInstances={deckInstances}
        openDecks={openDecks}
        openDeckTab={openDeckTab}
        moveCardBetweenDecks={moveCardBetweenDecks}
        moveCardSkuToDeck={moveCardSkuToDeck}
        setShowSellModal={setShowSellModal}
        setSellModalData={setSellModalData}
      />

      {/* Mobile Overlay */}
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
            ) : activeTab === 'unsorted' ? (
              groupedByFolder['Uncategorized'] && Object.keys(groupedByFolder['Uncategorized']).length > 0 ? (
                <CardGrid 
                  cards={Object.entries(groupedByFolder['Uncategorized']).filter(([cardName]) => 
                    inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase())
                  )} 
                  {...cardGridProps} 
                />
              ) : (
                <p className="text-slate-400 text-center py-12">No unsorted cards.</p>
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
