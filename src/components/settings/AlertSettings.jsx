import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Bell, ChevronDown, ChevronUp } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

/**
 * AlertSettings component - Low inventory alerts tab
 * Displays and manages cards with alerts enabled
 */
export const AlertSettings = ({ inventory = [] }) => {
  const { put, get } = useApi();
  const [saving, setSaving] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [deckCardsOnly, setDeckCardsOnly] = useState(false);
  const [deckCardNames, setDeckCardNames] = useState(new Set());
  const [loadingDeckCards, setLoadingDeckCards] = useState(false);
  const [thresholdValues, setThresholdValues] = useState({});
  const [expandedMerged, setExpandedMerged] = useState({});
  const hasFetchedDeckCards = useRef(false);

  // Helper to get normalized set name
  const getSetName = useCallback((set) => {
    if (!set) return 'unknown';
    if (typeof set === 'string') return set.toLowerCase().trim();
    return (set.editioncode || set.editionname || 'unknown').toLowerCase().trim();
  }, []);

  // Fetch deck template card names when filter is enabled
  useEffect(() => {
    if (deckCardsOnly && !hasFetchedDeckCards.current) {
      hasFetchedDeckCards.current = true;
      const fetchDeckCardNames = async () => {
        setLoadingDeckCards(true);
        try {
          const response = await get('/inventory/alerts/deck-card-names');
          if (response?.cardNames) {
            setDeckCardNames(new Set(response.cardNames));
          }
        } catch (error) {
          console.error('Error fetching deck card names:', error);
          // Reset flag on error so user can retry
          hasFetchedDeckCards.current = false;
        } finally {
          setLoadingDeckCards(false);
        }
      };
      fetchDeckCardNames();
    }
  }, [deckCardsOnly, get]);

  // Group inventory with alerts enabled by card name and variant - MEMOIZED to prevent recreating on every render
  const cardsWithAlerts = useMemo(() => {
    let items = inventory.filter(item => item.low_inventory_alert);
    
    // Filter by deck cards if toggle is enabled
    if (deckCardsOnly && deckCardNames.size > 0) {
      items = items.filter(item => 
        item.name && deckCardNames.has(item.name.toLowerCase().trim())
      );
    }
    
    // Group by card name first
    const byName = items.reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = [];
      }
      acc[item.name].push(item);
      return acc;
    }, {});
    
    // For each card name, group by variant (set + foil + quality)
    // If all items have the same variant, merge them
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
      
      // If there's only one variant with multiple items, keep only the first one
      // (they're identical, so we just show one entry)
      const variants = Object.values(variantMap);
      if (variants.length === 1 && variants[0].length > 1) {
        // Keep only the first item but mark it as merged
        byName[cardName] = [{
          ...variants[0][0],
          _mergedCount: variants[0].length,
          _mergedIds: variants[0].map(i => i.id),
          _mergedItems: variants[0], // Keep all items for dropdown
          _totalQuantity: variants[0].reduce((sum, i) => sum + (i.quantity || 0), 0)
        }];
      }
      // Otherwise keep all items as-is (they have distinguishing features)
    });
    
    return byName;
  }, [inventory, deckCardsOnly, deckCardNames, getSetName]);

  // Calculate counts for display
  const totalAlertsCount = useMemo(() => {
    const uniqueNames = new Set();
    inventory.forEach(item => {
      if (item.low_inventory_alert) {
        uniqueNames.add(item.name);
      }
    });
    return uniqueNames.size;
  }, [inventory]);

  const filteredCount = Object.keys(cardsWithAlerts).length;

  const handleThresholdChange = useCallback(async (itemId, newThreshold) => {
    setSaving(prev => ({ ...prev, [itemId]: true }));
    try {
      await put(`/inventory/${itemId}`, {
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
  }, [put]);

  const handleThresholdInputChange = useCallback((itemId, value) => {
    setThresholdValues(prev => ({ ...prev, [itemId]: value }));
  }, []);

  const handleToggleAlert = useCallback(async (itemId, currentAlert) => {
    setSaving(prev => ({ ...prev, [itemId]: true }));
    try {
      await put(`/inventory/${itemId}`, {
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
  }, [put]);

  return (
    <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-bold text-slate-100">Low Inventory Alerts</h2>
      </div>

      {/* Success/Error Message */}
      {successMessage && (
        <div className="bg-green-600/20 border border-green-600 rounded-lg p-3 text-green-300 text-sm mb-4">
          {successMessage}
        </div>
      )}

      {/* Filter Toggle - only show when alerts exist */}
      {totalAlertsCount > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-[var(--muted-surface)] rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deckCardsOnly"
              checked={deckCardsOnly}
              onChange={(e) => setDeckCardsOnly(e.target.checked)}
              disabled={loadingDeckCards}
              className="rounded border-slate-500 bg-slate-600 text-teal-500 focus:ring-teal-500"
            />
            <label htmlFor="deckCardsOnly" className="text-sm text-[var(--text-muted)]">
              Show only cards in deck templates
            </label>
            {loadingDeckCards && (
              <span className="text-xs text-[var(--text-muted)] ml-2">Loading...</span>
            )}
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {deckCardsOnly ? `${filteredCount} of ${totalAlertsCount} cards` : `${totalAlertsCount} cards`}
          </span>
        </div>
      )}

      {Object.keys(cardsWithAlerts).length === 0 ? (
        <div className="text-center py-8">
          {deckCardsOnly && totalAlertsCount > 0 ? (
            <>
              <p className="text-[var(--text-muted)]">No alerts match cards in your deck templates</p>
              <p className="text-[var(--text-muted)] text-sm mt-2">Try turning off the deck filter or add cards from your deck templates to alerts</p>
            </>
          ) : (
            <>
              <p className="text-[var(--text-muted)]">No low inventory alerts enabled yet</p>
              <p className="text-[var(--text-muted)] text-sm mt-2">Go to Inventory tab and click the bell icon to enable alerts for specific cards</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(cardsWithAlerts).map(([cardName, items]) => (
            <div key={cardName} className="bg-[var(--muted-surface)] rounded-lg p-4 border border-[var(--border)]">
              <h3 className="font-semibold text-slate-100 mb-3">{cardName}</h3>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id}>
                    <div className="flex items-center gap-3 bg-slate-600/50 p-3 rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[var(--text-muted)]">
                            {item.set ? `${item.set.toUpperCase()}` : 'Unknown Set'}
                          </span>
                          {item.foil && (
                            <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded">
                              FOIL
                            </span>
                          )}
                          {item.quality && item.quality !== 'NM' && (
                            <span className="text-xs bg-[var(--muted-surface)] text-[var(--text-muted)] px-2 py-0.5 rounded">
                              {item.quality}
                            </span>
                          )}
                          <span className="text-xs text-[var(--text-muted)]">
                            Qty: {item._totalQuantity || item.quantity || 0}
                          </span>
                          {item._mergedCount > 1 && (
                            <button
                              onClick={() => setExpandedMerged(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className="text-xs bg-teal-600/30 text-teal-300 px-2 py-0.5 rounded hover:bg-teal-600/50 transition-colors flex items-center gap-1"
                            >
                              {item._mergedCount} entries
                              {expandedMerged[item.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-[var(--text-muted)]">Threshold:</label>
                        <input
                          type="number"
                          min="0"
                          value={thresholdValues[item.id] ?? item.low_inventory_threshold ?? 0}
                          onChange={(e) => handleThresholdInputChange(item.id, e.target.value)}
                          onBlur={(e) => {
                            // If this is a merged entry, update all merged items
                            if (item._mergedIds && item._mergedIds.length > 1) {
                              item._mergedIds.forEach(id => handleThresholdChange(id, e.target.value));
                            } else {
                              handleThresholdChange(item.id, e.target.value);
                            }
                          }}
                          disabled={saving[item.id]}
                          className="w-16 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-teal-500"
                        />
                      </div>
                      <button
                        onClick={() => {
                          // If this is a merged entry, toggle all merged items
                          if (item._mergedIds && item._mergedIds.length > 1) {
                            item._mergedIds.forEach(id => handleToggleAlert(id, item.low_inventory_alert));
                          } else {
                            handleToggleAlert(item.id, item.low_inventory_alert);
                          }
                        }}
                        disabled={saving[item.id]}
                        className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded text-sm transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                    
                    {/* Expanded dropdown showing individual entries */}
                    {item._mergedCount > 1 && expandedMerged[item.id] && (
                      <div className="ml-6 mt-2 space-y-1 bg-[var(--muted-surface)] rounded p-2 border-l-2 border-teal-500/30">
                        {item._mergedItems.map((subItem, idx) => (
                          <div key={subItem.id} className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-1">
                            <span className="text-[var(--text-muted)]">#{idx + 1}</span>
                            <span>ID: {subItem.id}</span>
                            <span>Qty: {subItem.quantity || 0}</span>
                            <span>Threshold: {subItem.low_inventory_threshold || 0}</span>
                            {subItem.purchase_date && (
                              <span>Added: {new Date(subItem.purchase_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Info */}
      <div className="bg-[var(--muted-surface)] rounded-lg border border-[var(--border)] p-4 mt-6">
        <h3 className="font-semibold text-slate-100 mb-2">How to Use Low Inventory Alerts</h3>
        <ul className="text-sm text-[var(--text-muted)] space-y-2 list-disc list-inside">
          <li>Go to the <strong>Inventory</strong> tab and click the bell icon on any card SKU</li>
          <li>Set a quantity threshold (e.g., 2, 5, 10) for when you want to be alerted</li>
          <li>Alerts can be customized per card type to track deck staples differently than bulk inventory</li>
          <li>Manage all your alerts here in the Settings tab</li>
        </ul>
      </div>
    </div>
  );
};

AlertSettings.propTypes = {
  inventory: PropTypes.arrayOf(PropTypes.object)
};

export default AlertSettings;
