import { memo } from 'react';
import PropTypes from 'prop-types';
import { BarChart3, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * OverviewSummary - Main summary stats and quick view sections
 */
export const OverviewSummary = memo(function OverviewSummary({
  analysis,
  selectedDecksCount,
  onViewMissing,
  onViewShared
}) {
  return (
    <>
      {/* Overall Summary */}
      <div className="bg-ui-card rounded-lg border border-ui-border p-6">
        <h2 className="text-2xl font-bold text-teal-300 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Multi-Deck Analysis
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-ui-card/50 rounded-lg p-4">
            <div className="text-ui-muted text-sm mb-1">Decks</div>
            <div className="text-2xl font-bold text-ui-primary">{selectedDecksCount}</div>
          </div>
          <div className="bg-ui-card/50 rounded-lg p-4">
            <div className="text-ui-muted text-sm mb-1">Cards Needed</div>
            <div className="text-2xl font-bold text-ui-accent">{analysis.totalCardsNeeded}</div>
          </div>
          <div className="bg-ui-card/50 rounded-lg p-4">
            <div className="text-ui-muted text-sm mb-1">Cards Owned</div>
            <div className="text-2xl font-bold text-ui-primary">{analysis.totalCardsOwned}</div>
          </div>
          <div className="bg-ui-card/50 rounded-lg p-4">
            <div className="text-ui-muted text-sm mb-1">Completion</div>
            <div className="text-2xl font-bold text-ui-accent">
              {analysis.completionRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-ui-card/50 rounded-lg p-4">
            <div className="text-ui-muted text-sm mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Est. Cost
            </div>
            <div className="text-2xl font-bold text-ui-primary">
              ${analysis.estimatedCost.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="bg-ui-surface rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-ui-primary transition-all duration-500"
            style={{ width: `${Math.min(100, analysis.completionRate)}%` }}
          />
        </div>
      </div>

      {/* Quick Stats Summary */}
      {analysis.missingCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-ui-card/50 rounded-lg border border-red-600/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-red-300 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Top Missing Cards
              </h4>
              <button
                onClick={onViewMissing}
                className="text-xs text-red-400 hover:text-red-300"
              >
                View All →
              </button>
            </div>
            <div className="space-y-1">
              {analysis.missingCards.slice(0, 5).map((card, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-ui-text truncate">{card.name}</span>
                  <span className="text-red-400 font-medium ml-2">-{card.missing}</span>
                </div>
              ))}
            </div>
          </div>

          {analysis.sharedCards.length > 0 && (
            <div className="bg-ui-card/50 rounded-lg border border-teal-600/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-teal-300 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Most Shared Cards
                </h4>
                <button
                  onClick={onViewShared}
                  className="text-xs text-teal-400 hover:text-teal-300"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-1">
                {analysis.sharedCards.slice(0, 5).map((card, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-ui-text truncate">{card.name}</span>
                    <span className="text-teal-400 font-medium ml-2">{card.decks.length} decks</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
});

OverviewSummary.propTypes = {
  analysis: PropTypes.shape({
    totalCardsNeeded: PropTypes.number.isRequired,
    totalCardsOwned: PropTypes.number.isRequired,
    completionRate: PropTypes.number.isRequired,
    estimatedCost: PropTypes.number.isRequired,
    missingCards: PropTypes.array.isRequired,
    sharedCards: PropTypes.array.isRequired
  }).isRequired,
  selectedDecksCount: PropTypes.number.isRequired,
  onViewMissing: PropTypes.func.isRequired,
  onViewShared: PropTypes.func.isRequired
};

export default OverviewSummary;
