import React, { memo, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Package, Truck, CheckCircle, Clock, AlertCircle, ExternalLink, RefreshCw, Upload } from 'lucide-react';
import { useAuthFetch } from '../../hooks/useAuthFetch';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: Clock },
  active: { label: 'Active', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: ExternalLink },
  sold: { label: 'Sold', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Package },
  shipped: { label: 'Shipped', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Truck },
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
  ended: { label: 'Ended', color: 'text-gray-500', bg: 'bg-gray-500/20', icon: AlertCircle },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
};

export const EbayListingsPanel = memo(function EbayListingsPanel({ onSelectListing }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const { authFetch } = useAuthFetch();

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = statusFilter === 'all'
        ? '/api/ebay/listings'
        : `/api/ebay/listings?status=${encodeURIComponent(statusFilter)}`;
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Failed to fetch listings');
      const data = await res.json();
      setListings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, authFetch]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleCreatePicklist = async (listingId) => {
    try {
      setActionLoading(listingId);
      const res = await authFetch(`/api/ebay/listings/${listingId}/create-picklist`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create pick list');
      await fetchListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkShipped = async (listingId) => {
    try {
      setActionLoading(listingId);
      const res = await authFetch(`/api/ebay/listings/${listingId}/mark-shipped`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark as shipped');
      await fetchListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (listingId) => {
    if (!window.confirm('Complete this sale? This will remove cards from inventory and record the sale.')) {
      return;
    }
    try {
      setActionLoading(listingId);
      const res = await authFetch(`/api/ebay/listings/${listingId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete sale');
      await fetchListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (listingId) => {
    try {
      setActionLoading(listingId);
      const res = await authFetch(`/api/ebay/listings/${listingId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish listing');
      await fetchListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatPrice = (price) => {
    if (price == null) return '-';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  return (
    <Card className="p-4" header={
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">eBay Listings</h3>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-[var(--border)] p-2 text-sm bg-[var(--bg-secondary)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={fetchListings}
            disabled={loading}
            className="p-2 rounded hover:bg-[var(--bg-secondary)] transition border border-transparent hover:border-[var(--border)]"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    }>
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded text-sm border border-red-500/30">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {loading && listings.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)] flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[var(--primary)]" size={24} />
          <p>Loading listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)] border-2 border-dashed border-[var(--border)] rounded-lg">
          <p>No listings found.</p>
          <p className="text-xs mt-1">Create a listing from the Decks tab.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--bg-secondary)] transition bg-[var(--bg-secondary)]/30 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate text-[var(--text-main)]">{listing.title || listing.deck_name || 'Untitled'}</h4>
                    <StatusBadge status={listing.status} />
                  </div>
                  <div className="text-sm text-[var(--text-muted)] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--text-main)]">{formatPrice(listing.price)}</span>
                      {listing.quantity > 1 && <span className="text-xs bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">x{listing.quantity}</span>}
                    </div>
                    <div className="text-xs">Created: {formatDate(listing.created_at)}</div>
                    {listing.sold_at && <div className="text-xs text-yellow-500/80">Sold: {formatDate(listing.sold_at)}</div>}
                    {listing.ebay_buyer_username && <div className="text-xs text-blue-400">Buyer: {listing.ebay_buyer_username}</div>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {listing.status === 'draft' && (
                    <button
                      onClick={() => handlePublish(listing.id)}
                      disabled={actionLoading === listing.id}
                      className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1.5 text-xs rounded hover:bg-teal-700 shadow-sm transition-all hover:shadow-teal-500/20"
                    >
                      <Upload size={14} />
                      {actionLoading === listing.id ? 'Publishing...' : 'Publish'}
                    </button>
                  )}

                  {listing.status === 'active' && (
                    <button
                      onClick={() => handleCreatePicklist(listing.id)}
                      disabled={actionLoading === listing.id}
                      className="btn-primary px-3 py-1.5 text-xs rounded !min-h-[auto]"
                    >
                      {actionLoading === listing.id ? 'Creating...' : 'Create Pick List'}
                    </button>
                  )}

                  {listing.status === 'sold' && !listing.deck_instance_id && (
                    <button
                      onClick={() => handleCreatePicklist(listing.id)}
                      disabled={actionLoading === listing.id}
                      className="btn-primary px-3 py-1.5 text-xs rounded !min-h-[auto]"
                    >
                      {actionLoading === listing.id ? 'Creating...' : 'Create Pick List'}
                    </button>
                  )}

                  {listing.status === 'sold' && listing.deck_instance_id && (
                    <>
                      <button
                        onClick={() => onSelectListing?.(listing)}
                        className="bg-blue-600 text-white px-3 py-1.5 text-xs rounded hover:bg-blue-700 shadow-sm"
                      >
                        View Pick List
                      </button>
                      <button
                        onClick={() => handleMarkShipped(listing.id)}
                        disabled={actionLoading === listing.id}
                        className="bg-purple-600 text-white px-3 py-1.5 text-xs rounded hover:bg-purple-700 shadow-sm"
                      >
                        {actionLoading === listing.id ? 'Updating...' : 'Mark Shipped'}
                      </button>
                    </>
                  )}

                  {listing.status === 'shipped' && (
                    <button
                      onClick={() => handleComplete(listing.id)}
                      disabled={actionLoading === listing.id}
                      className="bg-green-600 text-white px-3 py-1.5 text-xs rounded hover:bg-green-700 shadow-sm"
                    >
                      {actionLoading === listing.id ? 'Completing...' : 'Complete Sale'}
                    </button>
                  )}

                  {listing.listing_url && (
                    <a
                      href={listing.listing_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 justify-end transition-colors"
                    >
                      <ExternalLink size={12} />
                      View on eBay
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});

EbayListingsPanel.propTypes = {
  onSelectListing: PropTypes.func,
};

export default EbayListingsPanel;
