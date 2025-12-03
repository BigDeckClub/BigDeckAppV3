import React from 'react';
import PropTypes from 'prop-types';
import { X, Trash2 } from 'lucide-react';

/**
 * DeckDetailsView component - Displays detailed view of a single deck
 */
export function DeckDetailsView({
  deck,
  onBack,
  onDelete,
  onUpdateDescription
}) {
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
            <p className="text-slate-400 mt-1">{deck.format} • {(deck.cards && deck.cards.length) || 0} cards</p>
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
              {deck.cards.map((card, idx) => (
                <div key={idx} className="flex justify-between text-sm text-slate-300 bg-slate-800 p-2 rounded">
                  <span>{card.quantity}x {card.name}</span>
                  <span className="text-slate-500">{card.set}</span>
                </div>
              ))}
            </div>
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
      set: PropTypes.string
    }))
  }).isRequired,
  onBack: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUpdateDescription: PropTypes.func.isRequired
};

export default DeckDetailsView;
