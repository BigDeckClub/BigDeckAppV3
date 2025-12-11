import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useConfirmDialog } from '../context/ConfirmContext';

/**
 * ConfirmDialog component that renders the confirmation modal
 */
export function ConfirmDialog() {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmDialog();
  const confirmButtonRef = useRef(null);
  const dialogRef = useRef(null);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter' && document.activeElement !== confirmButtonRef.current) {
        // Only trigger on Enter if not already focused on confirm button
        e.preventDefault();
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleConfirm, handleCancel]);

  // Focus trap and initial focus
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isDanger = options.variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-[var(--border)] shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scale-in"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            {isDanger && (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className={`text-lg font-semibold ${isDanger ? 'text-red-300' : 'text-white'}`}
              >
                {options.title}
              </h3>
              <p
                id="confirm-dialog-description"
                className="mt-2 text-sm text-[var(--text-muted)]"
              >
                {options.message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] bg-[var(--muted-surface)] hover:bg-slate-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              {options.cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500'
                  : 'bg-teal-600 hover:bg-teal-500 text-white focus:ring-teal-500'
              }`}
            >
              {options.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
