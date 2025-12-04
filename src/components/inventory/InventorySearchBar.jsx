import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Clock, Trash2 } from 'lucide-react';
import { useSearchHistory } from '../../hooks/useSearchHistory';

/**
 * InventorySearchBar - Search input for filtering inventory cards
 * Includes recent searches dropdown with keyboard navigation
 */
export const InventorySearchBar = memo(function InventorySearchBar({
  inventorySearch,
  setInventorySearch
}) {
  const { recentSearches, addSearch, removeSearch, clearHistory } = useSearchHistory();
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter recent searches based on current input
  const filteredSearches = inventorySearch.trim()
    ? recentSearches.filter((search) =>
        search.toLowerCase().includes(inventorySearch.toLowerCase())
      )
    : recentSearches;

  // Determine if dropdown should show
  const shouldShowDropdown = showDropdown && filteredSearches.length > 0;

  // Add search to history when user types
  useEffect(() => {
    if (inventorySearch.trim()) {
      addSearch(inventorySearch);
    }
  }, [inventorySearch, addSearch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle selecting a search term
  const handleSelectSearch = useCallback((term) => {
    setInventorySearch(term);
    setShowDropdown(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }, [setInventorySearch]);

  // Handle removing a search term (prevent event from selecting)
  const handleRemoveSearch = useCallback((event, term) => {
    event.stopPropagation();
    removeSearch(term);
  }, [removeSearch]);

  // Handle clearing all history
  const handleClearHistory = useCallback((event) => {
    event.stopPropagation();
    clearHistory();
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }, [clearHistory]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event) => {
    if (!shouldShowDropdown) {
      // Open dropdown on arrow down when closed
      if (event.key === 'ArrowDown' && filteredSearches.length > 0) {
        setShowDropdown(true);
        setHighlightedIndex(0);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSearches.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < filteredSearches.length) {
          event.preventDefault();
          handleSelectSearch(filteredSearches[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [shouldShowDropdown, filteredSearches, highlightedIndex, handleSelectSearch]);

  // Reset highlighted index when search input changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [inventorySearch]);

  return (
    <div className="mb-8 px-1 md:px-0" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search cards..."
          value={inventorySearch}
          onChange={(e) => setInventorySearch(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-5 py-3.5 md:py-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 focus:border-teal-400 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-30 transition-all duration-300 font-medium shadow-lg shadow-slate-900/50 text-base md:text-sm"
          aria-expanded={shouldShowDropdown}
          aria-haspopup="listbox"
          aria-controls="recent-searches-dropdown"
          aria-activedescendant={
            highlightedIndex >= 0 ? `recent-search-${highlightedIndex}` : undefined
          }
        />
        <svg 
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        {/* Recent Searches Dropdown */}
        {shouldShowDropdown && (
          <div
            id="recent-searches-dropdown"
            role="listbox"
            className="absolute left-0 right-0 mt-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-slate-900/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>Recent Searches</span>
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {filteredSearches.map((search, index) => (
                <li
                  key={search}
                  id={`recent-search-${index}`}
                  role="option"
                  aria-selected={highlightedIndex === index}
                  onClick={() => handleSelectSearch(search)}
                  className={`px-4 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 group ${
                    highlightedIndex === index
                      ? 'bg-teal-600/20 text-teal-300'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                  }`}
                >
                  <span className="truncate font-medium">{search}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemoveSearch(e, search)}
                    className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150"
                    aria-label={`Remove ${search} from history`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleClearHistory}
              className="w-full px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 border-t border-slate-700/50 transition-all duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear history</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

InventorySearchBar.propTypes = {
  inventorySearch: PropTypes.string.isRequired,
  setInventorySearch: PropTypes.func.isRequired
};

export default InventorySearchBar;
