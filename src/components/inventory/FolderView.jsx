import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CardGrid } from './CardGrid';
import { FolderHeader } from './FolderHeader';

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
}) {
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
    
    return { folderCards: cards, availableCardsStats: stats, folderDesc: desc };
  }, [folderName, groupedByFolder, inventorySearch, folderOps.folderMetadata]);

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
      {folderCards.length > 0 ? (
        <CardGrid cards={folderCards} {...cardGridProps} />
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
  }).isRequired,
  setSellModalData: PropTypes.func.isRequired,
  setShowSellModal: PropTypes.func.isRequired,
  onDeleteFolder: PropTypes.func.isRequired,
};

export default FolderView;
