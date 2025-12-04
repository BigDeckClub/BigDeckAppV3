import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Settings, Package, Mountain, TrendingUp, RotateCcw, HelpCircle, ChevronDown, Save, Lightbulb, Coins, Gem, BarChart3, Rocket } from 'lucide-react';
import { useToast, TOAST_TYPES } from '../../context/ToastContext';
import { calculateSmartThreshold } from '../../utils/thresholdCalculator';
import { QUICK_PRESETS } from '../../constants/thresholds';
import { fetchWithAuth } from '../../utils/apiClient';

/**
 * ThresholdSettings component - Smart threshold settings tab
 * Includes slider controls, quick presets, live preview, and apply functionality
 */
export const ThresholdSettings = ({
  inventory,
  thresholdSettings,
  saveStatus,
  handleSliderChange,
  handleResetSliders,
  handleApplyQuickPreset,
  salesHistory
}) => {
  const { showToast } = useToast();
  
  // Progress tracking for bulk apply
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });
  const [applying, setApplying] = useState(false);

  // Calculate smart suggestions with useMemo to prevent infinite re-render loops
  // Only calculate for first 20 items for preview, unless applying to all
  const computedSmartSuggestions = useMemo(() => {
    if (!inventory || inventory.length === 0) return {};
    const itemsToCalculate = applying ? inventory : inventory.slice(0, 20);
    const suggestions = {};
    itemsToCalculate.forEach(card => {
      const calc = calculateSmartThreshold(card, salesHistory, thresholdSettings);
      suggestions[card.id] = calc;
    });
    return suggestions;
  }, [inventory, salesHistory, thresholdSettings, applying]);

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

  // Apply Smart Thresholds to ALL Inventory
  const handleApplySmartThresholds = useCallback(async () => {
    if (!inventory || inventory.length === 0) {
      showToast('No inventory loaded. Please wait for inventory to load first.', TOAST_TYPES.WARNING);
      return;
    }
    
    setApplying(true);
    setApplyProgress({ current: 0, total: inventory.length });
    
    try {
      // Fetch sales history for velocity calculations
      let currentSalesHistory = salesHistory;
      if (!currentSalesHistory || currentSalesHistory.length === 0) {
        try {
          const salesResponse = await fetchWithAuth('/api/sales');
          if (salesResponse.ok) {
            currentSalesHistory = await salesResponse.json();
          }
        } catch (err) {
          console.warn('[Settings] Could not fetch sales history, using base calculations');
          currentSalesHistory = [];
        }
      }
      
      // Calculate thresholds for all items
      const updates = [];
      
      for (let i = 0; i < inventory.length; i++) {
        const item = inventory[i];
        
        try {
          const result = calculateSmartThreshold(item, currentSalesHistory, thresholdSettings);
          
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
          console.error('[Settings] Calculation error for item', item.name, ':', calcErr.message);
        }
      }
      
      setApplyProgress({ current: inventory.length, total: inventory.length });
      
      // Send bulk update to backend
      const response = await fetchWithAuth('/api/inventory/bulk-threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      
      if (!response.ok) {
        throw new Error(`Bulk update failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.errors > 0) {
        showToast(`Updated ${result.updated} items! ${result.errors} errors occurred.`, TOAST_TYPES.WARNING);
      } else {
        showToast(`Successfully updated all ${result.updated} items with smart thresholds!`, TOAST_TYPES.SUCCESS);
      }
      
    } catch (error) {
      console.error('[Settings] Error applying thresholds:', error.message);
      showToast(`Error: ${error.message}`, TOAST_TYPES.ERROR);
    } finally {
      setApplying(false);
      setApplyProgress({ current: 0, total: 0 });
    }
  }, [inventory, salesHistory, thresholdSettings, showToast]);

  return (
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
          <span className="text-xs text-slate-300 flex items-center gap-1">
            <Package className="w-3 h-3" />
            <span className="font-semibold text-white">{inventory?.length || 0}</span> items in inventory
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
              onClick={() => handleApplyQuickPreset(preset)}
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
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Mountain className="w-3 h-3" />
              Basic Land
            </p>
            <p className="text-lg font-bold text-green-400">
              {thresholdSettings.baseStock * thresholdSettings.landMultiplier}
            </p>
            <p className="text-xs text-slate-500">{thresholdSettings.baseStock} × {thresholdSettings.landMultiplier}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 border border-blue-500/20">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Fast Seller
            </p>
            <p className="text-lg font-bold text-blue-400">
              {5 * thresholdSettings.velocityWeeks}
            </p>
            <p className="text-xs text-slate-500">5/week × {thresholdSettings.velocityWeeks} weeks</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 border border-purple-500/20">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Coins className="w-3 h-3" />
              Budget Card
            </p>
            <p className="text-lg font-bold text-purple-400">
              {Math.round(thresholdSettings.baseStock * 1.5)}
            </p>
            <p className="text-xs text-slate-500">Under $0.50: base × 1.5</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 border border-amber-500/20">
            <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <Gem className="w-3 h-3" />
              Premium Card
            </p>
            <p className="text-lg font-bold text-amber-400">
              {Math.max(2, Math.round(thresholdSettings.baseStock * 0.3))}
            </p>
            <p className="text-xs text-slate-500">Over $10: base × 0.3</p>
          </div>
        </div>
      </div>

      {/* Summary Stats Before Apply */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30">
        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          What Will Be Updated
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
          disabled={applying}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
        >
          {applying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Applying... {applyProgress.current}/{applyProgress.total}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Rocket className="w-4 h-4" />
              Apply Smart Thresholds to All Inventory
            </span>
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
    </div>
  );
};

ThresholdSettings.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.object),
  thresholdSettings: PropTypes.shape({
    baseStock: PropTypes.number.isRequired,
    landMultiplier: PropTypes.number.isRequired,
    velocityWeeks: PropTypes.number.isRequired
  }).isRequired,
  saveStatus: PropTypes.string,
  handleSliderChange: PropTypes.func.isRequired,
  handleResetSliders: PropTypes.func.isRequired,
  handleApplyQuickPreset: PropTypes.func.isRequired,
  salesHistory: PropTypes.array
};

ThresholdSettings.defaultProps = {
  inventory: [],
  saveStatus: '',
  salesHistory: []
};

export default ThresholdSettings;
