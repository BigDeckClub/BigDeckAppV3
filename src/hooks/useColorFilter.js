/**
 * useColorFilter - Hook for filtering cards by MTG color identity
 * Fetches color data from Scryfall and caches results
 * @module hooks/useColorFilter
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { EXTERNAL_APIS } from '../config/api';
import { matchesAnyColorFilter } from '../constants/mtgColors';

// In-memory cache for color identity lookups
// Key: card name (lowercase), Value: color_identity array
const colorIdentityCache = new Map();

// Pending fetch promises to avoid duplicate requests
const pendingFetches = new Map();

// Scryfall rate limit: 10 requests per second
const RATE_LIMIT_MS = 100;
let lastFetchTime = 0;

/**
 * Fetch color identity from Scryfall for a card name
 * @param {string} cardName - Card name to look up
 * @returns {Promise<string[]>} Color identity array
 */
async function fetchColorIdentity(cardName) {
  const cacheKey = cardName.toLowerCase().trim();

  // Check cache first
  if (colorIdentityCache.has(cacheKey)) {
    return colorIdentityCache.get(cacheKey);
  }

  // Check if there's already a pending fetch for this card
  if (pendingFetches.has(cacheKey)) {
    return pendingFetches.get(cacheKey);
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastFetch = now - lastFetchTime;
  if (timeSinceLastFetch < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastFetch));
  }
  lastFetchTime = Date.now();

  // Create the fetch promise
  const fetchPromise = (async () => {
    try {
      // Use exact name lookup for best results
      const encodedName = encodeURIComponent(cardName.split('//')[0].trim());
      const response = await fetch(
        `${EXTERNAL_APIS.SCRYFALL}/cards/named?exact=${encodedName}`
      );

      if (!response.ok) {
        // Try fuzzy search as fallback
        const fuzzyResponse = await fetch(
          `${EXTERNAL_APIS.SCRYFALL}/cards/named?fuzzy=${encodedName}`
        );
        if (!fuzzyResponse.ok) {
          colorIdentityCache.set(cacheKey, []);
          return [];
        }
        const fuzzyData = await fuzzyResponse.json();
        const colors = fuzzyData.color_identity || [];
        colorIdentityCache.set(cacheKey, colors);
        return colors;
      }

      const data = await response.json();
      const colors = data.color_identity || [];
      colorIdentityCache.set(cacheKey, colors);
      return colors;
    } catch (error) {
      console.error(`[ColorFilter] Error fetching color for ${cardName}:`, error);
      colorIdentityCache.set(cacheKey, []);
      return [];
    } finally {
      pendingFetches.delete(cacheKey);
    }
  })();

  pendingFetches.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Batch fetch color identities for multiple cards
 * @param {string[]} cardNames - Array of card names
 * @returns {Promise<Map<string, string[]>>} Map of card name to color identity
 */
async function batchFetchColorIdentities(cardNames) {
  const results = new Map();
  const uncachedNames = [];

  // Check cache first
  for (const name of cardNames) {
    const cacheKey = name.toLowerCase().trim();
    if (colorIdentityCache.has(cacheKey)) {
      results.set(name, colorIdentityCache.get(cacheKey));
    } else {
      uncachedNames.push(name);
    }
  }

  // Fetch uncached in parallel with rate limiting
  const BATCH_SIZE = 8;
  for (let i = 0; i < uncachedNames.length; i += BATCH_SIZE) {
    const batch = uncachedNames.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(name => fetchColorIdentity(name).then(colors => ({ name, colors })))
    );
    for (const { name, colors } of batchResults) {
      results.set(name, colors);
    }
  }

  return results;
}

/**
 * Custom hook for color filtering cards
 * @param {Object} options - Hook options
 * @param {Array} options.cards - Array of card objects with 'name' property
 * @param {boolean} options.enabled - Whether filtering is enabled
 * @returns {Object} Hook state and methods
 */
