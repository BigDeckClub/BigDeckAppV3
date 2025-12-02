import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, Zap, Lightbulb } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { calculateSmartThreshold } from '../utils/thresholdCalculator';

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

  // Step 2: Smart Threshold Calculator
  const [salesHistory, setSalesHistory] = useState([]);
  const [smartSuggestions, setSmartSuggestions] = useState({});
  const [loadingCalculations, setLoadingCalculations] = useState(false);
  
  // Progress tracking for bulk apply
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });

  // Step 7: Save threshold settings to localStorage AND backend when they change
  useEffect(() => {
    localStorage.setItem('thresholdSettings', JSON.stringify(thresholdSettings));
    console.log('[Settings] Threshold settings saved to localStorage:', thresholdSettings);
    
    // Save to backend
    fetch('/api/settings/thresholdSettings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: thresholdSettings })
    }).catch(err => console.error('[Settings] Error saving to backend:', err));
  }, [thresholdSettings]);

  // Load threshold settings from localStorage/backend on mount
  useEffect(() => {
    // Try to load from backend first (Step 7)
    fetch('/api/settings/thresholdSettings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setThresholdSettings(data);
          console.log('[Settings] Threshold settings loaded from backend:', data);
        } else {
          // Fallback to localStorage if backend has no data
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
        }
      })
      .catch(err => {
        console.error('[Settings] Error loading from backend, falling back to localStorage:', err);
        const saved = localStorage.getItem('thresholdSettings');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setThresholdSettings(parsed);
          } catch (err) {
            console.error('[Settings] Failed to parse saved threshold settings:', err);
          }
        }
      });
  }, []);

  // Group inventory with alerts enabled by card name (MOVED BEFORE useEffect that uses it)
  const cardsWithAlerts = inventory
    .filter(item => item.low_inventory_alert)
    .reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = [];
      }
      acc[item.name].push(item);
      return acc;
    }, {});

  // Fetch sales history and calculate smart thresholds
  useEffect(() => {
    const fetchAndCalculate = async () => {
      setLoadingCalculations(true);
      try {
        // Fetch sales history
        const response = await fetch('/api/sales');
        if (response.ok) {
          const data = await response.json();
          setSalesHistory(data || []);
          
          // Calculate smart thresholds for all cards with alerts
          const suggestions = {};
          Object.values(cardsWithAlerts).flat().forEach(card => {
            const calc = calculateSmartThreshold(card, data || [], thresholdSettings);
            suggestions[card.id] = calc;
          });
          setSmartSuggestions(suggestions);
          console.log('[Settings] Smart suggestions calculated:', suggestions);
        }
      } catch (error) {
        console.error('[Settings] Error fetching sales history:', error);
      } finally {
        setLoadingCalculations(false);
      }
    };

    if (Object.keys(cardsWithAlerts).length > 0) {
      fetchAndCalculate();
    }
  }, [thresholdSettings, cardsWithAlerts]);

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

  // Step 4: Apply Smart Thresholds to ALL Inventory (DEBUG VERSION)
  const handleApplySmartThresholds = async () => {
    console.log('=== SMART THRESHOLDS DEBUG START ===');
    console.log('1. Button clicked');
    console.log('2. Inventory loaded?', !!inventory, 'Count:', inventory?.length);
    console.log('3. thresholdSettings:', thresholdSettings);
    
    if (!inventory || inventory.length === 0) {
      alert('❌ No inventory loaded. Please wait for inventory to load first.');
      console.log('ABORTED: No inventory');
      return;
    }
    
    const confirmMsg = `This will calculate and apply thresholds for ${inventory.length} items. Continue?`;
    
    if (!window.confirm(confirmMsg)) {
      console.log('ABORTED: User cancelled');
      return;
    }
    
    console.log('4. User confirmed, starting process...');
    setSaving(prev => ({ ...prev, applying: true }));
    setApplyProgress({ current: 0, total: inventory.length });
    
    try {
      // Step 1: Fetch sales history
      console.log('5. Fetching sales history...');
      let salesHistory = [];
      try {
        const salesResponse = await fetch('/api/sales');
        console.log('6. Sales response status:', salesResponse.status);
        if (salesResponse.ok) {
          salesHistory = await salesResponse.json();
          console.log('7. Sales history loaded:', salesHistory.length, 'records');
        } else {
          console.log('7. Sales fetch failed, continuing without sales data');
        }
      } catch (err) {
        console.warn('7. Sales fetch error (continuing anyway):', err.message);
      }
      
      // Step 2: Calculate thresholds
      console.log('8. Calculating thresholds for', inventory.length, 'items...');
      const updates = [];
      
      for (let i = 0; i < inventory.length; i++) {
        const item = inventory[i];
        
        try {
          const result = calculateSmartThreshold(item, salesHistory, thresholdSettings);
          
          updates.push({
            id: item.id,
            threshold: result.suggested,
            enableAlert: true
          });
          
          // Update progress every 10 items
          if (i % 10 === 0) {
            setApplyProgress({ current: i, total: inventory.length });
          }
        } catch (calcErr) {
          console.error('Calculation error for item', item.id, item.name, ':', calcErr);
        }
      }
      
      console.log('9. Calculated', updates.length, 'thresholds');
      console.log('10. Sample updates:', updates.slice(0, 3));
      
      setApplyProgress({ current: inventory.length, total: inventory.length });
      
      // Step 3: Send bulk update
      console.log('11. Sending bulk update to /api/inventory/bulk-threshold...');
      
      const response = await fetch('/api/inventory/bulk-threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      
      console.log('12. Response status:', response.status);
      console.log('13. Response ok:', response.ok);
      
      const responseText = await response.text();
      console.log('14. Response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('15. Parsed result:', result);
      } catch (parseErr) {
        console.error('15. JSON parse error:', parseErr);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      
      // Step 4: Success
      console.log('16. SUCCESS! Updated:', result.updated, 'Errors:', result.errors);
      
      if (result.errors > 0) {
        alert(`✅ Updated ${result.updated} items!\n⚠️ ${result.errors} errors occurred.`);
      } else {
        alert(`✅ Successfully updated all ${result.updated} items with smart thresholds!`);
      }
      
      setSuccessMessage(`✅ Applied smart thresholds to ${result.updated}/${result.updated + result.errors} items`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error) {
      console.error('=== ERROR ===', error);
      alert(`❌ Error: ${error.message}\n\nCheck browser console for details.`);
      setSuccessMessage('Error applying smart thresholds');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      console.log('19. Cleanup - resetting state');
      setSaving(prev => ({ ...prev, applying: false }));
      setApplyProgress({ current: 0, total: 0 });
      console.log('=== SMART THRESHOLDS DEBUG END ===');
    }
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

      {/* Smart Threshold Settings - Steps 1, 2 & 3 Combined */}
      <div className="bg-slate-800 rounded-lg p-6 space-y-6 border border-slate-600">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            🎯 Smart Threshold Settings
          </h3>
          <p className="text-sm text-slate-400">
            Thresholds are automatically calculated based on how fast cards sell. Adjust these sliders to fine-tune the calculations.
          </p>
        </div>
        
        {/* Slider 1: Base Stock Level */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white">
              📦 Base Stock Level
            </label>
            <span className="text-sm font-bold text-yellow-400">
              {thresholdSettings.baseStock}
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="50"
            value={thresholdSettings.baseStock}
            onChange={(e) => handleSliderChange('baseStock', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
          <p className="text-xs text-slate-500">
            Default threshold for cards with no sales history
          </p>
        </div>
        
        {/* Slider 2: Basic Land Multiplier */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white">
              🏔️ Basic Land Multiplier
            </label>
            <span className="text-sm font-bold text-green-400">
              {thresholdSettings.landMultiplier}x → {thresholdSettings.baseStock * thresholdSettings.landMultiplier}
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="20"
            value={thresholdSettings.landMultiplier}
            onChange={(e) => handleSliderChange('landMultiplier', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
          <p className="text-xs text-slate-500">
            Plains, Island, Swamp, Mountain, Forest get threshold × this multiplier
          </p>
        </div>
        
        {/* Slider 3: Velocity Buffer Weeks */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-white">
              📈 Sales Buffer (Weeks)
            </label>
            <span className="text-sm font-bold text-blue-400">
              {thresholdSettings.velocityWeeks} weeks
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="8"
            value={thresholdSettings.velocityWeeks}
            onChange={(e) => handleSliderChange('velocityWeeks', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <p className="text-xs text-slate-500">
            For cards that sell regularly: threshold = weekly sales × this number
          </p>
        </div>
        
        {/* Example Calculations */}
        <div className="bg-slate-700 rounded p-3 space-y-1">
          <p className="text-xs font-medium text-slate-300">Example Calculations:</p>
          <p className="text-xs text-slate-400">
            • Basic Land → <span className="text-green-400">{thresholdSettings.baseStock * thresholdSettings.landMultiplier}</span> threshold
          </p>
          <p className="text-xs text-slate-400">
            • Card selling 5/week → <span className="text-blue-400">{5 * thresholdSettings.velocityWeeks}</span> threshold
          </p>
          <p className="text-xs text-slate-400">
            • Card with no sales → <span className="text-yellow-400">{thresholdSettings.baseStock}</span> threshold
          </p>
        </div>
        
        {/* Apply to All Button - DEBUG VERSION */}
        <button
          onClick={() => {
            console.log('Button onClick fired');
            console.log('saving state:', saving);
            console.log('inventory:', inventory?.length);
            handleApplySmartThresholds();
          }}
          disabled={saving?.applying || loadingCalculations}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors"
        >
          {saving?.applying ? (
            <span>
              ⏳ Processing... {applyProgress.current}/{applyProgress.total}
            </span>
          ) : (
            <span>🚀 Apply Smart Thresholds ({inventory?.length || 0} items)</span>
          )}
        </button>
      </div>

      {/* Smart Threshold Suggestions - Step 2 */}
      {Object.keys(smartSuggestions).length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-slate-100">Smart Threshold Suggestions</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <p className="text-sm text-slate-300 mb-3">
                Based on your sales velocity and settings, here are optimized thresholds:
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(cardsWithAlerts).map(([cardName, items]) =>
                  items.map(item => {
                    const suggestion = smartSuggestions[item.id];
                    if (!suggestion) return null;
                    return (
                      <div key={item.id} className="flex justify-between items-center bg-slate-600/50 p-2 rounded text-xs">
                        <div>
                          <p className="text-slate-300 font-semibold">{item.name}</p>
                          <p className="text-slate-400">{suggestion.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400">Current: {item.low_inventory_threshold || 0}</p>
                          <p className="text-yellow-300 font-bold">→ {suggestion.suggested}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={handleApplySmartThresholds}
              disabled={saving.applying || loadingCalculations}
              className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingCalculations ? 'Calculating...' : saving.applying ? 'Applying...' : 'Apply All Smart Thresholds'}
            </button>
          </div>
        </div>
      )}

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
