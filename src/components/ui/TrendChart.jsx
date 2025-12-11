/**
 * TrendChart - Line/area chart for displaying trends over time
 * @module components/ui/TrendChart
 */

import React, { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

/**
 * Format value based on type
 */
const formatValue = (value, format) => {
  if (value === null || value === undefined) return '—';
  switch (format) {
    case 'currency':
      return `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percentage':
      return `${parseFloat(value).toFixed(1)}%`;
    default:
      return value.toLocaleString();
  }
};

/**
 * Time period selector
 */
const PeriodSelector = memo(function PeriodSelector({ periods, activePeriod, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-[var(--surface)] rounded-lg p-1">
      {periods.map((period) => (
        <button
          key={period.id}
          onClick={() => onChange(period.id)}
          className={`
            px-3 py-1.5 rounded-md text-xs font-medium transition-all
            ${activePeriod === period.id
              ? 'bg-teal-600 text-white'
              : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--muted-surface)]'
            }
          `}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
});

PeriodSelector.propTypes = {
  periods: PropTypes.array.isRequired,
  activePeriod: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * Chart tooltip
 */
const ChartTooltip = memo(function ChartTooltip({ x, y, label, value, format }) {
  return (
    <div
      className="absolute z-10 bg-[var(--bg-page)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl pointer-events-none"
      style={{
        left: x,
        top: y - 60,
        transform: 'translateX(-50%)',
      }}
    >
      <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className="text-sm font-bold text-white">{formatValue(value, format)}</p>
    </div>
  );
});

ChartTooltip.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  format: PropTypes.string,
};

/**
 * Default time periods
 */
const DEFAULT_PERIODS = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'all', label: 'All' },
];

/**
 * TrendChart - Main component
 */
export const TrendChart = memo(function TrendChart({
  data = [],
  dataKey = 'value',
  labelKey = 'label',
  title,
  subtitle,
  format = 'number',
  color = 'teal',
  showPeriodSelector = true,
  periods = DEFAULT_PERIODS,
  defaultPeriod = '30d',
  onPeriodChange,
  height = 200,
  showGrid = true,
  showArea = true,
  showDots = true,
  animate = true,
  className = '',
}) {
  const [activePeriod, setActivePeriod] = useState(defaultPeriod);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Handle period change
  const handlePeriodChange = (period) => {
    setActivePeriod(period);
    onPeriodChange?.(period);
  };

  // Calculate chart dimensions and data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { points: [], min: 0, max: 0 };

    const values = data.map((d) => d[dataKey] || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const padding = 20;
    const chartHeight = height - padding * 2;
    const chartWidth = 100; // Percentage-based

    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * chartWidth,
      y: padding + chartHeight - ((d[dataKey] - min) / range) * chartHeight,
      value: d[dataKey],
      label: d[labelKey],
    }));

    return { points, min, max, range };
  }, [data, dataKey, labelKey, height]);

  // Generate SVG path
  const pathData = useMemo(() => {
    if (chartData.points.length < 2) return { line: '', area: '' };

    const linePoints = chartData.points
      .map((p) => `${p.x},${p.y}`)
      .join(' L ');

    const line = `M ${linePoints}`;

    const area = `
      M ${chartData.points[0].x},${height - 20}
      L ${linePoints}
      L ${chartData.points[chartData.points.length - 1].x},${height - 20}
      Z
    `;

    return { line, area };
  }, [chartData.points, height]);

  // Color configurations
  const colors = {
    teal: { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.1)', dot: '#14b8a6' },
    blue: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.1)', dot: '#3b82f6' },
    purple: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.1)', dot: '#a855f7' },
    amber: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.1)', dot: '#f59e0b' },
    emerald: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.1)', dot: '#10b981' },
    red: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.1)', dot: '#ef4444' },
  };

  const colorConfig = colors[color] || colors.teal;

  // Calculate trend
  const trend = useMemo(() => {
    if (data.length < 2) return { value: 0, isPositive: true };
    const first = data[0][dataKey] || 0;
    const last = data[data.length - 1][dataKey] || 0;
    const change = first !== 0 ? ((last - first) / first) * 100 : 0;
    return { value: change, isPositive: change >= 0 };
  }, [data, dataKey]);

  // Handle mouse events
  const handleMouseMove = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  if (data.length === 0) {
    return (
      <div className={`bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 ${className}`}>
        <div className="flex items-center justify-center h-40 text-[var(--text-muted)]">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-[var(--surface)] rounded-xl border border-[var(--border)] ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-[var(--border)]">
        <div>
          {title && <h3 className="text-sm font-medium text-white">{title}</h3>}
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}

          {/* Current value and trend */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl font-bold text-white">
              {formatValue(data[data.length - 1]?.[dataKey], format)}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                trend.isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
          </div>
        </div>

        {showPeriodSelector && (
          <PeriodSelector
            periods={periods}
            activePeriod={activePeriod}
            onChange={handlePeriodChange}
          />
        )}
      </div>

      {/* Chart */}
      <div
        className="relative p-4"
        style={{ height }}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          viewBox={`0 0 100 ${height}`}
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {showGrid && (
            <g className="text-slate-700">
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={20 + (y / 100) * (height - 40)}
                  x2="100"
                  y2={20 + (y / 100) * (height - 40)}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              ))}
            </g>
          )}

          {/* Area fill */}
          {showArea && pathData.area && (
            <path
              d={pathData.area}
              fill={colorConfig.fill}
              className={animate ? 'animate-fade-in' : ''}
            />
          )}

          {/* Line */}
          {pathData.line && (
            <path
              d={pathData.line}
              fill="none"
              stroke={colorConfig.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={animate ? 'animate-fade-in' : ''}
            />
          )}

          {/* Interactive dots */}
          {showDots && chartData.points.map((point, index) => (
            <g key={index}>
              {/* Invisible larger hit area */}
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => handleMouseMove(e, index)}
                onMouseMove={(e) => handleMouseMove(e, index)}
              />
              {/* Visible dot */}
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredIndex === index ? 5 : 3}
                fill={colorConfig.dot}
                className="transition-all duration-150"
              />
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && chartData.points[hoveredIndex] && (
          <ChartTooltip
            x={tooltipPosition.x}
            y={tooltipPosition.y}
            label={chartData.points[hoveredIndex].label}
            value={chartData.points[hoveredIndex].value}
            format={format}
          />
        )}

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-5 text-xs text-[var(--text-muted)]">
          <span>{formatValue(chartData.max, format)}</span>
          <span>{formatValue((chartData.max + chartData.min) / 2, format)}</span>
          <span>{formatValue(chartData.min, format)}</span>
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-4 pb-4 text-xs text-[var(--text-muted)]">
        {data.length > 0 && (
          <>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {data[0][labelKey]}
            </span>
            <span>{data[data.length - 1][labelKey]}</span>
          </>
        )}
      </div>
    </div>
  );
});

TrendChart.propTypes = {
  /** Array of data points */
  data: PropTypes.arrayOf(PropTypes.object),
  /** Key for the value in data objects */
  dataKey: PropTypes.string,
  /** Key for the label in data objects */
  labelKey: PropTypes.string,
  /** Chart title */
  title: PropTypes.string,
  /** Chart subtitle */
  subtitle: PropTypes.string,
  /** Value format type */
  format: PropTypes.oneOf(['number', 'currency', 'percentage']),
  /** Color theme */
  color: PropTypes.oneOf(['teal', 'blue', 'purple', 'amber', 'emerald', 'red']),
  /** Show period selector */
  showPeriodSelector: PropTypes.bool,
  /** Available time periods */
  periods: PropTypes.array,
  /** Default selected period */
  defaultPeriod: PropTypes.string,
  /** Callback when period changes */
  onPeriodChange: PropTypes.func,
  /** Chart height in pixels */
  height: PropTypes.number,
  /** Show grid lines */
  showGrid: PropTypes.bool,
  /** Show area fill */
  showArea: PropTypes.bool,
  /** Show data point dots */
  showDots: PropTypes.bool,
  /** Animate chart elements */
  animate: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default TrendChart;
