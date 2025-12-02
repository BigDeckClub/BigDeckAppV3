import React from 'react';
import PropTypes from 'prop-types';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Alert component for displaying notifications and messages.
 * 
 * @example
 * // Success alert
 * <Alert variant="success" title="Success!">
 *   Your changes have been saved.
 * </Alert>
 * 
 * @example
 * // Dismissible error alert
 * <Alert variant="error" onClose={handleClose}>
 *   Something went wrong. Please try again.
 * </Alert>
 * 
 * @example
 * // Alert with action
 * <Alert
 *   variant="warning"
 *   title="Attention needed"
 *   action={{ label: 'Review', onClick: handleReview }}
 * >
 *   Some items require your attention.
 * </Alert>
 */
export function Alert({
  children,
  variant = 'info',
  title,
  onClose,
  action,
  icon: customIcon,
  className = '',
}) {
  const variantConfig = {
    success: {
      bg: 'bg-gradient-to-br from-green-900/70 to-green-800/50',
      border: 'border-green-700/60',
      text: 'text-green-100',
      icon: CheckCircle,
      iconColor: 'text-green-400',
    },
    error: {
      bg: 'bg-gradient-to-br from-red-900/70 to-red-800/50',
      border: 'border-red-700/60',
      text: 'text-red-100',
      icon: AlertCircle,
      iconColor: 'text-red-400',
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-900/70 to-amber-800/50',
      border: 'border-amber-700/60',
      text: 'text-amber-100',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-900/70 to-blue-800/50',
      border: 'border-blue-700/60',
      text: 'text-blue-100',
      icon: Info,
      iconColor: 'text-blue-400',
    },
  };

  const config = variantConfig[variant] || variantConfig.info;
  const IconComponent = customIcon || config.icon;

  const alertClasses = [
    'rounded-lg p-4 border flex items-start gap-3 shadow-lg backdrop-blur',
    config.bg,
    config.border,
    config.text,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={alertClasses} role="alert">
      <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold mb-1">
            {title}
          </h4>
        )}
        <div className="text-sm opacity-90">
          {children}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className={`mt-2 text-sm font-medium underline hover:no-underline ${config.iconColor}`}
          >
            {action.label}
          </button>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

Alert.propTypes = {
  /** Alert content */
  children: PropTypes.node,
  /** Alert variant */
  variant: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  /** Alert title */
  title: PropTypes.string,
  /** Close handler (shows close button if provided) */
  onClose: PropTypes.func,
  /** Action button configuration */
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
  }),
  /** Custom icon component */
  icon: PropTypes.elementType,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default Alert;
