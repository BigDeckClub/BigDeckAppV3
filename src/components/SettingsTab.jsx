import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Target, Zap, Settings } from 'lucide-react';
import { useThresholdSettings } from '../hooks/useThresholdSettings';
import { ThresholdSettings, PresetManager, AccountSettings } from './settings';
import AppearanceSettings from './settings/AppearanceSettings';
import { api } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

/**
 * SettingsTab component - Main settings page with tab navigation
 * Manages tab state and delegates to sub-components for each settings area
 */
export const SettingsTab = ({ inventory = [] }) => {
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('thresholds');

  // Shared threshold settings from custom hook
  const {
    thresholdSettings,
    saveStatus,
    handleSliderChange,
    handleResetSliders,
    handleApplyQuickPreset
  } = useThresholdSettings();

  // Sales history for threshold calculations
  const [salesHistory, setSalesHistory] = useState([]);

  // Fetch sales history ONCE on mount
  useEffect(() => {
    const loadSales = async () => {
      try {
        const data = await api.get(API_ENDPOINTS.SALES);
        setSalesHistory(data || []);
      } catch (error) {
        console.warn('[Settings] Error fetching sales history:', error);
      }
    };
    loadSales();

  }, []);

  // Tab button styling helper
  const getTabClassName = (tabName, activeColor) => {
    const baseClasses = 'px-4 py-3 font-medium transition-all whitespace-nowrap';
    const activeClasses = `border-b-2 ${activeColor} bg-[var(--bda-primary)]/10`;
    const inactiveClasses = 'text-[var(--text-muted)] hover:text-[var(--bda-text)]';

    return `${baseClasses} ${activeTab === tabName ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation Bar */}
      <div className="flex gap-2 border-b border-slate-600 pb-0 overflow-x-auto no-scrollbar scroll-smooth">
        <button
          onClick={() => setActiveTab('thresholds')}
          className={getTabClassName('thresholds', 'border-purple-500 text-purple-400')}
        >
          <span className="flex items-center gap-1.5">
            <Target className="w-4 h-4" />
            Smart Thresholds
          </span>
        </button>
        <button
          onClick={() => setActiveTab('presets')}
          className={getTabClassName('presets', 'border-[var(--bda-primary)] text-[var(--bda-primary)]')}
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            Presets
          </span>
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={getTabClassName('appearance', 'border-amber-500 text-amber-400')}
        >
          <span className="flex items-center gap-1.5">
            <Settings className="w-4 h-4" />
            Appearance
          </span>
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={getTabClassName('account', 'border-blue-500 text-blue-400')}
        >
          <span className="flex items-center gap-1.5">
            <Settings className="w-4 h-4" />
            Account
          </span>
        </button>
      </div>

      {/* Smart Threshold Settings Tab */}
      {activeTab === 'thresholds' && (
        <ThresholdSettings
          inventory={inventory}
          thresholdSettings={thresholdSettings}
          saveStatus={saveStatus}
          handleSliderChange={handleSliderChange}
          handleResetSliders={handleResetSliders}
          handleApplyQuickPreset={handleApplyQuickPreset}
          salesHistory={salesHistory}
        />
      )}

      {/* Threshold Presets Tab */}
      {activeTab === 'presets' && (
        <PresetManager
          inventory={inventory}
        />
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <AppearanceSettings />
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <AccountSettings />
      )}
      {/* Admin tools moved to top-level Templates page */}
    </div>
  );
};

SettingsTab.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.object)
};

export default SettingsTab;
