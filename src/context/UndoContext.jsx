/**
 * Undo Context for providing undo/redo functionality globally
 * @module context/UndoContext
 */

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useToast, TOAST_TYPES } from './ToastContext';

const UndoContext = createContext(null);

/**
 * Action types for undo/redo operations
 */
export const UNDO_ACTION_TYPES = {
  DELETE_ITEM: 'DELETE_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  MOVE_TO_FOLDER: 'MOVE_TO_FOLDER',
  RESTORE_ITEM: 'RESTORE_ITEM',
  BULK_DELETE: 'BULK_DELETE',
  BULK_MOVE: 'BULK_MOVE',
};

/**
 * UndoProvider component that wraps the application
 * and provides undo/redo functionality
 */
export function UndoProvider({ children }) {
  const { showToast } = useToast();
  const {
    past,
    future,
    canUndo,
    canRedo,
    lastActionDescription,
    nextRedoDescription,
    addAction,
    undo: undoAction,
    redo: redoAction,
    clearHistory,
  } = useUndoRedo();

  /**
   * Perform undo with toast feedback
   */
  const undo = useCallback(async () => {
    if (!canUndo) {
      showToast('Nothing to undo', TOAST_TYPES.INFO);
      return false;
    }

    const description = lastActionDescription;
    const success = await undoAction();

    if (success) {
      showToast(`Undone: ${description}`, TOAST_TYPES.SUCCESS);
    } else {
      showToast('Failed to undo action', TOAST_TYPES.ERROR);
    }

    return success;
  }, [canUndo, lastActionDescription, undoAction, showToast]);

  /**
   * Perform redo with toast feedback
   */
  const redo = useCallback(async () => {
    if (!canRedo) {
      showToast('Nothing to redo', TOAST_TYPES.INFO);
      return false;
    }

    const description = nextRedoDescription;
    const success = await redoAction();

    if (success) {
      showToast(`Redone: ${description}`, TOAST_TYPES.SUCCESS);
    } else {
      showToast('Failed to redo action', TOAST_TYPES.ERROR);
    }

    return success;
  }, [canRedo, nextRedoDescription, redoAction, showToast]);

  /**
   * Register an undoable action with automatic toast
   * @param {Object} action - The action to register
   * @param {boolean} showUndoToast - Whether to show the undo toast
   */
  const registerAction = useCallback((action, showUndoToast = true) => {
    addAction(action);

    if (showUndoToast) {
      showToast(action.description, TOAST_TYPES.SUCCESS, {
        duration: 5000,
        action: {
          label: 'Undo',
          onClick: async () => {
            // Use the wrapped undo() function for consistent feedback and error handling
            await undo();
          },
        },
      });
    }
  }, [addAction, showToast, undo]);

  /**
   * Handle keyboard shortcuts for undo/redo
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (modifierKey && e.key === 'z') {
        // Prevent default browser behavior
        e.preventDefault();

        if (e.shiftKey) {
          // Ctrl/Cmd + Shift + Z = Redo
          redo();
        } else {
          // Ctrl/Cmd + Z = Undo
          undo();
        }
      }

      // Also support Ctrl+Y for redo (common on Windows)
      if (!isMac && e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const value = {
    // State
    past,
    future,
    canUndo,
    canRedo,
    lastActionDescription,
    nextRedoDescription,

    // Functions
    registerAction,
    undo,
    redo,
    clearHistory,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
}

UndoProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to access undo functionality
 * @returns {Object} Undo context value
 */
export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}

export default UndoContext;
