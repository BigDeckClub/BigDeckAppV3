import React, { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

/**
 * Get icon for toast type
 */
const getToastIcon = (type) => {
  switch (type) {
    case TOAST_TYPES.SUCCESS:
      return <CheckCircle className="w-5 h-5" />;
    case TOAST_TYPES.ERROR:
      return <AlertCircle className="w-5 h-5" />;
    case TOAST_TYPES.WARNING:
      return <AlertTriangle className="w-5 h-5" />;
    case TOAST_TYPES.INFO:
    default:
      return <Info className="w-5 h-5" />;
  }
};

/**
 * Get styling for toast type
 */
const getToastStyles = (type) => {
  switch (type) {
    case TOAST_TYPES.SUCCESS:
      return {
        container: 'bg-gradient-to-r from-green-900/95 to-green-800/90 border-green-600/60',
        icon: 'text-green-400',
        progress: 'bg-green-400',
      };
    case TOAST_TYPES.ERROR:
      return {
        container: 'bg-gradient-to-r from-red-900/95 to-red-800/90 border-red-600/60',
        icon: 'text-red-400',
        progress: 'bg-red-400',
      };
    case TOAST_TYPES.WARNING:
      return {
        container: 'bg-gradient-to-r from-amber-900/95 to-amber-800/90 border-amber-600/60',
        icon: 'text-amber-400',
        progress: 'bg-amber-400',
      };
    case TOAST_TYPES.INFO:
    default:
      return {
        container: 'bg-gradient-to-r from-blue-900/95 to-blue-800/90 border-blue-600/60',
        icon: 'text-blue-400',
        progress: 'bg-blue-400',
      };
  }
};

/**
 * Individual Toast component
 */
function Toast({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const styles = getToastStyles(toast.type);
  const mountedRef = useRef(true);
  const dismissTimeoutRef = useRef(null);

  // Track component mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clear dismiss timeout on unmount
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (toast.duration > 0) {
      const startTime = toast.createdAt;
      const endTime = startTime + toast.duration;
      let rafId;

      const updateProgress = () => {
        if (!mountedRef.current) return;
        
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        const newProgress = (remaining / toast.duration) * 100;
        setProgress(newProgress);

        if (newProgress > 0) {
          rafId = requestAnimationFrame(updateProgress);
        }
      };

      rafId = requestAnimationFrame(updateProgress);
      
      return () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
      };
    }
  }, [toast.duration, toast.createdAt]);

  const handleDismiss = () => {
    setIsExiting(true);
    dismissTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        onDismiss(toast.id);
      }
    }, 200); // Match animation duration
  };

  const handleAction = () => {
    if (toast.action?.onClick) {
      toast.action.onClick();
      handleDismiss();
    }
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border shadow-2xl backdrop-blur-sm
        transition-all duration-200 ease-out
        ${styles.container}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-slide-in-right
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {getToastIcon(toast.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white break-words">
            {toast.message}
          </p>

          {/* Action button */}
          {toast.action && (
            <button
              onClick={handleAction}
              className="mt-2 text-sm font-semibold text-teal-300 hover:text-teal-200 underline underline-offset-2 transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Dismiss button */}
        {toast.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
          <div
            className={`h-full transition-all ease-linear ${styles.progress}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * ToastContainer component that renders all active toasts
 */
export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
