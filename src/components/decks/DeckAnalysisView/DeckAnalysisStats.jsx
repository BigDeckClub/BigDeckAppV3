import { memo } from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * DeckAnalysisStats - Individual deck statistics with completion bars
 */
export const DeckAnalysisStats = memo(function DeckAnalysisStats({
  deckStats,
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
          <TrendingUp className="w-5 h-5" />
          Individual Deck Stats
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-ui-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-ui-muted" />
        )}
      </button>
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {deckStats.map(stat => (
            <div key={stat.deckId} className="bg-ui-card/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-ui-text font-medium">{stat.deckName}</span>
                  {stat.copies > 1 && (
                    <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded">
                      {stat.copies}x
                    </span>
                  )}
                </div>
                <span className={`font-bold ${
                  stat.completion === 100 ? 'text-green-400' :
                  stat.completion >= 75 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {stat.completion.toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                <div>
                  <div className="text-ui-muted">Required</div>
                  <div className="text-blue-300 font-semibold">{stat.required}</div>
                </div>
                <div>
                  <div className="text-ui-muted">Owned</div>
                  <div className="text-green-300 font-semibold">{stat.owned}</div>
                </div>
                <div>
                  <div className="text-ui-muted">Missing</div>
                  <div className="text-red-300 font-semibold">{stat.missing}</div>
                </div>
              </div>
              <div className="bg-ui-card/50 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    stat.completion === 100 ? 'bg-green-500' :
                    stat.completion >= 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, stat.completion)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

DeckAnalysisStats.propTypes = {
  deckStats: PropTypes.arrayOf(PropTypes.shape({
    deckId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    deckName: PropTypes.string.isRequired,
    copies: PropTypes.number.isRequired,
    required: PropTypes.number.isRequired,
    owned: PropTypes.number.isRequired,
    missing: PropTypes.number.isRequired,
    completion: PropTypes.number.isRequired
  })).isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
};

export default DeckAnalysisStats;
