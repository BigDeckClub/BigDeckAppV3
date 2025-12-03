import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CardGrid } from './CardGrid';

/**
 * TrashView - Renders the Trash folder view with empty trash functionality
 */
export function TrashView({
  groupedByFolder,
  inventorySearch,
  cardGridProps,
  confirm,
  emptyTrash,
}) {
  // Calculate trash cards and stats
  const { trashCards, trashStats } = useMemo(() => {
    const folderData = groupedByFolder['Trash'] || {};
    
    const cards = Object.entries(folderData).filter(([cardName, items]) => {
      const matchesSearch = inventorySearch === '' || cardName.toLowerCase().includes(inventorySearch.toLowerCase());
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      return matchesSearch && totalQty > 0;
    });
    
    const stats = Object.entries(folderData).reduce((acc, [, items]) => {
      const totalQty = items.reduce((s, item) => s + (item.quantity || 0), 0);
      if (totalQty > 0) {
        acc.uniqueCount++;
        acc.totalCount += totalQty;
        acc.totalCost += items.reduce((s, item) => s + ((item.purchase_price || 0) * (item.quantity || 0)), 0);
      }
      return acc;
    }, { uniqueCount: 0, totalCount: 0, totalCost: 0 });
    
    return { trashCards: cards, trashStats: stats };
  }, [groupedByFolder, inventorySearch]);

  const handleEmptyTrash = async () => {
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
  };

  return (
    <>
      <div className="bg-gradient-to-br from-red-900/30 to-slate-800 rounded-lg p-4 mb-4 border border-red-600/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗑️</span>
            <div>
              <h2 className="text-xl font-bold text-red-200">Trash</h2>
              <p className="text-sm text-red-300">
                {trashStats.totalCount} {trashStats.totalCount === 1 ? 'card' : 'cards'} • {trashStats.uniqueCount} unique • ${trashStats.totalCost.toFixed(2)} value
              </p>
            </div>
          </div>
          {trashStats.totalCount > 0 && (
            <button
              onClick={handleEmptyTrash}
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
}

TrashView.propTypes = {
  groupedByFolder: PropTypes.object.isRequired,
  inventorySearch: PropTypes.string,
  cardGridProps: PropTypes.object.isRequired,
  confirm: PropTypes.func.isRequired,
  emptyTrash: PropTypes.func,
};

export default TrashView;
