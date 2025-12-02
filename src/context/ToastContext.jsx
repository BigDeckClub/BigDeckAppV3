import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const ToastContext = createContext(null);

/**
 * Toast types for different notification styles
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * Default toast options
 */
const DEFAULT_OPTIONS = {
  duration: 5000, // 5 seconds
  dismissible: true,
  action: null, // { label: string, onClick: () => void }
};

let toastIdCounter = 0;

/**
 * ToastProvider component that wraps the application
 * and provides toast notification functionality
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - The type of toast (success, error, warning, info)
   * @param {Object} options - Optional configuration
   * @param {number} options.duration - Duration in ms before auto-dismiss (0 = no auto-dismiss)
   * @param {boolean} options.dismissible - Whether the toast can be manually dismissed
   * @param {Object} options.action - Action button { label: string, onClick: () => void }
   * @returns {string} The toast ID
   */
  const showToast = useCallback((message, type = TOAST_TYPES.INFO, options = {}) => {
    const id = `toast-${++toastIdCounter}`;
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const toast = {
      id,
      message,
      type,
      ...mergedOptions,
      createdAt: Date.now(),
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss if duration is set
    if (mergedOptions.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, mergedOptions.duration);
    }

    return id;
  }, []);

  /**
   * Dismiss a specific toast by ID
   * @param {string} id - The toast ID to dismiss
   */
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Dismiss all toasts
   */
  const dismissAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    toasts,
    showToast,
    dismissToast,
    dismissAllToasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to access toast functionality
 * @returns {{ showToast: Function, dismissToast: Function, dismissAllToasts: Function, toasts: Array }}
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastContext;
