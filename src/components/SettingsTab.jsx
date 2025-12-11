import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Target, Zap, Settings, Palette } from 'lucide-react';
import { useThresholdSettings } from '../hooks/useThresholdSettings';
import { ThresholdSettings, PresetManager, AccountSettings, AppearanceSettings } from './settings';
import { api } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

export const SettingsTab = ({ inventory = [] }) => {
  const [activeTab, setActiveTab] = useState('appearance');
  
  const {
    thresholdSettings,
    saveStatus,
    handleSliderChange,
    handleResetSliders,
    handleApplyQuickPreset
  } = useThresholdSettings();
  
  const [salesHistory, setSalesHistory] = useState([]);

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

  const getTabClassName = (tabName, activeColor) => {
    const baseClasses = 'px-4 py-3 font-medium transition-all whitespace-nowrap';
    const activeClasses = `border-b-2 ${activeColor} bg-ui-card/50`;
    const inactiveClasses = 'text-ui-muted hover:text-ui-heading';
    
    return `${baseClasses} ${activeTab === tabName ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-ui-border pb-0 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('appearance')}
          className={getTabClassName('appearance', 'border-ui-primary text-ui-primary')}
        >
          <span className="flex items-center gap-1.5">
            <Palette className="w-4 h-4" />
            Appearance
          </span>
        </button>
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
          className={getTabClassName('presets', 'border-teal-500 text-teal-400')}
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            Presets
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

      {activeTab === 'appearance' && (
        <AppearanceSettings />
      )}

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

      {activeTab === 'presets' && (
        <PresetManager
          inventory={inventory}
        />
      )}

      {activeTab === 'account' && (
        <AccountSettings />
      )}
    </div>
  );
};

SettingsTab.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.object)
};

export default SettingsTab;
