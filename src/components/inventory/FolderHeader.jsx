import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { DollarSign, Trash2 } from 'lucide-react';

/**
 * FolderHeader - Header component for folder view
 * Shows folder name, description, stats, sell button, and delete button
 */
export const FolderHeader = memo(function FolderHeader({
  folderName,
  folderDesc,
  totalCards,
  uniqueCards,
  totalCost,
  editingFolderName,
  setEditingFolderName,
  editingFolderDesc,
  setEditingFolderDesc,
  setFolderMetadata,
  setSellModalData,
  setShowSellModal,
  onDeleteFolder,
  isUnsorted
}) {
  return (
    <div className="bg-[var(--bda-surface)] rounded-lg border border-[var(--bda-border)] p-4 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-[var(--bda-primary)]">{folderName === 'Uncategorized' ? 'Unsorted' : folderName}</h2>
          {editingFolderName === folderName ? (
            <input
              type="text"
              value={editingFolderDesc}
              onChange={(e) => setEditingFolderDesc(e.target.value)}
              onBlur={() => {
                setFolderMetadata(prev => ({ ...prev, [folderName]: { description: editingFolderDesc } }));
                setEditingFolderName(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setFolderMetadata(prev => ({ ...prev, [folderName]: { description: editingFolderDesc } }));
                  setEditingFolderName(null);
                }
              }}
              placeholder="Add folder description..."
              className="w-full mt-1 px-2 py-1 bg-[var(--input-bg)] border border-[var(--bda-border)] rounded text-[var(--bda-text)] placeholder-[var(--bda-muted)] focus:outline-none focus:border-[var(--bda-primary)]"
              autoFocus
            />
          ) : (
            <p
              onClick={() => {
                setEditingFolderName(folderName);
                setEditingFolderDesc(folderDesc);
              }}
              className="text-sm text-[var(--bda-muted)] mt-1 cursor-pointer hover:text-[var(--bda-text)] transition-colors"
            >
              {folderDesc || 'Click to add description...'}
            </p>
          )}
          <div className="flex gap-4 mt-3 text-sm">
            <div>
              <span className="text-[var(--bda-muted)]">Cards: </span>
              <span className="font-semibold text-[var(--bda-text)]">{totalCards}</span>
            </div>
            <div>
              <span className="text-[var(--bda-muted)]">Unique: </span>
              <span className="font-semibold text-[var(--bda-text)]">{uniqueCards}</span>
            </div>
            <div>
              <span className="text-[var(--bda-muted)]">Total Cost: </span>
              <span className="font-semibold text-green-400">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSellModalData({
                itemType: 'folder',
                itemId: null,
                itemName: folderName,
                purchasePrice: totalCost,
                quantity: totalCards
              });
              setShowSellModal(true);
            }}
            className="bg-green-600 hover:bg-green-500 text-white p-2 rounded transition-colors flex items-center"
            title="Sell this folder"
          >
            <DollarSign className="w-4 h-4" />
          </button>
          {!isUnsorted && onDeleteFolder && (
            <button
              onClick={() => onDeleteFolder(folderName)}
              className="bg-red-600 hover:bg-red-500 text-white p-2 rounded transition-colors flex items-center"
              title="Delete this folder"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

FolderHeader.propTypes = {
  folderName: PropTypes.string.isRequired,
  folderDesc: PropTypes.string.isRequired,
  totalCards: PropTypes.number.isRequired,
  uniqueCards: PropTypes.number.isRequired,
  totalCost: PropTypes.number.isRequired,
  editingFolderName: PropTypes.string,
  setEditingFolderName: PropTypes.func.isRequired,
  editingFolderDesc: PropTypes.string.isRequired,
  setEditingFolderDesc: PropTypes.func.isRequired,
  setFolderMetadata: PropTypes.func.isRequired,
  setSellModalData: PropTypes.func.isRequired,
  setShowSellModal: PropTypes.func.isRequired,
  onDeleteFolder: PropTypes.func,
  isUnsorted: PropTypes.bool
};

export default FolderHeader;
