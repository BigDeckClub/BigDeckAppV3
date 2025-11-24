                                        <div className="bg-purple-900 bg-opacity-50 border border-purple-400 rounded px-2 py-1 text-xs">
                                          <div className="text-gray-400">Avg Cost</div>
                                          <div className="font-bold text-green-300">${avgPrice.toFixed(2)}</div>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => startEditingItem(item)}
                                          className="bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs font-semibold"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => deleteInventoryItem(item.id)}
                                          className="bg-red-600 hover:bg-red-700 rounded px-2 py-1"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {inventory.length === 0 && <p className="text-gray-400">No cards in inventory yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Decklists Tab */}
        {activeTab === 'decklists' && !isLoading && (
          <div className="space-y-6">
            {!showDecklistForm ? (
              <button
                onClick={() => setShowDecklistForm(true)}
                className="bg-purple-600 hover:bg-purple-700 rounded px-6 py-3 font-semibold transition"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Decklist
              </button>
            ) : (
              <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
                <h2 className="text-xl font-bold mb-4">Create Decklist</h2>
                <input
                  type="text"
                  placeholder="Decklist Name"
                  value={decklistName}
                  onChange={(e) => setDecklistName(e.target.value)}
                  className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white mb-4"
                />
                <textarea
                  placeholder="Paste decklist here (e.g., '2 Lightning Bolt')"
                  value={decklistPaste}
                  onChange={(e) => setDecklistPaste(e.target.value)}
                  className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white mb-4 h-48"
                />
                <div className="flex gap-2">
                  <button
                    onClick={parseAndPreviewDecklist}
                    disabled={deckPreviewLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded px-4 py-2 font-semibold"
                  >
                    {deckPreviewLoading ? 'Checking...' : 'Check Inventory'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDecklistForm(false);
                      setDeckPreview(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                {deckPreview && (
                  <div className="mt-6 border-t border-purple-500 pt-4">
                    <h3 className="font-semibold mb-3">Decklist Preview</h3>
                    <div className="bg-black bg-opacity-50 rounded p-4 max-h-96 overflow-y-auto space-y-2">
                      {deckPreview.map((card, idx) => (
                        <div key={idx} className={`p-2 rounded border-l-4 flex justify-between items-center ${card.found ? 'border-green-500 bg-green-900 bg-opacity-20' : 'border-red-500 bg-red-900 bg-opacity-20'}`}>
                          <span className="text-sm font-semibold">{card.quantity}x {card.cardName}</span>
                          <span className="text-xs">{card.found ? '✓ Found' : card.error || '✗ Not found'}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={confirmAndAddDecklist}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold"
                    >
                      Confirm & Create Decklist
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Decklists ({decklists.length})</h2>
              <div className="grid gap-4">
                {decklists.map((deck) => {
                  const prices = decklistPrices[deck.id] || { tcg: 0, ck: 0 };
                  const isExpanded = expandedDecklists[deck.id];
                  const deckCards = deck.decklist.split('\n').filter(line => line.trim()).flatMap(line => {
                    const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
                    if (!match) return [];
                    const quantity = parseInt(match[1]);
                    const name = match[2].trim();
                    const setCode = match[3] || null;
                    return Array.from({ length: quantity }, () => ({ name, setCode }));
                  }).filter(Boolean);
                  
                  return (
                    <div key={deck.id} className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold">{deck.name}</div>
                          <div className="text-sm text-gray-300 mt-2">{deckCards.length} cards</div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setExpandedDecklists(prev => ({...prev, [deck.id]: !prev[deck.id]}))}
                            className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold"
                          >
                            {isExpanded ? 'Hide' : 'View'} Cards
                          </button>
                          <button
                            onClick={() => deleteDecklist(deck.id)}
                            className="bg-red-600 hover:bg-red-700 rounded px-3 py-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-purple-500 pt-2 mt-2">
                        <div className="text-purple-300">TCG: ${prices.tcg.toFixed(2)}</div>
                        <div className="text-blue-300">CK: ${prices.ck.toFixed(2)}</div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 border-t border-purple-500 pt-4">
                          <div className="space-y-3">
                            {deckCards.map((card, idx) => {
                              // Use set from decklist, fallback to inventory, then default
                              let cardSet = card.setCode;
                              if (!cardSet) {
                                const inventoryCard = inventory.find(inv => inv.name.toLowerCase() === card.name.toLowerCase());
                                cardSet = inventoryCard?.set || defaultSearchSet || 'UNK';
                              }
                              const isEditingThisCard = editingDecklistCard?.idx === idx && editingDecklistCard?.deckId === deck.id;
                              
                              return (
                                <div key={idx} className="bg-purple-900 bg-opacity-30 rounded p-3">
                                  {isEditingThisCard ? (
                                    <div className="space-y-2">
                                      <select
                                        value={editCardSet}
                                        onChange={(e) => setEditCardSet(e.target.value)}
                                        className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-3 py-2 text-white text-xs"
                                      >
                                        <option value="">Select a set...</option>
                                        {editCardAvailableSets.map((set) => (
                                          <option key={set.code} value={set.code}>
                                            {set.code.toUpperCase()} - {set.name}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            if (!editCardSet) {
                                              alert('Please select a set');
                                              return;
                                            }
                                            
                                            // Get the original lines (with quantities)
                                            const lines = deck.decklist.split('\n').filter(line => line.trim());
                                            
                                            // Find the line with this card and update its set code
                                            let found = false;
                                            let cardInstanceCount = 0;
                                            const newLines = lines.map(line => {
                                              const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
                                              if (match) {
                                                const qty = match[1];
                                                const cardNamePart = match[2].trim();
                                                const existingSet = match[3];
                                                
                                                if (cardNamePart.toLowerCase() === card.name.toLowerCase()) {
                                                  // This is the card we're looking for
                                                  // Check if this is the instance we want to edit (idx is the individual card position)
                                                  if (cardInstanceCount + parseInt(qty) > idx && cardInstanceCount <= idx) {
                                                    found = true;
                                                    // Replace the entire line with updated set code
                                                    return `${qty} ${cardNamePart} (${editCardSet.toUpperCase()})`;
                                                  }
                                                  cardInstanceCount += parseInt(qty);
                                                }
                                              }
                                              return line;
                                            });
                                            
                                            if (found) {
                                              const newDecklistText = newLines.join('\n');
                                              
                                              fetch(`${API_BASE}/decklists/${deck.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ decklist: newDecklistText })
                                              }).then(() => {
                                                // Track last used set
                                                setLastUsedSets(prev => ({...prev, [card.name.toLowerCase()]: editCardSet}));
                                                loadDecklists();
                                                setEditingDecklistCard(null);
                                              }).catch(err => {

                                                alert('Failed to update decklist');
                                              });
                                            } else {
                                              alert('Could not find card in decklist');
                                            }
                                          }}
                                          className="flex-1 bg-green-600 hover:bg-green-700 rounded px-2 py-1 text-xs font-semibold"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingDecklistCard(null)}
                                          className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-2 py-1 text-xs font-semibold"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                          <div className="font-semibold">{card.name}</div>
                                          <div className="text-xs text-gray-400">{cardSet.toUpperCase()}</div>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            const lastSet = lastUsedSets[card.name.toLowerCase()];
                                            setEditingDecklistCard({ idx, deckId: deck.id });
                                            setEditCardSet(lastSet || cardSet);
                                            
                                            // Fetch available sets for this card
                                            try {
                                              const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(card.name)}"&unique=prints&order=released`);
                                              if (response.ok) {
                                                const data = await response.json();
                                                const sets = data.data?.map(card => ({
                                                  code: card.set.toUpperCase(),
                                                  name: card.set_name
                                                })) || [];
                                                // Remove duplicates, sort with last used first
                                                const uniqueSets = Array.from(new Map(sets.map(s => [s.code, s])).values());
                                                if (lastSet) {
                                                  uniqueSets.sort((a, b) => {
                                                    if (a.code === lastSet) return -1;
                                                    if (b.code === lastSet) return 1;
                                                    return 0;
                                                  });
                                                }
                                                setEditCardAvailableSets(uniqueSets);
                                              }
                                            } catch (error) {

                                              setEditCardAvailableSets([]);
                                            }
                                          }}
                                          className="bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs ml-2"
                                        >
                                          Edit Set
                                        </button>
                                      </div>
                                      <DecklistCardPrice cardName={card.name} setCode={cardSet} />
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {decklists.length === 0 && <p className="text-gray-400">No decklists yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Containers Tab */}
        {activeTab === 'containers' && !isLoading && (
          <div className="space-y-6">
            {!showContainerForm ? (
              <button
                onClick={() => setShowContainerForm(true)}
                className="bg-purple-600 hover:bg-purple-700 rounded px-6 py-3 font-semibold transition"
              >
                <Plus className="w-5 h-5 inline mr-2" />
                New Container
              </button>
            ) : (
              <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
                <h2 className="text-xl font-bold mb-4">Create Container</h2>
                <input
                  type="text"
                  placeholder="Container Name"
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white mb-4"
                />
                <select
                  value={selectedDecklist || ''}
                  onChange={(e) => setSelectedDecklist(e.target.value)}
                  className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white mb-4"
                >
                  <option value="">Select a Decklist</option>
                  {decklists.map((deck) => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={addContainer}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 rounded px-4 py-2 font-semibold"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowContainerForm(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Containers ({containers.length})</h2>
              <div className="space-y-3">
                {containers.map((container) => {
                  const containerPrices = calculateContainerPrices(container.id);
                  return (
                    <div key={container.id} className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold">{container.name}</div>
                          <div className="text-sm text-gray-300">Decklist ID: {container.decklist_id}</div>
                          <div className="grid grid-cols-2 gap-2 text-xs mt-2 text-gray-400">
                            <div className="text-purple-300">TCG: ${containerPrices.tcg.toFixed(2)}</div>
                            <div className="text-blue-300">CK: ${containerPrices.ck.toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleContainerExpand(container.id)}
                            className="bg-blue-600 hover:bg-blue-700 rounded px-4 py-2 font-semibold"
                          >
                            {expandedContainers[container.id] ? 'Hide' : 'View'} Contents
                          </button>
                          <button
                            onClick={() => {
                              setSelectedContainerForSale(container.id);
                              setShowSellModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold flex items-center gap-2"
                          >
                            <DollarSign className="w-5 h-5" />
                            Sell
                          </button>
                          <button
                            onClick={() => deleteContainer(container.id)}
                            className="bg-red-600 hover:bg-red-700 rounded px-3 py-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                    {expandedContainers[container.id] && (
                      <div className="mt-4 pt-4 border-t border-purple-500">
                        <h4 className="font-semibold mb-3">Cards in Container</h4>
                        {containerItems[container.id] && containerItems[container.id].length > 0 ? (
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {containerItems[container.id].map((item, idx) => (
                              <div key={idx} className="bg-purple-900 bg-opacity-50 border border-purple-300 rounded p-3 text-sm">
                                <div className="flex justify-between">
                                  <div>
                                    <div className="font-semibold">{item.name}</div>
                                    <div className="text-xs text-gray-400">{item.set_name} ({item.set})</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-purple-300 font-semibold">{item.quantity_used}x</div>
                                    <div className="text-xs text-gray-400">${item.purchase_price || 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">Loading container contents...</p>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
                {containers.length === 0 && <p className="text-gray-400">No containers yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && !isLoading && (
          <div className="space-y-6">
            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                Sales Analytics
              </h2>
              
              {sales.length > 0 ? (
                <div className="space-y-4">
                  {sales.map((sale) => {
                    const deckCOGS = calculateDeckCOGS(sale.decklist_id);
                    const profit = sale.sale_price - deckCOGS;
                    const profitPercentage = deckCOGS > 0 ? ((profit / deckCOGS) * 100).toFixed(2) : 0;
                    const container = containers.find(c => c.id === sale.container_id);
                    
                    return (
                      <div key={sale.id} className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-lg">{container?.name || 'Unknown Container'}</div>
                            <div className="text-sm text-gray-400">{new Date(sale.sold_date).toLocaleDateString()}</div>
                          </div>
                          <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {profit >= 0 ? '+' : ''} ${profit.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="bg-purple-900 bg-opacity-50 border border-purple-300 rounded p-3">
                            <div className="text-gray-400 text-xs">COGS</div>
                            <div className="font-semibold text-purple-300">${deckCOGS.toFixed(2)}</div>
                          </div>
                          <div className="bg-purple-900 bg-opacity-50 border border-purple-300 rounded p-3">
                            <div className="text-gray-400 text-xs">Sale Price</div>
                            <div className="font-semibold text-blue-300">${sale.sale_price.toFixed(2)}</div>
                          </div>
                          <div className="bg-purple-900 bg-opacity-50 border border-purple-300 rounded p-3">
                            <div className="text-gray-400 text-xs">Profit %</div>
                            <div className={`font-semibold ${profit >= 0 ? 'text-green-300' : 'text-red-300'}`}>{profitPercentage}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="mt-6 pt-6 border-t border-purple-500">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-purple-900 bg-opacity-50 rounded p-4 border border-purple-400">
                        <div className="text-gray-400 text-sm">Total Sales</div>
                        <div className="text-2xl font-bold text-purple-300">{sales.length}</div>
                      </div>
                      <div className="bg-purple-900 bg-opacity-50 rounded p-4 border border-purple-400">
                        <div className="text-gray-400 text-sm">Total Revenue</div>
                        <div className="text-2xl font-bold text-blue-300">${sales.reduce((sum, s) => sum + s.sale_price, 0).toFixed(2)}</div>
                      </div>
                      <div className="bg-purple-900 bg-opacity-50 rounded p-4 border border-purple-400">
                        <div className="text-gray-400 text-sm">Total Profit</div>
                        <div className="text-2xl font-bold text-green-300">${sales.reduce((sum, s) => sum + (s.sale_price - calculateDeckCOGS(s.decklist_id)), 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No sales recorded yet. Sell containers to see analytics here.</p>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && !isLoading && (
          <div className="space-y-6">
            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
                Reorder Alerts
              </h2>
              <div className="grid gap-4">
                {getReorderAlerts().length > 0 ? (
                  getReorderAlerts().map((item) => (
                    <div key={item.id} className="bg-black bg-opacity-50 border border-red-400 rounded p-4">
                      <div className="font-semibold text-red-400">{item.name}</div>
                      <div className="text-sm text-gray-300">Quantity: {item.quantity} (Type: {item.reorder_type})</div>
                      <div className="text-sm text-gray-300">Set: {item.set_name}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No items below reorder threshold.</p>
                )}
              </div>
            </div>

            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Inventory Statistics</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                  <div className="text-gray-400 text-sm">Total Cards</div>
                  <div className="text-2xl font-bold text-purple-300">{inventory.length}</div>
                </div>
                <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                  <div className="text-gray-400 text-sm">Total Quantity</div>
                  <div className="text-2xl font-bold text-purple-300">{inventory.reduce((sum, card) => sum + (card.quantity || 0), 0)}</div>
                </div>
                <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-4">
                  <div className="text-gray-400 text-sm">Total Value</div>
                  <div className="text-2xl font-bold text-purple-300">${inventory.reduce((sum, card) => sum + (parseFloat(card.purchase_price) || 0), 0).toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="bg-purple-900 bg-opacity-30 rounded-lg p-6 border border-purple-500">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="grid gap-2">
                {usageHistory.length > 0 ? (
                  usageHistory.map((entry, idx) => (
                    <div key={idx} className="bg-black bg-opacity-50 border border-purple-400 rounded p-3 text-sm">
                      <span className="font-semibold text-purple-300">{entry.action}</span>
                      <span className="text-gray-400"> - {new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No activity yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sell Modal */}
        {showSellModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-purple-900 border border-purple-500 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Sell Container</h2>
                <button
                  onClick={() => {
                    setShowSellModal(false);
                    setSelectedContainerForSale(null);
                    setSalePrice('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {selectedContainerForSale && (
                <div className="mb-4">
                  <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-3 mb-4">
                    <div className="text-sm text-gray-400">Container</div>
                    <div className="font-semibold">{containers.find(c => c.id === selectedContainerForSale)?.name}</div>
                  </div>
                  
                  <div className="bg-black bg-opacity-50 border border-purple-400 rounded p-3 mb-4">
                    <div className="text-sm text-gray-400">Estimated COGS</div>
                    <div className="font-semibold text-purple-300">
                      ${calculateDeckCOGS(containers.find(c => c.id === selectedContainerForSale)?.decklist_id).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Sale Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Enter sale price"
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>
                
                {salePrice && (
                  <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded p-3">
                    <div className="text-sm text-gray-400">Estimated Profit</div>
                    <div className={`font-semibold text-lg ${(salePrice - calculateDeckCOGS(containers.find(c => c.id === selectedContainerForSale)?.decklist_id)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(salePrice - calculateDeckCOGS(containers.find(c => c.id === selectedContainerForSale)?.decklist_id)).toFixed(2)}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button
                    onClick={sellContainer}
                    className="flex-1 bg-green-600 hover:bg-green-700 rounded px-4 py-2 font-semibold"
                  >
                    Confirm Sale
                  </button>
                  <button
                    onClick={() => {
                      setShowSellModal(false);
                      setSelectedContainerForSale(null);
                      setSalePrice('');
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-purple-900 border border-purple-500 rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Reorder Thresholds</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Normal Cards</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.normal}
                    onChange={(e) => setReorderSettings({...reorderSettings, normal: parseInt(e.target.value)})}
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Lands</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.land}
                    onChange={(e) => setReorderSettings({...reorderSettings, land: parseInt(e.target.value)})}
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Bulk Items</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderSettings.bulk}
                    onChange={(e) => setReorderSettings({...reorderSettings, bulk: parseInt(e.target.value)})}
                    className="w-full bg-black bg-opacity-50 border border-purple-400 rounded px-4 py-2 text-white"
                  />
                </div>
                <div className="border-t border-purple-500 pt-4 mt-4">
                  <button
                    onClick={() => {
                      setPriceCache({});
                      setSuccessMessage('Price cache cleared successfully!');
                      setTimeout(() => setSuccessMessage(''), 3000);
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700 rounded px-4 py-2 font-semibold mb-2"
                  >
                    Refresh Price Cache
                  </button>
                  <p className="text-xs text-gray-400">Clears cached card prices and fetches fresh data</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={saveReorderSettings}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 rounded px-4 py-2 font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-4 py-2 font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
