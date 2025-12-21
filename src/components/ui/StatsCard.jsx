/**
 * StatsCard - Versatile statistics card component
 * @module components/ui/StatsCard
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Format number with commas
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString();
};

/**
 * Format currency
 */
const formatCurrency = (num) => {
  if (num === null || num === undefined) return '$0.00';
  return `$${parseFloat(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format percentage
 */
const formatPercentage = (num) => {
  if (num === null || num === undefined) return '0%';
  return `${parseFloat(num).toFixed(1)}%`;
};

/**
 * Trend indicator component
 */
const TrendIndicator = memo(function TrendIndicator({ value, inverted = false }) {
  if (value === 0 || value === null || value === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--bda-muted)] text-sm">
        <Minus className="w-4 h-4" />
        <span>0%</span>
      </span>
    );
  }

  const isPositive = inverted ? value < 0 : value > 0;
  const Icon = value > 0 ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'
        }`}
    >
      <Icon className="w-4 h-4" />
      <span>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>
    </span>
  );
});

TrendIndicator.propTypes = {
  value: PropTypes.number,
  inverted: PropTypes.bool,
};

/**
 * Sparkline mini chart
 */
const Sparkline = memo(function Sparkline({ data, color = 'teal', height = 40 }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const colors = {
    teal: 'stroke-[var(--bda-primary)]',
    emerald: 'stroke-emerald-400',
    amber: 'stroke-amber-400',
    red: 'stroke-red-400',
    purple: 'stroke-purple-400',
    blue: 'stroke-blue-400',
  };

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        className={`${colors[color]} opacity-80`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

Sparkline.propTypes = {
  data: PropTypes.arrayOf(PropTypes.number),
  color: PropTypes.string,
  height: PropTypes.number,
};

/**
 * StatsCard - Main component
 */
export const StatsCard = memo(function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  trendInverted = false,
  sparklineData,
  format = 'number',
  color = 'teal',
  size = 'md',
  variant = 'default',
  onClick,
  className = '',
}) {
  // Format value based on type
  const formattedValue = (() => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      default:
        return formatNumber(value);
    }
  })();

  // Color configurations
  const colors = {
    teal: {
      gradient: 'bg-gradient-to-br from-[var(--bda-primary)]/10 to-transparent',
      border: 'border-[var(--bda-primary)]/20',
      text: 'text-[var(--bda-primary)]',
      icon: 'text-[var(--bda-primary)] bg-[var(--bda-primary)]/10',
    },
    blue: {
      gradient: 'bg-gradient-to-br from-blue-500/10 to-transparent',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      icon: 'text-blue-400 bg-blue-500/10',
    },
    purple: {
      gradient: 'bg-gradient-to-br from-purple-500/10 to-transparent',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      icon: 'text-purple-400 bg-purple-500/10',
    },
    amber: {
      gradient: 'bg-gradient-to-br from-amber-500/10 to-transparent',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      icon: 'text-amber-400 bg-amber-500/10',
    },
    emerald: {
      gradient: 'bg-gradient-to-br from-emerald-500/10 to-transparent',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      icon: 'text-emerald-400 bg-emerald-500/10',
    },
    red: {
      gradient: 'bg-gradient-to-br from-red-500/10 to-transparent',
      border: 'border-red-500/20',
      text: 'text-red-400',
      icon: 'text-red-400 bg-red-500/10',
    },
    slate: {
      gradient: 'bg-[var(--surface)]',
      border: 'border-[var(--border)]',
      text: 'text-[var(--text-primary)]',
      icon: 'text-[var(--text-muted)] bg-[var(--surface)]',
    },
    primary: { // Alias for teal/brand
      gradient: 'bg-gradient-to-br from-[var(--bda-primary)]/10 to-transparent',
      border: 'border-[var(--bda-primary)]/20',
      text: 'text-[var(--bda-primary)]',
      icon: 'text-[var(--bda-primary)] bg-[var(--bda-primary)]/10',
    }
  };

  // Size configurations
  const sizes = {
    sm: {
      padding: 'p-3',
      title: 'text-xs',
      value: 'text-xl',
      icon: 'w-8 h-8',
      iconSize: 'w-4 h-4',
    },
    md: {
      padding: 'p-5',
      title: 'text-sm',
      value: 'text-3xl tracking-tight',
      icon: 'w-12 h-12',
      iconSize: 'w-6 h-6',
    },
    lg: {
      padding: 'p-6',
      title: 'text-sm',
      value: 'text-4xl tracking-tight',
      icon: 'w-14 h-14',
      iconSize: 'w-7 h-7',
    },
  };

  const colorConfig = colors[color] || colors.teal; // Fallback
  const sizeConfig = sizes[size];

  // Variant styles
  const variantStyles = {
    default: `neo-card ${colorConfig.gradient} ${colorConfig.border}`,
    solid: `bg-[var(--surface)] border ${colorConfig.border}`,
    minimal: 'bg-transparent border border-[var(--border)]',
    glass: 'glass-panel border-white/5',
  };

  return (
    <div
      className={`
        rounded-xl ${sizeConfig.padding}
        ${variantStyles[variant]}
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        transition-all duration-200
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={`${sizeConfig.title} text-[var(--bda-muted)] font-medium uppercase tracking-wider mb-1`}>
            {title}
          </p>

          {/* Value */}
          <p className={`${sizeConfig.value} font-bold ${colorConfig.text} truncate`}>
            {formattedValue}
          </p>

          {/* Subtitle or trend */}
          {(subtitle || trend !== undefined) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {trend !== undefined && (
                <TrendIndicator value={trend} inverted={trendInverted} />
              )}
              {trendLabel && (
                <span className="text-xs text-[var(--bda-muted)]">{trendLabel}</span>
              )}
              {subtitle && !trend && (
                <span className="text-xs text-ui-muted">{subtitle}</span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className={`rounded-xl ${sizeConfig.icon} flex items-center justify-center ${colorConfig.icon}`}>
            <Icon className={sizeConfig.iconSize} />
          </div>
        )}
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4">
          <Sparkline data={sparklineData} color={color} />
        </div>
      )}
    </div>
  );
});

StatsCard.propTypes = {
  /** Card title */
  title: PropTypes.string.isRequired,
  /** Main value to display */
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  /** Optional subtitle text */
  subtitle: PropTypes.string,
  /** Icon component */
  icon: PropTypes.elementType,
  /** Trend percentage (positive or negative) */
  trend: PropTypes.number,
  /** Label for the trend */
  trendLabel: PropTypes.string,
  /** Invert trend colors (down is good) */
  trendInverted: PropTypes.bool,
  /** Data for sparkline chart */
  sparklineData: PropTypes.arrayOf(PropTypes.number),
  /** Value format type */
  format: PropTypes.oneOf(['number', 'currency', 'percentage']),
  /** Color theme */
  color: PropTypes.oneOf(['teal', 'blue', 'purple', 'amber', 'emerald', 'red', 'slate']),
  /** Size variant */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Visual variant */
  variant: PropTypes.oneOf(['default', 'solid', 'minimal']),
  /** Click handler */
  onClick: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default StatsCard;
