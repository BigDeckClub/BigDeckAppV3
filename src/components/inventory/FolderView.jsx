import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CheckSquare, Square, FolderInput } from 'lucide-react';
import { CardGrid } from './CardGrid';
import { FolderHeader } from './FolderHeader';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { sortCards } from '../../utils/sortCards';

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
}) {
  const { showToast } = useToast();
  const [selectedCardIds, setSelectedCardIds] = useState(new Set());
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [targetFolder, setTargetFolder] = useState('');
  // Calculate folder cards and stats
  const { folderCards, availableCardsStats, folderDesc } = useMemo(() => {
    const folderData = groupedByFolder[folderName] || {};
    
    const cards = Object.entries(folderData).filter(([cardName, items]) => {
      const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const reservedQty = items.reduce((sum, item) => sum + (parseInt(item.reserved_quantity) || 0), 0);
      return matchesSearch && (totalQty - reservedQty) > 0;
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
  }, [folderName, groupedByFolder, inventorySearch, folderOps.folderMetadata, sortField, sortDirection]);

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
    
    try {
      let successCount = 0;
      for (const cardId of selectedCardIds) {
        await folderOps.moveInventoryItemToFolder(cardId, targetFolder);
        successCount++;
      }
      
      showToast(
        `Moved ${successCount} card${successCount === 1 ? '' : 's'} to ${targetFolder}`,
        TOAST_TYPES.SUCCESS
      );
      
      // Reset selection
      setSelectedCardIds(new Set());
      setShowBulkMove(false);
      setTargetFolder('');
    } catch (error) {
      showToast(`Failed to move cards: ${error.message}`, TOAST_TYPES.ERROR);
    }
  }, [targetFolder, selectedCardIds, folderOps, showToast]);

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
          
          {selectedCardIds.size > 0 && (
            <div className="flex items-center gap-2">
              {!showBulkMove ? (
                <button
                  onClick={() => setShowBulkMove(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-md transition-colors text-sm font-medium"
                >
                  <FolderInput className="w-4 h-4" />
                  Move to Folder
                </button>
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
  sortField: PropTypes.string,
  sortDirection: PropTypes.string,
};

export default FolderView;
