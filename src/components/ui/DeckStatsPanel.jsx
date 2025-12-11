/**
 * DeckStatsPanel - Comprehensive deck statistics display
 * @module components/ui/DeckStatsPanel
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Layers,
  DollarSign,
  BarChart3,
  Percent,
  TrendingUp,
  Package,
  Sparkles,
  Zap,
  Shield,
  Target,
} from 'lucide-react';

/**
 * Format currency for display
 */
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0.00';
  return `$${parseFloat(value).toFixed(2)}`;
};

/**
 * Stat card component
 */
const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'teal',
  size = 'md',
}) {
  const colors = {
    teal: 'from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
  };

  const sizes = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      className={`
        bg-gradient-to-br ${colors[color]} border rounded-xl
        ${sizes[size]}
      `}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ui-muted uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-bold ${colors[color].split(' ').pop()}`}>{value}</p>
          {subValue && (
            <p className="text-xs text-ui-muted mt-1">{subValue}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg bg-ui-surface/50 ${colors[color].split(' ').pop()}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
});

StatCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subValue: PropTypes.string,
  color: PropTypes.oneOf(['teal', 'blue', 'purple', 'amber', 'emerald', 'red']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

/**
 * Progress bar component
 */
const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  color = 'teal',
  showLabel = true,
  height = 'md',
}) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const colors = {
    teal: 'bg-teal-500',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="space-y-1">
      <div className={`bg-ui-surface rounded-full overflow-hidden ${heights[height]}`}>
        <div
          className={`${colors[color]} ${heights[height]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-ui-muted">
          <span>{value} / {max}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
});

ProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  max: PropTypes.number,
  color: PropTypes.string,
  showLabel: PropTypes.bool,
  height: PropTypes.oneOf(['sm', 'md', 'lg']),
};

/**
 * Type breakdown item
 */
const TypeBreakdownItem = memo(function TypeBreakdownItem({ type, count, total, icon: Icon }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-ui-card flex items-center justify-center">
        <Icon className="w-4 h-4 text-ui-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-ui-text">{type}</span>
          <span className="text-sm font-medium text-ui-muted">{count}</span>
        </div>
        <div className="h-1.5 bg-ui-surface/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
});

TypeBreakdownItem.propTypes = {
  type: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  icon: PropTypes.elementType.isRequired,
};

/**
 * Get icon for card type
 */
const getTypeIcon = (type) => {
  const typeIcons = {
    Creature: Target,
    Instant: Zap,
    Sorcery: Sparkles,
    Enchantment: Shield,
    Artifact: Package,
    Planeswalker: Sparkles,
    Land: Layers,
  };
  return typeIcons[type] || Layers;
};

/**
 * DeckStatsPanel - Main stats panel component
 */
