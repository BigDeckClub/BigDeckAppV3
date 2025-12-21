import { memo, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Search, Filter, Eye, CheckCircle2, SortAsc, SortDesc } from 'lucide-react';

/**
 * BreakdownView - Full breakdown of all cards across selected decks
 */
export const BreakdownView = memo(function BreakdownView({
  cardRequirements,
  getCardImageUrl
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('missing');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);
  const [filterColor, setFilterColor] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [hoveredCard, setHoveredCard] = useState(null);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let cards = [...cardRequirements];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      cards = cards.filter(card =>
        card.name.toLowerCase().includes(query)
      );
    }

    // Apply missing only filter
    if (filterMissingOnly) {
      cards = cards.filter(card => card.totalRequired > card.available);
    }

    // Apply color filter
    if (filterColor !== 'all') {
      cards = cards.filter(card =>
        card.metadata?.colors?.includes(filterColor) ||
        (filterColor === 'C' && card.metadata?.colors?.length === 0)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      cards = cards.filter(card =>
        card.metadata?.types?.some(t => t.toLowerCase() === filterType.toLowerCase())
      );
    }

    // Apply sorting
    cards.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'missing':
          comparison = (b.totalRequired - b.available) - (a.totalRequired - a.available);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'quantity':
          comparison = b.totalRequired - a.totalRequired;
          break;
        case 'decks':
          comparison = b.decks.length - a.decks.length;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return cards;
  }, [cardRequirements, searchQuery, filterMissingOnly, sortBy, sortOrder]);

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

      {/* Search and Filters */}
      <div className="bg-ui-card rounded-lg border border-ui-border p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all cards..."
              className="w-full pl-10 pr-4 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text placeholder-ui-muted focus:border-teal-500 focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ui-muted cursor-pointer">
            <input
              type="checkbox"
              checked={filterMissingOnly}
              onChange={(e) => setFilterMissingOnly(e.target.checked)}
              className="w-4 h-4 rounded border-ui-border text-teal-500 focus:ring-teal-500"
            />
            <Filter className="w-4 h-4" />
            Missing only
          </label>
          <select
            value={filterColor}
            onChange={(e) => setFilterColor(e.target.value)}
            className="px-3 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All Colors</option>
            <option value="W">White</option>
            <option value="U">Blue</option>
            <option value="B">Black</option>
            <option value="R">Red</option>
            <option value="G">Green</option>
            <option value="C">Colorless</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text focus:border-teal-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="Creature">Creatures</option>
            <option value="Instant">Instants</option>
            <option value="Sorcery">Sorceries</option>
            <option value="Artifact">Artifacts</option>
            <option value="Enchantment">Enchantments</option>
            <option value="Land">Lands</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text focus:border-teal-500 focus:outline-none"
          >
            <option value="missing">Sort by Missing</option>
            <option value="name">Sort by Name</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="decks">Sort by # Decks</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-muted hover:text-ui-text"
          >
            {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
          </button>
        </div>
        <div className="mt-3 text-sm text-ui-muted">
          Showing {filteredCards.length} of {cardRequirements.length} unique cards
        </div>
      </div>

      {/* All Cards List */}
      <div className="bg-ui-card rounded-lg border border-ui-border overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {filteredCards.map((card, idx) => {
            const missing = Math.max(0, card.totalRequired - card.available);
            const isComplete = missing === 0;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 border-b border-ui-border last:border-0 hover:bg-ui-surface/30 transition-colors ${isComplete ? 'bg-green-900/10' : ''
                  }`}
                onMouseEnter={(e) => setHoveredCard({ name: card.name, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Eye className="w-4 h-4 text-ui-muted flex-shrink-0" />
                  <span className="text-ui-text">{card.name}</span>
                  {card.decks.length > 1 && (
                    <span className="text-xs bg-teal-600/50 text-teal-200 px-1.5 py-0.5 rounded">
                      {card.decks.length} decks
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">
                    <span className="text-blue-300">{card.totalRequired}</span>
                    <span className="text-ui-muted mx-1">/</span>
                    <span className="text-green-300">{card.available}</span>
                  </span>
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <span className="text-red-400 font-semibold w-12 text-right">-{missing}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

BreakdownView.propTypes = {
  cardRequirements: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    totalRequired: PropTypes.number.isRequired,
    available: PropTypes.number.isRequired,
    decks: PropTypes.array.isRequired
  })).isRequired,
  getCardImageUrl: PropTypes.func.isRequired
};

export default BreakdownView;
