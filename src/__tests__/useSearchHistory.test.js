import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from '../hooks/useSearchHistory';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    _getStore: () => store,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useSearchHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty array when localStorage is empty', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('initializes with stored searches from localStorage', () => {
    const storedSearches = ['Sol Ring', 'Lightning Bolt'];
    localStorageMock.setItem('bigdeck_recent_searches', JSON.stringify(storedSearches));

    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.recentSearches).toEqual(storedSearches);
  });

  it('adds search term after debounce delay', async () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearch('Sol Ring');
    });

    // Before debounce timeout
    expect(result.current.recentSearches).toEqual([]);

    // After debounce timeout
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.recentSearches).toEqual(['Sol Ring']);
  });

  it('does not add empty searches', async () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearch('');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.recentSearches).toEqual([]);
  });

  it('does not add whitespace-only searches', async () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearch('   ');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.recentSearches).toEqual([]);
  });

  it('trims whitespace from search terms', async () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearch('  Sol Ring  ');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.recentSearches).toEqual(['Sol Ring']);
  });

  it('removes duplicate searches (case-insensitive)', async () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearch('Sol Ring');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.addSearch('sol ring');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.recentSearches).toEqual(['sol ring']);
  });

  it('moves duplicate search to the top', async () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearch('Sol Ring');
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.addSearch('Lightning Bolt');
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      result.current.addSearch('Sol Ring');
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.recentSearches).toEqual(['Sol Ring', 'Lightning Bolt']);
  });

  it('limits searches to 10 items', async () => {
    const { result } = renderHook(() => useSearchHistory());

    for (let i = 1; i <= 12; i++) {
      act(() => {
        result.current.addSearch(`Card ${i}`);
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });
    }

    expect(result.current.recentSearches).toHaveLength(10);
    expect(result.current.recentSearches[0]).toBe('Card 12');
    expect(result.current.recentSearches[9]).toBe('Card 3');
  });

  it('removes a specific search term', async () => {
    const storedSearches = ['Sol Ring', 'Lightning Bolt', 'Counterspell'];
    localStorageMock.setItem('bigdeck_recent_searches', JSON.stringify(storedSearches));

    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.removeSearch('Lightning Bolt');
    });

    expect(result.current.recentSearches).toEqual(['Sol Ring', 'Counterspell']);
  });

  it('removes search term case-insensitively', async () => {
    const storedSearches = ['Sol Ring', 'Lightning Bolt'];
    localStorageMock.setItem('bigdeck_recent_searches', JSON.stringify(storedSearches));

    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.removeSearch('SOL RING');
    });

    expect(result.current.recentSearches).toEqual(['Lightning Bolt']);
  });

  it('clears all search history', async () => {
    const storedSearches = ['Sol Ring', 'Lightning Bolt', 'Counterspell'];
    localStorageMock.setItem('bigdeck_recent_searches', JSON.stringify(storedSearches));

    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.recentSearches).toEqual([]);
  });

  it('persists changes to localStorage', async () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearch('Sol Ring');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'bigdeck_recent_searches',
      JSON.stringify(['Sol Ring'])
    );
  });

  it('cancels previous debounce when new search is added', async () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      result.current.addSearch('Sol');
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.addSearch('Sol Ring');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Only 'Sol Ring' should be added, not 'Sol'
    expect(result.current.recentSearches).toEqual(['Sol Ring']);
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorageMock.setItem('bigdeck_recent_searches', 'invalid json');

    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.recentSearches).toEqual([]);
  });

  it('handles non-array JSON in localStorage gracefully', () => {
    localStorageMock.setItem('bigdeck_recent_searches', JSON.stringify({ not: 'an array' }));

    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.recentSearches).toEqual([]);
  });
});
