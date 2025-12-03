import React from 'react';
import PropTypes from 'prop-types';

/**
 * Full-page loading spinner component.
 * Displays a centered spinner on a gradient background.
 * 
 * @example
 * // Basic usage
 * <FullPageSpinner />
 * 
 * @example
 * // With custom color
 * <FullPageSpinner color="white" />
 */
export function FullPageSpinner({ color = 'teal' }) {
  const colorClasses = {
    teal: 'text-teal-400 border-teal-400',
    white: 'text-white border-white',
  };

  const classes = colorClasses[color] || colorClasses.teal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div 
        className={`w-8 h-8 animate-spin border-2 border-t-transparent rounded-full ${classes}`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

FullPageSpinner.propTypes = {
  /** Spinner color */
  color: PropTypes.oneOf(['teal', 'white']),
};

export default FullPageSpinner;
