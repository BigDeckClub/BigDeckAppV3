import React, { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Toggle - Accessible toggle/switch component
 */
export const Toggle = memo(function Toggle({
  checked = false,
  onChange,
  disabled = false,
  size = 'md',
  color = 'teal',
  label,
  labelPosition = 'right',
  className = '',
}) {
  const sizes = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
      label: 'text-xs',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
      label: 'text-sm',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
      label: 'text-base',
    },
  };

  const colors = {
    teal: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    blue: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    purple: 'bg-gradient-to-r from-purple-500 to-pink-500',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500',
    red: 'bg-gradient-to-r from-red-500 to-rose-500',
    green: 'bg-gradient-to-r from-green-500 to-emerald-500',
  };

  const sizeConfig = sizes[size];
  const colorClass = colors[color];

  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onChange?.(!checked);
    }
  };

  const toggleElement = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex flex-shrink-0 cursor-pointer rounded-full
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:ring-offset-2 focus:ring-offset-slate-900
        ${sizeConfig.track}
        ${checked ? colorClass : 'bg-slate-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className="sr-only">{label || 'Toggle'}</span>
      <span
        aria-hidden="true"
        className={`
          pointer-events-none inline-block rounded-full bg-white shadow-lg
          transform ring-0 transition duration-200 ease-in-out
          ${sizeConfig.thumb}
          ${checked ? sizeConfig.translate : 'translate-x-0.5'}
          ${size === 'sm' ? 'mt-0.5' : 'mt-0.5'}
        `}
      />
    </button>
  );

  if (!label) {
    return <div className={className}>{toggleElement}</div>;
  }

  return (
    <label
      className={`
        inline-flex items-center gap-3 cursor-pointer
        ${disabled ? 'cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {labelPosition === 'left' && (
        <span className={`${sizeConfig.label} text-[var(--text-muted)] ${disabled ? 'opacity-50' : ''}`}>
          {label}
        </span>
      )}
      {toggleElement}
      {labelPosition === 'right' && (
        <span className={`${sizeConfig.label} text-[var(--text-muted)] ${disabled ? 'opacity-50' : ''}`}>
          {label}
        </span>
      )}
    </label>
  );
});

Toggle.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  color: PropTypes.oneOf(['teal', 'blue', 'purple', 'amber', 'red', 'green']),
  label: PropTypes.string,
  labelPosition: PropTypes.oneOf(['left', 'right']),
  className: PropTypes.string,
};

/**
 * ToggleGroup - Group of toggles with shared styling
 */
export const ToggleGroup = memo(function ToggleGroup({
  options = [],
  value = [],
  onChange,
  disabled = false,
  size = 'md',
  color = 'teal',
  className = '',
}) {
  const handleToggle = (optionValue, checked) => {
    if (disabled || !onChange) return;

    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter(v => v !== optionValue));
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {options.map((option) => (
        <div key={option.value} className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200">
              {option.label}
            </div>
            {option.description && (
              <div className="text-xs text-[var(--text-muted)] mt-0.5">
                {option.description}
              </div>
            )}
          </div>
          <Toggle
            checked={value.includes(option.value)}
            onChange={(checked) => handleToggle(option.value, checked)}
            disabled={disabled || option.disabled}
            size={size}
            color={color}
          />
        </div>
      ))}
    </div>
  );
});

ToggleGroup.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
      disabled: PropTypes.bool,
    })
  ),
  value: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  color: PropTypes.oneOf(['teal', 'blue', 'purple', 'amber', 'red', 'green']),
  className: PropTypes.string,
};

/**
 * RadioToggle - Single-select toggle group (radio-like behavior)
 */
export const RadioToggle = memo(function RadioToggle({
  options = [],
  value,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div
      role="radiogroup"
      className={`
        inline-flex rounded-lg bg-[var(--muted-surface)] p-1
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled || option.disabled}
            onClick={() => onChange?.(option.value)}
            className={`
              ${sizes[size]}
              rounded-md font-medium transition-all duration-200
              ${isSelected
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-slate-200 hover:bg-slate-600/50'
              }
              ${(disabled || option.disabled) ? 'cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-teal-500/50
            `}
          >
            {option.icon && (
              <option.icon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
});

RadioToggle.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      disabled: PropTypes.bool,
    })
  ),
  value: PropTypes.string,
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};
