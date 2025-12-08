/**
 * ColorFilterChips - Accessible MTG color filter chip selector
 * Supports mono colors, multi-color combinations, and colorless
 * @module components/ui/ColorFilterChips
 */

import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, X, Filter } from 'lucide-react';
import {
  MTG_COLORS,
  COLORLESS,
  COLOR_ORDER,
  PRESET_COLOR_FILTERS,
  getColorKey,
  createColorFilter,
} from '../../constants/mtgColors';

/**
 * Mana symbol icon component with colorblind-friendly patterns
 */
const ManaSymbol = memo(function ManaSymbol({ color, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs',
    lg: 'w-6 h-6 text-sm',
  };

  const colorData = color === 'C' ? COLORLESS : MTG_COLORS[color];
  if (!colorData) return null;

  // Letter abbreviation for colorblind accessibility
  const letter = color === 'C' ? '◇' : color;

  // Background colors with good contrast
  const bgColors = {
    W: 'bg-amber-100 text-amber-900 border-amber-300',
    U: 'bg-blue-500 text-white border-blue-600',
    B: 'bg-gray-800 text-gray-100 border-gray-600',
    R: 'bg-red-500 text-white border-red-600',
    G: 'bg-green-600 text-white border-green-700',
    C: 'bg-gray-400 text-gray-800 border-gray-500',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-bold ${sizes[size]} ${bgColors[color]} ${className}`}
      title={colorData.name}
      aria-label={colorData.name}
    >
      {letter}
    </span>
  );
});

ManaSymbol.propTypes = {
  color: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

/**
 * Color combination display (multiple mana symbols)
 */
const ColorCombo = memo(function ColorCombo({ colors, size = 'md', className = '' }) {
  if (!colors || colors.length === 0) {
    return <ManaSymbol color="C" size={size} className={className} />;
  }

  const sortedColors = [...colors].sort(
    (a, b) => COLOR_ORDER.indexOf(a) - COLOR_ORDER.indexOf(b)
  );

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {sortedColors.map(color => (
        <ManaSymbol key={color} color={color} size={size} />
      ))}
    </span>
  );
});

ColorCombo.propTypes = {
  colors: PropTypes.arrayOf(PropTypes.string),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

/**
 * Individual filter chip button
 */
const FilterChip = memo(function FilterChip({
  filter,
  isSelected,
  onToggle,
  size = 'md',
}) {
  const handleClick = useCallback(() => {
    onToggle(filter);
  }, [filter, onToggle]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(filter);
    }
  }, [filter, onToggle]);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={`Filter by ${filter.label}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        inline-flex items-center rounded-full border transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800
        ${sizeClasses[size]}
        ${isSelected
          ? 'bg-teal-600 border-teal-500 text-white shadow-md'
          : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
        }
      `}
    >
      <ColorCombo colors={filter.colors} size="sm" />
      <span className="font-medium">{filter.label}</span>
      {isSelected && (
        <X className="w-3 h-3 ml-0.5 opacity-70" aria-hidden="true" />
      )}
    </button>
  );
});

FilterChip.propTypes = {
  filter: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    colors: PropTypes.arrayOf(PropTypes.string).isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

/**
 * Dropdown section for organizing filters
 */
const FilterSection = memo(function FilterSection({ title, filters, selectedIds, onToggle, size }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <FilterChip
            key={filter.id}
            filter={filter}
            isSelected={selectedIds.has(filter.id)}
            onToggle={onToggle}
            size={size}
          />
        ))}
      </div>
    </div>
  );
});

FilterSection.propTypes = {
  title: PropTypes.string.isRequired,
  filters: PropTypes.array.isRequired,
  selectedIds: PropTypes.instanceOf(Set).isRequired,
  onToggle: PropTypes.func.isRequired,
  size: PropTypes.string,
};

/**
 * Main ColorFilterChips component
 */
export const ColorFilterChips = memo(function ColorFilterChips({
  selectedFilters = [],
  onToggleFilter,
  onClearFilters,
  isLoading = false,
  variant = 'inline', // 'inline' | 'dropdown' | 'compact'
  size = 'md',
  showLabel = true,
  className = '',
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDropdownOpen]);

  const selectedIds = new Set(selectedFilters.map(f => f.id));

  // Organize filters by category
  const colorlessFilter = PRESET_COLOR_FILTERS.filter(f => f.type === 'colorless');
  const monoFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'mono');
  const twoColorFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'exact' && f.colors.length === 2);
  const threeColorFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'exact' && f.colors.length === 3);

  const handleToggle = useCallback((filter) => {
    onToggleFilter(filter);
  }, [onToggleFilter]);

  // Compact variant - just shows selected chips with a dropdown trigger
  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center gap-2 flex-wrap">
          {showLabel && (
            <span className="text-sm text-slate-400 flex items-center gap-1">
              <Filter className="w-4 h-4" aria-hidden="true" />
              Colors:
            </span>
          )}

          {/* Selected chips */}
          {selectedFilters.map(filter => (
            <FilterChip
              key={filter.id}
              filter={filter}
              isSelected={true}
              onToggle={handleToggle}
              size="sm"
            />
          ))}

          {/* Add filter button */}
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            aria-label="Add color filter"
            className={`
              inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
              bg-slate-700 border border-slate-600 text-slate-300
              hover:bg-slate-600 hover:border-slate-500
              focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800
              transition-colors
              ${isLoading ? 'opacity-50' : ''}
            `}
            disabled={isLoading}
          >
            <span>+ Add</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Clear button */}
          {selectedFilters.length > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              aria-label="Clear all color filters"
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            role="menu"
            className="absolute z-50 mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[320px] max-h-[400px] overflow-y-auto"
          >
            <div className="space-y-4">
              <FilterSection title="Colorless" filters={colorlessFilter} selectedIds={selectedIds} onToggle={handleToggle} size="sm" />
              <FilterSection title="Mono Color" filters={monoFilters} selectedIds={selectedIds} onToggle={handleToggle} size="sm" />
              <FilterSection title="Two Colors (Guilds)" filters={twoColorFilters} selectedIds={selectedIds} onToggle={handleToggle} size="sm" />
              <FilterSection title="Three Colors (Shards/Wedges)" filters={threeColorFilters} selectedIds={selectedIds} onToggle={handleToggle} size="sm" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
            bg-slate-700 border border-slate-600 text-slate-200
            hover:bg-slate-600 hover:border-slate-500
            focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-800
            transition-colors
            ${isLoading ? 'opacity-50' : ''}
          `}
          disabled={isLoading}
        >
          <Filter className="w-4 h-4" aria-hidden="true" />
          <span>
            {selectedFilters.length === 0
              ? 'Filter by Color'
              : `${selectedFilters.length} color${selectedFilters.length === 1 ? '' : 's'} selected`
            }
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            role="menu"
            className="absolute z-50 mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[360px] max-h-[450px] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200">Filter by Color Identity</h3>
              {selectedFilters.length > 0 && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="text-xs text-teal-400 hover:text-teal-300"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-4">
              <FilterSection title="Colorless" filters={colorlessFilter} selectedIds={selectedIds} onToggle={handleToggle} size="sm" />
              <FilterSection title="Mono Color" filters={monoFilters} selectedIds={selectedIds} onToggle={handleToggle} size="sm" />
              <FilterSection title="Two Colors (Guilds)" filters={twoColorFilters} selectedIds={selectedIds} onToggle={handleToggle} size="sm" />
              <FilterSection title="Three Colors (Shards/Wedges)" filters={threeColorFilters} selectedIds={selectedIds} onToggle={handleToggle} size="sm" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Inline variant (default) - shows all chips directly
  return (
    <div className={`space-y-3 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Filter className="w-4 h-4" aria-hidden="true" />
            Filter by Color Identity
            {isLoading && <span className="text-xs text-slate-500">(loading...)</span>}
          </span>
          {selectedFilters.length > 0 && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-xs text-teal-400 hover:text-teal-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {/* Colorless and Mono in one row */}
        <div className="flex flex-wrap gap-2">
          {colorlessFilter.map(filter => (
            <FilterChip
              key={filter.id}
              filter={filter}
              isSelected={selectedIds.has(filter.id)}
              onToggle={handleToggle}
              size={size}
            />
          ))}
          {monoFilters.map(filter => (
            <FilterChip
              key={filter.id}
              filter={filter}
              isSelected={selectedIds.has(filter.id)}
              onToggle={handleToggle}
              size={size}
            />
          ))}
        </div>

        {/* Two colors */}
        <div className="flex flex-wrap gap-2">
          {twoColorFilters.map(filter => (
            <FilterChip
              key={filter.id}
              filter={filter}
              isSelected={selectedIds.has(filter.id)}
              onToggle={handleToggle}
              size={size}
            />
          ))}
        </div>

        {/* Three colors */}
        <div className="flex flex-wrap gap-2">
          {threeColorFilters.map(filter => (
            <FilterChip
              key={filter.id}
              filter={filter}
              isSelected={selectedIds.has(filter.id)}
              onToggle={handleToggle}
              size={size}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

ColorFilterChips.propTypes = {
  selectedFilters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      colors: PropTypes.arrayOf(PropTypes.string).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  onToggleFilter: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  variant: PropTypes.oneOf(['inline', 'dropdown', 'compact']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showLabel: PropTypes.bool,
  className: PropTypes.string,
};

// Export sub-components for flexibility
export { ManaSymbol, ColorCombo, FilterChip };
export default ColorFilterChips;
