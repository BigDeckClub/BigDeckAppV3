import React, { memo, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, Package, Truck, CheckCircle, AlertTriangle, MapPin, DollarSign } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

export const EbayOrderFulfillment = memo(function EbayOrderFulfillment({ listing, onBack, onComplete }) {
  const [picklist, setPicklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { authFetch } = useAuthFetch();

  const fetchPicklist = useCallback(async () => {
    if (!listing?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/ebay/listings/${listing.id}/picklist`);
      if (!res.ok) throw new Error('Failed to fetch pick list');
      const data = await res.json();
      setPicklist(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listing?.id, authFetch]);

  useEffect(() => {
    fetchPicklist();
  }, [fetchPicklist]);

  const handleMarkShipped = async () => {
    try {
      setActionLoading(true);
      const res = await authFetch(`/api/ebay/listings/${listing.id}/mark-shipped`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark as shipped');
      await fetchPicklist();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Complete this sale? This will remove cards from inventory and record the sale. This action cannot be undone.')) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await authFetch(`/api/ebay/listings/${listing.id}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete sale');
      onComplete?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (price == null) return '-';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  // Group reservations by folder for easier picking
  const groupedByFolder = picklist?.reservations?.reduce((acc, r) => {
    const folder = r.folder || 'Uncategorized';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(r);
    return acc;
  }, {}) || {};

  const folderNames = Object.keys(groupedByFolder).sort();

  if (loading) {
    return (
      <div className="bg-[var(--surface)] rounded-lg p-6">
        <div className="text-center py-8 text-[var(--text-muted)]">Loading pick list...</div>
      </div>
    );
  }

  if (!picklist?.hasPicklist) {
    return (
      <div className="bg-[var(--surface)] rounded-lg p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--bda-text)] mb-4">
          <ArrowLeft size={16} />
          Back to listings
        </button>
        <div className="text-center py-8 text-[var(--text-muted)]">
          No pick list found for this listing. Create one first.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--bda-text)] mb-2">
            <ArrowLeft size={16} />
            Back to listings
          </button>
          <h2 className="text-xl font-semibold">{listing.title || picklist.instanceName}</h2>
          <div className="text-sm text-[var(--text-muted)] mt-1">
            Order Pick List - {picklist.status === 'shipped' ? 'Shipped' : 'Ready to Ship'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-400">{formatPrice(listing.price)}</div>
          <div className="text-sm text-[var(--text-muted)]">Sale Price</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--muted-surface)] rounded-lg p-4 text-center">
          <Package className="mx-auto mb-2 text-blue-400" size={24} />
          <div className="text-2xl font-bold">{picklist.reservedCount}</div>
          <div className="text-xs text-[var(--text-muted)]">Cards Reserved</div>
        </div>
        <div className="bg-[var(--muted-surface)] rounded-lg p-4 text-center">
          <DollarSign className="mx-auto mb-2 text-green-400" size={24} />
          <div className="text-2xl font-bold">{formatPrice(picklist.totalCost)}</div>
          <div className="text-xs text-[var(--text-muted)]">Total Cost</div>
        </div>
        <div className="bg-[var(--muted-surface)] rounded-lg p-4 text-center">
          <DollarSign className="mx-auto mb-2 text-teal-400" size={24} />
          <div className="text-2xl font-bold">{formatPrice(parseFloat(listing.price) - picklist.totalCost)}</div>
          <div className="text-xs text-[var(--text-muted)]">Est. Profit</div>
        </div>
        {picklist.missingCount > 0 && (
          <div className="bg-red-500/20 rounded-lg p-4 text-center">
            <AlertTriangle className="mx-auto mb-2 text-red-400" size={24} />
            <div className="text-2xl font-bold text-red-400">{picklist.missingCount}</div>
            <div className="text-xs text-red-300">Cards Missing</div>
          </div>
        )}
      </div>

      {/* Missing Cards Warning */}
      {picklist.missingCards?.length > 0 && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3 className="font-semibold text-red-400 flex items-center gap-2 mb-2">
            <AlertTriangle size={16} />
            Missing Cards ({picklist.missingCount})
          </h3>
          <div className="text-sm space-y-1">
            {picklist.missingCards.map((card, i) => (
              <div key={i} className="text-red-300">
                {card.quantity_needed}x {card.card_name}
                {card.set_code && <span className="text-red-400/60"> ({card.set_code})</span>}
              </div>
            ))}
          </div>
          <div className="text-xs text-red-400/60 mt-2">
            These cards were not available in inventory when the pick list was created.
          </div>
        </div>
      )}

      {/* Pick List by Folder */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MapPin size={16} />
          Cards to Pick ({picklist.reservedCount})
        </h3>

        {folderNames.map((folder) => (
          <div key={folder} className="mb-4">
            <div className="text-sm font-medium text-[var(--text-muted)] mb-2 flex items-center gap-2">
              <span className="bg-[var(--muted-surface)] px-2 py-1 rounded">{folder}</span>
              <span>({groupedByFolder[folder].length} cards)</span>
            </div>
            <div className="bg-[var(--muted-surface)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left p-2 font-medium">Card</th>
                    <th className="text-left p-2 font-medium">Set</th>
                    <th className="text-center p-2 font-medium">Qty</th>
                    <th className="text-right p-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByFolder[folder].map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-[var(--text-muted)]">{r.set || '-'}</td>
                      <td className="p-2 text-center">{r.quantity_reserved}</td>
                      <td className="p-2 text-right">{formatPrice(r.purchase_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
        {picklist.status === 'sold' && (
          <button
            onClick={handleMarkShipped}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            <Truck size={16} />
            {actionLoading ? 'Updating...' : 'Mark as Shipped'}
          </button>
        )}

        {['sold', 'shipped'].includes(picklist.status) && (
          <button
            onClick={handleComplete}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle size={16} />
            {actionLoading ? 'Completing...' : 'Complete Sale'}
          </button>
        )}
      </div>
    </div>
  );
});

EbayOrderFulfillment.propTypes = {
  listing: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    title: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  onBack: PropTypes.func.isRequired,
  onComplete: PropTypes.func,
};

export default EbayOrderFulfillment;
