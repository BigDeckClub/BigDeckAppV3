/**
 * Tests for useKeyboardShortcuts hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, formatShortcut } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let events = {};
  
  beforeEach(() => {
    events = {};
    // Mock addEventListener and removeEventListener
    document.addEventListener = vi.fn((event, handler) => {
      events[event] = handler;
    });
    document.removeEventListener = vi.fn((event, handler) => {
      if (events[event] === handler) {
        delete events[event];
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register keydown listener', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: '/', handler }]));
    
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call handler when matching key is pressed', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: '/', handler }]));
    
    const event = new KeyboardEvent('keydown', { key: '/' });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
    
    events.keydown?.(event);
    
    expect(handler).toHaveBeenCalled();
  });

  it('should call handler for Ctrl+K shortcut', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'k', ctrlKey: true, handler }]));
    
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
    
    events.keydown?.(event);
    
    expect(handler).toHaveBeenCalled();
  });

  it('should not call handler when disabled', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: '/', handler }], { enabled: false }));
    
    const event = new KeyboardEvent('keydown', { key: '/' });
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
    Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
    
    events.keydown?.(event);
    
    expect(handler).not.toHaveBeenCalled();
  });

  it('should cleanup listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts([{ key: '/', handler }]));
    
    unmount();
    
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

describe('formatShortcut', () => {
  // Save original navigator
  const originalNavigator = global.navigator;
  
  afterEach(() => {
    // Restore navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('should format simple key', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Windows' },
      writable: true,
    });
    
    const result = formatShortcut({ key: '/' });
    expect(result).toBe('/');
  });

  it('should format Ctrl+K on Windows', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Windows' },
      writable: true,
    });
    
    const result = formatShortcut({ key: 'k', ctrlKey: true });
    expect(result).toBe('Ctrl+K');
  });

  it('should format Ctrl+K as ⌘K on Mac', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    });
    
    const result = formatShortcut({ key: 'k', ctrlKey: true });
    expect(result).toBe('⌘K');
  });

  it('should format Escape as Esc', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Windows' },
      writable: true,
    });
    
    const result = formatShortcut({ key: 'Escape' });
    expect(result).toBe('Esc');
  });

  it('should format Shift+? on Windows', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Windows' },
      writable: true,
    });
    
    const result = formatShortcut({ key: '?', shiftKey: true });
    expect(result).toBe('Shift+?');
  });

  it('should format Shift+? as ⇧? on Mac', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    });
    
    const result = formatShortcut({ key: '?', shiftKey: true });
    expect(result).toBe('⇧?');
  });
});
