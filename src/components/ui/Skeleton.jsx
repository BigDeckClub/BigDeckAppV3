import React from 'react';
import PropTypes from 'prop-types';

/**
 * Skeleton loading placeholder component.
 * 
 * @example
 * // Text skeleton
 * <Skeleton variant="text" width="60%" />
 * 
 * @example
 * // Card skeleton
 * <Skeleton variant="card" />
 * 
 * @example
 * // Circular avatar skeleton
 * <Skeleton variant="circular" width={40} height={40} />
 * 
 * @example
 * // Custom skeleton
 * <Skeleton width={200} height={100} className="rounded-xl" />
 */
export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
  count = 1,
}) {
  const baseClasses = 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 animate-pulse';

  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    card: 'h-40 rounded-lg',
    avatar: 'w-10 h-10 rounded-full',
  };

  const getStyle = () => {
    const style = {};
    if (width) {
      style.width = typeof width === 'number' ? `${width}px` : width;
    }
    if (height) {
      style.height = typeof height === 'number' ? `${height}px` : height;
    }
    return style;
  };

  const skeletonClasses = [
    baseClasses,
    variantClasses[variant] || variantClasses.rectangular,
    className,
  ].filter(Boolean).join(' ');

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={skeletonClasses}
            style={getStyle()}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={skeletonClasses}
      style={getStyle()}
      aria-hidden="true"
    />
  );
}

/**
 * Pre-composed skeleton for card placeholders in the inventory grid.
 */
export function CardSkeleton({ className = '' }) {
  return (
    <div className={`bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-lg p-4 ${className}`}>
      <Skeleton variant="text" width="70%" className="mb-3" />
      <Skeleton variant="rectangular" height={80} className="mb-3" />
      <div className="grid grid-cols-3 gap-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
      </div>
    </div>
  );
}

/**
 * Pre-composed skeleton for list item placeholders.
 */
export function ListItemSkeleton({ className = '' }) {
  return (
    <div className={`bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-lg p-4 flex items-center gap-4 ${className}`}>
      <Skeleton variant="avatar" />
      <div className="flex-1">
        <Skeleton variant="text" width="40%" className="mb-2" />
        <Skeleton variant="text" width="60%" />
      </div>
      <Skeleton variant="rectangular" width={80} height={32} />
    </div>
  );
}

Skeleton.propTypes = {
  /** Skeleton variant */
  variant: PropTypes.oneOf(['text', 'rectangular', 'circular', 'card', 'avatar']),
  /** Width (number for pixels or string for any CSS value) */
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Height (number for pixels or string for any CSS value) */
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Number of skeleton lines to render */
  count: PropTypes.number,
};

CardSkeleton.propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
};

ListItemSkeleton.propTypes = {
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default Skeleton;
