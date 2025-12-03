import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCardSearch } from '../hooks/useCardSearch';

// Mock fetch
global.fetch = vi.fn();

// Mock the useDebounce hook
vi.mock('../utils/useDebounce', () => ({
  useDebounce: (value) => value, // Return value immediately for testing
}));

// Mock popular cards utilities
vi.mock('../utils/popularCards', () => ({
  getCachedSearch: vi.fn(() => null),
  setCachedSearch: vi.fn(),
  getPopularCardMatches: vi.fn(() => []),
}));

describe('useCardSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useCardSearch());

    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.showDropdown).toBe(false);
    expect(result.current.searchIsLoading).toBe(false);
  });

  it('updates searchQuery when setSearchQuery is called', () => {
    const { result } = renderHook(() => useCardSearch());

    act(() => {
      result.current.setSearchQuery('Sol Ring');
    });

    expect(result.current.searchQuery).toBe('Sol Ring');
  });

  it('clears results for short queries', async () => {
    const { result } = renderHook(() => useCardSearch());

    await act(async () => {
      await result.current.handleSearch('a');
    });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.showDropdown).toBe(false);
  });

  it('makes API call for valid queries', async () => {
    const mockResponse = {
      data: [
        {
          name: 'Sol Ring',
          set: 'c21',
          set_name: 'Commander 2021',
          rarity: 'uncommon',
          image_uris: { small: 'http://example.com/image.jpg' },
        },
      ],
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useCardSearch());

    await act(async () => {
      await result.current.handleSearch('Sol Ring');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.scryfall.com/cards/search')
    );
  });

  it('handles API errors gracefully', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useCardSearch());

    await act(async () => {
      await result.current.handleSearch('Sol Ring');
    });

    expect(result.current.searchResults).toEqual([]);
    expect(result.current.showDropdown).toBe(false);
  });

  it('exposes setShowDropdown function', () => {
    const { result } = renderHook(() => useCardSearch());

    expect(typeof result.current.setShowDropdown).toBe('function');

    act(() => {
      result.current.setShowDropdown(true);
    });

    expect(result.current.showDropdown).toBe(true);
  });
});
