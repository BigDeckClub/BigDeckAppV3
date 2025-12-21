import React from 'react';
import PropTypes from 'prop-types';

/**
 * Loading spinner component with configurable size and colors.
 * 
 * @example
 * // Basic spinner
 * <LoadingSpinner />
 * 
 * @example
 * // Large white spinner
 * <LoadingSpinner size="lg" color="white" />
 * 
 * @example
 * // Full-page overlay spinner
 * <LoadingSpinner overlay />
 */
export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  overlay = false,
  label,
  className = '',
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const colorClasses = {
    primary: 'text-[var(--bda-primary)]',
    white: 'text-white',
    slate: 'text-[var(--text-muted)]',
  };

  const spinnerClasses = [
    'animate-spin',
    sizeClasses[size] || sizeClasses.md,
    colorClasses[color] || colorClasses.primary,
    className,
  ].filter(Boolean).join(' ');

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg
        className={spinnerClasses}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        role="status"
        aria-live="polite"
      >
        {spinner}
        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite">
      {spinner}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}

LoadingSpinner.propTypes = {
  /** Spinner size */
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  /** Spinner color */
  color: PropTypes.oneOf(['primary', 'white', 'slate']),
  /** Show as full-page overlay */
  overlay: PropTypes.bool,
  /** Accessible label for screen readers */
  label: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default LoadingSpinner;
