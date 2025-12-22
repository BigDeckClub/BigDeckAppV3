import React, { memo, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

export const EbayBulkListingModal = memo(function EbayBulkListingModal({ open, onClose, onComplete }) {
  const [decks, setDecks] = useState([]);
  const [selectedDeckIds, setSelectedDeckIds] = useState(new Set());
  const [defaultPrice, setDefaultPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { authFetch } = useAuthFetch();

  // Fetch available decks
  const fetchDecks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/decks');
      if (!res.ok) throw new Error('Failed to fetch decks');
      const data = await res.json();
      // Filter to only decklists (not deck instances)
      setDecks(data.filter(d => !d.is_deck_instance));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (open) {
      fetchDecks();
      setSelectedDeckIds(new Set());
      setResult(null);
    }
  }, [open, fetchDecks]);

  const toggleDeck = (deckId) => {
    setSelectedDeckIds(prev => {
      const next = new Set(prev);
      if (next.has(deckId)) {
        next.delete(deckId);
      } else {
        next.add(deckId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedDeckIds(new Set(decks.map(d => d.id)));
  };

  const selectNone = () => {
    setSelectedDeckIds(new Set());
  };

  const handleCreate = async () => {
    if (selectedDeckIds.size === 0) return;

    try {
      setCreating(true);
      setError(null);
      const res = await authFetch('/api/ebay/bulk-create-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckIds: Array.from(selectedDeckIds),
          defaultPrice: defaultPrice ? parseFloat(defaultPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create listings');

      setResult(data);
      if (onComplete) onComplete(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[var(--surface)] text-[var(--bda-text)] rounded-lg w-11/12 max-w-2xl shadow-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold">Bulk Create Listings</h3>
          <button onClick={onClose} aria-label="Close" className="close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded text-sm">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/20 text-green-400 rounded">
                <div className="font-semibold mb-2">Bulk listing complete!</div>
                <div className="text-sm space-y-1">
                  <div>Created: {result.summary.created} listings</div>
                  <div>Skipped: {result.summary.skipped} (already listed)</div>
                  {result.summary.errors > 0 && (
                    <div className="text-red-400">Errors: {result.summary.errors}</div>
                  )}
                </div>
              </div>

              {result.created.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Created Listings:</div>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {result.created.map(item => (
                      <div key={item.listingId} className="text-sm p-2 bg-[var(--muted-surface)] rounded flex items-center gap-2">
                        <Check size={14} className="text-green-400" />
                        {item.deckName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.skipped.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2 text-yellow-400">Skipped:</div>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {result.skipped.map((item, idx) => (
                      <div key={idx} className="text-sm p-2 bg-[var(--muted-surface)] rounded flex items-center gap-2">
                        <AlertTriangle size={14} className="text-yellow-400" />
                        {item.deckName || `Deck ${item.deckId}`} - {item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button onClick={onClose} className="btn-primary px-4 py-2 rounded">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Default Price (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                  placeholder="Leave empty to set prices later"
                  className="block w-full rounded border p-2 bg-[var(--muted-surface)] text-[var(--bda-text)]"
                />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Select Decks ({selectedDeckIds.size} selected)</div>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-teal-400 hover:underline">Select All</button>
                  <button onClick={selectNone} className="text-xs text-gray-400 hover:underline">Clear</button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-[var(--text-muted)]">Loading decks...</div>
              ) : decks.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)]">No decks available to list</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-auto border border-[var(--border)] rounded p-2">
                  {decks.map(deck => (
                    <label
                      key={deck.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-[var(--muted-surface)] ${selectedDeckIds.has(deck.id) ? 'bg-teal-500/20' : ''
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDeckIds.has(deck.id)}
                        onChange={() => toggleDeck(deck.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{deck.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {deck.commander || 'No commander'} • {deck.format || 'Commander'}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] mt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded border border-[var(--border)] hover:bg-[var(--muted-surface)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || selectedDeckIds.size === 0}
                  className="btn-primary px-4 py-2 rounded disabled:opacity-50 flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    `Create ${selectedDeckIds.size} Listing${selectedDeckIds.size !== 1 ? 's' : ''}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

EbayBulkListingModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func,
};

export default EbayBulkListingModal;
