/**
 * FilterBar - Integrated filter bar with search, chips, and saved presets
 * @module components/ui/FilterBar
 */

import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Search,
  X,
  SlidersHorizontal,
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { ColorFilterChips } from './ColorFilterChips';

/**
 * Rarity options
 */
const RARITY_OPTIONS = [
  { id: 'mythic', label: 'Mythic', color: 'text-orange-400 bg-orange-400/10' },
  { id: 'rare', label: 'Rare', color: 'text-yellow-400 bg-yellow-400/10' },
  { id: 'uncommon', label: 'Uncommon', color: 'text-[var(--bda-muted)] bg-[var(--surface)]' },
  { id: 'common', label: 'Common', color: 'text-[var(--bda-muted)] bg-[var(--surface)]' },
];

/**
 * Filter chip component
 */
const FilterChip = memo(function FilterChip({ label, isActive, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        ${isActive
          ? `${color || 'bg-[var(--bda-primary)]/20 text-[var(--bda-primary)]'} ring-1 ring-current`
          : 'bg-[var(--surface)] text-[var(--bda-muted)] hover:text-[var(--bda-text)] hover:bg-[var(--muted-surface)]'
        }
      `}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );
});

FilterChip.propTypes = {
  label: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  color: PropTypes.string,
};

/**
 * Preset dropdown
 */
const PresetDropdown = memo(function PresetDropdown({
  presets,
  activePreset,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  isOpen,
  onToggle,
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onToggle(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => onToggle(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${activePreset
            ? 'bg-[var(--bda-primary)]/20 text-[var(--bda-primary)]'
            : 'bg-[var(--surface)] text-[var(--bda-muted)] hover:text-[var(--bda-text)] hover:bg-[var(--muted-surface)]'
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bookmark className="w-4 h-4" />
        <span>{activePreset?.name || 'Presets'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-50 py-1 animate-slide-down">
          {/* Save current preset */}
          <button
            onClick={onSavePreset}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--bda-muted)] hover:bg-[var(--muted-surface)] hover:text-[var(--bda-text)]"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Save current filters...</span>
          </button>

          {presets.length > 0 && (
            <>
              <div className="my-1 border-t border-[var(--border)]" />
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={`
                    flex items-center justify-between px-4 py-2 cursor-pointer
                    hover:bg-[var(--muted-surface)] transition-colors
                    ${activePreset?.id === preset.id ? 'bg-[var(--bda-primary)]/10' : ''}
                  `}
                  onClick={() => onSelectPreset(preset)}
                >
                  <span className={`text-sm ${activePreset?.id === preset.id ? 'text-[var(--bda-primary)]' : 'text-[var(--bda-muted)]'}`}>
                    {preset.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePreset(preset.id);
                    }}
                    className="p-1 text-[var(--bda-muted)] hover:text-red-400 rounded"
                    aria-label={`Delete ${preset.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}

          {activePreset && (
            <>
              <div className="my-1 border-t border-[var(--border)]" />
              <button
                onClick={() => onSelectPreset(null)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--bda-muted)] hover:bg-[var(--muted-surface)] hover:text-[var(--bda-text)]"
              >
                <X className="w-4 h-4" />
                <span>Clear preset</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

PresetDropdown.propTypes = {
  presets: PropTypes.array.isRequired,
  activePreset: PropTypes.object,
  onSelectPreset: PropTypes.func.isRequired,
  onSavePreset: PropTypes.func.isRequired,
  onDeletePreset: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

/**
 * FilterBar component
 */
export const FilterBar = memo(function FilterBar({
  searchQuery = '',
  onSearchChange,
  selectedColors = [],
  onColorChange,
  selectedRarities = [],
  onRarityChange,
  selectedSets = [],
  onSetChange,
  availableSets = [],
  presets = [],
  activePreset = null,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
  showAdvanced = false,
  onToggleAdvanced,
  activeFiltersCount = 0,
  onClearAll,
  className = '',
}) {
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const [setDropdownOpen, setSetDropdownOpen] = useState(false);
  const setDropdownRef = useRef(null);

  // Close set dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (setDropdownRef.current && !setDropdownRef.current.contains(e.target)) {
        setSetDropdownOpen(false);
      }
    };

    if (setDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setDropdownOpen]);

  const handleRarityToggle = useCallback((rarityId) => {
    const newRarities = selectedRarities.includes(rarityId)
      ? selectedRarities.filter(r => r !== rarityId)
      : [...selectedRarities, rarityId];
    onRarityChange?.(newRarities);
  }, [selectedRarities, onRarityChange]);

  const handleSetToggle = useCallback((setCode) => {
    const newSets = selectedSets.includes(setCode)
      ? selectedSets.filter(s => s !== setCode)
      : [...selectedSets, setCode];
    onSetChange?.(newSets);
  }, [selectedSets, onSetChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--bda-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search cards..."
            className="w-full pl-10 pr-10 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg
                       text-[var(--bda-text)] placeholder:text-[var(--bda-muted)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--bda-primary)]/50 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--bda-muted)] hover:text-[var(--bda-text)]"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Color filter chips */}
        {onColorChange && (
          <ColorFilterChips
            selectedFilters={selectedColors}
            onFilterChange={onColorChange}
            size="sm"
          />
        )}

        {/* Advanced filters toggle */}
        {onToggleAdvanced && (
          <button
            onClick={onToggleAdvanced}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${showAdvanced
                ? 'bg-accent/20 text-accent'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--muted-surface)]'
              }
            `}
            aria-expanded={showAdvanced}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold
                             bg-[var(--bda-primary)] text-[var(--bda-primary-foreground)] rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}

        {/* Presets dropdown */}
        {onSelectPreset && (
          <PresetDropdown
            presets={presets}
            activePreset={activePreset}
            onSelectPreset={onSelectPreset}
            onSavePreset={onSavePreset}
            onDeletePreset={onDeletePreset}
            isOpen={presetDropdownOpen}
            onToggle={setPresetDropdownOpen}
          />
        )}

        {/* Clear all button */}
        {activeFiltersCount > 0 && onClearAll && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                       text-[var(--bda-muted)] hover:text-[var(--bda-text)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg space-y-4 animate-slide-down">
          {/* Rarity filter */}
          {onRarityChange && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--bda-muted)] uppercase tracking-wider">
                Rarity
              </label>
              <div className="flex flex-wrap gap-2">
                {RARITY_OPTIONS.map((rarity) => (
                  <FilterChip
                    key={rarity.id}
                    label={rarity.label}
                    isActive={selectedRarities.includes(rarity.id)}
                    onClick={() => handleRarityToggle(rarity.id)}
                    color={selectedRarities.includes(rarity.id) ? rarity.color : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Set filter */}
          {onSetChange && availableSets.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--bda-muted)] uppercase tracking-wider">
                Sets
              </label>
              <div className="relative" ref={setDropdownRef}>
                <button
                  onClick={() => setSetDropdownOpen(!setDropdownOpen)}
                  className="flex items-center justify-between w-full max-w-xs px-3 py-2
                             bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm
                             text-[var(--bda-muted)] hover:border-[var(--bda-border)] transition-colors"
                  aria-expanded={setDropdownOpen}
                >
                  <span>
                    {selectedSets.length === 0
                      ? 'All sets'
                      : `${selectedSets.length} set${selectedSets.length > 1 ? 's' : ''} selected`
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${setDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {setDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-full max-w-xs max-h-60 overflow-y-auto
                                  bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-50 py-1">
                    {availableSets.map((set) => (
                      <label
                        key={set.code}
                        className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-[var(--muted-surface)]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSets.includes(set.code)}
                          onChange={() => handleSetToggle(set.code)}
                          className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-page)] text-[var(--bda-primary)]
                                     focus:ring-[var(--bda-primary)]/50 focus:ring-offset-0"
                        />
                        <span className="text-sm text-[var(--bda-muted)]">{set.name}</span>
                        <span className="text-xs text-[var(--bda-muted)] ml-auto">{set.code}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected sets chips */}
              {selectedSets.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSets.map((setCode) => {
                    const set = availableSets.find(s => s.code === setCode);
                    return (
                      <span
                        key={setCode}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--muted-surface)] rounded text-sm text-[var(--bda-muted)]"
                      >
                        {set?.name || setCode}
                        <button
                          onClick={() => handleSetToggle(setCode)}
                          className="text-[var(--bda-muted)] hover:text-[var(--bda-text)]"
                          aria-label={`Remove ${set?.name || setCode}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FilterBar.propTypes = {
  /** Current search query */
  searchQuery: PropTypes.string,
  /** Callback when search changes */
  onSearchChange: PropTypes.func,
  /** Selected color filters */
  selectedColors: PropTypes.array,
  /** Callback when color filters change */
  onColorChange: PropTypes.func,
  /** Selected rarity filters */
  selectedRarities: PropTypes.array,
  /** Callback when rarity filters change */
  onRarityChange: PropTypes.func,
  /** Selected set filters */
  selectedSets: PropTypes.array,
  /** Callback when set filters change */
  onSetChange: PropTypes.func,
  /** Available sets for filtering */
  availableSets: PropTypes.arrayOf(PropTypes.shape({
    code: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })),
  /** Saved filter presets */
  presets: PropTypes.array,
  /** Currently active preset */
  activePreset: PropTypes.object,
  /** Callback when preset is selected */
  onSelectPreset: PropTypes.func,
  /** Callback to save current filters as preset */
  onSavePreset: PropTypes.func,
  /** Callback to delete a preset */
  onDeletePreset: PropTypes.func,
  /** Whether advanced filters are shown */
  showAdvanced: PropTypes.bool,
  /** Callback to toggle advanced filters */
  onToggleAdvanced: PropTypes.func,
  /** Number of active filters */
  activeFiltersCount: PropTypes.number,
  /** Callback to clear all filters */
  onClearAll: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default FilterBar;
