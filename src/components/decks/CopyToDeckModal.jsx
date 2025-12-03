import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

/**
 * CopyToDeckModal component - Modal for copying a deck to inventory
 */
export function CopyToDeckModal({
  deck,
  copyDeckName,
  onCopyDeckNameChange,
  isCopying,
  onCopy,
  onCancel
}) {
  // Memoize cards count calculation to avoid recalculating on every render
  const cardsCount = useMemo(() => {
    return (deck.cards || []).reduce((sum, c) => sum + (c.quantity || 1), 0);
  }, [deck.cards]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg border border-teal-500 p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-teal-300">Copy to Inventory Deck</h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-slate-300 mb-4">
          This will create a deck in your Inventory tab and reserve the cheapest available copies of each card.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1">Deck Name</label>
          <input
            type="text"
            value={copyDeckName}
            onChange={(e) => onCopyDeckNameChange(e.target.value)}
            placeholder="Enter deck name"
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            autoFocus
          />
        </div>
        
        <div className="bg-slate-900 rounded p-3 mb-4">
          <p className="text-sm text-slate-400">
            Source: <span className="text-teal-300">{deck.name}</span>
          </p>
          <p className="text-sm text-slate-400">
            Cards: <span className="text-teal-300">{cardsCount}</span>
          </p>
          <p className="text-sm text-slate-400">
            Format: <span className="text-teal-300">{deck.format}</span>
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
            disabled={isCopying}
          >
            Cancel
          </button>
          <button
            onClick={onCopy}
            disabled={isCopying || !copyDeckName.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {isCopying ? 'Copying...' : 'Copy to Deck'}
          </button>
        </div>
      </div>
    </div>
  );
}

CopyToDeckModal.propTypes = {
  deck: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    format: PropTypes.string,
    cards: PropTypes.array
  }).isRequired,
  copyDeckName: PropTypes.string.isRequired,
  onCopyDeckNameChange: PropTypes.func.isRequired,
  isCopying: PropTypes.bool.isRequired,
  onCopy: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default CopyToDeckModal;