export function useColorFilter({ cards = [], enabled = true } = {}) {
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [colorData, setColorData] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const abortControllerRef = useRef(null);

  // Get unique card names from the cards array
  const uniqueCardNames = useMemo(() => {
    const names = new Set();
    for (const card of cards) {
      if (card?.name) {
        names.add(card.name);
      }
    }
    return Array.from(names);
  }, [cards]);

  // Fetch color data when cards change and filters are active
  useEffect(() => {
    if (!enabled || selectedFilters.length === 0 || uniqueCardNames.length === 0) {
      return;
    }

    // Check which cards need fetching
    const needsFetch = uniqueCardNames.filter(
      name => !colorIdentityCache.has(name.toLowerCase().trim())
    );

    if (needsFetch.length === 0) {
      // All cached, just update state
      const cached = new Map();
      for (const name of uniqueCardNames) {
        cached.set(name, colorIdentityCache.get(name.toLowerCase().trim()) || []);
      }
      setColorData(cached);
      return;
    }

    // Cancel any previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setLoadingProgress({ loaded: 0, total: needsFetch.length });

    let loadedCount = 0;
    const fetchAll = async () => {
      try {
        const results = await batchFetchColorIdentities(needsFetch);

        // Merge with existing cached data
        const merged = new Map();
        for (const name of uniqueCardNames) {
          const cacheKey = name.toLowerCase().trim();
          merged.set(name, colorIdentityCache.get(cacheKey) || []);
        }
        setColorData(merged);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('[ColorFilter] Error fetching color data:', error);
        }
      } finally {
        setIsLoading(false);
        setLoadingProgress({ loaded: 0, total: 0 });
      }
    };

    fetchAll();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [uniqueCardNames, selectedFilters.length, enabled]);

  // Toggle a filter on/off
  const toggleFilter = useCallback((filter) => {
    setSelectedFilters(prev => {
      const exists = prev.some(f => f.id === filter.id);
      if (exists) {
        return prev.filter(f => f.id !== filter.id);
      }
      return [...prev, filter];
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSelectedFilters([]);
  }, []);

  // Set filters directly
  const setFilters = useCallback((filters) => {
    setSelectedFilters(filters);
  }, []);

  // Check if a specific filter is active
  const isFilterActive = useCallback((filterId) => {
    return selectedFilters.some(f => f.id === filterId);
  }, [selectedFilters]);

  // Filter function to apply to cards
  const filterCard = useCallback((card) => {
    if (selectedFilters.length === 0) return true;

    const cardName = card?.name;
    if (!cardName) return false;

    const colors = colorData.get(cardName) ?? colorIdentityCache.get(cardName.toLowerCase().trim()) ?? null;

    // If we don't have color data yet, include the card (will filter when data arrives)
    if (colors === null) return true;

    return matchesAnyColorFilter(colors, selectedFilters);
  }, [selectedFilters, colorData]);

  // Get color identity for a specific card (from cache)
  const getCardColors = useCallback((cardName) => {
    if (!cardName) return null;
    return colorData.get(cardName) ?? colorIdentityCache.get(cardName.toLowerCase().trim()) ?? null;
  }, [colorData]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    if (selectedFilters.length === 0) return cards;
    return cards.filter(filterCard);
  }, [cards, filterCard, selectedFilters]);

  // Pre-fetch color data for a list of cards (useful for preparing before filter is applied)
  const prefetchColors = useCallback(async (cardNames) => {
    const names = cardNames.filter(n => n && !colorIdentityCache.has(n.toLowerCase().trim()));
    if (names.length === 0) return;

    setIsLoading(true);
    try {
      await batchFetchColorIdentities(names);
      // Update state with new cache data
      const updated = new Map(colorData);
      for (const name of names) {
        updated.set(name, colorIdentityCache.get(name.toLowerCase().trim()) || []);
      }
      setColorData(updated);
    } finally {
      setIsLoading(false);
    }
  }, [colorData]);

  return {
    // State
    selectedFilters,
    isLoading,
    loadingProgress,
    colorData,
    filteredCards,

    // Actions
    toggleFilter,
    clearFilters,
    setFilters,
    isFilterActive,
    filterCard,
    getCardColors,
    prefetchColors,
  };
}

/**
 * Get cached color identity (synchronous, returns null if not cached)
 * @param {string} cardName - Card name
 * @returns {string[]|null} Color identity or null if not cached
 */
export function getCachedColorIdentity(cardName) {
  if (!cardName) return null;
  const cacheKey = cardName.toLowerCase().trim();
  return colorIdentityCache.has(cacheKey) ? colorIdentityCache.get(cacheKey) : null;
}

/**
 * Prefetch and cache color identity for a card
 * @param {string} cardName - Card name
 * @returns {Promise<string[]>} Color identity
 */
export async function prefetchColorIdentity(cardName) {
  return fetchColorIdentity(cardName);
}

export default useColorFilter;
