/**
 * Card search hook for handling MTG card searches
 * @module hooks/useCardSearch
 * 
 * Optimizations:
 * - Uses Scryfall autocomplete API (faster than full search)
 * - AbortController cancels stale requests
 * - Aggressive caching reduces API calls
 * - Two-phase: autocomplete first, fetch details on selection
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDebounce } from '../utils/useDebounce';
import { scoreCardMatch } from '../utils/searchScoring';
import { getCachedSearch, setCachedSearch, getPopularCardMatches, POPULAR_CARDS } from '../utils/popularCards';

/**
 * @typedef {Object} CardSearchResult
 * @property {string} name - Card name
 * @property {string} set - Set code (uppercase)
 * @property {string} setName - Full set name
 * @property {string} rarity - Card rarity
 * @property {string} [imageUrl] - URL to card image
 */

/**
 * @typedef {Object} UseCardSearchResult
 * @property {string} searchQuery - Current search query
 * @property {function(string): void} setSearchQuery - Update search query
 * @property {CardSearchResult[]} searchResults - Array of search results
 * @property {boolean} showDropdown - Whether to show the dropdown
 * @property {function(boolean): void} setShowDropdown - Control dropdown visibility
 * @property {boolean} searchIsLoading - Whether search is loading
 * @property {function(string): Promise<void>} handleSearch - Manually trigger search
 * @property {function(): void} clearSearch - Clear search state
 */

/**
 * Custom hook for handling card search functionality
 * Includes debouncing, caching, and smart result ranking
 * 
 * @param {Object} [options] - Hook options
 * @param {number} [options.debounceMs=150] - Debounce delay in milliseconds
 * @param {number} [options.maxResults=15] - Maximum number of results to return
 * @returns {UseCardSearchResult}
 */
export function useCardSearch(options = {}) {
  const { debounceMs = 150, maxResults = 15 } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchIsLoading, setSearchIsLoading] = useState(false);

  // Ref for AbortController to cancel pending requests
  const abortControllerRef = useRef(null);

  const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);

  /**
   * Perform a fast card name autocomplete against Scryfall
   * Uses the autocomplete endpoint which is much faster than full search
   * @param {string} query - Search query
   */
  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Check cache first (before showing loading state for better UX)
    const cached = getCachedSearch(query);
    if (cached) {
      setSearchResults(cached);
      setShowDropdown(true);
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setSearchIsLoading(true);

    try {
      // Use autocomplete API first - it's MUCH faster (~50ms vs ~300ms)
      const autocompleteResponse = await fetch(
        `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`,
        { signal: abortControllerRef.current.signal }
      );

      if (!autocompleteResponse.ok) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      const autocompleteData = await autocompleteResponse.json();
      const cardNames = autocompleteData.data || [];

      if (cardNames.length === 0) {
        setSearchResults([]);
        setShowDropdown(false);
        setSearchIsLoading(false);
        return;
      }

      // Create lightweight results from autocomplete (no images yet - faster!)
      // We'll fetch full details when user selects a card
      let results = cardNames.slice(0, maxResults).map(name => ({
        name,
        set: '',
        setName: '',
        rarity: '',
        imageUrl: null, // Will be loaded on selection
      }));

      // Sort by relevance score
      results = results.sort((a, b) => {
        const scoreA = scoreCardMatch(a.name, query);
        const scoreB = scoreCardMatch(b.name, query);
        return scoreB - scoreA;
      });

      // Cache the results
      setCachedSearch(query, results);

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      // Ignore abort errors (expected when cancelling)
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowDropdown(false);
      }
    } finally {
      setSearchIsLoading(false);
    }
  }, [maxResults]);

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      handleSearch(debouncedSearchQuery);
    } else {
      // Show popular cards when search is empty but user has started typing
      const popular = getPopularCardMatches(searchQuery);
      if (searchQuery.length > 0 && popular.length > 0) {
        setSearchResults(popular);
        setShowDropdown(true);
      } else if (searchQuery.length === 0) {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }
  }, [debouncedSearchQuery, searchQuery, handleSearch]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Clear search query, results, and close dropdown
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    showDropdown,
    setShowDropdown,
    searchIsLoading,
    handleSearch,
    clearSearch,
  };
}

export default useCardSearch;

