import React, { useState, useEffect } from 'react';
import { ShoppingBag, Link2, Unlink, Loader2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, Save, Key, Globe, Shield } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    ebay_client_id: '',
    ebay_client_secret: '',
    ebay_runame: '',
  });

  // Check URL params for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ebayConnected = params.get('ebay_connected');
    const ebayError = params.get('ebay_error');

    if (ebayConnected === 'true') {
      showToast('eBay account connected successfully!', TOAST_TYPES.SUCCESS);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (ebayError) {
      showToast(`eBay connection failed: ${ebayError}`, TOAST_TYPES.ERROR);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);

  // Fetch eBay connection status and config
  useEffect(() => {
    fetchStatus();
    fetchConfig();
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

  const fetchConfig = async () => {
    try {
      const [clientId, ruName] = await Promise.all([
        api.get('/settings/ebay_client_id'),
        api.get('/settings/ebay_runame')
      ]);
      setConfig(prev => ({
        ...prev,
        ebay_client_id: clientId || '',
        ebay_runame: ruName || '',
        // Don't fetch secret for security, user re-enters if changing
      }));
    } catch (error) {
      console.error('[eBay] Failed to fetch config:', error);
    }
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      await api.post('/settings/ebay_client_id', { value: config.ebay_client_id });
      await api.post('/settings/ebay_runame', { value: config.ebay_runame });

      if (config.ebay_client_secret) {
        await api.post('/settings/ebay_client_secret', { value: config.ebay_client_secret });
      }

      showToast('eBay configuration saved successfully', TOAST_TYPES.SUCCESS);
      await fetchStatus();
    } catch (error) {
      console.error('[eBay] Save config failed:', error);
      showToast('Failed to save configuration', TOAST_TYPES.ERROR);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const data = await api.get('/ebay/auth');

      if (data.authUrl) {
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
      description="Configure API credentials and connect your seller account"
      icon={ShoppingBag}
      badge={status?.connected ? 'Connected' : status?.configured ? 'Ready' : 'Setup Required'}
      badgeColor={status?.connected ? 'green' : status?.configured ? 'blue' : 'yellow'}
    >
      <div className="space-y-6">

        {/* API Configuration Section */}
        <div className="glass-panel p-5 bg-[var(--background-secondary)]/30 rounded-xl border border-[var(--border-color)]">
          <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-400" />
            Application Configuration
          </h4>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Enter your eBay App credentials from the <a href="https://developer.ebay.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">eBay Developer Portal</a>.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">App ID (Client ID)</label>
              <input
                type="text"
                value={config.ebay_client_id}
                onChange={(e) => handleConfigChange('ebay_client_id', e.target.value)}
                placeholder="Ex: MyName-MyApp-PRD-..."
                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Cert ID (Client Secret)</label>
              <div className="relative">
                <input
                  type="password"
                  value={config.ebay_client_secret}
                  onChange={(e) => handleConfigChange('ebay_client_secret', e.target.value)}
                  placeholder={config.ebay_client_id ? "(Unchanged)" : "Ex: PRD-1234..."}
                  className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50 outline-none pr-8"
                />
                <Shield className="absolute right-3 top-2.5 w-4 h-4 text-[var(--text-muted)] opacity-50" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">RuName (Redirect URI Name)</label>
              <input
                type="text"
                value={config.ebay_runame}
                onChange={(e) => handleConfigChange('ebay_runame', e.target.value)}
                placeholder="Ex: My_Name-MyName-MyApp-..."
                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Must match the RuName configured in your eBay account.</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${isSaving
                    ? 'bg-[var(--muted-surface)] text-[var(--text-muted)] cursor-not-allowed'
                    : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-blue-500/20'
                  }`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </button>
            </div>
          </div>
        </div>

        {/* Connection Status Section */}
        {status?.configured ? (
          <div className="border-t border-[var(--border-color)] pt-6">
            <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-400" />
              Account Connection
            </h4>

            {status?.connected ? (
              <div className="space-y-4">
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

                <div className="flex flex-wrap gap-3">
                  <button onClick={fetchStatus} className="btn-secondary text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                  <a href="https://www.ebay.com/sh/lst/active" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> View on eBay
                  </a>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="px-3 py-2 rounded-lg font-medium text-sm bg-red-900/20 text-red-300 hover:bg-red-900/30 border border-red-900/30 flex items-center gap-2"
                  >
                    {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-blue-900/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h5 className="font-medium text-blue-300 mb-1">Connect Seller Account</h5>
                    <p className="text-sm text-blue-200/60">Link your eBay account to enable listing creation.</p>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg shadow-lg shadow-blue-500/30 font-medium flex items-center gap-2"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Connect eBay
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-900/10 border border-yellow-600/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-medium text-yellow-500 mb-1">Configuration Required</h5>
              <p className="text-sm text-yellow-200/60">Please fill out the Application Configuration section above to enable eBay integration.</p>
            </div>
          </div>
        )}
      </div>
    </SettingsSection>
  );
};

export default EbaySettings;
