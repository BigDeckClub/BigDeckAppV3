import React, { useState } from 'react';
import { Database, Loader2, CheckCircle2, AlertCircle, User, Bell, Shield } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { api } from '../../utils/apiClient';
import { SettingsSection, Toggle } from '../ui';

/**
 * AccountSettings component - Account settings tab
 * Includes data management tools like Scryfall ID backfill
 */
export const AccountSettings = () => {
  const { showToast } = useToast();
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  // Example settings state (would persist to backend in production)
  const [notifications, setNotifications] = useState({
    priceAlerts: true,
    lowStock: true,
    weeklyReport: false,
  });

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
    <div className="space-y-6">
      {/* Account Info Section */}
      <SettingsSection
        title="Account Settings"
        description="Manage your account and preferences"
        icon={User}
        collapsible={false}
      >
        <p className="text-[var(--text-muted)] text-sm">More account options coming soon...</p>
      </SettingsSection>

      {/* Notifications Section */}
      <SettingsSection
        title="Notifications"
        description="Configure how you receive alerts and updates"
        icon={Bell}
        badge="Preview"
        badgeColor="purple"
      >
        <div className="space-y-1 divide-y divide-slate-700/50">
          <SettingsSection.Item
            label="Price Alerts"
            description="Get notified when card prices change significantly"
          >
            <Toggle
              checked={notifications.priceAlerts}
              onChange={(checked) => setNotifications(prev => ({ ...prev, priceAlerts: checked }))}
              color="teal"
            />
          </SettingsSection.Item>

          <SettingsSection.Item
            label="Low Stock Alerts"
            description="Alert when cards fall below threshold"
          >
            <Toggle
              checked={notifications.lowStock}
              onChange={(checked) => setNotifications(prev => ({ ...prev, lowStock: checked }))}
              color="teal"
            />
          </SettingsSection.Item>

          <SettingsSection.Item
            label="Weekly Report"
            description="Receive a weekly summary of your collection"
          >
            <Toggle
              checked={notifications.weeklyReport}
              onChange={(checked) => setNotifications(prev => ({ ...prev, weeklyReport: checked }))}
              color="teal"
            />
          </SettingsSection.Item>
        </div>
      </SettingsSection>

      {/* Data Management Section */}
      <SettingsSection
        title="Data Management"
        description="Tools to maintain and update your inventory data"
        icon={Database}
      >
        <div className="space-y-4">
          <div className="bg-[var(--bg-page)] rounded-lg p-4 border border-[var(--border)]">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
              Update Price Data
            </h3>
            <p className="text-[var(--text-muted)] text-sm mb-4">
              Populate Scryfall IDs for cards missing them. This enables CardKingdom and TCGPlayer
              price tracking in the Analytics tab.
            </p>

            <button
              onClick={handleBackfillScryfallIds}
              disabled={isBackfilling}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isBackfilling
                  ? 'bg-[var(--muted-surface)] text-[var(--text-muted)] cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-[var(--text-primary)] shadow-lg shadow-teal-500/25'
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
      </SettingsSection>

      {/* Privacy & Security Section */}
      <SettingsSection
        title="Privacy & Security"
        description="Manage your data and security preferences"
        icon={Shield}
        defaultExpanded={false}
      >
        <p className="text-[var(--text-muted)] text-sm">Security options coming soon...</p>
      </SettingsSection>
    </div>
  );
};

export default AccountSettings;
