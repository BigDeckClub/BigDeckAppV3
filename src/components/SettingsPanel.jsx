import React from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { usePriceCache } from '../context/PriceCacheContext';

export const SettingsPanel = ({
  showSettings,
  setShowSettings,
  reorderSettings,
  setReorderSettings,
  onSaveReorderSettings,
  setSuccessMessage,
}) => {
  const { setPriceCache } = usePriceCache();

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 hover:border-teal-500 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Reorder Thresholds</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Normal Cards</label>
            <input
              type="number"
              min="0"
              value={reorderSettings.normal}
              onChange={(e) =>
                setReorderSettings({
                  ...reorderSettings,
                  normal: parseInt(e.target.value),
                })
              }
              className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Lands</label>
            <input
              type="number"
              min="0"
              value={reorderSettings.land}
              onChange={(e) =>
                setReorderSettings({
                  ...reorderSettings,
                  land: parseInt(e.target.value),
                })
              }
              className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Bulk Items</label>
            <input
              type="number"
              min="0"
              value={reorderSettings.bulk}
              onChange={(e) =>
                setReorderSettings({
                  ...reorderSettings,
                  bulk: parseInt(e.target.value),
                })
              }
              className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white"
            />
          </div>
          <div className="border-t border-slate-700 hover:border-teal-500 pt-4 mt-4">
            <button
              onClick={() => {
                setPriceCache({});
                setSuccessMessage('Price cache cleared successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
              }}
              className="w-full btn-accent mb-2"
            >
              Refresh Price Cache
            </button>
            <p className="text-xs text-slate-400">
              Clears cached card prices and fetches fresh data
            </p>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button
              onClick={onSaveReorderSettings}
              className="flex-1 btn-primary px-4 py-2 font-semibold"
            >
              Save
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 btn-secondary px-4 py-2 font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SettingsPanel.propTypes = {
  showSettings: PropTypes.bool.isRequired,
  setShowSettings: PropTypes.func.isRequired,
  reorderSettings: PropTypes.object.isRequired,
  setReorderSettings: PropTypes.func.isRequired,
  onSaveReorderSettings: PropTypes.func.isRequired,
  setSuccessMessage: PropTypes.func.isRequired,
};

export default SettingsPanel;
