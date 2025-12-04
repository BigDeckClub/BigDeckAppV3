/**
 * Keyboard shortcuts hook for global keyboard navigation
 * @module hooks/useKeyboardShortcuts
 */

import { useEffect, useCallback, useRef } from 'react';

/**
 * @typedef {Object} ShortcutConfig
 * @property {string} key - The key to listen for (e.g., '/', 'Escape', 'k')
 * @property {boolean} [ctrlKey=false] - Whether Ctrl/Cmd key is required (accepts both Ctrl and Meta for cross-platform)
 * @property {boolean} [shiftKey=false] - Whether Shift key is required
 * @property {boolean} [altKey=false] - Whether Alt key is required
 * @property {Function} handler - The function to call when shortcut is triggered
 * @property {boolean} [allowInInput=false] - Whether to allow shortcut when focused on input
 * @property {string} [description] - Human-readable description of the shortcut
 */

/**
 * Check if the currently focused element is an input field
 * @returns {boolean}
 */
const isInputElement = () => {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toLowerCase();
  const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';
  
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
};

/**
 * Custom hook for registering global keyboard shortcuts
 * 
 * @param {ShortcutConfig[]} shortcuts - Array of shortcut configurations
 * @param {Object} [options] - Hook options
 * @param {boolean} [options.enabled=true] - Whether shortcuts are enabled
 * 
 * @example
 * // Focus search on '/' or Ctrl+K
 * useKeyboardShortcuts([
 *   { key: '/', handler: focusSearch },
 *   { key: 'k', ctrlKey: true, handler: focusSearch },
 *   { key: 'Escape', handler: clearSearch, allowInInput: true },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts, options = {}) {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);
  
  // Keep shortcuts ref updated
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    const currentShortcuts = shortcutsRef.current;
    
    for (const shortcut of currentShortcuts) {
      const {
        key,
        ctrlKey = false,
        shiftKey = false,
        altKey = false,
        handler,
        allowInInput = false,
      } = shortcut;
      
      // Check if shortcut should be ignored when in input
      if (!allowInInput && isInputElement()) {
        // Only allow Escape key in inputs by default
        if (key !== 'Escape') continue;
      }
      
      // Check modifier keys
      // For Ctrl+Key shortcuts, we also accept Cmd+Key (Meta) on Mac for cross-platform compatibility
      const matchesModifiers = 
        (ctrlKey ? (event.ctrlKey || event.metaKey) : (!event.ctrlKey && !event.metaKey)) &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey;
      
      // Check key match (case-insensitive for letters)
      const keyMatch = event.key.toLowerCase() === key.toLowerCase() ||
        event.key === key;
      
      if (keyMatch && matchesModifiers) {
        event.preventDefault();
        event.stopPropagation();
        handler(event);
        return;
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Predefined shortcut keys for common actions
 * Note: The '?' key is pressed by typing Shift+/ on most keyboards,
 * but the event.key will be '?' directly, so no shiftKey modifier is needed
 */
export const SHORTCUT_KEYS = {
  FOCUS_SEARCH: [
    { key: '/', description: 'Focus search' },
    { key: 'k', ctrlKey: true, description: 'Focus search (Ctrl+K)' },
  ],
  CLOSE: { key: 'Escape', description: 'Close modal / Clear search' },
  HELP: { key: '?', description: 'Show keyboard shortcuts' },
};

/**
 * Detect if the current platform is Mac
 * Uses multiple detection methods for better compatibility
 * @returns {boolean}
 */
export function isMacPlatform() {
  if (typeof navigator === 'undefined') return false;
  
  // Check userAgentData first (modern browsers)
  if (navigator.userAgentData?.platform === 'macOS') return true;
  
  // Check userAgent (reliable fallback)
  if (navigator.userAgent?.includes('Mac')) return true;
  
  // Check platform (deprecated but still works)
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Format shortcut for display (e.g., "Ctrl+K" or "⌘+K" on Mac)
 * Always uses '+' separator for consistent parsing in the UI
 * @param {ShortcutConfig} shortcut
 * @returns {string}
 */
export function formatShortcut(shortcut) {
  const isMac = isMacPlatform();
  
  const parts = [];
  
  if (shortcut.ctrlKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  
  // Format the key
  let keyDisplay = shortcut.key;
  if (keyDisplay === 'Escape') keyDisplay = 'Esc';
  if (keyDisplay === ' ') keyDisplay = 'Space';
  if (keyDisplay.length === 1) keyDisplay = keyDisplay.toUpperCase();
  
  parts.push(keyDisplay);
  
  // Always use '+' separator for consistent parsing
  return parts.join('+');
}

export default useKeyboardShortcuts;