export const DeckStatsPanel = memo(function DeckStatsPanel({
  cards = [],
  totalValue = 0,
  completionPercentage = 100,
  missingCount = 0,
  ownedCount = 0,
  averageCmc = 0,
  typeBreakdown = {},
  showTypeBreakdown = true,
  showValueStats = true,
  compact = false,
  className = '',
}) {
  // Calculate stats from cards
  const stats = useMemo(() => {
    const uniqueCards = cards.length;
    const totalCards = cards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    // Type counts
    const types = {};
    cards.forEach((card) => {
      const type = card.type_line?.split(' — ')[0]?.split(' ').pop() || 'Other';
      types[type] = (types[type] || 0) + (card.quantity || 1);
    });

    // Rarity counts
    const rarities = { mythic: 0, rare: 0, uncommon: 0, common: 0 };
    cards.forEach((card) => {
      const rarity = card.rarity?.toLowerCase() || 'common';
      if (rarities[rarity] !== undefined) {
        rarities[rarity] += card.quantity || 1;
      }
    });

    return {
      uniqueCards,
      totalCards,
      types: Object.keys(typeBreakdown).length > 0 ? typeBreakdown : types,
      rarities,
    };
  }, [cards, typeBreakdown]);

  if (compact) {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
        <StatCard
          icon={Layers}
          label="Cards"
          value={stats.totalCards}
          color="teal"
          size="sm"
        />
        <StatCard
          icon={Percent}
          label="Complete"
          value={`${completionPercentage.toFixed(0)}%`}
          color={completionPercentage >= 100 ? 'emerald' : completionPercentage >= 75 ? 'amber' : 'red'}
          size="sm"
        />
        <StatCard
          icon={BarChart3}
          label="Avg CMC"
          value={averageCmc.toFixed(2)}
          color="purple"
          size="sm"
        />
        {showValueStats && (
          <StatCard
            icon={DollarSign}
            label="Value"
            value={formatCurrency(totalValue)}
            color="emerald"
            size="sm"
          />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Total Cards"
          value={stats.totalCards}
          subValue={`${stats.uniqueCards} unique`}
          color="teal"
        />
        <StatCard
          icon={Percent}
          label="Completion"
          value={`${completionPercentage.toFixed(0)}%`}
          subValue={missingCount > 0 ? `${missingCount} missing` : 'Complete'}
          color={completionPercentage >= 100 ? 'emerald' : completionPercentage >= 75 ? 'amber' : 'red'}
        />
        <StatCard
          icon={BarChart3}
          label="Average CMC"
          value={averageCmc.toFixed(2)}
          subValue="Mana value"
          color="purple"
        />
        {showValueStats && (
          <StatCard
            icon={DollarSign}
            label="Total Value"
            value={formatCurrency(totalValue)}
            subValue="Estimated"
            color="emerald"
          />
        )}
      </div>

      {/* Completion progress */}
      <div className="bg-ui-surface/50 rounded-xl p-4 border border-ui-border">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-ui-heading flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-ui-accent" />
            Deck Completion
          </h4>
          <span className="text-sm text-ui-muted">
            {ownedCount} / {stats.totalCards} cards
          </span>
        </div>
        <ProgressBar
          value={ownedCount}
          max={stats.totalCards}
          color={completionPercentage >= 100 ? 'emerald' : completionPercentage >= 75 ? 'amber' : 'red'}
          height="lg"
        />
      </div>

      {/* Type breakdown */}
      {showTypeBreakdown && Object.keys(stats.types).length > 0 && (
        <div className="bg-ui-surface/50 rounded-xl p-4 border border-ui-border">
          <h4 className="text-sm font-medium text-ui-heading mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" />
            Card Type Breakdown
          </h4>
          <div className="space-y-3">
            {Object.entries(stats.types)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <TypeBreakdownItem
                  key={type}
                  type={type}
                  count={count}
                  total={stats.totalCards}
                  icon={getTypeIcon(type)}
                />
              ))}
          </div>
        </div>
      )}

      {/* Rarity breakdown */}
      <div className="bg-ui-surface/50 rounded-xl p-4 border border-ui-border">
        <h4 className="text-sm font-medium text-ui-heading mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Rarity Distribution
        </h4>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-orange-400">{stats.rarities.mythic}</div>
            <div className="text-xs text-ui-muted">Mythic</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-amber-400">{stats.rarities.rare}</div>
            <div className="text-xs text-ui-muted">Rare</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-ui-text">{stats.rarities.uncommon}</div>
            <div className="text-xs text-ui-muted">Uncommon</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-ui-text">{stats.rarities.common}</div>
            <div className="text-xs text-ui-muted">Common</div>
          </div>
        </div>
      </div>
    </div>
  );
});

DeckStatsPanel.propTypes = {
  /** Array of cards in the deck */
  cards: PropTypes.array,
  /** Total estimated value of the deck */
  totalValue: PropTypes.number,
  /** Completion percentage (0-100) */
  completionPercentage: PropTypes.number,
  /** Number of missing cards */
  missingCount: PropTypes.number,
  /** Number of owned cards */
  ownedCount: PropTypes.number,
  /** Average converted mana cost */
  averageCmc: PropTypes.number,
  /** Type breakdown object { type: count } */
  typeBreakdown: PropTypes.object,
  /** Whether to show type breakdown */
  showTypeBreakdown: PropTypes.bool,
  /** Whether to show value statistics */
  showValueStats: PropTypes.bool,
  /** Use compact layout */
  compact: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default DeckStatsPanel;
