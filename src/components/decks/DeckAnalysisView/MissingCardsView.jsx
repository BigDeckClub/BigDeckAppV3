import { memo, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  AlertCircle, Search, X, Download, Copy, Check,
  ShoppingCart, List, Grid3X3, SortAsc, SortDesc
} from 'lucide-react';
import { EXTERNAL_APIS } from '../../../config/api';

/**
 * MissingCardsView - Display and manage missing cards list
 */
export const MissingCardsView = memo(function MissingCardsView({
  missingCards,
  estimatedCost,
  onExportCSV,
  onOpenBuyModal,
  getCardImageUrl
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('missing');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('list');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    return missingCards
      .filter(card => !searchQuery || card.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'quantity':
            comparison = b.totalRequired - a.totalRequired;
            break;
          case 'decks':
            comparison = b.decks.length - a.decks.length;
            break;
          case 'missing':
          default:
            comparison = b.missing - a.missing;
        }
        return sortOrder === 'asc' ? -comparison : comparison;
      });
  }, [missingCards, searchQuery, sortBy, sortOrder]);

  const totalMissingCount = useMemo(() =>
    filteredCards.reduce((sum, card) => sum + card.missing, 0),
    [filteredCards]
  );

  // Copy to clipboard
  const copyToClipboard = () => {
    const text = missingCards
      .map(card => `${card.missing}x ${card.name}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
  };

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

      {/* Actions Bar */}
      <div className="bg-ui-card rounded-lg border border-ui-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-red-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Missing Cards ({missingCards.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {missingCards.length > 0 && (
              <button
                onClick={onOpenBuyModal}
                className="flex items-center gap-2 px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors text-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Missing
              </button>
            )}
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-3 py-2 bg-ui-surface hover:bg-ui-surface/60 text-ui-text rounded-lg transition-colors text-sm"
            >
              {copiedToClipboard ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy List
                </>
              )}
            </button>
            <button
              onClick={onExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-ui-surface hover:bg-ui-surface/60 text-ui-text rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Estimated Cost Banner */}
        <div className="mt-4 p-3 bg-emerald-900/30 rounded-lg border border-emerald-600/30">
          <div className="flex items-center justify-between">
            <span className="text-emerald-300 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Estimated Cost to Complete
            </span>
            <span className="text-2xl font-bold text-emerald-300">
              ${estimatedCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-ui-card rounded-lg border border-ui-border p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="w-full pl-10 pr-4 py-2 bg-ui-card/50 border border-ui-border rounded-lg text-ui-text placeholder-ui-muted focus:border-teal-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ui-muted hover:text-ui-text"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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
          <div className="flex gap-1 bg-ui-card/50 border border-ui-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-ui-muted hover:text-ui-text'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'text-ui-muted hover:text-ui-text'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Missing Cards List/Grid */}
      <div className="bg-ui-card rounded-lg border border-ui-border">
        {/* Header with count */}
        <div className="bg-ui-card/50 px-4 py-3 border-b border-ui-border">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-ui-muted">
              Showing <span className="text-red-300 font-semibold">{filteredCards.length}</span> unique cards
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
            <div className="text-sm text-ui-muted">
              Total missing: <span className="text-red-300 font-bold">{totalMissingCount}</span> cards
            </div>
          </div>
          {filteredCards.length > 6 && (
            <div className="text-xs text-amber-400 bg-amber-900/30 px-3 py-1.5 rounded border border-amber-600/30 text-center">
              Scroll down to see all {filteredCards.length} cards
            </div>
          )}
        </div>

        {/* Scrollable container */}
        <div
          className="overflow-auto border-l-4 border-red-500"
          style={{ maxHeight: '60vh' }}
        >
          {viewMode === 'list' ? (
            <div>
              {filteredCards.map((card, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-4 hover:bg-ui-surface/60 transition-colors ${idx !== filteredCards.length - 1 ? 'border-b border-ui-border' : ''}`}
                  onMouseEnter={(e) => setHoveredCard({ name: card.name, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 font-bold text-lg">#{idx + 1}</span>
                      <span className="text-ui-text font-medium">{card.name}</span>
                    </div>
                    <div className="text-xs text-ui-muted mt-1 ml-8">
                      Used in {card.decks.map(d => d.deckName).join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-right">
                      <div className="text-ui-muted">
                        Need <span className="text-blue-300 font-semibold">{card.totalRequired}</span>
                        {' / '}
                        Have <span className="text-green-300 font-semibold">{card.available}</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-red-400 w-16 text-right">
                      -{card.missing}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
              {filteredCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-ui-card rounded-lg border border-ui-border overflow-hidden hover:border-red-500/50 transition-colors"
                  onMouseEnter={(e) => setHoveredCard({ name: card.name, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="aspect-[3/4] bg-ui-card/50 relative">
                    <img
                      src={getCardImageUrl(card.name)}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 hidden items-center justify-center bg-ui-card text-ui-muted text-sm p-2 text-center">
                      {card.name}
                    </div>
                    <div className="absolute top-2 right-2 bg-red-600 text-white font-bold px-2 py-1 rounded text-sm">
                      -{card.missing}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-xs text-ui-text truncate font-medium">{card.name}</div>
                    <div className="text-xs text-ui-muted">{card.decks.length} deck(s)</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {filteredCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-ui-muted">
              <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
              {searchQuery ? (
                <p>No missing cards match "{searchQuery}"</p>
              ) : (
                <p>No missing cards found - your decks are complete!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MissingCardsView.propTypes = {
  missingCards: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    totalRequired: PropTypes.number.isRequired,
    available: PropTypes.number.isRequired,
    missing: PropTypes.number.isRequired,
    decks: PropTypes.array.isRequired
  })).isRequired,
  estimatedCost: PropTypes.number.isRequired,
  onExportCSV: PropTypes.func.isRequired,
  onOpenBuyModal: PropTypes.func.isRequired,
  getCardImageUrl: PropTypes.func.isRequired
};

export default MissingCardsView;
