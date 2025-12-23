import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Unlink, RefreshCw, CheckCircle, XCircle, Plus } from 'lucide-react';
import Card from '../ui/Card';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import EbayTemplatesManager from '../ebay/EbayTemplatesManager';
import EbayListingsPanel from '../ebay/EbayListingsPanel';
import EbayOrderFulfillment from '../ebay/EbayOrderFulfillment';
import EbayBulkListingModal from '../ebay/EbayBulkListingModal';

export default function AdminTab() {
  const [activeSection, setActiveSection] = useState('listings');
  const [selectedListing, setSelectedListing] = useState(null);
  const [ebayStatus, setEbayStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [listingsPanelKey, setListingsPanelKey] = useState(0);
  const { authFetch } = useAuthFetch();

  // Fetch eBay connection status
  const fetchEbayStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      const res = await authFetch('/api/ebay/status');
      if (res.ok) {
        const data = await res.json();
        setEbayStatus(data);
      }
    } catch (err) {
      console.error('[AdminTab] Failed to fetch eBay status', err);
    } finally {
      setStatusLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchEbayStatus();
  }, [fetchEbayStatus]);

  const handleConnectEbay = async () => {
    try {
      const res = await authFetch('/api/ebay/auth');
      if (res.ok) {
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      }
    } catch (err) {
      console.error('[AdminTab] Failed to initiate eBay auth', err);
    }
  };

  const handleDisconnectEbay = async () => {
    if (!confirm('Are you sure you want to disconnect your eBay account?')) return;
    try {
      const res = await authFetch('/api/ebay/disconnect', { method: 'POST' });
      if (res.ok) {
        setEbayStatus(prev => ({ ...prev, connected: false, ebayUserId: null }));
      }
    } catch (err) {
      console.error('[AdminTab] Failed to disconnect eBay', err);
    }
  };

  const handleSyncOrders = async () => {
    try {
      setSyncLoading(true);
      setSyncResult(null);
      const res = await authFetch('/api/ebay/sync-orders', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ success: true, message: `Synced ${data.salesSynced} orders from ${data.ordersChecked} checked` });
      } else {
        setSyncResult({ success: false, message: data.error || 'Sync failed' });
      }
    } catch (err) {
      setSyncResult({ success: false, message: 'Network error' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSelectListing = (listing) => {
    setSelectedListing(listing);
  };

  const handleBackToListings = () => {
    setSelectedListing(null);
  };

  const handleSaleComplete = () => {
    setSelectedListing(null);
  };

  const handleBulkComplete = () => {
    // Refresh listings panel after bulk create
    setListingsPanelKey(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">eBay Management</h2>
      <p className="text-sm text-[var(--text-muted)]">Manage eBay listings, templates, and order fulfillment.</p>

      {/* eBay Connection Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${ebayStatus?.connected ? 'bg-green-500' : 'bg-gray-500'}`} />
            <div>
              <div className="font-medium">
                {statusLoading ? 'Checking connection...' : ebayStatus?.connected ? 'Connected to eBay' : 'Not connected to eBay'}
              </div>
              {ebayStatus?.connected && ebayStatus?.ebayUserId && (
                <div className="text-sm text-[var(--text-muted)]">Account: {ebayStatus.ebayUserId}</div>
              )}
              {!ebayStatus?.configured && !statusLoading && (
                <div className="text-sm text-amber-400">
                  Set up your eBay API credentials in{' '}
                  <button
                    onClick={() => { /* Ideally navigate to settings */ }}
                    className="underline hover:text-amber-300"
                  >
                    Settings → eBay Integration
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {ebayStatus?.connected ? (
              <>
                <button
                  onClick={handleSyncOrders}
                  disabled={syncLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium disabled:opacity-50"
                >
                  <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
                  {syncLoading ? 'Syncing...' : 'Sync Orders'}
                </button>
                <button
                  onClick={handleDisconnectEbay}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium"
                >
                  <Unlink size={16} />
                  Disconnect
                </button>
              </>
            ) : ebayStatus?.configured ? (
              <button
                onClick={handleConnectEbay}
                className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm font-medium"
              >
                <Link2 size={16} />
                Connect eBay Account
              </button>
            ) : null}
          </div>
        </div>
        {syncResult && (
          <div className={`mt-3 p-2 rounded text-sm flex items-center gap-2 ${syncResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {syncResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {syncResult.message}
          </div>
        )}
      </Card>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => { setActiveSection('listings'); setSelectedListing(null); }}
          className={`px-4 py-2 rounded-t text-sm font-medium transition ${activeSection === 'listings'
            ? 'bg-[var(--surface)] text-[var(--bda-text)] border-b-2 border-teal-400'
            : 'text-[var(--text-muted)] hover:text-[var(--bda-text)]'
            }`}
        >
          Listings & Orders
        </button>
        <button
          onClick={() => { setActiveSection('templates'); setSelectedListing(null); }}
          className={`px-4 py-2 rounded-t text-sm font-medium transition ${activeSection === 'templates'
            ? 'bg-[var(--surface)] text-[var(--bda-text)] border-b-2 border-teal-400'
            : 'text-[var(--text-muted)] hover:text-[var(--bda-text)]'
            }`}
        >
          Templates
        </button>
      </div>

      {/* Listings & Orders Section */}
      {activeSection === 'listings' && (
        <div className="mt-4">
          {selectedListing ? (
            <EbayOrderFulfillment
              listing={selectedListing}
              onBack={handleBackToListings}
              onComplete={handleSaleComplete}
            />
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm font-medium"
                >
                  <Plus size={16} />
                  Bulk Create Listings
                </button>
              </div>
              <EbayListingsPanel key={listingsPanelKey} onSelectListing={handleSelectListing} />
            </>
          )}
        </div>
      )}

      {/* Templates Section */}
      {activeSection === 'templates' && (
        <div className="mt-4">
          <EbayTemplatesManager onClose={() => { }} />
        </div>
      )}

      {/* Bulk Listing Modal */}
      <EbayBulkListingModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onComplete={handleBulkComplete}
      />
    </div>
  );
}
