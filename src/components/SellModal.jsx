import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

export const SellModal = ({
  showSellModal,
  setShowSellModal,
  selectedContainerForSale,
  setSelectedContainerForSale,
  salePrice,
  setSalePrice,
  containers,
  calculateDeckCOGS,
  onSellContainer,
}) => {
  if (!showSellModal) return null;

  const selectedContainer = containers.find((c) => c.id === selectedContainerForSale);
  const estimatedCOGS = selectedContainer
    ? calculateDeckCOGS(selectedContainer.decklist_id)
    : 0;
  const estimatedProfit = salePrice ? parseFloat(salePrice) - estimatedCOGS : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 hover:border-teal-500 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sell Container</h2>
          <button
            onClick={() => {
              setShowSellModal(false);
              setSelectedContainerForSale(null);
              setSalePrice('');
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {selectedContainerForSale && (
          <div className="mb-4">
            <div className="bg-slate-800 border border-slate-600 p-3 mb-4">
              <div className="text-sm text-slate-400">Container</div>
              <div className="font-semibold">{selectedContainer?.name}</div>
            </div>

            <div className="bg-slate-800 border border-slate-600 p-3 mb-4">
              <div className="text-sm text-slate-400">Estimated COGS</div>
              <div className="font-semibold text-teal-300">${estimatedCOGS.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Sale Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="Enter sale price"
              className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white"
            />
          </div>

          {salePrice && (
            <div className="bg-emerald-900 bg-opacity-30 border border-green-500 p-3">
              <div className="text-sm text-slate-400">Estimated Profit</div>
              <div
                className={`font-semibold text-lg ${estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-300'}`}
              >
                ${estimatedProfit.toFixed(2)}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onSellContainer}
              className="flex-1 btn-primary px-4 py-2 font-semibold"
            >
              Confirm Sale
            </button>
            <button
              onClick={() => {
                setShowSellModal(false);
                setSelectedContainerForSale(null);
                setSalePrice('');
              }}
              className="flex-1 btn-secondary px-4 py-2 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SellModal.propTypes = {
  showSellModal: PropTypes.bool.isRequired,
  setShowSellModal: PropTypes.func.isRequired,
  selectedContainerForSale: PropTypes.number,
  setSelectedContainerForSale: PropTypes.func.isRequired,
  salePrice: PropTypes.string.isRequired,
  setSalePrice: PropTypes.func.isRequired,
  containers: PropTypes.array.isRequired,
  calculateDeckCOGS: PropTypes.func.isRequired,
  onSellContainer: PropTypes.func.isRequired,
};

export default SellModal;
