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
  { id: 'uncommon', label: 'Uncommon', color: 'text-slate-300 bg-slate-300/10' },
  { id: 'common', label: 'Common', color: 'text-slate-500 bg-slate-500/10' },
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
          ? `${color || 'bg-teal-500/20 text-teal-400'} ring-1 ring-current`
          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
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
            ? 'bg-accent/20 text-accent'
            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
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
        <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 animate-slide-down">
          {/* Save current preset */}
          <button
            onClick={onSavePreset}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <BookmarkPlus className="w-4 h-4" />
            <span>Save current filters...</span>
          </button>

          {presets.length > 0 && (
            <>
              <div className="my-1 border-t border-slate-700" />
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={`
                    flex items-center justify-between px-4 py-2 cursor-pointer
                    hover:bg-slate-700 transition-colors
                    ${activePreset?.id === preset.id ? 'bg-accent/10' : ''}
                  `}
                  onClick={() => onSelectPreset(preset)}
                >
                  <span className={`text-sm ${activePreset?.id === preset.id ? 'text-accent' : 'text-slate-300'}`}>
                    {preset.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePreset(preset.id);
                    }}
                    className="p-1 text-slate-500 hover:text-red-400 rounded"
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
              <div className="my-1 border-t border-slate-700" />
              <button
                onClick={() => onSelectPreset(null)}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search cards..."
            className="w-full pl-10 pr-10 py-2 bg-slate-800/50 border border-slate-700 rounded-lg
                       text-white placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
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
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }
            `}
            aria-expanded={showAdvanced}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold
                             bg-accent text-white rounded-full">
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
                       text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg space-y-4 animate-slide-down">
          {/* Rarity filter */}
          {onRarityChange && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
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
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Sets
              </label>
              <div className="relative" ref={setDropdownRef}>
                <button
                  onClick={() => setSetDropdownOpen(!setDropdownOpen)}
                  className="flex items-center justify-between w-full max-w-xs px-3 py-2
                             bg-slate-800 border border-slate-700 rounded-lg text-sm
                             text-slate-300 hover:border-slate-600 transition-colors"
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
                                  bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                    {availableSets.map((set) => (
                      <label
                        key={set.code}
                        className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSets.includes(set.code)}
                          onChange={() => handleSetToggle(set.code)}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500
                                     focus:ring-teal-500/50 focus:ring-offset-0"
                        />
                        <span className="text-sm text-slate-300">{set.name}</span>
                        <span className="text-xs text-slate-500 ml-auto">{set.code}</span>
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
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-sm text-slate-300"
                      >
                        {set?.name || setCode}
                        <button
                          onClick={() => handleSetToggle(setCode)}
                          className="text-slate-500 hover:text-white"
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
