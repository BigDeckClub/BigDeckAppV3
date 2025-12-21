/**
 * ViewModeToggle - Toggle between gallery, list, and table view modes
 * @module components/ui/ViewModeToggle
 */

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { LayoutGrid, List, Table2 } from 'lucide-react';

/**
 * View mode configuration
 */
export const VIEW_MODES = {
  GALLERY: 'gallery',
  LIST: 'list',
  TABLE: 'table',
};

/**
 * View mode options with icons and labels
 */
const VIEW_MODE_OPTIONS = [
  { id: VIEW_MODES.GALLERY, icon: LayoutGrid, label: 'Gallery', description: 'Card images in a grid' },
  { id: VIEW_MODES.LIST, icon: List, label: 'List', description: 'Compact list view' },
  { id: VIEW_MODES.TABLE, icon: Table2, label: 'Table', description: 'Sortable table with details' },
];

/**
 * Individual toggle button
 */
const ToggleButton = memo(function ToggleButton({ option, isActive, onClick }) {
  const Icon = option.icon;

  return (
    <button
      onClick={() => onClick(option.id)}
      className={`
        relative flex items-center justify-center p-2 rounded-md transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        ${isActive
          ? 'bg-[var(--bda-primary)]/20 text-[var(--bda-primary)] shadow-sm'
          : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--muted-surface)]'
        }
      `}
      title={option.description}
      aria-label={`${option.label} view`}
      aria-pressed={isActive}
    >
      <Icon className="w-4 h-4" />
      {isActive && (
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--bda-primary)]" />
      )}
    </button>
  );
});

ToggleButton.propTypes = {
  option: PropTypes.shape({
    id: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

/**
 * ViewModeToggle component - Button group for switching view modes
 */
export const ViewModeToggle = memo(function ViewModeToggle({
  activeMode,
  onChange,
  className = '',
  showLabels = false,
}) {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg ${className}`}
      role="group"
      aria-label="View mode"
    >
      {VIEW_MODE_OPTIONS.map((option) => (
        <div key={option.id} className="flex items-center">
          <ToggleButton
            option={option}
            isActive={activeMode === option.id}
            onClick={onChange}
          />
          {showLabels && (
            <span
              className={`
                ml-1.5 mr-2 text-sm font-medium transition-colors
                ${activeMode === option.id ? 'text-[var(--bda-primary)]' : 'text-[var(--text-muted)]'}
              `}
            >
              {option.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
});

ViewModeToggle.propTypes = {
  /** Currently active view mode */
  activeMode: PropTypes.oneOf(Object.values(VIEW_MODES)).isRequired,
  /** Callback when view mode changes */
  onChange: PropTypes.func.isRequired,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Whether to show text labels next to icons */
  showLabels: PropTypes.bool,
};

export default ViewModeToggle;
