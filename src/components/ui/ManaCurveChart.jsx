/**
 * ManaCurveChart - Visual mana curve display for deck analysis
 * @module components/ui/ManaCurveChart
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Get bar color based on index or CMC
 */
const getBarColor = (index) => {
  const colors = [
    'from-slate-500 to-slate-600',   // 0
    'from-teal-500 to-teal-600',     // 1
    'from-cyan-500 to-cyan-600',     // 2
    'from-blue-500 to-blue-600',     // 3
    'from-indigo-500 to-indigo-600', // 4
    'from-purple-500 to-purple-600', // 5
    'from-fuchsia-500 to-fuchsia-600', // 6
    'from-pink-500 to-pink-600',     // 7+
  ];
  return colors[Math.min(index, colors.length - 1)];
};

/**
 * Mana cost label
 */
const ManaLabel = memo(function ManaLabel({ cmc }) {
  if (cmc === 0) return <span className="text-slate-500">0</span>;
  if (cmc >= 7) return <span className="text-slate-400">7+</span>;
  return <span className="text-slate-400">{cmc}</span>;
});

ManaLabel.propTypes = {
  cmc: PropTypes.number.isRequired,
};

/**
 * Single bar in the curve
 */
const CurveBar = memo(function CurveBar({
  cmc,
  count,
  maxCount,
  showLabels = true,
  animated = true,
}) {
  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const barColor = getBarColor(cmc);

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      {/* Count label */}
      {showLabels && (
        <span className={`text-xs font-medium ${count > 0 ? 'text-white' : 'text-slate-600'}`}>
          {count > 0 ? count : ''}
        </span>
      )}

      {/* Bar container */}
      <div className="w-full h-32 bg-slate-800/50 rounded-t-lg relative flex items-end">
        <div
          className={`
            w-full rounded-t-lg bg-gradient-to-t ${barColor}
            ${animated ? 'transition-all duration-500 ease-out' : ''}
          `}
          style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0' }}
        />
      </div>

      {/* CMC label */}
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-medium">
        <ManaLabel cmc={cmc} />
      </div>
    </div>
  );
});

CurveBar.propTypes = {
  cmc: PropTypes.number.isRequired,
  count: PropTypes.number.isRequired,
  maxCount: PropTypes.number.isRequired,
  showLabels: PropTypes.bool,
  animated: PropTypes.bool,
};

/**
 * Stats row below the chart
 */
const CurveStats = memo(function CurveStats({ totalCards, averageCmc, landCount }) {
  return (
    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
      <div className="text-center">
        <div className="text-lg font-bold text-teal-400">{totalCards}</div>
        <div className="text-xs text-slate-500">Non-land cards</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-purple-400">{averageCmc.toFixed(2)}</div>
        <div className="text-xs text-slate-500">Average CMC</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-amber-400">{landCount}</div>
        <div className="text-xs text-slate-500">Lands</div>
      </div>
    </div>
  );
});

CurveStats.propTypes = {
  totalCards: PropTypes.number.isRequired,
  averageCmc: PropTypes.number.isRequired,
  landCount: PropTypes.number.isRequired,
};

/**
 * ManaCurveChart - Main component
 */
export const ManaCurveChart = memo(function ManaCurveChart({
  cards = [],
  manaCurve: externalCurve,
  showStats = true,
  showLabels = true,
  animated = true,
  title = 'Mana Curve',
  className = '',
}) {
  // Calculate mana curve from cards if not provided
  const { curve, stats } = useMemo(() => {
    if (externalCurve) {
      const totalCards = Object.values(externalCurve).reduce((a, b) => a + b, 0);
      const avgCmc = totalCards > 0
        ? Object.entries(externalCurve).reduce((sum, [cmc, count]) => {
            const cmcNum = cmc === '7+' ? 7 : parseInt(cmc, 10);
            return sum + (cmcNum * count);
          }, 0) / totalCards
        : 0;

      return {
        curve: externalCurve,
        stats: { totalCards, averageCmc: avgCmc, landCount: 0 },
      };
    }

    // Calculate from cards array
    const curveData = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, '7+': 0 };
    let totalCmc = 0;
    let nonLandCount = 0;
    let landCount = 0;

    cards.forEach((card) => {
      const qty = card.quantity || 1;
      const isLand = card.type_line?.toLowerCase().includes('land');

      if (isLand) {
        landCount += qty;
        return;
      }

      const cmc = card.cmc ?? card.mana_value ?? 0;
      nonLandCount += qty;
      totalCmc += cmc * qty;

      if (cmc >= 7) {
        curveData['7+'] += qty;
      } else {
        curveData[cmc] = (curveData[cmc] || 0) + qty;
      }
    });

    const averageCmc = nonLandCount > 0 ? totalCmc / nonLandCount : 0;

    return {
      curve: curveData,
      stats: { totalCards: nonLandCount, averageCmc, landCount },
    };
  }, [cards, externalCurve]);

  // Get max count for scaling
  const maxCount = Math.max(...Object.values(curve), 1);

  // Prepare curve data for display
  const curveEntries = [
    { cmc: 0, count: curve[0] || 0 },
    { cmc: 1, count: curve[1] || 0 },
    { cmc: 2, count: curve[2] || 0 },
    { cmc: 3, count: curve[3] || 0 },
    { cmc: 4, count: curve[4] || 0 },
    { cmc: 5, count: curve[5] || 0 },
    { cmc: 6, count: curve[6] || 0 },
    { cmc: 7, count: curve['7+'] || curve[7] || 0 },
  ];

  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700 p-4 ${className}`}>
      {/* Title */}
      {title && (
        <h3 className="text-sm font-medium text-slate-300 mb-4">{title}</h3>
      )}

      {/* Chart */}
      <div className="flex items-end gap-1 sm:gap-2">
        {curveEntries.map(({ cmc, count }) => (
          <CurveBar
            key={cmc}
            cmc={cmc}
            count={count}
            maxCount={maxCount}
            showLabels={showLabels}
            animated={animated}
          />
        ))}
      </div>

      {/* Stats */}
      {showStats && (
        <CurveStats
          totalCards={stats.totalCards}
          averageCmc={stats.averageCmc}
          landCount={stats.landCount}
        />
      )}
    </div>
  );
});

ManaCurveChart.propTypes = {
  /** Array of cards to calculate curve from */
  cards: PropTypes.array,
  /** Pre-calculated mana curve { 0: n, 1: n, ..., '7+': n } */
  manaCurve: PropTypes.object,
  /** Whether to show stats below the chart */
  showStats: PropTypes.bool,
  /** Whether to show count labels above bars */
  showLabels: PropTypes.bool,
  /** Whether to animate bar heights */
  animated: PropTypes.bool,
  /** Chart title */
  title: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default ManaCurveChart;
