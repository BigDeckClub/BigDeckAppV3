import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { usePriceCache } from '../context/PriceCacheContext';
import { useApi } from '../hooks/useApi';
import DecklistCardPrice from './DecklistCardPrice';

const API_BASE = '/api';

export const ContainersTab = ({
  containers,
  containerItems,
  decklists,
  inventory,
  onLoadContainers,
  onLoadInventory,
  onOpenSellModal,
  successMessage,
  setSuccessMessage,
}) => {
  const { getPrice } = usePriceCache();
  const { get, post, put, del } = useApi();

  const [containerName, setContainerName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [showContainerForm, setShowContainerForm] = useState(false);
  const locations = [...new Set(inventory.map(item => item.location).filter(Boolean))].sort();
  const [expandedContainers, setExpandedContainers] = useState({});
  const [containerPriceCache, setContainerPriceCache] = useState({});
  const [expandedCardCopies, setExpandedCardCopies] = useState({});

  const toggleContainerExpand = (containerId) => {
    setExpandedContainers((prev) => ({
      ...prev,
      [containerId]: !prev[containerId],
    }));
  };

  const addContainer = async () => {
    if (!containerName || !selectedLocation) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await post(`${API_BASE}/containers`, {
        name: containerName,
        location: selectedLocation,
      });
      setContainerName('');
      setSelectedLocation('');
      setShowContainerForm(false);
      await Promise.all([onLoadContainers(), onLoadInventory()]);
      setSuccessMessage('Container created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const deleteContainer = async (id) => {
    try {
      await del(`${API_BASE}/containers/${id}`);
      await onLoadContainers();
    } catch (error) {}
  };

  const calculateContainerTotalCost = (containerId) => {
    const items = containerItems[containerId] || [];
    if (!Array.isArray(items)) return 0;

    return items.reduce((total, item) => {
      const quantity = parseInt(item.quantity_used) || 0;
      const price = parseFloat(item.purchase_price) || 0;
      return total + quantity * price;
    }, 0);
  };

  const calculateContainerPrices = (containerId) => {
    return containerPriceCache[containerId] || { tcg: 0, ck: 0 };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {!showContainerForm ? (
        <button
          onClick={() => setShowContainerForm(true)}
          className="btn-primary w-full sm:w-auto px-4 sm:px-6 py-3 font-semibold"
        >
          <Plus className="w-5 h-5 inline mr-2" />
          New Container
        </button>
      ) : (
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Create Container</h2>
          <input
            type="text"
            placeholder="Container Name"
            value={containerName}
            onChange={(e) => setContainerName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white mb-4"
          />
          <select
            value={selectedLocation || ''}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white mb-4"
          >
            <option value="">Select a Location</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={addContainer} className="flex-1 btn-primary px-4 py-3 font-semibold">
              Create
            </button>
            <button
              onClick={() => setShowContainerForm(false)}
              className="flex-1 btn-secondary px-4 py-3 font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
          Containers ({containers.length})
        </h2>
        <div className="space-y-3">
          {containers.map((container) => {
            const containerPrices = calculateContainerPrices(container.id);
            const totalCost = calculateContainerTotalCost(container.id);
            return (
              <div key={container.id} className="bg-slate-800 border border-slate-600 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold">{container.name}</div>
                    <div className="text-sm text-teal-300">
                      📍 {container.location}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-2 text-slate-400">
                      <div className="text-orange-300 bg-slate-800 bg-opacity-50 p-2 rounded">
                        <div className="text-xs">Purchase Cost</div>
                        <div className="font-semibold">${totalCost.toFixed(2)}</div>
                      </div>
                      <div className="text-teal-300 bg-slate-800 bg-opacity-50 p-2 rounded">
                        <div className="text-xs">TCG Value</div>
                        <div className="font-semibold">${containerPrices.tcg.toFixed(2)}</div>
                      </div>
                      <div className="text-cyan-300 bg-slate-800 bg-opacity-50 p-2 rounded">
                        <div className="text-xs">CK Value</div>
                        <div className="font-semibold">${containerPrices.ck.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleContainerExpand(container.id)}
                      className="btn-primary px-4 py-2 font-semibold"
                    >
                      {expandedContainers[container.id] ? 'Hide' : 'View'} Contents
                    </button>
                    <button
                      onClick={() => onOpenSellModal(container.id)}
                      className="btn-primary px-4 py-2 font-semibold flex items-center gap-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      Sell
                    </button>
                    <button
                      onClick={() => deleteContainer(container.id)}
                      className="btn-danger px-3 py-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {expandedContainers[container.id] && (
                  <div className="mt-4 pt-4 border-t border-slate-700 hover:border-teal-500">
                    <h4 className="font-semibold mb-3">Cards in Container</h4>
                    {containerItems[container.id] !== undefined ? (
                      containerItems[container.id].length > 0 ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {(() => {
                            const expandedItems = [];
                            containerItems[container.id].forEach((item, itemIdx) => {
                              const quantity = parseInt(item.quantity_used) || 1;
                              for (let i = 0; i < quantity; i++) {
                                expandedItems.push({
                                  ...item,
                                  copyNumber: i + 1,
                                  originalIdx: itemIdx,
                                  uniqueKey: `${itemIdx}-${i}`,
                                });
                              }
                            });

                            const groupedByName = {};
                            expandedItems.forEach((item) => {
                              if (!groupedByName[item.name]) {
                                groupedByName[item.name] = [];
                              }
                              groupedByName[item.name].push(item);
                            });

                            return Object.entries(groupedByName).map(([cardName, cards]) => {
                              const isGroupExpanded =
                                expandedCardCopies[`${container.id}-group-${cardName}`];
                              const firstCard = cards[0];

                              return (
                                <div
                                  key={cardName}
                                  className="bg-slate-800 border border-slate-600 rounded"
                                >
                                  <button
                                    onClick={() =>
                                      setExpandedCardCopies((prev) => ({
                                        ...prev,
                                        [`${container.id}-group-${cardName}`]: !isGroupExpanded,
                                      }))
                                    }
                                    className="w-full p-3 text-sm flex justify-between items-center hover:bg-slate-700 transition"
                                  >
                                    <div className="text-left flex-1">
                                      <div className="font-semibold">{cardName}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-right text-xs">
                                        <div className="text-teal-300 font-semibold">
                                          {cards.length}x
                                        </div>
                                      </div>
                                      <div className="text-slate-400">
                                        {isGroupExpanded ? '▼' : '▶'}
                                      </div>
                                    </div>
                                  </button>

                                  {isGroupExpanded && (
                                    <div className="bg-slate-900 bg-opacity-50 border-t border-slate-600 p-3 space-y-2">
                                      {cards.map((item, copyIdx) => {
                                        const itemCost = parseFloat(item.purchase_price || 0);
                                        const inventoryItem = inventory.find(
                                          (inv) => inv.id === String(item.inventoryId)
                                        );

                                        return (
                                          <div
                                            key={copyIdx}
                                            className="bg-slate-800 p-3 rounded border border-slate-600 text-xs space-y-2"
                                          >
                                            <div className="font-semibold text-slate-200">
                                              {item.set_name} ({item.set})
                                            </div>
                                            {inventoryItem && (
                                              <div className="text-xs text-slate-500">
                                                From Inventory • Purchased{' '}
                                                {new Date(
                                                  inventoryItem.purchase_date
                                                ).toLocaleDateString()}
                                              </div>
                                            )}
                                            <div className="grid grid-cols-4 gap-2">
                                              <div className="bg-slate-700 p-2 rounded">
                                                <div className="text-slate-400 text-xs mb-1">
                                                  Purchase Price
                                                </div>
                                                <div className="text-teal-300 font-semibold">
                                                  ${itemCost.toFixed(2)}
                                                </div>
                                              </div>
                                              <div className="bg-slate-700 p-2 rounded">
                                                <div className="text-slate-400 text-xs mb-1">
                                                  TCG Player
                                                </div>
                                                <div className="text-teal-300 font-semibold text-sm">
                                                  <DecklistCardPrice
                                                    key={`price-${item.name}-${item.set}-tcg-${copyIdx}`}
                                                    name={item.name}
                                                    set={item.set}
                                                    priceType="tcg"
                                                  />
                                                </div>
                                              </div>
                                              <div className="bg-slate-700 p-2 rounded">
                                                <div className="text-slate-400 text-xs mb-1">
                                                  Card Kingdom
                                                </div>
                                                <div className="text-cyan-300 font-semibold text-sm">
                                                  <DecklistCardPrice
                                                    key={`price-${item.name}-${item.set}-ck-${copyIdx}`}
                                                    name={item.name}
                                                    set={item.set}
                                                    priceType="ck"
                                                  />
                                                </div>
                                              </div>
                                              <button
                                                onClick={async () => {
                                                  try {
                                                    const updatedCards = containerItems[
                                                      container.id
                                                    ]
                                                      .map((card, idx) => {
                                                        if (idx === item.originalIdx) {
                                                          const qty =
                                                            parseInt(card.quantity_used) || 1;
                                                          if (qty === 1) return null;
                                                          return {
                                                            ...card,
                                                            quantity_used: qty - 1,
                                                          };
                                                        }
                                                        return card;
                                                      })
                                                      .filter(Boolean);

                                                    await fetch(
                                                      `${API_BASE}/containers/${container.id}`,
                                                      {
                                                        method: 'PUT',
                                                        headers: {
                                                          'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify({
                                                          cards: JSON.stringify(updatedCards),
                                                        }),
                                                      }
                                                    );

                                                    const invItem = inventory.find(
                                                      (inv) =>
                                                        inv.id === String(item.inventoryId)
                                                    );
                                                    if (invItem) {
                                                      await fetch(
                                                        `${API_BASE}/inventory/${item.inventoryId}`,
                                                        {
                                                          method: 'PUT',
                                                          headers: {
                                                            'Content-Type': 'application/json',
                                                          },
                                                          body: JSON.stringify({
                                                            quantity: invItem.quantity + 1,
                                                            quantity_in_containers:
                                                              (invItem.quantity_in_containers ||
                                                                1) - 1,
                                                          }),
                                                        }
                                                      );
                                                    }

                                                    await Promise.all([
                                                      onLoadContainers(),
                                                      onLoadInventory(),
                                                    ]);
                                                  } catch (err) {
                                                    alert('Failed to remove card');
                                                  }
                                                }}
                                                className="btn-danger px-2 py-1 text-xs font-semibold h-fit"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">No cards in this container.</p>
                      )
                    ) : (
                      <p className="text-slate-400 text-sm">Loading container contents...</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {containers.length === 0 && <p className="text-slate-400">No containers yet.</p>}
      </div>
    </div>
  );
};

ContainersTab.propTypes = {
  containers: PropTypes.array.isRequired,
  containerItems: PropTypes.object.isRequired,
  decklists: PropTypes.array.isRequired,
  inventory: PropTypes.array.isRequired,
  onLoadContainers: PropTypes.func.isRequired,
  onLoadInventory: PropTypes.func.isRequired,
  onOpenSellModal: PropTypes.func.isRequired,
  successMessage: PropTypes.string,
  setSuccessMessage: PropTypes.func.isRequired,
};

export default ContainersTab;
