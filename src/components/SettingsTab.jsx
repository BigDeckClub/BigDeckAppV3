import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle } from 'lucide-react';
import { useThresholdSettings } from '../hooks/useThresholdSettings';
import { ThresholdSettings, PresetManager, AlertSettings, AccountSettings } from './settings';

/**
 * SettingsTab component - Main settings page with tab navigation
 * Manages tab state and delegates to sub-components for each settings area
 */
export const SettingsTab = ({ inventory }) => {
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
  
  // Success message state (shared across some tabs)
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch sales history ONCE on mount
  useEffect(() => {
    const loadSales = async () => {
      try {
        const response = await fetch('/api/sales');
        if (response.ok) {
          const data = await response.json();
          setSalesHistory(data || []);
        }
      } catch (error) {
        console.warn('[Settings] Error fetching sales history:', error);
      }
    };
    loadSales();
  }, []);

  // Tab button styling helper
  const getTabClassName = (tabName, activeColor) => {
    const baseClasses = 'px-4 py-3 font-medium transition-all whitespace-nowrap';
    const activeClasses = `border-b-2 ${activeColor} bg-slate-800/50`;
    const inactiveClasses = 'text-slate-400 hover:text-slate-300';
    
    return `${baseClasses} ${activeTab === tabName ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-600/20 border border-green-600 rounded-lg p-4 text-green-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Tab Navigation Bar */}
      <div className="flex gap-2 border-b border-slate-600 pb-0 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('thresholds')}
          className={getTabClassName('thresholds', 'border-purple-500 text-purple-400')}
        >
          🎯 Smart Thresholds
        </button>
        <button 
          onClick={() => setActiveTab('presets')}
          className={getTabClassName('presets', 'border-teal-500 text-teal-400')}
        >
          ⚡ Presets
        </button>
        <button 
          onClick={() => setActiveTab('alerts')}
          className={getTabClassName('alerts', 'border-yellow-500 text-yellow-400')}
        >
          🔔 Alerts
        </button>
        <button 
          onClick={() => setActiveTab('account')}
          className={getTabClassName('account', 'border-blue-500 text-blue-400')}
        >
          ⚙️ Account
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
          onSuccess={() => {
            setSuccessMessage('Preset applied successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}

      {/* Low Inventory Alerts Tab */}
      {activeTab === 'alerts' && (
        <AlertSettings inventory={inventory} />
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <AccountSettings />
      )}
    </div>
  );
};

SettingsTab.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.object)
};

SettingsTab.defaultProps = {
  inventory: []
};

export default SettingsTab;
