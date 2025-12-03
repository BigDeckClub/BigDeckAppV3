import React, { forwardRef, useId } from 'react';
import PropTypes from 'prop-types';

/**
 * Input component with label, error state, helper text, and icon support.
 * 
 * @example
 * // Basic input
 * <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
 * 
 * @example
 * // Input with error
 * <Input
 *   label="Password"
 *   type="password"
 *   error="Password must be at least 8 characters"
 *   value={password}
 *   onChange={(e) => setPassword(e.target.value)}
 * />
 * 
 * @example
 * // Search input with icon
 * <Input
 *   placeholder="Search cards..."
 *   iconLeft={<SearchIcon />}
 *   value={search}
 *   onChange={(e) => setSearch(e.target.value)}
 * />
 */
export const Input = forwardRef(function Input({
  id: providedId,
  label,
  error,
  helperText,
  iconLeft,
  iconRight,
  type = 'text',
  size = 'md',
  fullWidth = true,
  className = '',
  containerClassName = '',
  ...props
}, ref) {
  const generatedId = useId();
  const inputId = providedId || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const baseClasses = `
    w-full bg-gradient-to-br from-slate-800 to-slate-900 
    border border-slate-600 hover:border-teal-500 
    backdrop-blur rounded-xl 
    text-white placeholder-slate-500 
    focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-30 
    transition-all duration-300 
    shadow-lg shadow-slate-900/30
  `;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-8',
    md: 'px-4 py-2.5 text-base min-h-10',
    lg: 'px-5 py-3 text-lg min-h-12',
  };

  const errorClasses = error
    ? 'border-red-500 hover:border-red-400 focus:border-red-400 focus:ring-red-500'
    : '';

  const iconPaddingLeft = iconLeft ? 'pl-10' : '';
  const iconPaddingRight = iconRight ? 'pr-10' : '';

  const inputClasses = [
    baseClasses,
    sizeClasses[size] || sizeClasses.md,
    errorClasses,
    iconPaddingLeft,
    iconPaddingRight,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.propTypes = {
  /** Custom ID for the input element (auto-generated if not provided) */
  id: PropTypes.string,
  /** Input label */
  label: PropTypes.string,
  /** Error message */
  error: PropTypes.string,
  /** Helper text shown below input */
  helperText: PropTypes.string,
  /** Icon displayed on the left */
  iconLeft: PropTypes.node,
  /** Icon displayed on the right */
  iconRight: PropTypes.node,
  /** Input type */
  type: PropTypes.string,
  /** Input size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Make input full width */
  fullWidth: PropTypes.bool,
  /** Additional CSS classes for input */
  className: PropTypes.string,
  /** Additional CSS classes for container */
  containerClassName: PropTypes.string,
};

export default Input;
