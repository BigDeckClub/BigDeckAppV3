import React, { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

/**
 * Modal component with backdrop, keyboard support, and focus trap.
 * 
 * @example
 * // Basic modal
 * <Modal isOpen={isOpen} onClose={handleClose} title="Confirm Action">
 *   <p>Are you sure you want to proceed?</p>
 * </Modal>
 * 
 * @example
 * // Modal with footer actions
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   title="Edit Item"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={handleClose}>Cancel</Button>
 *       <Button variant="primary" onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   <Input label="Name" value={name} onChange={setName} />
 * </Modal>
 */

// Get all focusable elements within a container
const getFocusableElements = (container) => {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');
  return container.querySelectorAll(focusableSelectors);
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const focusableElementsRef = useRef([]);

  // Update cached focusable elements when modal content changes
  const updateFocusableElements = useCallback(() => {
    if (modalRef.current) {
      focusableElementsRef.current = Array.from(getFocusableElements(modalRef.current));
    }
  }, []);

  // Handle escape key and focus trap
  const handleKeyDown = useCallback((e) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
      return;
    }
    
    // Focus trap: handle Tab and Shift+Tab
    if (e.key === 'Tab') {
      const focusableElements = focusableElementsRef.current;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (focusableElements.length === 0) {
        e.preventDefault();
        return;
      }
      
      if (e.shiftKey) {
        // Shift + Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }, [closeOnEscape, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  // Focus trap and body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);

      // Cache focusable elements and focus the first one
      if (modalRef.current) {
        updateFocusableElements();
        const focusableElements = focusableElementsRef.current;
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          modalRef.current.focus();
        }
      }

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, handleKeyDown, updateFocusableElements]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4',
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          bg-gradient-to-b from-slate-800 to-slate-900 
          rounded-xl border border-slate-700 
          shadow-2xl shadow-slate-900/50
          w-full ${sizeClasses[size] || sizeClasses.md}
          max-h-[90vh] overflow-hidden
          flex flex-col
          animate-in fade-in zoom-in-95 duration-200
          ${className}
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
            {title && (
              typeof title === 'string' ? (
                <h2 id="modal-title" className="text-xl font-bold text-white">
                  {title}
                </h2>
              ) : (
                <div id="modal-title" className="flex-1">
                  {title}
                </div>
              )
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors ml-auto"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-700 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

Modal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Callback when modal should close */
  onClose: PropTypes.func.isRequired,
  /** Modal title (can be a string or custom React node) */
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  /** Modal body content */
  children: PropTypes.node,
  /** Footer content (typically action buttons) */
  footer: PropTypes.node,
  /** Modal size */
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', '2xl', 'full']),
  /** Close modal when clicking backdrop */
  closeOnBackdrop: PropTypes.bool,
  /** Close modal when pressing Escape */
  closeOnEscape: PropTypes.bool,
  /** Show close button in header */
  showCloseButton: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default Modal;
