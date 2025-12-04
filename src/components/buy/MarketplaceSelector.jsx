import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { MARKETPLACES } from '../../utils/marketplaceUrls';

/**
 * MarketplaceSelector - Reusable component for selecting a marketplace
 */
export const MarketplaceSelector = memo(function MarketplaceSelector({
  selectedMarketplace,
  onSelect,
  showRememberOption = false,
  remember = false,
  onRememberChange,
}) {
  const marketplaceStyles = {
    tcgplayer: {
      base: 'border-blue-600/50 bg-slate-800',
      selected: 'border-blue-500 bg-blue-900/40 ring-2 ring-blue-500/50',
      hover: 'hover:border-blue-500/70 hover:bg-blue-900/20',
    },
    manapool: {
      base: 'border-green-600/50 bg-slate-800',
      selected: 'border-green-500 bg-green-900/40 ring-2 ring-green-500/50',
      hover: 'hover:border-green-500/70 hover:bg-green-900/20',
    },
    cardkingdom: {
      base: 'border-purple-600/50 bg-slate-800',
      selected: 'border-purple-500 bg-purple-900/40 ring-2 ring-purple-500/50',
      hover: 'hover:border-purple-500/70 hover:bg-purple-900/20',
    },
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        Select Marketplace:
      </label>
      <div className="flex flex-wrap gap-2">
        {Object.entries(MARKETPLACES).map(([key, marketplace]) => {
          const isSelected = selectedMarketplace === key;
          const styles = marketplaceStyles[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200
                ${styles.base}
                ${isSelected ? styles.selected : styles.hover}
              `}
            >
              <span className="text-lg">{marketplace.icon}</span>
              <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {marketplace.name}
              </span>
            </button>
          );
        })}
      </div>
      {showRememberOption && (
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => onRememberChange?.(e.target.checked)}
            className="rounded border-slate-500 bg-slate-600 text-teal-500 focus:ring-teal-500"
          />
          Remember my choice
        </label>
      )}
    </div>
  );
});

MarketplaceSelector.propTypes = {
  /** Currently selected marketplace key */
  selectedMarketplace: PropTypes.string.isRequired,
  /** Callback when marketplace is selected */
  onSelect: PropTypes.func.isRequired,
  /** Whether to show the "Remember my choice" checkbox */
  showRememberOption: PropTypes.bool,
  /** Current state of remember checkbox */
  remember: PropTypes.bool,
  /** Callback when remember checkbox changes */
  onRememberChange: PropTypes.func,
};

export default MarketplaceSelector;
