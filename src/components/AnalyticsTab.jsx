import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, ChevronDown } from 'lucide-react';

export const AnalyticsTab = ({
  inventory,
  containerItems,
  usageHistory,
  reorderSettings,
  totalPurchased60Days,
}) => {
  const [expandedAlerts, setExpandedAlerts] = useState({});

  const getReorderAlerts = () => {
    const grouped = {};
    inventory.forEach((item) => {
      const key = `${item.name}|${item.set}`;
      if (!grouped[key]) {
        grouped[key] = {
          name: item.name,
          reorder_type: item.reorder_type,
          set_code: item.set,
          set_name: item.set_name,
          quantity: 0,
          purchase_price: item.purchase_price,
          id: item.id,
          groupName: item.name,
        };
      }
      grouped[key].quantity += parseInt(item.quantity) || 0;
    });

    const withUsage = Object.values(grouped).map((item) => {
      const cardsInContainers =
        (containerItems &&
          Object.values(containerItems)
            .flat()
            .filter((ci) => ci.name === item.name && ci.set === item.set_code)
            .reduce((sum, ci) => sum + (ci.quantity_used || 0), 0)) ||
        0;

      return { ...item, cardsInContainers };
    });

    return withUsage.filter((item) => {
      const threshold = reorderSettings[item.reorder_type] || 5;
      return item.quantity <= threshold;
    });
  };

  const alerts = getReorderAlerts();

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-red-300" />
            Reorder Alerts
          </h2>
          {alerts.length > 0 && (
            <span className="bg-red-900 text-red-200 px-3 py-1 rounded-full text-sm font-semibold">
              {alerts.length} items
            </span>
          )}
        </div>
        {alerts.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
              {(() => {
                const groupedByName = {};
                alerts.forEach((alert) => {
                  if (!groupedByName[alert.name]) {
                    groupedByName[alert.name] = [];
                  }
                  groupedByName[alert.name].push(alert);
                });

                return Object.entries(groupedByName).map(([cardName, cardAlerts]) => {
                  const totalQty = cardAlerts.reduce((sum, a) => sum + a.quantity, 0);
                  const totalUsedSold = cardAlerts.reduce(
                    (sum, a) => sum + (a.cardsInContainers || 0),
                    0
                  );
                  const displayQty = totalQty + totalUsedSold;
                  const threshold = reorderSettings[cardAlerts[0].reorder_type] || 5;
                  const percentOfThreshold = (displayQty / threshold) * 100;
                  const severity =
                    percentOfThreshold < 25
                      ? 'critical'
                      : percentOfThreshold < 75
                        ? 'warning'
                        : 'low';
                  const severityColor =
                    severity === 'critical'
                      ? 'bg-red-950 border-red-500'
                      : severity === 'warning'
                        ? 'bg-orange-950 border-orange-500'
                        : 'bg-yellow-950 border-yellow-500';
                  const textColor =
                    severity === 'critical'
                      ? 'text-red-300'
                      : severity === 'warning'
                        ? 'text-orange-300'
                        : 'text-yellow-300';
                  const isExpanded = expandedAlerts[cardName];

                  return (
                    <div key={cardName}>
                      <button
                        onClick={() =>
                          setExpandedAlerts((prev) => ({
                            ...prev,
                            [cardName]: !prev[cardName],
                          }))
                        }
                        className={`${severityColor} border p-3 rounded flex justify-between items-center text-sm w-full hover:border-opacity-100 transition text-left`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{cardName}</div>
                          <div className="text-xs text-slate-400">
                            {cardAlerts.length === 1
                              ? cardAlerts[0].set_name
                              : `${cardAlerts.length} sets`}{' '}
                            • {cardAlerts[0].reorder_type}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <div className="text-right">
                            <div className={`font-bold text-lg ${textColor}`}>{displayQty}</div>
                            <div className="text-xs text-slate-400">of {threshold}</div>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="bg-slate-800 border border-slate-700 border-t-0 p-3 rounded-b space-y-2 text-xs">
                          {cardAlerts.map((setItem) => (
                            <div
                              key={`${setItem.name}|${setItem.set_code}`}
                              className="bg-slate-700 bg-opacity-40 p-2 rounded space-y-1"
                            >
                              <div className="flex justify-between">
                                <div>
                                  <div className="text-slate-200">{setItem.set_name}</div>
                                  <div className="text-slate-500">{setItem.set_code}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-teal-300 font-semibold">
                                    {setItem.quantity}x
                                  </div>
                                  <div className="text-slate-400">
                                    @${parseFloat(setItem.purchase_price || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="border-t border-slate-600 pt-2 mt-2 space-y-1">
                            <div className="flex justify-between text-slate-300">
                              <span>Used/Sold:</span>
                              <span className="text-orange-300 font-semibold">
                                {cardAlerts.reduce(
                                  (sum, a) => sum + (a.cardsInContainers || 0),
                                  0
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold text-slate-300">
                              <span>Approx Reorder Total:</span>
                              <span className="text-emerald-300">
                                $
                                {cardAlerts
                                  .reduce((sum, a) => {
                                    return (
                                      sum +
                                      (a.cardsInContainers || 0) *
                                        parseFloat(a.purchase_price || 0)
                                    );
                                  }, 0)
                                  .toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 bg-opacity-50 border border-slate-700 rounded p-4 text-center text-slate-400">
            ✓ No reorder alerts
          </div>
        )}
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Inventory Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-slate-400 text-xs sm:text-sm">Total Unique Cards</div>
            <div className="text-xl sm:text-2xl font-bold text-teal-300 mt-1">
              {inventory.filter((card) => (card.quantity || 0) > 0).length}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-slate-400 text-xs sm:text-sm">Total Quantity</div>
            <div className="text-xl sm:text-2xl font-bold text-teal-300 mt-1">
              {inventory.reduce((sum, card) => sum + (card.quantity || 0), 0)}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-slate-400 text-xs sm:text-sm">Total Value</div>
            <div className="text-xl sm:text-2xl font-bold text-teal-300 mt-1">
              $
              {inventory
                .reduce(
                  (sum, card) =>
                    sum + (parseFloat(card.purchase_price) || 0) * (card.quantity || 0),
                  0
                )
                .toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-slate-400 text-xs sm:text-sm">Purchased (60d)</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-300 mt-1">
              ${totalPurchased60Days.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Recent Activity</h2>
        <div className="grid gap-2">
          {usageHistory.length > 0 ? (
            usageHistory.map((entry, idx) => (
              <div
                key={idx}
                className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs sm:text-sm"
              >
                <div className="font-semibold text-teal-300">{entry.action}</div>
                <div className="text-slate-400 mt-1">
                  {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400">No activity yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

AnalyticsTab.propTypes = {
  inventory: PropTypes.array.isRequired,
  containerItems: PropTypes.object.isRequired,
  usageHistory: PropTypes.array.isRequired,
  reorderSettings: PropTypes.object.isRequired,
  totalPurchased60Days: PropTypes.number.isRequired,
};

export default AnalyticsTab;
