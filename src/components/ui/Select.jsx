import React, { forwardRef, useId } from 'react';
import PropTypes from 'prop-types';

/**
 * Select dropdown component with label and styling matching the design system.
 * 
 * @example
 * // Basic select
 * <Select
 *   label="Category"
 *   value={category}
 *   onChange={(e) => setCategory(e.target.value)}
 *   options={[
 *     { value: 'standard', label: 'Standard' },
 *     { value: 'modern', label: 'Modern' },
 *     { value: 'legacy', label: 'Legacy' },
 *   ]}
 * />
 * 
 * @example
 * // Select with placeholder
 * <Select
 *   label="Set"
 *   placeholder="Select a set..."
 *   value={set}
 *   onChange={(e) => setSet(e.target.value)}
 *   options={sets.map(s => ({ value: s.code, label: s.name }))}
 * />
 */
export const Select = forwardRef(function Select({
  id: providedId,
  label,
  error,
  helperText,
  options = [],
  placeholder,
  size = 'md',
  fullWidth = true,
  className = '',
  containerClassName = '',
  ...props
}, ref) {
  const generatedId = useId();
  const selectId = providedId || generatedId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;
  const baseClasses = `
    w-full bg-gradient-to-br from-slate-800 to-slate-900 
    border border-[var(--border)] hover:border-teal-500 
    backdrop-blur rounded-xl 
    text-white 
    focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-30 
    transition-all duration-300 
    shadow-lg shadow-slate-900/30
    appearance-none cursor-pointer
  `;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-8',
    md: 'px-4 py-2.5 text-base min-h-10',
    lg: 'px-5 py-3 text-lg min-h-12',
  };

  const errorClasses = error
    ? 'border-red-500 hover:border-red-400 focus:border-red-400 focus:ring-red-500'
    : '';

  const selectClasses = [
    baseClasses,
    sizeClasses[size] || sizeClasses.md,
    errorClasses,
    'pr-10', // Space for dropdown arrow
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-[var(--text-muted)] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={selectClasses}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-[var(--text-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.propTypes = {
  /** Custom ID for the select element (auto-generated if not provided) */
  id: PropTypes.string,
  /** Select label */
  label: PropTypes.string,
  /** Error message */
  error: PropTypes.string,
  /** Helper text shown below select */
  helperText: PropTypes.string,
  /** Array of options */
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    })
  ),
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Select size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Make select full width */
  fullWidth: PropTypes.bool,
  /** Additional CSS classes for select */
  className: PropTypes.string,
  /** Additional CSS classes for container */
  containerClassName: PropTypes.string,
};

export default Select;
