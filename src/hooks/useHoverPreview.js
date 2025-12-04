import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for managing hover preview state with delay
 * Handles hover delay logic, mouse position tracking, and touch device detection
 * 
 * @param {number} showDelay - Delay in ms before showing preview (default: 300ms)
 * @param {number} hideDelay - Delay in ms before hiding preview (default: 0ms)
 * @returns {Object} - Hook state and handlers
 */
export function useHoverPreview(showDelay = 300, hideDelay = 0) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [targetRect, setTargetRect] = useState(null);
  
  const showTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const lacksHoverCapability = useRef(false);

  // Check for hover capability on mount
  useEffect(() => {
    // Check if device supports hover (false on touch-only devices)
    const mediaQuery = window.matchMedia('(hover: hover)');
    lacksHoverCapability.current = !mediaQuery.matches;
    
    const handleMediaChange = (e) => {
      lacksHoverCapability.current = !e.matches;
      // Hide preview if device no longer supports hover
      if (lacksHoverCapability.current && isVisible) {
        setIsVisible(false);
      }
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [isVisible]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  /**
   * Show preview after delay
   * @param {MouseEvent} event - Mouse event for position tracking
   * @param {DOMRect} rect - Target element's bounding rectangle
   */
  const showPreview = useCallback((event, rect) => {
    // Don't show on devices that lack hover capability
    if (lacksHoverCapability.current) return;
    
    // Cancel any pending hide
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    // Update position
    setPosition({ x: event.clientX, y: event.clientY });
    if (rect) {
      setTargetRect(rect);
    }
    
    // If already visible, no need to set timeout again
    if (isVisible) return;
    
    // Set timeout to show preview
    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, showDelay);
  }, [showDelay, isVisible]);

  /**
   * Update position while hovering
   * @param {MouseEvent} event - Mouse event for position tracking
   */
  const updatePosition = useCallback((event) => {
    setPosition({ x: event.clientX, y: event.clientY });
  }, []);

  /**
   * Hide preview (immediately or with delay)
   */
  const hidePreview = useCallback(() => {
    // Cancel any pending show
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    
    if (hideDelay === 0) {
      setIsVisible(false);
    } else {
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);
    }
  }, [hideDelay]);

  /**
   * Cancel any pending preview show
   * Useful when mouse leaves quickly
   */
  const cancelPendingShow = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  return {
    isVisible,
    position,
    targetRect,
    showPreview,
    hidePreview,
    updatePosition,
    cancelPendingShow,
    lacksHoverCapability: lacksHoverCapability.current
  };
}

export default useHoverPreview;
