import React from 'react';
import PropTypes from 'prop-types';

// Stats grid items for inventory card skeleton
const STATS_GRID_ITEMS = [0, 1, 2, 3];

/**
 * Skeleton loader component for showing placeholder content while loading.
 * 
 * @example
 * // Basic usage
 * {isLoading ? <Skeleton width={100} height={20} /> : <span>Content</span>}
 * 
 * @example
 * // Card skeleton
 * <Skeleton variant="card" />
 * 
 * @example
 * // Multiple lines
 * <Skeleton variant="text" count={3} />
 */
export function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  count = 1,
  className = '',
  animate = true
}) {
  const baseClasses = `bg-slate-700 rounded ${animate ? 'animate-pulse' : ''}`;
  
  const variants = {
    text: {
      className: 'h-4 w-full',
      style: {}
    },
    circle: {
      className: 'rounded-full',
      style: { width: width || 40, height: height || 40 }
    },
    rect: {
      className: '',
      style: { width: width || '100%', height: height || 100 }
    },
    card: {
      className: 'p-4 space-y-3',
      style: { width: width || '100%', height: height || 'auto' },
      children: (
        <>
          <div className={`${baseClasses} h-6 w-3/4`} />
          <div className={`${baseClasses} h-4 w-full`} />
          <div className={`${baseClasses} h-4 w-5/6`} />
          <div className="flex gap-2 mt-4">
            <div className={`${baseClasses} h-8 w-20`} />
            <div className={`${baseClasses} h-8 w-20`} />
          </div>
        </>
      )
    },
    inventoryCard: {
      className: 'p-4',
      style: { width: width || '100%' },
      children: (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className={`${baseClasses} h-6 w-1/2`} />
            <div className={`${baseClasses} h-5 w-5 rounded`} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {STATS_GRID_ITEMS.map(i => (
              <div key={i} className="bg-slate-800 bg-opacity-50 rounded p-2 border border-slate-700">
                <div className={`${baseClasses} h-3 w-16 mb-2`} />
                <div className={`${baseClasses} h-6 w-12`} />
              </div>
            ))}
          </div>
        </div>
      )
    },
    tableRow: {
      className: 'flex items-center gap-4 p-3',
      style: {},
      children: (
        <>
          <div className={`${baseClasses} h-4 w-1/3`} />
          <div className={`${baseClasses} h-4 w-1/4`} />
          <div className={`${baseClasses} h-4 w-1/6`} />
          <div className={`${baseClasses} h-8 w-16`} />
        </>
      )
    }
  };

  const variantConfig = variants[variant] || variants.text;
  
  // For simple variants, render count times
  if (['text', 'circle', 'rect'].includes(variant)) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantConfig.className} ${className}`}
            style={{ 
              ...variantConfig.style,
              ...(width && { width }),
              ...(height && { height }),
              ...(count > 1 && index < count - 1 && { marginBottom: 8 })
            }}
          />
        ))}
      </>
    );
  }

  // For complex variants with children
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`bg-slate-800 border border-slate-600 rounded-lg ${variantConfig.className} ${className}`}
          style={{
            ...variantConfig.style,
            ...(count > 1 && index < count - 1 && { marginBottom: 12 })
          }}
        >
          {variantConfig.children}
        </div>
      ))}
    </>
  );
}

Skeleton.propTypes = {
  variant: PropTypes.oneOf(['text', 'circle', 'rect', 'card', 'inventoryCard', 'tableRow']),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  count: PropTypes.number,
  className: PropTypes.string,
  animate: PropTypes.bool
};

/**
 * Skeleton wrapper that conditionally renders skeleton or content
 * 
 * @example
 * <SkeletonWrapper loading={isLoading} skeleton={<Skeleton variant="card" count={3} />}>
 *   <CardList items={items} />
 * </SkeletonWrapper>
 */
export function SkeletonWrapper({ loading, skeleton, children }) {
  if (loading) {
    return skeleton;
  }
  return children;
}

SkeletonWrapper.propTypes = {
  loading: PropTypes.bool.isRequired,
  skeleton: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired
};

export default Skeleton;
