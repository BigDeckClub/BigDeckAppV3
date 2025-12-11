import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { THRESHOLD_PRESETS } from '../../constants/thresholds';

/**
 * PresetManager component - Threshold presets tab
 * Allows applying predefined thresholds to selected cards
 */
export const PresetManager = ({ 
  inventory = [], 
  onSuccess = null 
}) => {
  const { put } = useApi();
  const [presetMode, setPresetMode] = useState('single'); // 'single' or 'bulk'
  const [selectedCategory, setSelectedCategory] = useState('Staple Common');
  const [selectedCards, setSelectedCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedMerged, setExpandedMerged] = useState({});

  // Helper to get normalized set name
  const getSetName = useCallback((set) => {
    if (!set) return 'unknown';
    if (typeof set === 'string') return set.toLowerCase().trim();
    return (set.editioncode || set.editionname || 'unknown').toLowerCase().trim();
  }, []);

  // Group inventory with alerts enabled by card name and variant - MEMOIZED
  const cardsWithAlerts = useMemo(() => {
    const items = inventory.filter(item => item.low_inventory_alert);
    
    // Group by card name first
    const byName = items.reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = [];
      }
      acc[item.name].push(item);
      return acc;
    }, {});
    
    // For each card name, group by variant (set + foil + quality)
    Object.keys(byName).forEach(cardName => {
      const cardItems = byName[cardName];
      
      // Create a map of variant -> items
      const variantMap = {};
      cardItems.forEach(item => {
        const setName = getSetName(item.set);
        const foilStatus = item.foil ? 'foil' : 'nonfoil';
        const qualityValue = (item.quality || 'NM').toLowerCase().trim();
        const variantKey = `${setName}_${foilStatus}_${qualityValue}`;
        
        if (!variantMap[variantKey]) {
          variantMap[variantKey] = [];
        }
        variantMap[variantKey].push(item);
      });
      
      // Merge identical variants
      const variants = Object.values(variantMap);
      const mergedVariants = variants.map(variantItems => {
        if (variantItems.length > 1) {
          return {
            ...variantItems[0],
            _mergedCount: variantItems.length,
            _mergedIds: variantItems.map(i => i.id),
            _mergedItems: variantItems,
            _totalQuantity: variantItems.reduce((sum, i) => sum + (i.quantity || 0), 0)
          };
        }
        return variantItems[0];
      });
      
      byName[cardName] = mergedVariants;
    });
    
    return byName;
  }, [inventory, getSetName]);

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
    let cardsToUpdate = [];
    
    if (presetMode === 'single' && selectedCards.length > 0) {
      // Get selected cards and expand merged IDs
      selectedCards.forEach(id => {
        const card = cardLookup.get(id);
        if (card) {
          if (card._mergedIds && card._mergedIds.length > 1) {
            // If merged, update all merged items
            card._mergedIds.forEach(mergedId => {
              const mergedCard = cardLookup.get(mergedId);
              if (mergedCard) cardsToUpdate.push(mergedCard);
            });
          } else {
            cardsToUpdate.push(card);
          }
        }
      });
    } else {
      // Bulk mode - get all cards and expand merged entries
      flattenedCards.forEach(card => {
        if (card._mergedIds && card._mergedIds.length > 1) {
          // If merged, get all individual items
          card._mergedIds.forEach(mergedId => {
            const mergedCard = inventory.find(i => i.id === mergedId);
            if (mergedCard) cardsToUpdate.push(mergedCard);
          });
        } else {
          cardsToUpdate.push(card);
        }
      });
    }
    
    if (cardsToUpdate.length === 0) {
      setSuccessMessage('No cards selected');
      setTimeout(() => setSuccessMessage(''), 3000);
      return;
    }

    setSaving(true);
    const results = await Promise.allSettled(
      cardsToUpdate.map(item =>
        put(`/api/inventory/${item.id}`, {
          low_inventory_threshold: preset.threshold
        })
      )
    );
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    if (failed > 0) {
      setSuccessMessage(`Applied to ${successful} card(s), ${failed} failed`);
    } else {
      setSuccessMessage(`Applied ${selectedCategory} preset to ${successful} card(s)`);
    }
    setSelectedCards([]);
    if (onSuccess) onSuccess();
    setTimeout(() => setSuccessMessage(''), 3000);
    setSaving(false);
  }, [selectedCategory, presetMode, selectedCards, flattenedCards, cardLookup, put, onSuccess]);

  return (
    <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
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
          <label className="block text-sm font-semibold text-[var(--text-muted)] mb-2">Select Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-[var(--muted-surface)] border border-[var(--border)] rounded px-3 py-2 text-white focus:outline-none focus:border-teal-500"
          >
            {Object.entries(THRESHOLD_PRESETS).map(([cat, preset]) => (
              <option key={cat} value={cat}>
                {cat} (Threshold: {preset.threshold}) - {preset.description}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[var(--muted-surface)] rounded p-3 border border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)] font-semibold mb-1">Selected: {selectedCategory}</p>
          <p className="text-xs text-[var(--text-muted)]">{THRESHOLD_PRESETS[selectedCategory].description}</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            <strong>Threshold:</strong> {THRESHOLD_PRESETS[selectedCategory].threshold}
          </p>
        </div>

        {presetMode === 'single' && flattenedCards.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-2 bg-[var(--muted-surface)] rounded p-3 border border-[var(--border)]">
            {flattenedCards.map(item => (
              <div key={item.id}>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-600/50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedCards.includes(item.id)}
                    onChange={() => toggleCardSelection(item.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-[var(--text-muted)] flex-1">
                    {item.name} ({item.set?.toUpperCase()})
                    {item.foil && <span className="ml-2 text-xs text-purple-400">FOIL</span>}
                    {item.quality && item.quality !== 'NM' && <span className="ml-2 text-xs text-[var(--text-muted)]">{item.quality}</span>}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">Qty: {item._totalQuantity || item.quantity || 0}</span>
                  {item._mergedCount > 1 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setExpandedMerged(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      className="text-xs bg-teal-600/30 text-teal-300 px-2 py-0.5 rounded hover:bg-teal-600/50 transition-colors flex items-center gap-1"
                    >
                      {item._mergedCount}
                      {expandedMerged[item.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </label>
                {item._mergedCount > 1 && expandedMerged[item.id] && (
                  <div className="ml-6 mt-1 space-y-1 bg-[var(--muted-surface)] rounded p-2 border-l-2 border-teal-500/30">
                    {item._mergedItems.map((subItem, idx) => (
                      <div key={subItem.id} className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-1">
                        <span className="text-[var(--text-muted)]">#{idx + 1}</span>
                        <span>ID: {subItem.id}</span>
                        <span>Qty: {subItem.quantity || 0}</span>
                        <span>Threshold: {subItem.low_inventory_threshold || 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setPresetMode('single')}
            className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors ${
              presetMode === 'single'
                ? 'bg-teal-600 text-white'
                : 'bg-[var(--muted-surface)] text-[var(--text-muted)] hover:bg-slate-600'
            }`}
          >
            Apply to Selected
          </button>
          <button
            onClick={() => setPresetMode('bulk')}
            className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition-colors ${
              presetMode === 'bulk'
                ? 'bg-teal-600 text-white'
                : 'bg-[var(--muted-surface)] text-[var(--text-muted)] hover:bg-slate-600'
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

export default PresetManager;
