import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, RefreshCw, Link2, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { getSetDisplayName } from '../../utils/cardHelpers';

/**
 * ArchidektSyncModal - Link Archidekt URL and sync deck changes
 */
export function ArchidektSyncModal({ deck, onClose, onSyncComplete }) {
  const [archidektUrl, setArchidektUrl] = useState(deck.archidekt_url || '');
  const [syncData, setSyncData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { showToast } = useToast();

  // Validate Archidekt URL format
  const isValidUrl = useCallback((url) => {
    return /archidekt\.com\/decks\/\d+/.test(url);
  }, []);

  // Fetch sync preview
  const handleFetchSync = useCallback(async () => {
    if (!isValidUrl(archidektUrl)) {
      showToast('Please enter a valid Archidekt deck URL', 'error');
      return;
    }

    setLoading(true);
    setSyncData(null);

    try {
      // First, update the deck with the Archidekt URL
      const updateResponse = await fetch(`/api/decks/${deck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archidekt_url: archidektUrl })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to save Archidekt URL');
      }

      // Then fetch sync data
      const syncResponse = await fetch(`/api/decks/${deck.id}/sync-archidekt`, {
        method: 'POST'
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || 'Failed to fetch deck from Archidekt');
      }

      const data = await syncResponse.json();
      setSyncData(data);

      if (!data.hasChanges) {
        showToast('Deck is already up to date!', 'success');
      }
    } catch (error) {
      console.error('Error fetching sync:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [deck.id, archidektUrl, isValidUrl, showToast]);

  // Apply sync changes
  const handleApplySync = useCallback(async () => {
    if (!syncData) return;

    setSyncing(true);

    try {
      // Build new cards array based on sync data
      const localCards = deck.cards || [];
      const localCardMap = new Map();
      localCards.forEach(card => {
        const key = `${card.name}|${card.set}|${card.collector_number}`;
        localCardMap.set(key, card);
      });

      // Start with local cards, apply modifications and removals
      const updatedCards = [];
      
      localCards.forEach(card => {
        const key = `${card.name}|${card.set}|${card.collector_number}`;
        
        // Check if card was removed
        const isRemoved = syncData.changes.removed.some(r => 
          `${r.name}|${r.set}|${r.collector_number}` === key
        );
        
        if (!isRemoved) {
          // Check if card was modified
          const modified = syncData.changes.modified.find(m => 
            `${m.card.name}|${m.card.set}|${m.card.collector_number}` === key
          );
          
          if (modified) {
            updatedCards.push({ ...card, quantity: modified.newQuantity });
          } else {
            updatedCards.push(card);
          }
        }
      });

      // Add new cards
      syncData.changes.added.forEach(card => {
        updatedCards.push(card);
      });

      const response = await fetch(`/api/decks/${deck.id}/apply-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: updatedCards,
          name: syncData.archidektName,
          format: syncData.archidektFormat,
          description: syncData.archidektDescription
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply sync changes');
      }

      const updatedDeck = await response.json();
      
      showToast('Deck synced successfully!', 'success');
      onSyncComplete(updatedDeck);
      onClose();
    } catch (error) {
      console.error('Error applying sync:', error);
      showToast(error.message, 'error');
    } finally {
      setSyncing(false);
    }
  }, [deck, syncData, showToast, onSyncComplete, onClose]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-teal-400" />
            <h2 className="text-xl font-bold text-teal-300">Archidekt Sync</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            disabled={loading || syncing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Archidekt Deck URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={archidektUrl}
                onChange={(e) => setArchidektUrl(e.target.value)}
                placeholder="https://archidekt.com/decks/123456"
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500"
                disabled={loading || syncing}
              />
              <button
                onClick={handleFetchSync}
                disabled={loading || syncing || !archidektUrl}
                className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Fetching...' : 'Fetch Changes'}
              </button>
            </div>
            {archidektUrl && !isValidUrl(archidektUrl) && (
              <p className="text-red-400 text-xs mt-1">
                Please enter a valid Archidekt URL (e.g., https://archidekt.com/decks/123456)
              </p>
            )}
          </div>

          {/* Sync Preview */}
          {syncData && (
            <div className="space-y-4">
              {/* Deck Info Changes */}
              {(syncData.archidektName !== deck.name || 
                syncData.archidektFormat !== deck.format || 
                syncData.archidektDescription !== deck.description) && (
                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                  <h3 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Deck Information Changes
                  </h3>
                  <div className="space-y-2 text-sm">
                    {syncData.archidektName !== deck.name && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Name:</span>
                        <span className="text-slate-300">{deck.name}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-blue-300 font-medium">{syncData.archidektName}</span>
                      </div>
                    )}
                    {syncData.archidektFormat !== deck.format && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Format:</span>
                        <span className="text-slate-300">{deck.format}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="text-blue-300 font-medium">{syncData.archidektFormat}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!syncData.hasChanges ? (
                <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 text-center">
                  <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-300 font-medium">Deck is up to date!</p>
                  <p className="text-green-400 text-sm mt-1">No card changes detected</p>
                </div>
              ) : (
                <>
                  {/* Added Cards */}
                  {syncData.changes.added.length > 0 && (
                    <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                      <h3 className="text-green-300 font-semibold mb-2">
                        ✅ Added Cards ({syncData.changes.added.length})
                      </h3>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {syncData.changes.added.map((card, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-green-900/40 rounded px-3 py-1">
                            <span className="text-green-200">
                              {card.quantity}x {card.name}
                            </span>
                            <span className="text-green-400 text-xs">
                              {getSetDisplayName(card.set, true)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Removed Cards */}
                  {syncData.changes.removed.length > 0 && (
                    <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                      <h3 className="text-red-300 font-semibold mb-2">
                        ❌ Removed Cards ({syncData.changes.removed.length})
                      </h3>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {syncData.changes.removed.map((card, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-red-900/40 rounded px-3 py-1">
                            <span className="text-red-200">
                              {card.quantity}x {card.name}
                            </span>
                            <span className="text-red-400 text-xs">
                              {getSetDisplayName(card.set, true)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modified Cards */}
                  {syncData.changes.modified.length > 0 && (
                    <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                      <h3 className="text-yellow-300 font-semibold mb-2">
                        🔄 Quantity Changes ({syncData.changes.modified.length})
                      </h3>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {syncData.changes.modified.map((change, idx) => (
                          <div key={idx} className="flex justify-between text-sm bg-yellow-900/40 rounded px-3 py-1">
                            <span className="text-yellow-200">
                              {change.card.name}
                            </span>
                            <span className="text-yellow-300 flex items-center gap-2">
                              <span>{change.oldQuantity}x</span>
                              <ArrowRight className="w-3 h-3" />
                              <span className="font-bold">{change.newQuantity}x</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {syncData?.hasChanges && (
          <div className="p-4 border-t border-slate-600 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium"
              disabled={syncing}
            >
              Cancel
            </button>
            <button
              onClick={handleApplySync}
              disabled={syncing}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {syncing ? 'Applying...' : 'Apply Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

ArchidektSyncModal.propTypes = {
  deck: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    format: PropTypes.string,
    description: PropTypes.string,
    archidekt_url: PropTypes.string,
    cards: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      quantity: PropTypes.number,
      set: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
      collector_number: PropTypes.string,
      scryfall_id: PropTypes.string
    }))
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSyncComplete: PropTypes.func.isRequired
};

export default ArchidektSyncModal;
