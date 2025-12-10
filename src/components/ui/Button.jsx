import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button component with multiple variants, sizes, and states.
 *
 * @example
 * // Primary button
 * <Button variant="primary">Click me</Button>
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  className = '',
  type = 'button',
  fullWidth = false,
  ariaLabel, // accept camelCase and map to aria-label
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95';

  const variantClasses = {
    primary: 'bg-ui-primary text-ui-primary-foreground hover:bg-ui-primary/90 focus:ring-ui-primary',
    secondary: 'bg-ui-card text-ui-text border border-ui-border hover:bg-ui-surface focus:ring-ui-primary',
    danger: 'bg-mtg-R text-white hover:bg-mtg-R/90 focus:ring-mtg-R',
    ghost: 'bg-transparent text-ui-text hover:bg-ui-card focus:ring-ui-primary',
    accent: 'bg-ui-accent text-white hover:bg-ui-accent/90 focus:ring-ui-accent',
    success: 'bg-mtg-G text-white hover:bg-mtg-G/90 focus:ring-mtg-G',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-8 gap-1.5',
    md: 'px-4 py-2.5 text-sm min-h-10 gap-2',
    lg: 'px-6 py-3 text-base min-h-12 gap-2.5',
  };

  const isDisabled = disabled || loading;

  const classes = [
    baseClasses,
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || sizeClasses.md,
    fullWidth ? 'w-full' : '',
    isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-label={ariaLabel}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
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
      )}
      {!loading && iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
      {children}
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
}

Button.propTypes = {
  /** Button content */
  children: PropTypes.node.isRequired,
  /** Visual style variant */
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'ghost', 'accent', 'success']),
  /** Button size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Show loading spinner */
  loading: PropTypes.bool,
  /** Disable button */
  disabled: PropTypes.bool,
  /** Icon to display on the left */
  iconLeft: PropTypes.node,
  /** Icon to display on the right */
  iconRight: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Button type attribute */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  /** Make button full width */
  fullWidth: PropTypes.bool,
};

// Export named for tests that import `{ Button }`
export { Button };

