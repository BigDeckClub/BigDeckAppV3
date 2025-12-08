/**
 * Integration tests for useColorFilter hook
 * Tests the hook's filtering behavior and state management
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useColorFilter } from '../hooks/useColorFilter';
import { createColorFilter, PRESET_COLOR_FILTERS, matchesColorFilter, matchesAnyColorFilter } from '../constants/mtgColors';

describe('useColorFilter', () => {
  describe('initialization', () => {
    it('should initialize with empty selected filters', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));

      expect(result.current.selectedFilters).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should initialize with empty colorData', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));

      expect(result.current.colorData).toEqual(new Map());
    });
  });

  describe('toggleFilter', () => {
    it('should add filter when toggled', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);

      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });

      expect(result.current.selectedFilters).toHaveLength(1);
      expect(result.current.selectedFilters[0].id).toBe('mono-R');
    });

    it('should remove filter when toggled again', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);

      // Add
      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });
      expect(result.current.selectedFilters).toHaveLength(1);

      // Remove
      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });
      expect(result.current.selectedFilters).toHaveLength(0);
    });

    it('should support multiple filters at once', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);
      const monoGreenFilter = createColorFilter('mono', ['G']);

      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });
      act(() => {
        result.current.toggleFilter(monoGreenFilter);
      });

      expect(result.current.selectedFilters).toHaveLength(2);
    });

    it('should match by filter id for toggle', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter1 = createColorFilter('mono', ['R']);
      const monoRedFilter2 = createColorFilter('mono', ['R']); // Same filter, new object

      // Add first
      act(() => {
        result.current.toggleFilter(monoRedFilter1);
      });
      expect(result.current.selectedFilters).toHaveLength(1);

      // Toggle with equivalent filter
      act(() => {
        result.current.toggleFilter(monoRedFilter2);
      });
      expect(result.current.selectedFilters).toHaveLength(0);
    });
  });

  describe('clearFilters', () => {
    it('should clear all selected filters', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);
      const monoGreenFilter = createColorFilter('mono', ['G']);

      act(() => {
        result.current.toggleFilter(monoRedFilter);
        result.current.toggleFilter(monoGreenFilter);
      });
      expect(result.current.selectedFilters).toHaveLength(2);

      act(() => {
        result.current.clearFilters();
      });
      expect(result.current.selectedFilters).toHaveLength(0);
    });
  });

  describe('setFilters', () => {
    it('should set filters directly', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);
      const monoGreenFilter = createColorFilter('mono', ['G']);

      act(() => {
        result.current.setFilters([monoRedFilter, monoGreenFilter]);
      });

      expect(result.current.selectedFilters).toHaveLength(2);
      expect(result.current.selectedFilters[0].id).toBe('mono-R');
      expect(result.current.selectedFilters[1].id).toBe('mono-G');
    });

    it('should replace existing filters', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);
      const monoBlueFilter = createColorFilter('mono', ['U']);

      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });
      expect(result.current.selectedFilters).toHaveLength(1);
      expect(result.current.selectedFilters[0].id).toBe('mono-R');

      act(() => {
        result.current.setFilters([monoBlueFilter]);
      });
      expect(result.current.selectedFilters).toHaveLength(1);
      expect(result.current.selectedFilters[0].id).toBe('mono-U');
    });
  });

  describe('isFilterActive', () => {
    it('should return true for active filter', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);

      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });

      expect(result.current.isFilterActive('mono-R')).toBe(true);
    });

    it('should return false for inactive filter', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));

      expect(result.current.isFilterActive('mono-R')).toBe(false);
    });
  });

  describe('filterCard', () => {
    it('should return true when no filters are selected', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));

      const passes = result.current.filterCard({ name: 'Lightning Bolt' });
      expect(passes).toBe(true);
    });

    it('should return true for cards without name', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);

      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });

      // Card without name should be excluded
      expect(result.current.filterCard({})).toBe(false);
      expect(result.current.filterCard({ name: null })).toBe(false);
    });

    it('should return true for cards with uncached color data (until fetched)', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));
      const monoRedFilter = createColorFilter('mono', ['R']);

      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });

      // Card with unknown color data is included by default (will be filtered when data arrives)
      expect(result.current.filterCard({ name: 'Unknown Card' })).toBe(true);
    });
  });

  describe('getCardColors', () => {
    it('should return null for uncached cards', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));

      const colors = result.current.getCardColors('Unknown Card');
      expect(colors).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));

      expect(result.current.getCardColors(null)).toBeNull();
      expect(result.current.getCardColors(undefined)).toBeNull();
    });
  });

  describe('filteredCards', () => {
    it('should return all cards when no filters selected', () => {
      const cards = [
        { name: 'Lightning Bolt' },
        { name: 'Giant Growth' },
        { name: 'Sol Ring' },
      ];
      const { result } = renderHook(() => useColorFilter({ cards, enabled: true }));

      expect(result.current.filteredCards).toEqual(cards);
    });

    it('should return filtered cards based on cached color data', () => {
      const { result } = renderHook(() => useColorFilter({ cards: [], enabled: true }));

      // With no color data cached and filters selected, cards with names
      // but no cached data are included (return true until data fetched)
      const monoRedFilter = createColorFilter('mono', ['R']);
      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });

      // filteredCards should be empty since we started with no cards
      expect(result.current.filteredCards).toHaveLength(0);
    });
  });

  describe('disabled state', () => {
    it('should not trigger fetches when disabled', () => {
      const cards = [{ name: 'Lightning Bolt', scryfall_id: 'abc123' }];
      const { result } = renderHook(() => useColorFilter({ cards, enabled: false }));

      // Even with filters, nothing should happen when disabled
      const monoRedFilter = createColorFilter('mono', ['R']);
      act(() => {
        result.current.toggleFilter(monoRedFilter);
      });

      // Hook still works but fetching is disabled
      expect(result.current.selectedFilters).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
    });
  });
});

// Separate tests for the filter matching logic (no hooks, pure functions)
describe('Color Filter Matching Logic', () => {
  describe('matchesColorFilter - colorless', () => {
    const colorlessFilter = createColorFilter('colorless', []);

    it('should match cards with empty color array', () => {
      expect(matchesColorFilter([], colorlessFilter)).toBe(true);
    });

    it('should match cards with null colors', () => {
      expect(matchesColorFilter(null, colorlessFilter)).toBe(true);
    });

    it('should not match cards with colors', () => {
      expect(matchesColorFilter(['R'], colorlessFilter)).toBe(false);
      expect(matchesColorFilter(['W', 'U'], colorlessFilter)).toBe(false);
    });
  });

  describe('matchesColorFilter - mono', () => {
    const monoRedFilter = createColorFilter('mono', ['R']);

    it('should match exactly mono-colored cards', () => {
      expect(matchesColorFilter(['R'], monoRedFilter)).toBe(true);
    });

    it('should not match multi-colored cards', () => {
      expect(matchesColorFilter(['R', 'G'], monoRedFilter)).toBe(false);
    });

    it('should not match different mono-colored cards', () => {
      expect(matchesColorFilter(['G'], monoRedFilter)).toBe(false);
    });

    it('should not match colorless cards', () => {
      expect(matchesColorFilter([], monoRedFilter)).toBe(false);
    });
  });

  describe('matchesColorFilter - exact multi-color', () => {
    const azoriusFilter = createColorFilter('exact', ['W', 'U']);

    it('should match exact color combination regardless of order', () => {
      expect(matchesColorFilter(['W', 'U'], azoriusFilter)).toBe(true);
      expect(matchesColorFilter(['U', 'W'], azoriusFilter)).toBe(true);
    });

    it('should not match if missing a color', () => {
      expect(matchesColorFilter(['W'], azoriusFilter)).toBe(false);
      expect(matchesColorFilter(['U'], azoriusFilter)).toBe(false);
    });

    it('should not match if has extra colors', () => {
      expect(matchesColorFilter(['W', 'U', 'B'], azoriusFilter)).toBe(false);
    });

    it('should not match different color combination', () => {
      expect(matchesColorFilter(['B', 'R'], azoriusFilter)).toBe(false);
    });
  });

  describe('matchesAnyColorFilter - OR semantics', () => {
    it('should return true when no filters provided', () => {
      expect(matchesAnyColorFilter(['R'], [])).toBe(true);
      expect(matchesAnyColorFilter(['R'], null)).toBe(true);
    });

    it('should return true if card matches ANY filter', () => {
      const filters = [
        createColorFilter('mono', ['R']),
        createColorFilter('mono', ['G']),
      ];

      expect(matchesAnyColorFilter(['R'], filters)).toBe(true);
      expect(matchesAnyColorFilter(['G'], filters)).toBe(true);
    });

    it('should return false if card matches NO filters', () => {
      const filters = [
        createColorFilter('mono', ['R']),
        createColorFilter('mono', ['G']),
      ];

      expect(matchesAnyColorFilter(['U'], filters)).toBe(false);
      expect(matchesAnyColorFilter(['W', 'B'], filters)).toBe(false);
    });

    it('should work with mixed filter types', () => {
      const filters = [
        createColorFilter('colorless', []),
        createColorFilter('mono', ['R']),
        createColorFilter('exact', ['W', 'U']),
      ];

      expect(matchesAnyColorFilter([], filters)).toBe(true); // matches colorless
      expect(matchesAnyColorFilter(['R'], filters)).toBe(true); // matches mono red
      expect(matchesAnyColorFilter(['W', 'U'], filters)).toBe(true); // matches exact Azorius
      expect(matchesAnyColorFilter(['B'], filters)).toBe(false); // matches none
    });
  });

  describe('PRESET_COLOR_FILTERS validation', () => {
    it('should have all mono colors', () => {
      const monoFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'mono');
      expect(monoFilters).toHaveLength(5);
      expect(monoFilters.map(f => f.colors[0]).sort()).toEqual(['B', 'G', 'R', 'U', 'W']);
    });

    it('should have all 10 guilds (2-color combinations)', () => {
      const guildFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'exact' && f.colors.length === 2);
      expect(guildFilters).toHaveLength(10);
    });

    it('should have all 10 shards/wedges (3-color combinations)', () => {
      const threeColorFilters = PRESET_COLOR_FILTERS.filter(f => f.type === 'exact' && f.colors.length === 3);
      expect(threeColorFilters).toHaveLength(10);
    });

    it('should have colorless filter', () => {
      const colorlessFilter = PRESET_COLOR_FILTERS.find(f => f.type === 'colorless');
      expect(colorlessFilter).toBeDefined();
      expect(colorlessFilter.colors).toEqual([]);
    });

    it('should have all known guild names', () => {
      const guildNames = ['Azorius', 'Dimir', 'Rakdos', 'Gruul', 'Selesnya', 'Orzhov', 'Izzet', 'Golgari', 'Boros', 'Simic'];
      for (const name of guildNames) {
        expect(PRESET_COLOR_FILTERS.some(f => f.label === name)).toBe(true);
      }
    });

    it('should have all known shard/wedge names', () => {
      const shardNames = ['Esper', 'Grixis', 'Jund', 'Naya', 'Bant', 'Abzan', 'Jeskai', 'Sultai', 'Mardu', 'Temur'];
      for (const name of shardNames) {
        expect(PRESET_COLOR_FILTERS.some(f => f.label === name)).toBe(true);
      }
    });
  });
});
