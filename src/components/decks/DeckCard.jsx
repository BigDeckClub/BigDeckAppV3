import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Download, Edit2, Trash2 } from 'lucide-react';

/**
 * DeckCard component - Displays a single deck in the deck list grid
 */
export function DeckCard({
  deck,
  editingDeck,
  inventoryByName,
  onSelect,
  onCopy,
  onEdit,
  onDelete,
  onUpdateName,
  onCancelEdit
}) {
  const [showMissing, setShowMissing] = useState(false);

  // Compute missing cards based on inventory mapping passed from parent
  const missingEntries = (deck.cards || []).map((card) => {
    const nameKey = (card.name || '').toLowerCase().trim();
    const available = inventoryByName?.[nameKey] || 0;
    const needed = Math.max(0, (card.quantity || 1) - available);
    return { name: card.name, needed, set: card.set };
  }).filter(m => m.needed > 0);
  const totalMissing = missingEntries.reduce((sum, m) => sum + m.needed, 0);
  return (
    <div
      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-teal-500/20"
      onClick={() => onSelect(deck)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-teal-300 break-words">{deck.name}</h3>
          <p className="text-xs text-slate-400 mt-1">{deck.format}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopy(deck);
            }}
            className="text-slate-300 hover:text-green-400 hover:bg-green-600/20 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
            title="Copy to Inventory - Name your deck instance"
          >
            <Download className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(deck.id);
            }}
            className="text-slate-400 hover:text-teal-400 transition-colors bg-slate-700 hover:bg-slate-600 p-1.5 rounded"
            title="Edit deck name"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(deck.id);
            }}
            className="text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {editingDeck === deck.id ? (
        <input
          type="text"
          defaultValue={deck.name}
          placeholder="Deck name"
          className="w-full bg-slate-700 border border-teal-600 rounded px-2 py-1 text-white text-sm mb-2"
          onBlur={(e) => {
            onUpdateName(deck.id, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onUpdateName(deck.id, e.currentTarget.value);
            }
            if (e.key === 'Escape') {
              onCancelEdit();
            }
          }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : null}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Cards:</span>
          <span className="text-teal-300 font-semibold">{(deck.cards && deck.cards.length) || 0}</span>
        </div>
        <div className="text-xs text-slate-500">
          Created: {new Date(deck.created_at).toLocaleDateString()}
        </div>
        {deck.description && (
          <p className="text-xs text-slate-400 italic mt-2">{deck.description}</p>
        )}
      </div>

      {totalMissing > 0 && (
        <div className="mt-3">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMissing(prev => !prev); }}
            className="w-full flex items-center justify-between p-2 bg-gradient-to-r from-red-700/20 to-red-800/10 hover:from-red-700/30 hover:to-red-800/20 rounded text-sm font-semibold text-red-300 border border-red-700/30"
          >
            <span>Missing to complete: {totalMissing}</span>
            <span className="text-xs text-red-200">{showMissing ? '▲' : '▼'}</span>
          </button>
          {showMissing && (
            <div className="mt-2 bg-slate-900 rounded p-2 max-h-40 overflow-y-auto border border-red-700/20">
              {missingEntries.map((m, i) => (
                <div key={i} className="flex justify-between items-center text-sm bg-red-900/40 text-red-200 rounded px-2 py-1 mb-1">
                  <div>
                    <span className="font-semibold">{m.needed}x</span>
                    <span className="ml-2">{m.name}</span>
                    <span className="text-xs text-red-200 ml-2">{(m.set && (typeof m.set === 'string' ? m.set : (m.set.editioncode || m.set.editionname))) || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => onSelect(deck)}
        className="w-full mt-4 bg-slate-700 hover:bg-teal-600 text-white px-3 py-1 rounded text-sm transition-colors"
      >
        View Details
      </button>
    </div>
  );
}

DeckCard.propTypes = {
  deck: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    format: PropTypes.string,
    description: PropTypes.string,
    created_at: PropTypes.string,
    cards: PropTypes.array
  }).isRequired,
  editingDeck: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  inventoryByName: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateName: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired
};

export default DeckCard;
