import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Bell, AlertCircle, Zap, Lightbulb, Settings, Package, Mountain, TrendingUp, RotateCcw, HelpCircle, ChevronDown, Save } from 'lucide-react';
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

// Quick preset configurations for shop types
const QUICK_PRESETS = {
  lowVolume: {
    label: '🏃 Low Volume Shop',
    baseStock: 5,
    landMultiplier: 15,
    velocityWeeks: 2,
    description: 'Minimal inventory, quick turnover'
  },
  balanced: {
    label: '⚖️ Balanced (Default)',
    baseStock: 10,
    landMultiplier: 10,
    velocityWeeks: 4,
    description: 'Standard settings for most shops'
  },
  highVolume: {
    label: '📦 High Volume Shop',
    baseStock: 20,
    landMultiplier: 15,
    velocityWeeks: 6,
    description: 'Large inventory, high turnover'
  },
  commander: {
    label: '🎴 Commander Focus',
    baseStock: 15,
    landMultiplier: 20,
    velocityWeeks: 4,
    description: 'Emphasis on lands for Commander'
  }
};

const DEFAULT_SETTINGS = {
  baseStock: 10,
  landMultiplier: 10,
  velocityWeeks: 4
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
  
  // Progress tracking for bulk apply
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });
  
  // Auto-save status indicator
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'saved'
  const saveTimeoutRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState('thresholds');

  // Cleanup saveTimeoutRef on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Auto-save with debounce (500ms)
  const saveSettingsToBackend = useCallback(async (settings) => {
    setSaveStatus('saving');
    try {
      localStorage.setItem('thresholdSettings', JSON.stringify(settings));
      await post('/settings/thresholdSettings', { value: settings });
      setSaveStatus('saved');
      // Clear saved status after 2 seconds
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaveStatus(''), 2000);
    } catch (err) {
      console.error('[Settings] Error saving to backend:', err);
      setSaveStatus('');
    }
  }, [post]);

  // Debounced save effect (500ms)
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      saveSettingsToBackend(thresholdSettings);
    }, 500);
    
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [thresholdSettings, saveSettingsToBackend]);

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

  // Group inventory with alerts enabled by card name - MEMOIZED to prevent recreating on every render
  const cardsWithAlerts = useMemo(() => {
    return inventory
      .filter(item => item.low_inventory_alert)
      .reduce((acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = [];
        }
        acc[item.name].push(item);
        return acc;
      }, {});
  }, [inventory]);

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
  }, []); // Empty deps = only runs once

  // Calculate smart thresholds ONLY when thresholdSettings changes (not on every render)
  useEffect(() => {
    if (Object.keys(cardsWithAlerts).length === 0 || salesHistory.length === 0) {
      return;
    }

    console.log('[Settings] Recalculating smart suggestions due to settings change');
    const suggestions = {};
    Object.values(cardsWithAlerts).flat().forEach(card => {
      const calc = calculateSmartThreshold(card, salesHistory, thresholdSettings);
      suggestions[card.id] = calc;
    });
    setSmartSuggestions(suggestions);
    console.log('[Settings] Smart suggestions ready:', Object.keys(suggestions).length, 'items');
  }, [thresholdSettings]); // ONLY depends on thresholdSettings, not cardsWithAlerts!

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

  // Reset sliders to default values
  const handleResetSliders = () => {
    setThresholdSettings(DEFAULT_SETTINGS);
  };

  // Apply quick preset
  const handleApplyQuickPreset = (presetKey) => {
    const preset = QUICK_PRESETS[presetKey];
    setThresholdSettings({
      baseStock: preset.baseStock,
      landMultiplier: preset.landMultiplier,
      velocityWeeks: preset.velocityWeeks
    });
  };

  // Calculate smart suggestions with useMemo to prevent infinite re-render loops
  // Only calculate for first 20 items for preview, unless needed for full apply
  const computedSmartSuggestions = useMemo(() => {
    if (!inventory || inventory.length === 0) return {};
    const itemsToCalculate = applyProgress?.total > 0 ? inventory : inventory.slice(0, 20);
    const suggestions = {};
    itemsToCalculate.forEach(card => {
      const calc = calculateSmartThreshold(card, salesHistory, thresholdSettings);
      suggestions[card.id] = calc;
    });
    return suggestions;
  }, [inventory, salesHistory, thresholdSettings, applyProgress?.total]);

  // Calculate summary stats for what will change
  const summaryStats = useMemo(() => {
    if (!inventory || inventory.length === 0) {
      return { total: 0, basicLands: 0, velocityBased: 0, priceBased: 0 };
    }
    
    const basicLands = ['plains', 'island', 'swamp', 'mountain', 'forest'];
    let basicLandCount = 0;
    let velocityBasedCount = 0;
    let priceBasedCount = 0;
    
    inventory.forEach(card => {
      const name = (card.name || '').toLowerCase().trim();
      const isSnowBasic = name.startsWith('snow-covered ') && 
        basicLands.includes(name.replace('snow-covered ', ''));
      
      if (basicLands.includes(name) || isSnowBasic) {
        basicLandCount++;
      } else {
        const suggestion = computedSmartSuggestions[card.id];
        if (suggestion?.reason?.includes('week')) {
          velocityBasedCount++;
        } else {
          priceBasedCount++;
        }
      }
    });
    
    return {
      total: inventory.length,
      basicLands: basicLandCount,
      velocityBased: velocityBasedCount,
      priceBased: priceBasedCount
    };
  }, [inventory, computedSmartSuggestions]);

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

      {/* Tab Navigation Bar */}
      <div className="flex gap-2 border-b border-slate-600 pb-0 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('thresholds')}
          className={`px-4 py-3 font-medium transition-all whitespace-nowrap ${
            activeTab === 'thresholds' 
              ? 'border-b-2 border-purple-500 text-purple-400 bg-slate-800/50' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          🎯 Smart Thresholds
        </button>
        <button 
          onClick={() => setActiveTab('presets')}
          className={`px-4 py-3 font-medium transition-all whitespace-nowrap ${
            activeTab === 'presets' 
              ? 'border-b-2 border-teal-500 text-teal-400 bg-slate-800/50' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ⚡ Presets
        </button>
        <button 
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-3 font-medium transition-all whitespace-nowrap ${
            activeTab === 'alerts' 
              ? 'border-b-2 border-yellow-500 text-yellow-400 bg-slate-800/50' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          🔔 Alerts
        </button>
        <button 
          onClick={() => setActiveTab('account')}
          className={`px-4 py-3 font-medium transition-all whitespace-nowrap ${
            activeTab === 'account' 
              ? 'border-b-2 border-blue-500 text-blue-400 bg-slate-800/50' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          ⚙️ Account
        </button>
      </div>

      {/* Smart Threshold Settings Tab */}
      {activeTab === 'thresholds' && (
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/70 rounded-2xl p-6 space-y-6 border border-slate-600/50 shadow-xl">
        {/* Header with icon, title, description, and quick stats badge */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Smart Threshold Settings
                {/* Auto-save status indicator */}
                {saveStatus === 'saving' && (
                  <span className="text-xs font-normal text-amber-400 flex items-center gap-1">
                    <Save className="w-3 h-3 animate-pulse" />
                    Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-xs font-normal text-green-400 flex items-center gap-1">
                    ✓ Saved
                  </span>
                )}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Fine-tune how thresholds are calculated based on sales velocity and card types
              </p>
            </div>
          </div>
          {/* Inventory count badge */}
          <div className="bg-slate-700/50 px-3 py-1.5 rounded-full border border-slate-600/50">
            <span className="text-xs text-slate-300">
              📦 <span className="font-semibold text-white">{inventory?.length || 0}</span> items in inventory
            </span>
          </div>
        </div>

        {/* Quick Preset Buttons */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-300">Quick Presets</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(QUICK_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleApplyQuickPreset(key)}
                className="px-3 py-2 bg-slate-700/50 hover:bg-slate-600/70 border border-slate-600/50 hover:border-purple-500/50 rounded-lg text-xs text-left transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/10 group"
                aria-label={`Apply ${preset.label} preset: ${preset.description}`}
              >
                <span className="block font-semibold text-white group-hover:text-purple-300 transition-colors">
                  {preset.label}
                </span>
                <span className="block text-slate-400 mt-0.5">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Slider Controls in Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Slider Card 1: Base Stock Level */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/30 hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-yellow-400" />
              <label className="text-sm font-medium text-white">Base Stock Level</label>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-yellow-400">{thresholdSettings.baseStock}</span>
              <span className="text-xs text-slate-500">2-50</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              value={thresholdSettings.baseStock}
              onChange={(e) => handleSliderChange('baseStock', parseInt(e.target.value))}
              className="threshold-slider threshold-slider-yellow w-full"
              aria-label="Base Stock Level"
            />
            <p className="text-xs text-slate-400 mt-2">
              Default threshold for cards with no sales history
            </p>
          </div>
          
          {/* Slider Card 2: Basic Land Multiplier */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/30 hover:border-green-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Mountain className="w-5 h-5 text-green-400" />
              <label className="text-sm font-medium text-white">Land Multiplier</label>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-green-400">{thresholdSettings.landMultiplier}x</span>
              <span className="text-xs text-slate-500">→ {thresholdSettings.baseStock * thresholdSettings.landMultiplier}</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              value={thresholdSettings.landMultiplier}
              onChange={(e) => handleSliderChange('landMultiplier', parseInt(e.target.value))}
              className="threshold-slider threshold-slider-green w-full"
              aria-label="Land Multiplier"
            />
            <p className="text-xs text-slate-400 mt-2">
              Plains, Island, Swamp, Mountain, Forest multiplier
            </p>
          </div>
          
          {/* Slider Card 3: Sales Buffer Weeks */}
          <div className="bg-slate-700/40 rounded-xl p-4 border border-slate-600/30 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <label className="text-sm font-medium text-white">Sales Buffer</label>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-blue-400">{thresholdSettings.velocityWeeks}</span>
              <span className="text-xs text-slate-500">weeks</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={thresholdSettings.velocityWeeks}
              onChange={(e) => handleSliderChange('velocityWeeks', parseInt(e.target.value))}
              className="threshold-slider threshold-slider-blue w-full"
              aria-label="Sales Buffer Weeks"
            />
            <p className="text-xs text-slate-400 mt-2">
              Weeks of buffer stock for selling cards
            </p>
          </div>
        </div>

        {/* Live Preview Section */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30">
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Live Preview - How Thresholds Will Be Calculated
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-700/50 rounded-lg p-3 border border-green-500/20">
              <p className="text-xs text-slate-400 mb-1">🏔️ Basic Land</p>
              <p className="text-lg font-bold text-green-400">
                {thresholdSettings.baseStock * thresholdSettings.landMultiplier}
              </p>
              <p className="text-xs text-slate-500">{thresholdSettings.baseStock} × {thresholdSettings.landMultiplier}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-blue-500/20">
              <p className="text-xs text-slate-400 mb-1">🏃 Fast Seller</p>
              <p className="text-lg font-bold text-blue-400">
                {5 * thresholdSettings.velocityWeeks}
              </p>
              <p className="text-xs text-slate-500">5/week × {thresholdSettings.velocityWeeks} weeks</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-purple-500/20">
              <p className="text-xs text-slate-400 mb-1">💰 Budget Card</p>
              <p className="text-lg font-bold text-purple-400">
                {Math.round(thresholdSettings.baseStock * 1.5)}
              </p>
              <p className="text-xs text-slate-500">Under $0.50: base × 1.5</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-amber-500/20">
              <p className="text-xs text-slate-400 mb-1">💎 Premium Card</p>
              <p className="text-lg font-bold text-amber-400">
                {Math.max(2, Math.round(thresholdSettings.baseStock * 0.3))}
              </p>
              <p className="text-xs text-slate-500">Over $10: base × 0.3</p>
            </div>
          </div>
        </div>

        {/* Summary Stats Before Apply */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">
            📊 What Will Be Updated
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-700/50 rounded-lg p-2">
              <p className="text-xl font-bold text-white">{summaryStats.total}</p>
              <p className="text-xs text-slate-400">Total Items</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-2">
              <p className="text-xl font-bold text-green-400">{summaryStats.basicLands}</p>
              <p className="text-xs text-slate-400">Basic Lands</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-2">
              <p className="text-xl font-bold text-blue-400">{summaryStats.velocityBased}</p>
              <p className="text-xs text-slate-400">Velocity-Based</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-2">
              <p className="text-xl font-bold text-purple-400">{summaryStats.priceBased}</p>
              <p className="text-xs text-slate-400">Price-Based</p>
            </div>
          </div>
        </div>

        {/* Expandable Card Preview */}
        <details className="bg-slate-800/50 rounded-xl border border-slate-600/30 overflow-hidden">
          <summary className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors flex items-center gap-2 text-sm font-semibold text-slate-300">
            <ChevronDown className="w-4 h-4" />
            Preview Individual Card Thresholds
          </summary>
          <div className="p-4 pt-0 max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-600/50">
                  <th className="text-left py-2 font-medium">Card Name</th>
                  <th className="text-center py-2 font-medium">Current</th>
                  <th className="text-center py-2 font-medium">New</th>
                  <th className="text-left py-2 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {inventory?.slice(0, 20).map(item => {
                  const suggestion = computedSmartSuggestions[item.id];
                  return (
                    <tr key={item.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                      <td className="py-2 text-slate-300 font-medium">{item.name}</td>
                      <td className="py-2 text-center text-slate-500">{item.low_inventory_threshold || 0}</td>
                      <td className="py-2 text-center text-yellow-400 font-semibold">{suggestion?.suggested || '-'}</td>
                      <td className="py-2 text-slate-400">{suggestion?.reason || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {inventory && inventory.length > 20 && (
              <p className="text-xs text-slate-500 text-center mt-3 py-2 border-t border-slate-600/30">
                ...and {inventory.length - 20} more items
              </p>
            )}
          </div>
        </details>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleApplySmartThresholds}
            disabled={saving?.applying}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
          >
            {saving?.applying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Applying... {applyProgress.current}/{applyProgress.total}
              </span>
            ) : (
              <span>🚀 Apply Smart Thresholds to All Inventory</span>
            )}
          </button>
          <button
            onClick={handleResetSliders}
            className="px-4 py-3 bg-slate-700/50 hover:bg-slate-600/70 border border-slate-600 hover:border-slate-500 text-slate-300 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Sliders
          </button>
        </div>
      </div>

      {/* Help Text Info Box */}
      <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-xl p-4 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-300 mb-1">How Threshold Calculation Works</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• <strong className="text-slate-300">Basic Lands</strong> use Base Stock × Land Multiplier for high-demand staples</li>
              <li>• <strong className="text-slate-300">Fast Sellers</strong> calculate threshold based on weekly sales velocity × buffer weeks</li>
              <li>• <strong className="text-slate-300">Budget Cards</strong> (under $0.50) get 1.5× base stock for bulk inventory</li>
              <li>• <strong className="text-slate-300">Premium Cards</strong> (over $10) use 0.3× base stock to minimize capital in expensive singles</li>
            </ul>
          </div>
        </div>
      </div>
      )}

      {/* Threshold Presets Tab */}
      {activeTab === 'presets' && (
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
      )}

      {/* Low Inventory Alerts Tab */}
      {activeTab === 'alerts' && (
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
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
      <div className="space-y-4">
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Account Settings</h2>
          <p className="text-slate-400 text-sm">Manage your account and preferences</p>
          <p className="text-slate-500 text-xs mt-2">More options coming soon...</p>
        </div>
      </div>
      )}
    </div>
  );
};
