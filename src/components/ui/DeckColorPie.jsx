/**
 * DeckColorPie - Color distribution visualization for decks
 * @module components/ui/DeckColorPie
 */

import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * MTG color configurations
 */
const MTG_COLORS = {
  W: { name: 'White', color: 'var(--mtg-W)', dark: 'var(--mtg-W-dark)', textColor: 'var(--mtg-W-text)' },
  U: { name: 'Blue', color: 'var(--mtg-U)', dark: 'var(--mtg-U-dark)', textColor: 'var(--mtg-U-text)' },
  B: { name: 'Black', color: 'var(--mtg-B)', dark: 'var(--mtg-B-dark)', textColor: 'var(--mtg-B-text)' },
  R: { name: 'Red', color: 'var(--mtg-R)', dark: 'var(--mtg-R-dark)', textColor: 'var(--mtg-R-text)' },
  G: { name: 'Green', color: 'var(--mtg-G)', dark: 'var(--mtg-G-dark)', textColor: 'var(--mtg-G-text)' },
  C: { name: 'Colorless', color: 'var(--mtg-C)', dark: 'var(--mtg-C-dark)', textColor: 'var(--mtg-C-text)' },
};

/**
 * Calculate SVG arc path for pie segment
 */
const getArcPath = (startAngle, endAngle, innerRadius, outerRadius) => {
  const startRadians = (startAngle - 90) * (Math.PI / 180);
  const endRadians = (endAngle - 90) * (Math.PI / 180);

  const x1 = 50 + outerRadius * Math.cos(startRadians);
  const y1 = 50 + outerRadius * Math.sin(startRadians);
  const x2 = 50 + outerRadius * Math.cos(endRadians);
  const y2 = 50 + outerRadius * Math.sin(endRadians);
  const x3 = 50 + innerRadius * Math.cos(endRadians);
  const y3 = 50 + innerRadius * Math.sin(endRadians);
  const x4 = 50 + innerRadius * Math.cos(startRadians);
  const y4 = 50 + innerRadius * Math.sin(startRadians);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
};

/**
 * Pie segment component
 */
const PieSegment = memo(function PieSegment({
  color,
  startAngle,
  endAngle,
  innerRadius = 25,
  outerRadius = 45,
  isHovered,
  onHover,
}) {
  const config = MTG_COLORS[color] || MTG_COLORS.C;
  const path = getArcPath(
    startAngle,
    endAngle,
    innerRadius,
    isHovered ? outerRadius + 3 : outerRadius
  );

  return (
    <path
      d={path}
      stroke="var(--surface)"
      strokeWidth="2"
      className="transition-all duration-200 cursor-pointer"
      style={{
        fill: config.color,
        filter: isHovered ? `drop-shadow(0 0 8px ${config.color})` : undefined,
      }}
      onMouseEnter={() => onHover?.(color)}
      onMouseLeave={() => onHover?.(null)}
    />
  );
});

PieSegment.propTypes = {
  color: PropTypes.string.isRequired,
  startAngle: PropTypes.number.isRequired,
  endAngle: PropTypes.number.isRequired,
  innerRadius: PropTypes.number,
  outerRadius: PropTypes.number,
  isHovered: PropTypes.bool,
  onHover: PropTypes.func,
};

/**
 * Color legend item
 */
