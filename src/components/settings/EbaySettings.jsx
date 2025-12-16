import React, { useState, useEffect } from 'react';
import { ShoppingBag, Link2, Unlink, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { api } from '../../utils/apiClient';
import { SettingsSection } from '../ui';

/**
 * EbaySettings component - eBay integration settings
 * Handles connecting/disconnecting eBay account and showing status
 */
export const EbaySettings = () => {
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check URL params for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ebayConnected = params.get('ebay_connected');
    const ebayError = params.get('ebay_error');

    if (ebayConnected === 'true') {
      showToast('eBay account connected successfully!', TOAST_TYPES.SUCCESS);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (ebayError) {
      showToast(`eBay connection failed: ${ebayError}`, TOAST_TYPES.ERROR);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);

  // Fetch eBay connection status
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const data = await api.get('/ebay/status');
      setStatus(data);
    } catch (error) {
      console.error('[eBay] Failed to fetch status:', error);
      setStatus({ configured: false, connected: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const data = await api.get('/ebay/auth');

      if (data.authUrl) {
        // Redirect to eBay authorization page
        window.location.href = data.authUrl;
      } else {
        showToast('Failed to get eBay authorization URL', TOAST_TYPES.ERROR);
      }
    } catch (error) {
      console.error('[eBay] Connect failed:', error);
      showToast(error.message || 'Failed to connect to eBay', TOAST_TYPES.ERROR);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your eBay account? Active listings will not be affected on eBay.')) {
      return;
    }

    try {
      setIsDisconnecting(true);
      await api.post('/ebay/disconnect', {});
      showToast('eBay account disconnected', TOAST_TYPES.SUCCESS);
      await fetchStatus();
    } catch (error) {
      console.error('[eBay] Disconnect failed:', error);
      showToast('Failed to disconnect eBay account', TOAST_TYPES.ERROR);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <SettingsSection
        title="eBay Integration"
        description="Connect your eBay seller account to list decks"
        icon={ShoppingBag}
      >
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading eBay status...
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="eBay Integration"
      description="Connect your eBay seller account to list decks directly from the app"
      icon={ShoppingBag}
      badge={status?.connected ? 'Connected' : status?.configured ? 'Ready' : 'Setup Required'}
      badgeColor={status?.connected ? 'green' : status?.configured ? 'blue' : 'yellow'}
    >
      <div className="space-y-4">
        {/* Not Configured State */}
        {!status?.configured && (
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-300 mb-1">eBay API Not Configured</h4>
                <p className="text-sm text-yellow-200/80 mb-3">
                  eBay integration requires API credentials. Contact the administrator to set up:
                </p>
                <ul className="text-xs text-yellow-200/70 space-y-1 list-disc list-inside">
                  <li>EBAY_CLIENT_ID</li>
                  <li>EBAY_CLIENT_SECRET</li>
                  <li>EBAY_REDIRECT_URI</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Configured but Not Connected State */}
        {status?.configured && !status?.connected && (
          <div className="bg-[var(--bg-page)] rounded-lg p-4 border border-[var(--border)]">
            <h4 className="font-semibold text-[var(--text-primary)] mb-2">Connect Your eBay Account</h4>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Link your eBay seller account to create listings directly from your deck inventory.
              You'll be redirected to eBay to authorize the connection.
            </p>

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isConnecting
                  ? 'bg-[var(--muted-surface)] text-[var(--text-muted)] cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white shadow-lg shadow-blue-500/25'
              }`}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Connect eBay Account
                </>
              )}
            </button>
          </div>
        )}

        {/* Connected State */}
        {status?.connected && (
          <div className="space-y-4">
            {/* Connection Status Card */}
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-300 mb-1">eBay Account Connected</h4>
                  <div className="text-sm text-green-200/80 space-y-1">
                    {status.ebayUserId && (
                      <p>
                        <span className="text-green-300/60">eBay User:</span>{' '}
                        <span className="font-medium">{status.ebayUserId}</span>
                      </p>
                    )}
                    {status.connectedAt && (
                      <p>
                        <span className="text-green-300/60">Connected:</span>{' '}
                        {new Date(status.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchStatus}
                className="px-3 py-2 rounded-lg font-medium text-sm bg-[var(--muted-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Status
              </button>

              <a
                href="https://www.ebay.com/sh/lst/active"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg font-medium text-sm bg-[var(--muted-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View on eBay
              </a>

              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  isDisconnecting
                    ? 'bg-[var(--muted-surface)] text-[var(--text-muted)] cursor-not-allowed'
                    : 'bg-red-900/30 text-red-300 hover:bg-red-900/50 border border-red-600/30'
                }`}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="w-4 h-4" />
                    Disconnect
                  </>
                )}
              </button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-[var(--text-muted)]">
              Once connected, you can list decks on eBay directly from the Decks tab.
              Look for the "List on eBay" option on each deck.
            </p>
          </div>
        )}
      </div>
    </SettingsSection>
  );
};

export default EbaySettings;
