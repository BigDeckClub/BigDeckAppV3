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
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95';

  const variantClasses = {
    primary: 'bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-900 font-bold hover:shadow-2xl hover:shadow-teal-500/40 hover:-translate-y-0.5 focus:ring-teal-500',
    secondary: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur hover:from-slate-600 hover:to-slate-700 text-white border border-slate-600/50 hover:border-slate-500 hover:shadow-xl hover:shadow-slate-600/40 hover:-translate-y-0.5 focus:ring-slate-500',
    danger: 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white hover:shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5 focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-slate-700/50 text-slate-300 hover:text-white border border-transparent hover:border-slate-600 focus:ring-slate-500',
    accent: 'bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-0.5 focus:ring-amber-500',
    success: 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white hover:shadow-lg hover:shadow-green-500/40 hover:-translate-y-0.5 focus:ring-green-500',
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
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button component with multiple variants, sizes, and states.
 * 
 * @example
 * // Primary button
 * <Button variant="primary">Click me</Button>
 * 
 * @example
 * // Loading button with icon
 * <Button variant="secondary" loading iconLeft={<SaveIcon />}>
 *   Saving...
 * </Button>
 * 
 * @example
 * // Small danger button
 * <Button variant="danger" size="sm" onClick={handleDelete}>
 *   Delete
 * </Button>
 */
export function Button({
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
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 active:scale-95';

  const variantClasses = {
    primary: 'bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-900 font-bold hover:shadow-2xl hover:shadow-teal-500/40 hover:-translate-y-0.5 focus:ring-teal-500',
    secondary: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur hover:from-slate-600 hover:to-slate-700 text-white border border-slate-600/50 hover:border-slate-500 hover:shadow-xl hover:shadow-slate-600/40 hover:-translate-y-0.5 focus:ring-slate-500',
    danger: 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white hover:shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5 focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-slate-700/50 text-slate-300 hover:text-white border border-transparent hover:border-slate-600 focus:ring-slate-500',
    accent: 'bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold hover:shadow-2xl hover:shadow-amber-500/40 hover:-translate-y-0.5 focus:ring-amber-500',
    success: 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white hover:shadow-lg hover:shadow-green-500/40 hover:-translate-y-0.5 focus:ring-green-500',
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

export default Button;
