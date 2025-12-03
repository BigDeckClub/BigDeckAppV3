import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';

const ConfirmContext = createContext(null);

/**
 * Default confirm options
 */
const DEFAULT_OPTIONS = {
  title: 'Confirm Action',
  message: 'Are you sure you want to continue?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'default', // 'default' | 'danger'
};

/**
 * ConfirmProvider component that provides confirmation dialog functionality
 */
export function ConfirmProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const resolveRef = useRef(null);

  /**
   * Show a confirmation dialog
   * @param {Object} confirmOptions - Configuration options
   * @param {string} confirmOptions.title - Dialog title
   * @param {string} confirmOptions.message - Dialog message
   * @param {string} confirmOptions.confirmText - Confirm button text
   * @param {string} confirmOptions.cancelText - Cancel button text
   * @param {string} confirmOptions.variant - 'default' | 'danger'
   * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
   */
  const confirm = useCallback((confirmOptions = {}) => {
    return new Promise((resolve) => {
      setOptions({ ...DEFAULT_OPTIONS, ...confirmOptions });
      setIsOpen(true);
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const value = {
    confirm,
    isOpen,
    options,
    handleConfirm,
    handleCancel,
  };

  return (
    <ConfirmContext.Provider value={value}>
      {children}
    </ConfirmContext.Provider>
  );
}

ConfirmProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

/**
 * Hook to access confirm dialog functionality
 * @returns {{ confirm: Function }}
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return { confirm: context.confirm };
}

/**
 * Internal hook for the ConfirmDialog component
 */
export function useConfirmDialog() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within a ConfirmProvider');
  }
  return context;
}

export default ConfirmContext;
