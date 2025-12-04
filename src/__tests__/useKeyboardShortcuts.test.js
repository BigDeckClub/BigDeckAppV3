/**
 * Tests for useKeyboardShortcuts hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, formatShortcut, isMacPlatform } from '../hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let events = {};
  let originalActiveElement;
  
  beforeEach(() => {
    events = {};
    originalActiveElement = document.activeElement;
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

  it('should call handler for Cmd+K (metaKey) on Mac as Ctrl+K alternative', () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts([{ key: 'k', ctrlKey: true, handler }]));
    
    // Simulate Mac Cmd+K (metaKey instead of ctrlKey)
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
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

  describe('allowInInput behavior', () => {
    it('should block shortcuts when input element is focused (except Escape)', () => {
      const handler = vi.fn();
      renderHook(() => useKeyboardShortcuts([{ key: '/', handler }]));
      
      // Create an input element and make it the active element
      const input = document.createElement('input');
      document.body.appendChild(input);
      Object.defineProperty(document, 'activeElement', { value: input, configurable: true });
      
      const event = new KeyboardEvent('keydown', { key: '/' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
      
      events.keydown?.(event);
      
      expect(handler).not.toHaveBeenCalled();
      
      // Cleanup
      document.body.removeChild(input);
      Object.defineProperty(document, 'activeElement', { value: originalActiveElement, configurable: true });
    });

    it('should allow Escape key when input element is focused', () => {
      const handler = vi.fn();
      renderHook(() => useKeyboardShortcuts([{ key: 'Escape', handler }]));
      
      // Create an input element and make it the active element
      const input = document.createElement('input');
      document.body.appendChild(input);
      Object.defineProperty(document, 'activeElement', { value: input, configurable: true });
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
      
      events.keydown?.(event);
      
      expect(handler).toHaveBeenCalled();
      
      // Cleanup
      document.body.removeChild(input);
      Object.defineProperty(document, 'activeElement', { value: originalActiveElement, configurable: true });
    });

    it('should allow shortcuts with allowInInput: true when input is focused', () => {
      const handler = vi.fn();
      renderHook(() => useKeyboardShortcuts([{ key: '/', handler, allowInInput: true }]));
      
      // Create an input element and make it the active element
      const input = document.createElement('input');
      document.body.appendChild(input);
      Object.defineProperty(document, 'activeElement', { value: input, configurable: true });
      
      const event = new KeyboardEvent('keydown', { key: '/' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
      
      events.keydown?.(event);
      
      expect(handler).toHaveBeenCalled();
      
      // Cleanup
      document.body.removeChild(input);
      Object.defineProperty(document, 'activeElement', { value: originalActiveElement, configurable: true });
    });

    it('should block shortcuts when textarea is focused', () => {
      const handler = vi.fn();
      renderHook(() => useKeyboardShortcuts([{ key: '/', handler }]));
      
      // Create a textarea element and make it the active element
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      Object.defineProperty(document, 'activeElement', { value: textarea, configurable: true });
      
      const event = new KeyboardEvent('keydown', { key: '/' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
      
      events.keydown?.(event);
      
      expect(handler).not.toHaveBeenCalled();
      
      // Cleanup
      document.body.removeChild(textarea);
      Object.defineProperty(document, 'activeElement', { value: originalActiveElement, configurable: true });
    });

    it('should block shortcuts when select is focused', () => {
      const handler = vi.fn();
      renderHook(() => useKeyboardShortcuts([{ key: '/', handler }]));
      
      // Create a select element and make it the active element
      const select = document.createElement('select');
      document.body.appendChild(select);
      Object.defineProperty(document, 'activeElement', { value: select, configurable: true });
      
      const event = new KeyboardEvent('keydown', { key: '/' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
      
      events.keydown?.(event);
      
      expect(handler).not.toHaveBeenCalled();
      
      // Cleanup
      document.body.removeChild(select);
      Object.defineProperty(document, 'activeElement', { value: originalActiveElement, configurable: true });
    });

    it('should block shortcuts when contenteditable element is focused', () => {
      const handler = vi.fn();
      renderHook(() => useKeyboardShortcuts([{ key: '/', handler }]));
      
      // Create a contenteditable element and make it the active element
      const div = document.createElement('div');
      div.setAttribute('contenteditable', 'true');
      document.body.appendChild(div);
      Object.defineProperty(document, 'activeElement', { value: div, configurable: true });
      
      const event = new KeyboardEvent('keydown', { key: '/' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });
      Object.defineProperty(event, 'stopPropagation', { value: vi.fn() });
      
      events.keydown?.(event);
      
      expect(handler).not.toHaveBeenCalled();
      
      // Cleanup
      document.body.removeChild(div);
      Object.defineProperty(document, 'activeElement', { value: originalActiveElement, configurable: true });
    });
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

  it('should format Ctrl+K as ⌘+K on Mac (with + separator)', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    });
    
    const result = formatShortcut({ key: 'k', ctrlKey: true });
    expect(result).toBe('⌘+K');
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

  it('should format Shift+? as ⇧+? on Mac', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    });
    
    const result = formatShortcut({ key: '?', shiftKey: true });
    expect(result).toBe('⇧+?');
  });
});

describe('isMacPlatform', () => {
  const originalNavigator = global.navigator;
  
  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('should detect Mac from userAgentData', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgentData: { platform: 'macOS' } },
      writable: true,
    });
    
    expect(isMacPlatform()).toBe(true);
  });

  it('should detect Mac from userAgent', () => {
    Object.defineProperty(global, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      writable: true,
    });
    
    expect(isMacPlatform()).toBe(true);
  });

  it('should detect Mac from platform', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    });
    
    expect(isMacPlatform()).toBe(true);
  });

  it('should return false for Windows', () => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0)' },
      writable: true,
    });
    
    expect(isMacPlatform()).toBe(false);
  });
});
