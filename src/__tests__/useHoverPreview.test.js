import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHoverPreview } from '../hooks/useHoverPreview';

describe('useHoverPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: true, // Default to hover-capable device
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('initializes with isVisible false', () => {
    const { result } = renderHook(() => useHoverPreview());
    expect(result.current.isVisible).toBe(false);
  });

  it('initializes with default position', () => {
    const { result } = renderHook(() => useHoverPreview());
    expect(result.current.position).toEqual({ x: 0, y: 0 });
  });

  it('shows preview after delay when showPreview is called', () => {
    const { result } = renderHook(() => useHoverPreview(300));
    
    const mockEvent = { clientX: 100, clientY: 200 };
    const mockRect = { top: 50, right: 150, bottom: 100, left: 50 };
    
    act(() => {
      result.current.showPreview(mockEvent, mockRect);
    });
    
    // Should not be visible immediately
    expect(result.current.isVisible).toBe(false);
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should be visible after delay
    expect(result.current.isVisible).toBe(true);
  });

  it('updates position when showPreview is called', () => {
    const { result } = renderHook(() => useHoverPreview());
    
    const mockEvent = { clientX: 150, clientY: 250 };
    const mockRect = { top: 50, right: 150, bottom: 100, left: 50 };
    
    act(() => {
      result.current.showPreview(mockEvent, mockRect);
    });
    
    expect(result.current.position).toEqual({ x: 150, y: 250 });
  });

  it('hides preview immediately when hidePreview is called', () => {
    const { result } = renderHook(() => useHoverPreview(300, 0));
    
    const mockEvent = { clientX: 100, clientY: 200 };
    const mockRect = { top: 50, right: 150, bottom: 100, left: 50 };
    
    // Show preview
    act(() => {
      result.current.showPreview(mockEvent, mockRect);
      vi.advanceTimersByTime(300);
    });
    
    expect(result.current.isVisible).toBe(true);
    
    // Hide preview
    act(() => {
      result.current.hidePreview();
    });
    
    expect(result.current.isVisible).toBe(false);
  });

  it('cancels pending show when hidePreview is called quickly', () => {
    const { result } = renderHook(() => useHoverPreview(300));
    
    const mockEvent = { clientX: 100, clientY: 200 };
    const mockRect = { top: 50, right: 150, bottom: 100, left: 50 };
    
    act(() => {
      result.current.showPreview(mockEvent, mockRect);
    });
    
    // Should not be visible yet
    expect(result.current.isVisible).toBe(false);
    
    // Hide before delay completes
    act(() => {
      vi.advanceTimersByTime(100); // Only advance 100ms
      result.current.hidePreview();
    });
    
    // Should still not be visible
    expect(result.current.isVisible).toBe(false);
    
    // Advance remaining time
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should remain not visible
    expect(result.current.isVisible).toBe(false);
  });

  it('updates position when updatePosition is called', () => {
    const { result } = renderHook(() => useHoverPreview());
    
    const mockEvent = { clientX: 200, clientY: 300 };
    
    act(() => {
      result.current.updatePosition(mockEvent);
    });
    
    expect(result.current.position).toEqual({ x: 200, y: 300 });
  });

  it('cancelPendingShow stops the show timeout', () => {
    const { result } = renderHook(() => useHoverPreview(300));
    
    const mockEvent = { clientX: 100, clientY: 200 };
    const mockRect = { top: 50, right: 150, bottom: 100, left: 50 };
    
    act(() => {
      result.current.showPreview(mockEvent, mockRect);
    });
    
    // Cancel before timeout completes
    act(() => {
      result.current.cancelPendingShow();
    });
    
    // Advance time past the delay
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // Should remain not visible
    expect(result.current.isVisible).toBe(false);
  });

  it('stores targetRect when showPreview is called', () => {
    const { result } = renderHook(() => useHoverPreview());
    
    const mockEvent = { clientX: 100, clientY: 200 };
    const mockRect = { top: 50, right: 150, bottom: 100, left: 50, width: 100, height: 50 };
    
    act(() => {
      result.current.showPreview(mockEvent, mockRect);
    });
    
    expect(result.current.targetRect).toEqual(mockRect);
  });

  it('does not show preview on touch devices', () => {
    // Mock as touch device (no hover capability)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false, // Touch device
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useHoverPreview(300));
    
    const mockEvent = { clientX: 100, clientY: 200 };
    const mockRect = { top: 50, right: 150, bottom: 100, left: 50 };
    
    act(() => {
      result.current.showPreview(mockEvent, mockRect);
      vi.advanceTimersByTime(500);
    });
    
    // Should remain not visible on touch device
    expect(result.current.isVisible).toBe(false);
  });

  it('respects custom show delay', () => {
    const { result } = renderHook(() => useHoverPreview(500)); // 500ms delay
    
    const mockEvent = { clientX: 100, clientY: 200 };
    const mockRect = { top: 50, right: 150, bottom: 100, left: 50 };
    
    act(() => {
      result.current.showPreview(mockEvent, mockRect);
    });
    
    // Should not be visible at 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.isVisible).toBe(false);
    
    // Should be visible at 500ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.isVisible).toBe(true);
  });
});
