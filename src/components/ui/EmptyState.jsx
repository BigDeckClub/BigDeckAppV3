import React from 'react';
import PropTypes from 'prop-types';
import { Button } from './Button';

/**
 * Empty state component for displaying when there's no content.
 * 
 * @example
 * // Basic empty state
 * <EmptyState
 *   icon={<FolderIcon />}
 *   title="No items found"
 *   description="Add your first item to get started."
 * />
 * 
 * @example
 * // Empty state with action button
 * <EmptyState
 *   icon={<SearchIcon />}
 *   title="No search results"
 *   description="Try adjusting your search or filter to find what you're looking for."
 *   action={{
 *     label: 'Clear filters',
 *     onClick: handleClearFilters
 *   }}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/50 flex items-center justify-center mb-4 text-slate-400">
          {React.cloneElement(icon, {
            className: `w-8 h-8 ${icon.props.className || ''}`,
          })}
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-slate-400 max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || 'primary'}
          size={action.size || 'md'}
          onClick={action.onClick}
          iconLeft={action.icon}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  /** Icon to display */
  icon: PropTypes.node,
  /** Title text */
  title: PropTypes.string,
  /** Description text */
  description: PropTypes.string,
  /** Action button configuration */
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    variant: PropTypes.string,
    size: PropTypes.string,
    icon: PropTypes.node,
  }),
  /** Additional CSS classes */
  className: PropTypes.string,
};

export default EmptyState;
