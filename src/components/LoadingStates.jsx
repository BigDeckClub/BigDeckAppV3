import React from 'react';
import PropTypes from 'prop-types';

/**
 * CardSkeleton - Placeholder for loading cards
 */
export function CardSkeleton({ className = '' }) {
  return (
    <div
      className={`bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4 h-36 md:h-40 animate-pulse ${className}`}
    >
      {/* Title skeleton */}
      <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-4" />
      
      {/* Main content skeleton */}
      <div className="flex-1 flex items-center justify-center py-4">
        <div className="text-center">
          <div className="h-3 bg-slate-700 rounded w-16 mx-auto mb-2" />
          <div className="h-8 bg-slate-700 rounded w-12 mx-auto" />
        </div>
      </div>
      
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50">
        <div className="space-y-1">
          <div className="h-2 bg-slate-700 rounded w-8 mx-auto" />
          <div className="h-3 bg-slate-700 rounded w-6 mx-auto" />
        </div>
        <div className="space-y-1">
          <div className="h-2 bg-slate-700 rounded w-8 mx-auto" />
          <div className="h-3 bg-slate-700 rounded w-10 mx-auto" />
        </div>
        <div className="space-y-1">
          <div className="h-2 bg-slate-700 rounded w-8 mx-auto" />
          <div className="h-3 bg-slate-700 rounded w-10 mx-auto" />
        </div>
      </div>
    </div>
  );
}

CardSkeleton.propTypes = {
  className: PropTypes.string,
};

/**
 * ListSkeleton - Placeholder for loading lists
 */
export function ListSkeleton({ rows = 5, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4 animate-pulse"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
              {/* Subtitle */}
              <div className="flex gap-4">
                <div className="h-3 bg-slate-700 rounded w-16" />
                <div className="h-3 bg-slate-700 rounded w-20" />
                <div className="h-3 bg-slate-700 rounded w-16" />
              </div>
            </div>
            {/* Action indicator */}
            <div className="h-4 w-4 bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

ListSkeleton.propTypes = {
  rows: PropTypes.number,
  className: PropTypes.string,
};

/**
 * TableSkeleton - Placeholder for loading tables
 */
export function TableSkeleton({ rows = 5, columns = 4, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="bg-slate-800 p-4 border-b border-slate-700">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, index) => (
            <div
              key={index}
              className="h-4 bg-slate-700 rounded animate-pulse"
              style={{ width: `${100 / columns - 2}%` }}
            />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="bg-slate-900 p-4 border-b border-slate-700/50 last:border-b-0"
        >
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 bg-slate-800 rounded animate-pulse"
                style={{ 
                  width: `${100 / columns - 2}%`,
                  animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

TableSkeleton.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number,
  className: PropTypes.string,
};

/**
 * PageLoader - Full-page loading overlay
 */
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

PageLoader.propTypes = {
  message: PropTypes.string,
};

/**
 * Spinner - Simple inline spinner
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-teal-400 border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

Spinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

/**
 * CardGridSkeleton - Multiple card skeletons in a grid
 */
export function CardGridSkeleton({ count = 6, className = '' }) {
  return (
    <div className={`grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

CardGridSkeleton.propTypes = {
  count: PropTypes.number,
  className: PropTypes.string,
};

/**
 * SidebarSkeleton - Skeleton for sidebar folders
 */
export function SidebarSkeleton({ items = 4, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="bg-slate-800 rounded-lg p-3 animate-pulse"
        >
          <div className="h-4 bg-slate-700 rounded w-2/3 mb-2" />
          <div className="h-3 bg-slate-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

SidebarSkeleton.propTypes = {
  items: PropTypes.number,
  className: PropTypes.string,
};

export default {
  CardSkeleton,
  ListSkeleton,
  TableSkeleton,
  PageLoader,
  Spinner,
  CardGridSkeleton,
  SidebarSkeleton,
};
