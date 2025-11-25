import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// Toast context
const ToastContext = createContext();

// Toast types with their corresponding styles and icons
const TOAST_TYPES = {
  success: {
    bgClass: 'bg-emerald-900 border-emerald-500',
    textClass: 'text-emerald-200',
    Icon: CheckCircle,
    iconClass: 'text-emerald-400'
  },
  error: {
    bgClass: 'bg-red-900 border-red-500',
    textClass: 'text-red-200',
    Icon: AlertCircle,
    iconClass: 'text-red-400'
  },
  warning: {
    bgClass: 'bg-orange-900 border-orange-500',
    textClass: 'text-orange-200',
    Icon: AlertTriangle,
    iconClass: 'text-orange-400'
  },
  info: {
    bgClass: 'bg-blue-900 border-blue-500',
    textClass: 'text-blue-200',
    Icon: Info,
    iconClass: 'text-blue-400'
  }
};

// Default toast duration in ms
const DEFAULT_DURATION = 4000;

/**
 * Individual Toast component
 */
function Toast({ id, type, message, onDismiss, duration }) {
  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const { Icon, bgClass, textClass, iconClass } = config;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgClass} ${textClass} shadow-lg animate-slide-in-right min-w-[300px] max-w-md`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconClass}`} />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 p-1 rounded hover:bg-white hover:bg-opacity-10 transition"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

Toast.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
  message: PropTypes.string.isRequired,
  onDismiss: PropTypes.func.isRequired,
  duration: PropTypes.number
};

/**
 * Toast container component
 * Renders all active toasts in a fixed position
 */
function ToastContainer({ toasts, dismissToast }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onDismiss={dismissToast}
          duration={toast.duration}
        />
      ))}
    </div>
  );
}

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    duration: PropTypes.number
  })).isRequired,
  dismissToast: PropTypes.func.isRequired
};

/**
 * Toast Provider component
 * Wrap your app with this to enable toast notifications
 * 
 * @example
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = React.useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = DEFAULT_DURATION) => {
    const id = ++toastIdRef.current;
    console.log(`[Toast] ${type.toUpperCase()}: ${message}`);
    
    setToasts(prev => [...prev, { id, type, message, duration }]);
    
    return id;
  }, []);

  // Convenience methods
  const toast = {
    success: useCallback((message, duration) => addToast('success', message, duration), [addToast]),
    error: useCallback((message, duration) => addToast('error', message, duration), [addToast]),
    warning: useCallback((message, duration) => addToast('warning', message, duration), [addToast]),
    info: useCallback((message, duration) => addToast('info', message, duration), [addToast]),
    dismiss: dismissToast,
    dismissAll: useCallback(() => setToasts([]), [])
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Hook to use toast notifications
 * 
 * @returns {Object} Toast methods: success, error, warning, info, dismiss, dismissAll
 * 
 * @example
 * const toast = useToast();
 * 
 * // Show success toast
 * toast.success('Card added successfully!');
 * 
 * // Show error toast
 * toast.error('Failed to save changes');
 * 
 * // Show with custom duration (in ms)
 * toast.info('Processing...', 10000);
 * 
 * // Dismiss specific toast
 * const toastId = toast.info('Loading...');
 * toast.dismiss(toastId);
 * 
 * // Dismiss all toasts
 * toast.dismissAll();
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default ToastProvider;
