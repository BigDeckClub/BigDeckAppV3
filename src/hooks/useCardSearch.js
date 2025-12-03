/**
 * Card search hook for handling MTG card searches
 * @module hooks/useCardSearch
 */

import { useState, useCallback, useEffect } from 'react';
import { useDebounce } from '../utils/useDebounce';
import { scoreCardMatch } from '../utils/searchScoring';
import { getCachedSearch, setCachedSearch, getPopularCardMatches } from '../utils/popularCards';

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
 * @property {boolean} isSearching - Whether a search is in progress
 * @property {boolean} showDropdown - Whether to show the dropdown
 * @property {function(boolean): void} setShowDropdown - Control dropdown visibility
 * @property {boolean} searchIsLoading - Whether search is loading
 * @property {function(string): Promise<void>} handleSearch - Manually trigger search
 */

/**
 * Custom hook for handling card search functionality
 * Includes debouncing, caching, and smart result ranking
 * 
 * @param {Object} [options] - Hook options
 * @param {number} [options.debounceMs=300] - Debounce delay in milliseconds
 * @param {number} [options.maxResults=15] - Maximum number of results to return
 * @returns {UseCardSearchResult}
 */
export function useCardSearch(options = {}) {
  const { debounceMs = 300, maxResults = 15 } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchIsLoading, setSearchIsLoading] = useState(false);

  const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);

  /**
   * Perform a card search against the Scryfall API
   * @param {string} query - Search query
   */
  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Check cache first
    const cached = getCachedSearch(query);
    if (cached) {
      setSearchResults(cached);
      setShowDropdown(true);
      return;
    }

    setSearchIsLoading(true);
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`
      );

      if (!response.ok) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      const data = await response.json();

      let results = (data.data || []).map((card) => ({
        name: card.name,
        set: card.set.toUpperCase(),
        setName: card.set_name,
        rarity: card.rarity,
        imageUrl: card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small,
      }));

      // Sort by relevance score
      results = results.sort((a, b) => {
        const scoreA = scoreCardMatch(a.name, query);
        const scoreB = scoreCardMatch(b.name, query);
        return scoreB - scoreA; // Descending order
      });

      // Limit to top results
      results = results.slice(0, maxResults);

      // Cache the results
      setCachedSearch(query, results);

      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      setSearchResults([]);
      setShowDropdown(false);
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

  /**
   * Clear search query, results, and close dropdown
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    showDropdown,
    setShowDropdown,
    searchIsLoading,
    handleSearch,
    clearSearch,
  };
}

export default useCardSearch;
