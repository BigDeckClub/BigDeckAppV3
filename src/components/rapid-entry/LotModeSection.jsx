import React from 'react';
import PropTypes from 'prop-types';
import { Check, X, AlertTriangle, Package, ToggleLeft, ToggleRight } from 'lucide-react';

/**
 * LotModeSection - Lot/Pack mode toggle, card list, and summary
 */
export function LotModeSection({
  lotModeEnabled,
  setLotModeEnabled,
  lotName,
  setLotName,
  lotTotalCost,
  setLotTotalCost,
  lotCards,
  lotSubmitting,
  lotError,
  setLotError,
  lotTotalCards,
  lotPerCardCost,
  handleSubmitLot,
  handleRemoveCardFromLot,
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-400" />
          <span id="lot-mode-label" className="font-medium text-white">Lot/Pack Mode</span>
        </div>
        <button
          onClick={() => setLotModeEnabled(!lotModeEnabled)}
          className="flex items-center gap-2 text-sm"
          type="button"
          aria-pressed={lotModeEnabled}
          aria-labelledby="lot-mode-label"
        >
          {lotModeEnabled ? (
            <ToggleRight className="w-8 h-8 text-amber-400" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-slate-500" />
          )}
          <span className={lotModeEnabled ? 'text-amber-400' : 'text-slate-500'}>
            {lotModeEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
      
      {lotModeEnabled && (
        <div className="space-y-4">
          {/* Lot Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="lot-name-input" className="text-xs text-slate-400 mb-1 block">Lot Name</label>
              <input
                id="lot-name-input"
                type="text"
                placeholder="e.g., Mystery Booster Box, Commander Masters Pack"
                value={lotName}
                onChange={(e) => setLotName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>
            <div>
              <label htmlFor="lot-total-cost-input" className="text-xs text-slate-400 mb-1 block">Total Lot Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  id="lot-total-cost-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={lotTotalCost}
                  onChange={(e) => setLotTotalCost(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded pl-7 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>
          
          {/* Cards in Lot */}
          {lotCards.length > 0 && (
            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Cards in this lot:</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {lotCards.map((card, index) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-slate-900/30 rounded px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400">{card.quantity}x</span>
                      <span className="text-white">{card.name}</span>
                      <span className="text-slate-500">({card.set})</span>
                    </div>
                    <button
                      onClick={() => handleRemoveCardFromLot(index)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      type="button"
                      aria-label="Remove card from lot"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Lot Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-700 pt-4">
            <div className="flex gap-6">
              <div className="text-sm">
                <span className="text-slate-400">Total Cards: </span>
                <span className="font-semibold text-white">{lotTotalCards}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-400">Cost Per Card: </span>
                <span className="font-semibold text-amber-400">
                  ${lotPerCardCost.toFixed(2)}
                </span>
              </div>
            </div>
            <button
              onClick={handleSubmitLot}
              disabled={lotCards.length === 0 || lotSubmitting}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${lotCards.length > 0 && !lotSubmitting
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }
              `}
              type="button"
            >
              {lotSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Submit All Cards
                </>
              )}
            </button>
          </div>
          
          {/* Error Message */}
          {lotError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 rounded px-3 py-2 mt-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{lotError}</span>
              <button 
                onClick={() => setLotError(null)} 
                className="ml-auto text-red-400 hover:text-red-300"
                type="button"
                aria-label="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

LotModeSection.propTypes = {
  lotModeEnabled: PropTypes.bool.isRequired,
  setLotModeEnabled: PropTypes.func.isRequired,
  lotName: PropTypes.string.isRequired,
  setLotName: PropTypes.func.isRequired,
  lotTotalCost: PropTypes.string.isRequired,
  setLotTotalCost: PropTypes.func.isRequired,
  lotCards: PropTypes.array.isRequired,
  lotSubmitting: PropTypes.bool.isRequired,
  lotError: PropTypes.string,
  setLotError: PropTypes.func.isRequired,
  lotTotalCards: PropTypes.number.isRequired,
  lotPerCardCost: PropTypes.number.isRequired,
  handleSubmitLot: PropTypes.func.isRequired,
  handleRemoveCardFromLot: PropTypes.func.isRequired,
};

export default LotModeSection;
