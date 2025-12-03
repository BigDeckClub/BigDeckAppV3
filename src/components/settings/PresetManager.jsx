import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Zap } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { THRESHOLD_PRESETS } from '../../constants/thresholds';

/**
 * PresetManager component - Threshold presets tab
 * Allows applying predefined thresholds to selected cards
 */
export const PresetManager = ({ 
  inventory, 
  onSuccess 
}) => {
  const { put } = useApi();
  const [presetMode, setPresetMode] = useState('single'); // 'single' or 'bulk'
  const [selectedCategory, setSelectedCategory] = useState('Staple Common');
  const [selectedCards, setSelectedCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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

  // Create a flattened array and lookup map for efficient card access
  const { flattenedCards, cardLookup } = useMemo(() => {
    const flattened = Object.values(cardsWithAlerts).flat();
    const lookup = new Map(flattened.map(item => [item.id, item]));
    return { flattenedCards: flattened, cardLookup: lookup };
  }, [cardsWithAlerts]);

  const toggleCardSelection = useCallback((itemId) => {
    setSelectedCards(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const handleApplyPreset = useCallback(async () => {
    const preset = THRESHOLD_PRESETS[selectedCategory];
    const cardsToUpdate = presetMode === 'single' && selectedCards.length > 0 
      ? selectedCards.map(id => cardLookup.get(id)).filter(Boolean)
      : flattenedCards;
    
    if (cardsToUpdate.length === 0) {
      setSuccessMessage('No cards selected');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setSaving(true);
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
      if (onSuccess) onSuccess();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error applying preset:', error);
      setSuccessMessage('Error applying preset');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  }, [selectedCategory, presetMode, selectedCards, flattenedCards, cardLookup, put, onSuccess]);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-6 h-6 text-teal-400" />
        <h2 className="text-xl font-bold text-slate-100">Threshold Presets</h2>
      </div>
      
      {/* Success/Error Message */}
      {successMessage && (
        <div className="bg-green-600/20 border border-green-600 rounded-lg p-3 text-green-300 text-sm mb-4">
          {successMessage}
        </div>
      )}
      
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

        {presetMode === 'single' && flattenedCards.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-2 bg-slate-700/30 rounded p-3 border border-slate-600">
            {flattenedCards.map(item => (
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
          disabled={saving || (presetMode === 'single' && selectedCards.length === 0)}
          className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Applying...' : `Apply ${selectedCategory} Preset`}
        </button>
      </div>
    </div>
  );
};

PresetManager.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.object),
  onSuccess: PropTypes.func
};

PresetManager.defaultProps = {
  inventory: [],
  onSuccess: null
};

export default PresetManager;