const LegendItem = memo(function LegendItem({ color, count, percentage, isHovered, onHover }) {
  const config = MTG_COLORS[color] || MTG_COLORS.C;

  return (
    <div
      className={`
        flex items-center gap-2 px-2 py-1 rounded transition-all
        ${isHovered ? 'bg-[var(--muted-surface)]' : ''}
      `}
      onMouseEnter={() => onHover?.(color)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div
        className="w-4 h-4 rounded-full border-2 border-[var(--border)]"
        style={{ backgroundColor: config.color }}
      />
      <span className="text-sm text-[var(--text-muted)] min-w-[60px]">{config.name}</span>
      <span className="text-sm font-medium text-white">{count}</span>
      <span className="text-xs text-[var(--text-muted)]">({percentage.toFixed(0)}%)</span>
    </div>
  );
});

LegendItem.propTypes = {
  color: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  percentage: PropTypes.number.isRequired,
  isHovered: PropTypes.bool,
  onHover: PropTypes.func,
};

/**
 * Color identity display (mana symbols)
 */
const ColorIdentity = memo(function ColorIdentity({ colors }) {
  if (!colors || colors.length === 0) return null;

  return (
    <div className="flex items-center gap-1 justify-center mt-4">
      {colors.map((color) => {
        const config = MTG_COLORS[color] || MTG_COLORS.C;
        return (
          <div
            key={color}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 border-[var(--border)]"
            style={{ backgroundColor: config.color, color: config.textColor }}
          >
            {color}
          </div>
        );
      })}
    </div>
  );
});

ColorIdentity.propTypes = {
  colors: PropTypes.arrayOf(PropTypes.string),
};

/**
 * DeckColorPie - Main component
 */
export const DeckColorPie = memo(function DeckColorPie({
  cards = [],
  colorDistribution: externalDistribution,
  colorIdentity = [],
  showLegend = true,
  showIdentity = true,
  size = 'md',
  title = 'Color Distribution',
  className = '',
}) {
  const [hoveredColor, setHoveredColor] = React.useState(null);

  // Calculate color distribution from cards if not provided
  const distribution = useMemo(() => {
    if (externalDistribution) return externalDistribution;

    const colors = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

    cards.forEach((card) => {
      const qty = card.quantity || 1;
      const manaCost = card.mana_cost || '';
      const colorId = card.color_identity || [];

      // Count from color identity
      if (colorId.length === 0) {
        colors.C += qty;
      } else {
        colorId.forEach((c) => {
          if (colors[c] !== undefined) {
            colors[c] += qty;
          }
        });
      }
    });

    return colors;
  }, [cards, externalDistribution]);

  // Calculate percentages and filter zero values
  const segments = useMemo(() => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const result = [];
    let currentAngle = 0;

    // Order: WUBRG + C
    ['W', 'U', 'B', 'R', 'G', 'C'].forEach((color) => {
      const count = distribution[color] || 0;
      if (count === 0) return;

      const percentage = (count / total) * 100;
      const angle = (count / total) * 360;

      result.push({
        color,
        count,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      });

      currentAngle += angle;
    });

    return result;
  }, [distribution]);

  const totalCards = segments.reduce((sum, s) => sum + s.count, 0);

  // Size variants
  const sizes = {
    sm: { viewBox: 100, inner: 20, outer: 40 },
    md: { viewBox: 100, inner: 25, outer: 45 },
    lg: { viewBox: 100, inner: 30, outer: 48 },
  };

  const { viewBox, inner, outer } = sizes[size];

  if (segments.length === 0) {
    return (
      <div className={`bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 ${className}`}>
        {title && <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">{title}</h3>}
        <div className="text-center py-8 text-[var(--text-muted)]">No color data available</div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 ${className}`}>
      {/* Title */}
      {title && (
        <h3 className="text-sm font-medium text-[var(--text-muted)] mb-4">{title}</h3>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Pie chart */}
        <div className="relative">
          <svg
            viewBox={`0 0 ${viewBox} ${viewBox}`}
            className="w-32 h-32 sm:w-40 sm:h-40"
          >
            {segments.map((segment) => (
              <PieSegment
                key={segment.color}
                color={segment.color}
                startAngle={segment.startAngle}
                endAngle={segment.endAngle}
                innerRadius={inner}
                outerRadius={outer}
                isHovered={hoveredColor === segment.color}
                onHover={setHoveredColor}
              />
            ))}
            {/* Center text */}
            <text
              x="50"
              y="45"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-2xl font-bold fill-white pointer-events-none"
            >
              {totalCards}
            </text>
            <text
              x="50"
              y="62"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px] fill-slate-500 uppercase tracking-wider pointer-events-none"
            >
              cards
            </text>
          </svg>

          {/* Hover tooltip */}
          {hoveredColor && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-[var(--bg-page)] border border-[var(--border)] rounded-lg px-3 py-1.5 shadow-xl z-10 whitespace-nowrap">
              <div className="text-sm font-medium text-white">
                {MTG_COLORS[hoveredColor]?.name || hoveredColor}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                {segments.find((s) => s.color === hoveredColor)?.count || 0} cards
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex-1 space-y-1">
            {segments.map((segment) => (
              <LegendItem
                key={segment.color}
                color={segment.color}
                count={segment.count}
                percentage={segment.percentage}
                isHovered={hoveredColor === segment.color}
                onHover={setHoveredColor}
              />
            ))}
          </div>
        )}
      </div>

      {/* Color identity */}
      {showIdentity && colorIdentity.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--text-muted)] text-center mb-2">Color Identity</div>
          <ColorIdentity colors={colorIdentity} />
        </div>
      )}
    </div>
  );
});

DeckColorPie.propTypes = {
  /** Array of cards to calculate distribution from */
  cards: PropTypes.array,
  /** Pre-calculated color distribution { W: n, U: n, B: n, R: n, G: n, C: n } */
  colorDistribution: PropTypes.object,
  /** Deck's color identity array */
  colorIdentity: PropTypes.arrayOf(PropTypes.string),
  /** Whether to show the legend */
  showLegend: PropTypes.bool,
  /** Whether to show color identity */
  showIdentity: PropTypes.bool,
  /** Size variant */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Chart title */
  title: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default DeckColorPie;
