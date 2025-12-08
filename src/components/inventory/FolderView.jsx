import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CheckSquare, Square, FolderInput, ListFilter, Trash2 } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';
import { CardGrid } from './CardGrid';
import { FolderHeader } from './FolderHeader';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { sortCards } from '../../utils/sortCards';
import { ColorFilterChips } from '../ui/ColorFilterChips';
import { useColorFilter } from '../../hooks/useColorFilter';

/**
 * FolderView - Renders a generic folder view with folder header and card grid
 */
export function FolderView({
  folderName,
  groupedByFolder,
  inventorySearch,
  cardGridProps,
  folderOps,
  setSellModalData,
  setShowSellModal,
  onDeleteFolder,
  sortField = 'name',
  sortDirection = 'asc',
  decklistFilter = 'all',
  setDecklistFilter,
  decklistCardNames = new Set(),
  deleteInventoryItem,
}) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [targetFolder, setTargetFolder] = useState('');

  // Get all cards for color filtering
  const allCardsFlat = useMemo(() => {
    const folderData = groupedByFolder[folderName] || {};
    return Object.entries(folderData).flatMap(([cardName, items]) =>
      items.map(item => ({ ...item, name: cardName }))
    );
  }, [groupedByFolder, folderName]);

  // Color filter hook
  const {
    selectedFilters: colorFilters,
    toggleFilter: toggleColorFilter,
    clearFilters: clearColorFilters,
    filterCard: matchesColorFilter,
    isLoading: colorFilterLoading,
  } = useColorFilter({ cards: allCardsFlat, enabled: true });

  // Calculate folder cards and stats
  const { folderCards, availableCardsStats, folderDesc } = useMemo(() => {
    const folderData = groupedByFolder[folderName] || {};
    
    // Helper to check if card is in decklist (handles double-faced cards like "Avatar Aang // Aang, Master of Elements")
    const isInDecklist = (name) => {
      const lowerName = name.toLowerCase();
      if (decklistCardNames.has(lowerName)) return true;
      if (lowerName.includes(' // ')) {
        const frontFace = lowerName.split(' // ')[0].trim();
        if (decklistCardNames.has(frontFace)) return true;
      }
      return false;
    };
    
    const cards = Object.entries(folderData).filter(([cardName, items]) => {
      const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
      // Apply decklist filter (handles double-faced cards)
      const inDecklist = isInDecklist(cardName);
      const matchesDecklistFilter =
        decklistFilter === 'all' ||
        (decklistFilter === 'in-decklist' && inDecklist) ||
        (decklistFilter === 'not-in-decklist' && !inDecklist);
      // Apply color filter
      const passesColorFilter = colorFilters.length === 0 || matchesColorFilter({ name: cardName });
      return matchesSearch && matchesDecklistFilter && passesColorFilter && (totalQty - reservedQty) > 0;
    });
    
    const stats = Object.entries(folderData).reduce((acc, [, items]) => {
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
    
    const desc = folderOps.folderMetadata[folderName]?.description || '';
    
    // Apply sorting to the cards
    const sortedCards = sortCards(cards, sortField, sortDirection);
    
    return { folderCards: sortedCards, availableCardsStats: stats, folderDesc: desc };
  }, [folderName, groupedByFolder, inventorySearch, folderOps.folderMetadata, sortField, sortDirection, decklistFilter, decklistCardNames, colorFilters, matchesColorFilter]);

  // Get all card IDs for select all
  const allCardIds = useMemo(() => {
    const folderData = groupedByFolder[folderName] || {};
    const ids = [];
    Object.values(folderData).forEach(items => {
      items.forEach(item => ids.push(item.id));
    });
    return ids;
  }, [groupedByFolder, folderName]);

  // Handlers
  const handleSelectAll = useCallback(() => {
    setSelectedCardIds(new Set(allCardIds));
  }, [allCardIds]);

  const handleDeselectAll = useCallback(() => {
    setSelectedCardIds(new Set());
  }, []);

  const handleBulkMove = useCallback(async () => {
    if (!targetFolder || selectedCardIds.size === 0) return;

    let successCount = 0;
    let failedCount = 0;

    for (const cardId of selectedCardIds) {
      try {
        await folderOps.moveInventoryItemToFolder(cardId, targetFolder, { silent: true });
        successCount++;
      } catch {
        failedCount++;
      }
    }

    if (failedCount > 0) {
      showToast(
        `Moved ${successCount} card${successCount === 1 ? '' : 's'}, ${failedCount} failed`,
        TOAST_TYPES.WARNING
      );
    } else {
      showToast(
        `Moved ${successCount} card${successCount === 1 ? '' : 's'} to ${targetFolder}`,
        TOAST_TYPES.SUCCESS
      );
    }

    // Reset selection
    setSelectedCardIds(new Set());
    setShowBulkMove(false);
    setTargetFolder('');
  }, [targetFolder, selectedCardIds, folderOps, showToast]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedCardIds.size === 0 || !deleteInventoryItem) return;

    const confirmed = await confirm({
      title: 'Delete Selected Cards',
      message: `Are you sure you want to delete ${selectedCardIds.size} card${selectedCardIds.size === 1 ? '' : 's'}? They will be moved to Trash.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (!confirmed) return;

    let successCount = 0;
    let failedCount = 0;

    for (const cardId of selectedCardIds) {
      try {
        await deleteInventoryItem(cardId, { silent: true });
        successCount++;
      } catch {
        failedCount++;
      }
    }

    if (failedCount > 0) {
      showToast(
        `Deleted ${successCount} card${successCount === 1 ? '' : 's'}, ${failedCount} failed`,
        TOAST_TYPES.WARNING
      );
    } else {
      showToast(
        `Deleted ${successCount} card${successCount === 1 ? '' : 's'}`,
        TOAST_TYPES.SUCCESS
      );
    }

    // Reset selection
    setSelectedCardIds(new Set());
  }, [selectedCardIds, deleteInventoryItem, confirm, showToast]);

  const isAllSelected = allCardIds.length > 0 && selectedCardIds.size === allCardIds.length;
  const availableFolders = folderOps.createdFolders.filter(f => f !== folderName && f !== 'Trash');

  return (
    <>
      <FolderHeader
        folderName={folderName}
        folderDesc={folderDesc}
        totalCards={availableCardsStats.totalCount}
        uniqueCards={availableCardsStats.uniqueCount}
        totalCost={availableCardsStats.totalCost}
        editingFolderName={folderOps.editingFolderName}
        setEditingFolderName={folderOps.setEditingFolderName}
        editingFolderDesc={folderOps.editingFolderDesc}
        setEditingFolderDesc={folderOps.setEditingFolderDesc}
        setFolderMetadata={folderOps.setFolderMetadata}
        setSellModalData={setSellModalData}
        setShowSellModal={setShowSellModal}
        onDeleteFolder={onDeleteFolder}
        isUnsorted={folderName === 'Uncategorized'}
      />

      {/* Color Filter */}
      <div className="mb-4">
        <ColorFilterChips
          selectedFilters={colorFilters}
          onToggleFilter={toggleColorFilter}
          onClearFilters={clearColorFilters}
          isLoading={colorFilterLoading}
          variant="compact"
          size="sm"
          showLabel={true}
        />
      </div>

      {/* Bulk Selection Controls */}
      {folderCards.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-600 p-3 mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors text-sm font-medium"
            >
              {isAllSelected ? (
                <>
                  <Square className="w-4 h-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Select All
                </>
              )}
            </button>
            {selectedCardIds.size > 0 && (
              <span className="text-sm text-slate-400">
                {selectedCardIds.size} card{selectedCardIds.size === 1 ? '' : 's'} selected
              </span>
            )}
          </div>
          
          {/* Decklist Filter */}
          {setDecklistFilter && (
            <div className="flex items-center gap-2 ml-auto">
              <ListFilter className="w-4 h-4 text-slate-400" />
              <select
                value={decklistFilter}
                onChange={(e) => setDecklistFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-700 border border-slate-600 text-slate-200 rounded-md text-sm focus:outline-none focus:border-teal-400"
              >
                <option value="all">All Cards</option>
                <option value="in-decklist">In Decklists</option>
                <option value="not-in-decklist">Not in Decklists</option>
              </select>
              {decklistFilter !== 'all' && (
                <span className="text-xs text-teal-400">
                  {folderCards.length} cards
                </span>
              )}
            </div>
          )}
          
          {selectedCardIds.size > 0 && (
            <div className="flex items-center gap-2">
              {!showBulkMove ? (
                <>
                  <button
                    onClick={() => setShowBulkMove(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-md transition-colors text-sm font-medium"
                  >
                    <FolderInput className="w-4 h-4" />
                    Move to Folder
                  </button>
                  {deleteInventoryItem && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Selected
                    </button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={targetFolder}
                    onChange={(e) => setTargetFolder(e.target.value)}
                    className="px-3 py-1.5 bg-slate-700 border border-slate-600 text-slate-200 rounded-md text-sm focus:outline-none focus:border-teal-400"
                  >
                    <option value="">Select folder...</option>
                    {availableFolders.map(folder => (
                      <option key={folder} value={folder}>{folder}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkMove}
                    disabled={!targetFolder}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md transition-colors text-sm font-medium"
                  >
                    Move
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkMove(false);
                      setTargetFolder('');
                    }}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {folderCards.length > 0 ? (
        <CardGrid 
          cards={folderCards} 
          {...cardGridProps}
          selectedCardIds={selectedCardIds}
          setSelectedCardIds={setSelectedCardIds}
        />
      ) : (
        <p className="text-slate-400 text-center py-12">No cards in this folder.</p>
      )}
    </>
  );
}

FolderView.propTypes = {
  folderName: PropTypes.string.isRequired,
  groupedByFolder: PropTypes.object.isRequired,
  inventorySearch: PropTypes.string,
  cardGridProps: PropTypes.object.isRequired,
  folderOps: PropTypes.shape({
    folderMetadata: PropTypes.object,
    editingFolderName: PropTypes.string,
    setEditingFolderName: PropTypes.func,
    editingFolderDesc: PropTypes.string,
    setEditingFolderDesc: PropTypes.func,
    setFolderMetadata: PropTypes.func,
    createdFolders: PropTypes.array,
    moveInventoryItemToFolder: PropTypes.func,
  }).isRequired,
  setSellModalData: PropTypes.func.isRequired,
  setShowSellModal: PropTypes.func.isRequired,
  onDeleteFolder: PropTypes.func.isRequired,
  sortField: PropTypes.oneOf(['name', 'price', 'quantity', 'set', 'dateAdded']),
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
  decklistFilter: PropTypes.oneOf(['all', 'in-decklist', 'not-in-decklist']),
  setDecklistFilter: PropTypes.func,
  decklistCardNames: PropTypes.instanceOf(Set),
  deleteInventoryItem: PropTypes.func,
};

export default FolderView;
