/**
 * Deck Statistics Sidebar
 * Displays deck composition stats and analytics
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Card from '../ui/Card';

export default function DeckStatsSidebar({ deckCards }) {
  // Calculate deck stats
  const deckStats = useMemo(() => {
    if (!deckCards || deckCards.length === 0) return {};

    return deckCards.reduce((acc, card) => {
      const cat = card.category || 'Other';
      acc[cat] = (acc[cat] || 0) + (card.quantity || 1);
      return acc;
    }, {});
  }, [deckCards]);

  const maxStat = useMemo(() => {
    return Math.max(...Object.values(deckStats), 1);
  }, [deckStats]);

  const totalCards = useMemo(() => {
    return Object.values(deckStats).reduce((sum, count) => sum + count, 0);
  }, [deckStats]);

  // Category display order and colors
  const categoryConfig = {
    Commander: { color: 'from-yellow-500 to-amber-600', icon: '👑' },
    Creatures: { color: 'from-green-500 to-emerald-600', icon: '🐉' },
    Instants: { color: 'from-blue-500 to-cyan-600', icon: '⚡' },
    Sorceries: { color: 'from-purple-500 to-violet-600', icon: '✨' },
    Artifacts: { color: 'from-gray-400 to-gray-600', icon: '⚙️' },
    Enchantments: { color: 'from-pink-500 to-rose-600', icon: '🔮' },
    Planeswalkers: { color: 'from-indigo-500 to-blue-600', icon: '🌟' },
    Lands: { color: 'from-amber-600 to-orange-700', icon: '🏔️' },
    Other: { color: 'from-gray-500 to-slate-600', icon: '📦' }
  };

  const displayOrder = [
    'Commander',
    'Creatures',
    'Instants',
    'Sorceries',
    'Artifacts',
    'Enchantments',
    'Planeswalkers',
    'Lands',
    'Other'
  ];

  return (
    <Card className="h-full">
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
          <span className="text-2xl">📊</span>
          Deck Statistics
        </h3>

        {/* Total Cards */}
        <div className="mb-6 p-4 bg-ui-secondary rounded-lg border border-ui-border">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{totalCards}</div>
            <div className="text-sm text-ui-muted">Total Cards</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          {displayOrder
            .filter(category => deckStats[category] > 0)
            .map(category => {
              const count = deckStats[category];
              const percentage = (count / maxStat) * 100;
              const config = categoryConfig[category] || categoryConfig.Other;

              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ui-muted flex items-center gap-2">
                      <span>{config.icon}</span>
                      {category}
                    </span>
                    <span className="font-medium text-white">{count}</span>
                  </div>
                  <div className="h-2 bg-ui-tertiary rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${config.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Empty State */}
        {totalCards === 0 && (
          <div className="text-center text-ui-muted py-8">
            <div className="text-4xl mb-2">📭</div>
            <p>No cards in deck</p>
          </div>
        )}
      </div>
    </Card>
  );
}

DeckStatsSidebar.propTypes = {
  deckCards: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      category: PropTypes.string,
      quantity: PropTypes.number
    })
  ).isRequired
};
