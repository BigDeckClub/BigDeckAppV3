import { memo } from 'react';
import PropTypes from 'prop-types';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * DeckQuantitySelector - Collapsible section for adjusting deck quantities
 */
export const DeckQuantitySelector = memo(function DeckQuantitySelector({
  selectedDecks,
  deckQuantities,
  onQuantityChange,
  isExpanded,
  onToggle
}) {
  return (
    <div className="bg-ui-card rounded-lg border border-ui-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-ui-surface/60 transition-colors"
      >
        <h3 className="text-lg font-semibold text-teal-300 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Deck Quantities
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-ui-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-ui-muted" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedDecks.map(deck => (
            <div key={deck.id} className="bg-ui-card/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-ui-text font-medium truncate">{deck.name}</span>
                <span className="text-teal-300 font-bold text-lg ml-2">
                  {deckQuantities[deck.id] || 1}x
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={deckQuantities[deck.id] || 1}
                onChange={(e) => onQuantityChange(deck.id, parseInt(e.target.value))}
                className="w-full h-2 bg-ui-surface rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-xs text-ui-muted mt-1">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

DeckQuantitySelector.propTypes = {
  selectedDecks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired
  })).isRequired,
  deckQuantities: PropTypes.object.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

export default DeckQuantitySelector;
