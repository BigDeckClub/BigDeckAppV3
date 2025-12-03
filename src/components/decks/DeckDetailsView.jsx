import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X, Trash2, ChevronDown } from 'lucide-react';
import { getSetDisplayName } from '../../utils/cardHelpers';

/**
 * DeckDetailsView component - Displays detailed view of a single deck
 */
export function DeckDetailsView({
  deck,
  inventoryByName,
  onBack,
  onDelete,
  onUpdateDescription
}) {
  const [showMissing, setShowMissing] = useState(false);

  // Compute missing cards
  const missingEntries = (deck.cards || []).map((card) => {
    const nameKey = (card.name || '').toLowerCase().trim();
    const available = inventoryByName?.[nameKey] || 0;
    const needed = Math.max(0, (card.quantity || 1) - available);
    return { name: card.name, needed, set: card.set };
  }).filter(m => m.needed > 0);
  const totalMissing = missingEntries.reduce((sum, m) => sum + m.needed, 0);
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-teal-300 hover:text-teal-200 flex items-center gap-2 mb-4"
      >
        <X className="w-4 h-4" />
        Back to Decks
      </button>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-teal-300">{deck.name}</h2>
            <p className="text-slate-400 mt-1">
              {deck.format} • {(deck.cards && deck.cards.length) || 0} cards
              {totalMissing > 0 && (
                <span className="ml-2 text-red-400 font-semibold">• {totalMissing} missing</span>
              )}
            </p>
          </div>
          <button
            onClick={() => onDelete(deck.id)}
            className="text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">Description</label>
          <textarea
            value={deck.description || ''}
            onChange={(e) => onUpdateDescription(deck.id, e.target.value)}
            placeholder="Add deck notes, strategy, etc."
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 resize-none"
            rows="3"
          />
        </div>

        {(!deck.cards || deck.cards.length === 0) ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No cards in this deck yet. Add cards from your inventory!</p>
          </div>
        ) : (
          <div className="bg-slate-900 rounded p-4 max-h-96 overflow-y-auto">
            <h3 className="text-teal-300 font-semibold mb-3">Deck Cards</h3>
            <div className="space-y-2">
              {deck.cards.map((card, idx) => {
                const nameKey = (card.name || '').toLowerCase().trim();
                const available = inventoryByName?.[nameKey] || 0;
                const needed = Math.max(0, (card.quantity || 1) - available);
                const isMissing = needed > 0;
                return (
                  <div
                    key={idx}
                    className={`flex justify-between text-sm p-2 rounded ${
                      isMissing
                        ? 'bg-red-900/40 text-red-200 border border-red-700/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>
                      {card.quantity}x {card.name}
                      {isMissing && <span className="ml-2 text-xs text-red-300">(need {needed})</span>}
                    </span>
                    <span className="text-slate-500">{getSetDisplayName(card.set, true)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalMissing > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowMissing(prev => !prev)}
              className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-red-700/20 to-red-800/10 hover:from-red-700/30 hover:to-red-800/20 rounded-lg text-sm font-semibold text-red-300 border border-red-700/30"
            >
              <span>❌ Missing Cards ({totalMissing})</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${showMissing ? 'rotate-180' : ''}`} />
            </button>
            {showMissing && (
              <div className="mt-2 bg-slate-900 rounded-lg p-3 max-h-48 overflow-y-auto border border-red-700/20">
                {missingEntries.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-red-900/40 text-red-200 rounded px-3 py-2 mb-1">
                    <span><span className="font-bold">{m.needed}x</span> {m.name}</span>
                    <span className="text-xs text-red-300">{getSetDisplayName(m.set, true)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-4">
          Created: {new Date(deck.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

DeckDetailsView.propTypes = {
  deck: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    format: PropTypes.string,
    description: PropTypes.string,
    created_at: PropTypes.string,
    cards: PropTypes.arrayOf(PropTypes.shape({
      quantity: PropTypes.number,
      name: PropTypes.string,
      set: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
          editioncode: PropTypes.string,
          editionname: PropTypes.string,
          editiondate: PropTypes.string,
          editiontype: PropTypes.string,
          mtgoCode: PropTypes.string
        })
      ])
    }))
  }).isRequired,
  inventoryByName: PropTypes.object,
  onBack: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateDescription: PropTypes.func.isRequired
};

export default DeckDetailsView;
