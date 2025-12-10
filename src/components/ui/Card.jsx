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
  ...props
}) {
  const baseClasses = `
    bg-gradient-to-br from-slate-800/60 to-slate-900/40 
    backdrop-blur-2xl 
    rounded-2xl 
    border border-slate-600/30 
    shadow-2xl
    transition-all duration-300
  `;

  const hoverClasses = hoverable
    ? 'hover:shadow-teal-500/30 hover:border-teal-500/60 hover:bg-slate-800/70 hover:-translate-y-1 cursor-pointer'
    : '';

  const variantClasses = {
    default: '',
    compact: 'rounded-xl',
    stat: 'bg-gradient-to-br from-slate-800/50 to-slate-900/40 hover:border-teal-500/50 hover:from-slate-800/60 hover:to-slate-900/50 hover:shadow-lg hover:shadow-teal-500/20',
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
    <div className={cardClasses} {...props}>
      {header && (
        <div className={`border-b border-slate-700/50 ${paddingClasses[padding] || paddingClasses.default} pb-3`}>
          {header}
        </div>
      )}
      <div className={header || footer ? paddingClasses[padding] || paddingClasses.default : ''}>
        {children}
      </div>
      {footer && (
        <div className={`border-t border-slate-700/50 ${paddingClasses[padding] || paddingClasses.default} pt-3`}>
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
