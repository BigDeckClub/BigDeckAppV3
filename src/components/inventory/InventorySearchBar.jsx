import React, { memo, forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * InventorySearchBar - Search input for filtering inventory cards
 * Extracted from InventoryTab for better component organization
 * Supports forwarded ref for programmatic focus (keyboard shortcuts)
 */
export const InventorySearchBar = memo(forwardRef(function InventorySearchBar({
  inventorySearch,
  setInventorySearch
}, ref) {
  return (
    <div className="mb-8 px-1 md:px-0">
      <div className="relative">
        <input
          ref={ref}
          type="text"
          placeholder="Search cards... (Press / to focus)"
          value={inventorySearch}
          onChange={(e) => setInventorySearch(e.target.value)}
          className="w-full px-5 py-3.5 md:py-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 hover:border-teal-500 focus:border-teal-400 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-30 transition-all duration-300 font-medium shadow-lg shadow-slate-900/50 text-base md:text-sm"
        />
        <svg className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  );
}));

InventorySearchBar.propTypes = {
  inventorySearch: PropTypes.string.isRequired,
  setInventorySearch: PropTypes.func.isRequired
};

export default InventorySearchBar;
