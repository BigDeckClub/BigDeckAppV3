import React from 'react';
import PropTypes from 'prop-types';

/**
 * Card container component with glassmorphism styling matching the design system.
 */
export default function Card({
  children,
  header,
  footer,
  variant = 'default',
  hoverable = false,
  padding = 'default',
  className = '',
  ariaLabel, // accept camelCase prop and map to aria-label
  ...props
}) {
  const baseClasses = `
    bg-ui-card
    rounded-lg
    border border-ui-border
    shadow-md
    transition-all duration-300
    shadow-inner-sm
  `;

  const hoverClasses = hoverable
    ? 'hover:border-ui-primary hover:bg-ui-surface hover:-translate-y-1 cursor-pointer'
    : '';

  const variantClasses = {
    default: '',
    compact: 'rounded-md',
    stat: 'bg-ui-surface hover:border-ui-primary hover:bg-ui-surface',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    default: 'p-4 md:p-6',
    lg: 'p-6 md:p-8',
  };

  const cardClasses = [
    baseClasses,
    hoverClasses,
    variantClasses[variant] || '',
    header || footer ? '' : paddingClasses[padding] || paddingClasses.default,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} aria-label={ariaLabel} {...props}>
      {header && (
        <div className={`border-b border-ui-border ${paddingClasses[padding] || paddingClasses.default} pb-3`}>
          {header}
        </div>
      )}
      <div className={header || footer ? paddingClasses[padding] || paddingClasses.default : ''}>
        {children}
      </div>
      {footer && (
        <div className={`border-t border-ui-border ${paddingClasses[padding] || paddingClasses.default} pt-3`}>
          {footer}
        </div>
      )}
    </div>
  );
}

Card.propTypes = {
  /** Card content */
  children: PropTypes.node,
  /** Header content */
  header: PropTypes.node,
  /** Footer content */
  footer: PropTypes.node,
  /** Card variant */
  variant: PropTypes.oneOf(['default', 'compact', 'stat']),
  /** Add hover effects */
  hoverable: PropTypes.bool,
  /** Padding size */
  padding: PropTypes.oneOf(['none', 'sm', 'default', 'lg']),
  /** Additional CSS classes */
  className: PropTypes.string,
};

// Export named for tests that import `{ Card }`
export { Card };
