import { memo, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Search, Eye } from 'lucide-react';

/**
 * SharedCardsView - Display cards that appear in multiple decks
 */
export const SharedCardsView = memo(function SharedCardsView({
  sharedCards,
  getCardImageUrl
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);

  const filteredCards = useMemo(() =>
    sharedCards.filter(card =>
      !searchQuery || card.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [sharedCards, searchQuery]
  );

  return (
    <div className="space-y-4">
      {/* Card Preview Tooltip */}
      {hoveredCard && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: Math.min(window.innerWidth - 260, Math.max(10, hoveredCard.x)),
            top: Math.min(window.innerHeight - 370, Math.max(10, hoveredCard.y - 180))
          }}
        >
          <div className="bg-ui-card rounded-lg shadow-2xl border border-ui-border p-2">
            <img
              src={getCardImageUrl(hoveredCard.name)}
              alt={hoveredCard.name}
              className="w-60 h-auto rounded"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>
      )}

      <div className="bg-ui-card rounded-lg border border-ui-border p-4">
        <h3 className="text-lg font-semibold text-teal-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Shared Cards ({sharedCards.length})
        </h3>
        <p className="text-sm text-ui-muted mt-1">
          Cards that appear in multiple selected decks - these share inventory across decks
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search shared cards..."
          className="w-full pl-10 pr-4 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text placeholder-ui-muted focus:border-teal-500 focus:outline-none"
        />
      </div>

      <div className="bg-ui-card rounded-lg border border-ui-border overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto divide-y divide-ui-border">
          {filteredCards.map((card, idx) => (
            <div
              key={idx}
              className="p-4 hover:bg-ui-surface/60 transition-colors"
              onMouseEnter={(e) => setHoveredCard({ name: card.name, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-ui-muted" />
                    <span className="text-ui-text font-medium">{card.name}</span>
                    <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded">
                      {card.decks.length} decks
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    <span className="text-blue-300 font-semibold">{card.totalRequired}</span>
                    <span className="text-ui-muted mx-1">/</span>
                    <span className="text-green-300 font-semibold">{card.available}</span>
                  </div>
                  {card.totalRequired > card.available && (
                    <div className="text-xs text-red-400 mt-1">
                      Need {card.totalRequired - card.available} more
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {card.decks.map((deckInfo, i) => (
                  <span
                    key={i}
                    className="text-xs bg-ui-surface text-ui-text px-2 py-1 rounded"
                  >
                    {deckInfo.deckName}: {deckInfo.quantity}×{deckInfo.copies}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SharedCardsView.propTypes = {
  sharedCards: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    totalRequired: PropTypes.number.isRequired,
    available: PropTypes.number.isRequired,
    decks: PropTypes.array.isRequired
  })).isRequired,
  getCardImageUrl: PropTypes.func.isRequired
};

export default SharedCardsView;
