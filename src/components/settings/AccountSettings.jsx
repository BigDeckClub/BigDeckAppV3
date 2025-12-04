import React, { useState } from 'react';
import { Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { api } from '../../utils/apiClient';

/**
 * AccountSettings component - Account settings tab
 * Includes data management tools like Scryfall ID backfill
 */
export const AccountSettings = () => {
  const { showToast } = useToast();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  const handleBackfillScryfallIds = async () => {
    if (isBackfilling) return;
    
    setIsBackfilling(true);
    setBackfillResult(null);

    try {
      const result = await api.post('/inventory/backfill-scryfall-ids', {});
      setBackfillResult(result);
      
      if (result.updated > 0) {
        showToast(
          `Successfully updated ${result.updated} card${result.updated === 1 ? '' : 's'} with Scryfall IDs for price tracking`,
          TOAST_TYPES.SUCCESS
        );
      } else {
        showToast(result.message || 'All cards already have Scryfall IDs', TOAST_TYPES.INFO);
      }
    } catch (error) {
      showToast(`Failed to backfill Scryfall IDs: ${error.message}`, TOAST_TYPES.ERROR);
      setBackfillResult({ error: error.message });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Account Settings</h2>
        <p className="text-slate-400 text-sm">Manage your account and preferences</p>
        <p className="text-slate-500 text-xs mt-2">More options coming soon...</p>
      </div>

      {/* Data Management Section */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          Data Management
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Tools to maintain and update your inventory data
        </p>

        {/* Backfill Scryfall IDs */}
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              Update Price Data
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Populate Scryfall IDs for cards missing them. This enables CardKingdom and TCGPlayer 
              price tracking in the Analytics tab. This process may take a few minutes for large inventories.
            </p>

            <button
              onClick={handleBackfillScryfallIds}
              disabled={isBackfilling}
              className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                isBackfilling
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isBackfilling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Price Data...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Update Price Data
                </>
              )}
            </button>

            {/* Backfill Result Display */}
            {backfillResult && !isBackfilling && (
              <div className={`mt-4 p-3 rounded-lg border ${
                backfillResult.error 
                  ? 'bg-red-900/20 border-red-600/30 text-red-300'
                  : 'bg-green-900/20 border-green-600/30 text-green-300'
              }`}>
                <div className="flex items-start gap-2">
                  {backfillResult.error ? (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="text-sm">
                    {backfillResult.error ? (
                      <p>{backfillResult.error}</p>
                    ) : (
                      <>
                        <p className="font-semibold mb-1">{backfillResult.message}</p>
                        <div className="text-xs space-y-0.5 opacity-90">
                          <p>• Updated: {backfillResult.updated} cards</p>
                          {backfillResult.notFound > 0 && (
                            <p>• Not found: {backfillResult.notFound} cards</p>
                          )}
                          {backfillResult.errors > 0 && (
                            <p className="text-yellow-300">• Errors: {backfillResult.errors} cards</p>
                          )}
                          <p>• Total processed: {backfillResult.total} cards</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
