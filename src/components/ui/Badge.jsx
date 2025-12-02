import React from 'react';
import PropTypes from 'prop-types';

/**
 * Badge component for status indicators and labels.
 * 
 * @example
 * // Basic badge
 * <Badge>New</Badge>
 * 
 * @example
 * // Success badge
 * <Badge variant="success">In Stock</Badge>
 * 
 * @example
 * // Rarity badge for MTG cards
 * <Badge variant="mythic">Mythic Rare</Badge>
 * 
 * @example
 * // Count badge
 * <Badge variant="primary" size="sm">42</Badge>
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-full shadow-md backdrop-blur transition-all duration-200';

  const variantClasses = {
    default: 'bg-gradient-to-br from-slate-700/70 to-slate-800/50 text-slate-200 border border-slate-600/60',
    primary: 'bg-gradient-to-br from-teal-900/70 to-teal-800/50 text-teal-100 border border-teal-700/60 shadow-teal-900/30 hover:shadow-teal-500/20',
    success: 'bg-gradient-to-br from-green-900/70 to-green-800/50 text-green-100 border border-green-700/60 shadow-green-900/30 hover:shadow-green-500/20',
    warning: 'bg-gradient-to-br from-amber-900/70 to-amber-800/50 text-amber-100 border border-amber-700/60 shadow-amber-900/30 hover:shadow-amber-500/20',
    danger: 'bg-gradient-to-br from-red-900/70 to-red-800/50 text-red-100 border border-red-700/60 shadow-red-900/30 hover:shadow-red-500/20',
    // MTG card rarity variants
    common: 'bg-gradient-to-br from-slate-700/70 to-slate-800/50 text-slate-200 border border-slate-600/60',
    uncommon: 'bg-gradient-to-br from-zinc-600/70 to-zinc-700/50 text-zinc-100 border border-zinc-500/60',
    rare: 'bg-gradient-to-br from-amber-600/70 to-amber-700/50 text-amber-100 border border-amber-500/60 shadow-amber-900/30',
    mythic: 'bg-gradient-to-br from-orange-600/70 to-red-700/50 text-orange-100 border border-orange-500/60 shadow-orange-900/30',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const badgeClasses = [
    baseClasses,
    variantClasses[variant] || variantClasses.default,
    sizeClasses[size] || sizeClasses.md,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={badgeClasses}>
      {children}
    </span>
  );
}

Badge.propTypes = {
  /** Badge content */
  children: PropTypes.node.isRequired,
  /** Badge variant */
  variant: PropTypes.oneOf([
    'default',
    'primary',
    'success',
    'warning',
    'danger',
    'common',
    'uncommon',
    'rare',
    'mythic',
  ]),
  /** Badge size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default Badge;
