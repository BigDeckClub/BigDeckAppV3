import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, Zap } from 'lucide-react';
import { useApi } from '../hooks/useApi';

const THRESHOLD_PRESETS = {
  'Basic Land': { threshold: 100, description: 'Stock heavily for casual decks' },
  'Staple Common': { threshold: 25, description: 'Core playables in multiple formats' },
  'Staple Uncommon': { threshold: 15, description: 'Format staples, moderate demand' },
  'Format Staple Rare': { threshold: 8, description: 'Competitive format staples' },
  'Bulk Common': { threshold: 10, description: 'General bulk inventory' },
  'Bulk Uncommon': { threshold: 5, description: 'Lower-demand bulk' },
};

export const SettingsTab = ({ inventory }) => {
  const { put, post } = useApi();
  const [alertSettings, setAlertSettings] = useState({});
  const [saving, setSaving] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [presetMode, setPresetMode] = useState('single'); // 'single' or 'bulk'
  const [selectedCategory, setSelectedCategory] = useState('Staple Common');
  const [selectedCards, setSelectedCards] = useState([]);

  // Step 1: Dynamic Threshold Settings with Sliders
  const [thresholdSettings, setThresholdSettings] = useState({
    baseStock: 10,           // Default threshold for all cards (range: 2-50)
    landMultiplier: 10,      // Multiplier for basic lands (range: 2-20)
    velocityWeeks: 4,        // How many weeks of buffer stock (range: 1-8)
  });

  // Save threshold settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('thresholdSettings', JSON.stringify(thresholdSettings));
    console.log('[Settings] Threshold settings saved to localStorage:', thresholdSettings);
  }, [thresholdSettings]);

  // Load threshold settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('thresholdSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setThresholdSettings(parsed);
        console.log('[Settings] Threshold settings loaded from localStorage:', parsed);
      } catch (err) {
        console.error('[Settings] Failed to parse saved threshold settings:', err);
      }
    }
  }, []);

  // Group inventory with alerts enabled by card name
  const cardsWithAlerts = inventory
    .filter(item => item.low_inventory_alert)
    .reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = [];
      }
      acc[item.name].push(item);
      return acc;
    }, {});

  const handleThresholdChange = async (cardName, itemId, newThreshold) => {
    setSaving(prev => ({ ...prev, [itemId]: true }));
    try {
      await put(`/api/inventory/${itemId}`, {
        low_inventory_threshold: parseInt(newThreshold) || 0
      });
      setSuccessMessage('Threshold updated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating threshold:', error);
      setSuccessMessage('Error updating threshold');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setSaving(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleToggleAlert = async (itemId, currentAlert) => {
    setSaving(prev => ({ ...prev, [itemId]: true }));
    try {
      await put(`/api/inventory/${itemId}`, {
        low_inventory_alert: !currentAlert
      });
      setSuccessMessage('Alert setting updated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error toggling alert:', error);
      setSuccessMessage('Error updating alert');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setSaving(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleApplyPreset = async () => {
    const preset = THRESHOLD_PRESETS[selectedCategory];
    const cardsToUpdate = presetMode === 'single' && selectedCards.length > 0 
      ? selectedCards 
      : Object.values(cardsWithAlerts).flat();
    
    if (cardsToUpdate.length === 0) {
      setSuccessMessage('No cards selected');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setSaving(prev => ({ ...prev, applying: true }));
    try {
      const results = await Promise.allSettled(
        cardsToUpdate.map(item =>
          put(`/api/inventory/${item.id}`, {
            low_inventory_threshold: preset.threshold
          })
        )
      );
      const successful = results.filter(r => r.status === 'fulfilled').length;
      setSuccessMessage(`Applied ${selectedCategory} preset to ${successful} card(s)`);
      setSelectedCards([]);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error applying preset:', error);
      setSuccessMessage('Error applying preset');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setSaving(prev => ({ ...prev, applying: false }));
    }
  };

  const toggleCardSelection = (itemId) => {
    setSelectedCards(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSliderChange = (key, value) => {
    setThresholdSettings(prev => ({
      ...prev,
      [key]: value
    }));
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

      {/* Dynamic Threshold Settings with Sliders - Step 1 */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-slate-100">Dynamic Threshold Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Base Stock Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300">Base Stock Level</label>
              <span className="text-lg font-bold text-cyan-400">{thresholdSettings.baseStock}</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              value={thresholdSettings.baseStock}
              onChange={(e) => handleSliderChange('baseStock', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              Default threshold for all cards. Lower = less inventory needed, Higher = more stock.
            </p>
          </div>

          {/* Land Multiplier Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300">Basic Land Multiplier</label>
              <span className="text-lg font-bold text-cyan-400">{thresholdSettings.landMultiplier}x</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              value={thresholdSettings.landMultiplier}
              onChange={(e) => handleSliderChange('landMultiplier', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              How many times higher should basic land thresholds be? (Multiplies the base stock)
            </p>
          </div>

          {/* Velocity Weeks Slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300">Velocity Buffer (Weeks)</label>
              <span className="text-lg font-bold text-cyan-400">{thresholdSettings.velocityWeeks}w</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={thresholdSettings.velocityWeeks}
              onChange={(e) => handleSliderChange('velocityWeeks', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <p className="text-xs text-slate-400 mt-2">
              How many weeks of buffer stock based on sales velocity. Step 2 will calculate this automatically.
            </p>
          </div>

          {/* Settings Summary */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 mt-6">
            <p className="text-sm font-semibold text-slate-300 mb-2">Current Settings Summary:</p>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>All cards start with threshold: <strong className="text-cyan-300">{thresholdSettings.baseStock}</strong></li>
              <li>Basic lands get multiplied by: <strong className="text-cyan-300">{thresholdSettings.landMultiplier}x</strong></li>
              <li>Sales velocity buffer: <strong className="text-cyan-300">{thresholdSettings.velocityWeeks} weeks</strong></li>
            </ul>
            <p className="text-xs text-slate-500 mt-3 italic">
              These settings will be used in Step 2 to automatically calculate optimal thresholds for each card.
            </p>
          </div>
        </div>
      </div>

      {/* Threshold Presets Section */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-6 h-6 text-teal-400" />
          <h2 className="text-xl font-bold text-slate-100">Threshold Presets</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Select Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-teal-500"
            >
              {Object.entries(THRESHOLD_PRESETS).map(([cat, preset]) => (
                <option key={cat} value={cat}>
                  {cat} (Threshold: {preset.threshold}) - {preset.description}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-700/50 rounded p-3 border border-slate-600">
            <p className="text-sm text-slate-300 font-semibold mb-1">Selected: {selectedCategory}</p>
            <p className="text-xs text-slate-400">{THRESHOLD_PRESETS[selectedCategory].description}</p>
            <p className="text-xs text-slate-400 mt-2">
              <strong>Threshold:</strong> {THRESHOLD_PRESETS[selectedCategory].threshold}
            </p>
          </div>

          {presetMode === 'single' && Object.keys(cardsWithAlerts).length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-2 bg-slate-700/30 rounded p-3 border border-slate-600">
              {Object.values(cardsWithAlerts).flat().map(item => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-600/50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedCards.includes(item.id)}
                    onChange={() => toggleCardSelection(item.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-slate-300">{item.name} ({item.set?.toUpperCase()})</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setPresetMode('single')}
              className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                presetMode === 'single'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Apply to Selected
            </button>
            <button
              onClick={() => setPresetMode('bulk')}
              className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors ${
                presetMode === 'bulk'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Apply to All
            </button>
          </div>

          <button
            onClick={handleApplyPreset}
            disabled={saving.applying || (presetMode === 'single' && selectedCards.length === 0)}
            className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving.applying ? 'Applying...' : `Apply ${selectedCategory} Preset`}
          </button>
        </div>
      </div>

      {/* Low Inventory Alerts Section */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-slate-100">Low Inventory Alerts</h2>
        </div>

        {Object.keys(cardsWithAlerts).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No low inventory alerts enabled yet</p>
            <p className="text-slate-500 text-sm mt-2">Go to Inventory tab and click the bell icon to enable alerts for specific cards</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(cardsWithAlerts).map(([cardName, items]) => (
              <div key={cardName} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <h3 className="font-semibold text-slate-100 mb-3">{cardName}</h3>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-slate-600/50 p-3 rounded">
                      <div className="flex-1">
                        <div className="text-sm text-slate-300">
                          {item.set ? `${item.set.toUpperCase()}` : 'Unknown Set'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-400">Threshold:</label>
                        <input
                          type="number"
                          min="0"
                          value={item.low_inventory_threshold || 0}
                          onChange={(e) => handleThresholdChange(cardName, item.id, e.target.value)}
                          onBlur={(e) => handleThresholdChange(cardName, item.id, e.target.value)}
                          disabled={saving[item.id]}
                          className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <button
                        onClick={() => handleToggleAlert(item.id, item.low_inventory_alert)}
                        disabled={saving[item.id]}
                        className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded text-sm transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Info */}
      <div className="bg-slate-700/50 rounded-lg border border-slate-600 p-4">
        <h3 className="font-semibold text-slate-100 mb-2">How to Use Low Inventory Alerts</h3>
        <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
          <li>Go to the <strong>Inventory</strong> tab and click the bell icon on any card SKU</li>
          <li>Set a quantity threshold (e.g., 2, 5, 10) for when you want to be alerted</li>
          <li>Alerts can be customized per card type to track deck staples differently than bulk inventory</li>
          <li>Manage all your alerts here in the Settings tab</li>
        </ul>
      </div>

      {/* Account Section */}
      <div className="bg-slate-700/50 rounded-lg border border-slate-600 p-4">
        <h3 className="font-semibold text-slate-100 mb-3">Account</h3>
        <p className="text-slate-400 text-sm">Manage your account settings</p>
        <p className="text-slate-500 text-xs mt-2">More options coming soon...</p>
      </div>
    </div>
  );
};
