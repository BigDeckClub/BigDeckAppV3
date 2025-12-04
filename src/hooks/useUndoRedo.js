/**
 * Undo/Redo hook for managing action history
 * @module hooks/useUndoRedo
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * @typedef {Object} UndoAction
 * @property {string} type - Action type (e.g., 'DELETE_ITEM', 'UPDATE_ITEM')
 * @property {Object} data - Data associated with the action
 * @property {Function} undoFn - Function to execute when undoing this action
 * @property {Function} redoFn - Function to execute when redoing this action
 * @property {string} description - Human-readable description of the action
 * @property {number} timestamp - When the action was performed
 */

const MAX_HISTORY_SIZE = 50;

/**
 * Custom hook for undo/redo functionality
 * Maintains a history stack of actions that can be undone and redone
 * 
 * @returns {Object} Undo/redo state and functions
 */
export function useUndoRedo() {
  // Past actions that can be undone
  const [past, setPast] = useState([]);
  // Future actions that can be redone (populated when undoing)
  const [future, setFuture] = useState([]);

  /**
   * Add a new action to the history
   * This clears the future stack (can't redo after new action)
   * @param {UndoAction} action - The action to record
   */
  const addAction = useCallback((action) => {
    const actionWithTimestamp = {
      ...action,
      timestamp: Date.now(),
    };

    setPast((prevPast) => {
      const newPast = [...prevPast, actionWithTimestamp];
      // Keep only the last MAX_HISTORY_SIZE items
      if (newPast.length > MAX_HISTORY_SIZE) {
        return newPast.slice(-MAX_HISTORY_SIZE);
      }
      return newPast;
    });

    // Clear future when new action is added
    setFuture([]);
  }, []);

  /**
   * Undo the last action
   * @returns {Promise<boolean>} Whether the undo was successful
   */
  const undo = useCallback(async () => {
    if (past.length === 0) {
      return false;
    }

    const lastAction = past[past.length - 1];

    try {
      // Execute the undo function
      if (typeof lastAction.undoFn === 'function') {
        await lastAction.undoFn();
      }

      // Move action from past to future
      setPast((prevPast) => prevPast.slice(0, -1));
      setFuture((prevFuture) => [lastAction, ...prevFuture]);

      return true;
    } catch (error) {
      console.error('[UNDO] Failed to undo action:', error);
      return false;
    }
  }, [past]);

  /**
   * Redo the last undone action
   * @returns {Promise<boolean>} Whether the redo was successful
   */
  const redo = useCallback(async () => {
    if (future.length === 0) {
      return false;
    }

    const nextAction = future[0];

    try {
      // Execute the redo function
      if (typeof nextAction.redoFn === 'function') {
        await nextAction.redoFn();
      }

      // Move action from future to past
      setFuture((prevFuture) => prevFuture.slice(1));
      setPast((prevPast) => [...prevPast, nextAction]);

      return true;
    } catch (error) {
      console.error('[UNDO] Failed to redo action:', error);
      return false;
    }
  }, [future]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  /**
   * Whether there are actions that can be undone
   */
  const canUndo = past.length > 0;

  /**
   * Whether there are actions that can be redone
   */
  const canRedo = future.length > 0;

  /**
   * Get the description of the last action that can be undone
   */
  const lastActionDescription = useMemo(() => {
    if (past.length === 0) return null;
    return past[past.length - 1].description;
  }, [past]);

  /**
   * Get the description of the next action that can be redone
   */
  const nextRedoDescription = useMemo(() => {
    if (future.length === 0) return null;
    return future[0].description;
  }, [future]);

  return {
    // State
    past,
    future,
    canUndo,
    canRedo,
    lastActionDescription,
    nextRedoDescription,
    
    // Functions
    addAction,
    undo,
    redo,
    clearHistory,
  };
}

export default useUndoRedo;
