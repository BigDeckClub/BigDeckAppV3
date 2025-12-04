import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Bell } from 'lucide-react';
import { useApi } from '../../hooks/useApi';

/**
 * AlertSettings component - Low inventory alerts tab
 * Displays and manages cards with alerts enabled
 */
export const AlertSettings = ({ inventory }) => {
  const { put, get } = useApi();
  const [saving, setSaving] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [deckCardsOnly, setDeckCardsOnly] = useState(false);
  const [deckCardNames, setDeckCardNames] = useState(new Set());
  const [loadingDeckCards, setLoadingDeckCards] = useState(false);
  const hasFetchedDeckCards = useRef(false);

  // Fetch deck template card names when filter is enabled
  useEffect(() => {
    if (deckCardsOnly && !hasFetchedDeckCards.current) {
      hasFetchedDeckCards.current = true;
      const fetchDeckCardNames = async () => {
        setLoadingDeckCards(true);
        try {
          const response = await get('/api/inventory/alerts/deck-card-names');
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

  // Group inventory with alerts enabled by card name - MEMOIZED to prevent recreating on every render
  const cardsWithAlerts = useMemo(() => {
    let items = inventory.filter(item => item.low_inventory_alert);
    
    // Filter by deck cards if toggle is enabled
    if (deckCardsOnly && deckCardNames.size > 0) {
      items = items.filter(item => 
        deckCardNames.has(item.name?.toLowerCase().trim())
      );
    }
    
    return items.reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = [];
      }
      acc[item.name].push(item);
      return acc;
    }, {});
  }, [inventory, deckCardsOnly, deckCardNames]);

  // Calculate counts for display
  const totalAlertsCount = useMemo(() => {
    return Object.keys(
      inventory
        .filter(item => item.low_inventory_alert)
        .reduce((acc, item) => {
          acc[item.name] = true;
          return acc;
        }, {})
    ).length;
  }, [inventory]);

  const filteredCount = Object.keys(cardsWithAlerts).length;

  const handleThresholdChange = useCallback(async (itemId, newThreshold) => {
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
  }, [put]);

  const handleToggleAlert = useCallback(async (itemId, currentAlert) => {
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
  }, [put]);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
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

      {/* Filter Toggle */}
      {totalAlertsCount > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="deckCardsOnly"
              checked={deckCardsOnly}
              onChange={(e) => setDeckCardsOnly(e.target.checked)}
              disabled={loadingDeckCards}
              className="rounded border-slate-500 bg-slate-600 text-teal-500 focus:ring-teal-500"
            />
            <label htmlFor="deckCardsOnly" className="text-sm text-slate-300">
              Show only cards in deck templates
            </label>
            {loadingDeckCards && (
              <span className="text-xs text-slate-400 ml-2">Loading...</span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {deckCardsOnly ? `${filteredCount} of ${totalAlertsCount} cards` : `${totalAlertsCount} cards`}
          </span>
        </div>
      )}

      {Object.keys(cardsWithAlerts).length === 0 ? (
        <div className="text-center py-8">
          {deckCardsOnly && totalAlertsCount > 0 ? (
            <>
              <p className="text-slate-400">No alerts match cards in your deck templates</p>
              <p className="text-slate-500 text-sm mt-2">Try turning off the deck filter or add cards from your decks to alerts</p>
            </>
          ) : (
            <>
              <p className="text-slate-400">No low inventory alerts enabled yet</p>
              <p className="text-slate-500 text-sm mt-2">Go to Inventory tab and click the bell icon to enable alerts for specific cards</p>
            </>
          )}
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
                        onBlur={(e) => handleThresholdChange(item.id, e.target.value)}
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
      <div className="bg-slate-700/50 rounded-lg border border-slate-600 p-4 mt-6">
        <h3 className="font-semibold text-slate-100 mb-2">How to Use Low Inventory Alerts</h3>
        <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
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

AlertSettings.defaultProps = {
  inventory: []
};

export default AlertSettings;
