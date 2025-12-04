/**
 * Recent search history hook for storing and managing previous searches
 * @module hooks/useSearchHistory
 */

import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'bigdeck_recent_searches';
const MAX_SEARCHES = 10;
const DEBOUNCE_DELAY = 500;

/**
 * Get stored searches from localStorage
 * @returns {string[]} Array of recent search terms
 */
const getStoredSearches = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // If parsing fails, return empty array
  }
  return [];
};

/**
 * Save searches to localStorage
 * @param {string[]} searches - Array of search terms to store
 */
const saveSearches = (searches) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Silently fail if localStorage is not available
  }
};

/**
 * @typedef {Object} UseSearchHistoryResult
 * @property {string[]} recentSearches - Array of recent search terms
 * @property {function(string): void} addSearch - Add a search term to history (debounced)
 * @property {function(string): void} removeSearch - Remove a specific search term
 * @property {function(): void} clearHistory - Clear all search history
 */

/**
 * Custom hook for managing recent search history
 * Stores searches in localStorage with debouncing to avoid saving while typing
 * 
 * @returns {UseSearchHistoryResult}
 */
export function useSearchHistory() {
  const [recentSearches, setRecentSearches] = useState(getStoredSearches);
  const debounceTimerRef = useRef(null);

  // Sync state changes to localStorage
  useEffect(() => {
    saveSearches(recentSearches);
  }, [recentSearches]);

  /**
   * Add a search term to history (debounced)
   * @param {string} term - Search term to add
   */
  const addSearch = useCallback((term) => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set up debounced add
    debounceTimerRef.current = setTimeout(() => {
      const trimmedTerm = (term || '').trim();
      
      // Don't store empty searches
      if (!trimmedTerm) {
        return;
      }

      setRecentSearches((prev) => {
        // Remove duplicates (case-insensitive)
        const filtered = prev.filter(
          (search) => search.toLowerCase() !== trimmedTerm.toLowerCase()
        );
        
        // Add new search at the beginning and limit to MAX_SEARCHES
        return [trimmedTerm, ...filtered].slice(0, MAX_SEARCHES);
      });
    }, DEBOUNCE_DELAY);
  }, []);

  /**
   * Remove a specific search term from history
   * @param {string} term - Search term to remove
   */
  const removeSearch = useCallback((term) => {
    if (!term) return;
    
    setRecentSearches((prev) =>
      prev.filter((search) => search.toLowerCase() !== term.toLowerCase())
    );
  }, []);

  /**
   * Clear all search history
   */
  const clearHistory = useCallback(() => {
    setRecentSearches([]);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearHistory,
  };
}

export default useSearchHistory;
