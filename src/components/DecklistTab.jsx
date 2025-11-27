import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2 } from 'lucide-react';
import { usePriceCache } from '../context/PriceCacheContext';
import { useApi } from '../hooks/useApi';
import DecklistCardPrice from './DecklistCardPrice';

const API_BASE = '/api';

export const DecklistTab = ({
  decklists,
  inventory,
  defaultSearchSet,
  lastUsedSets,
  setLastUsedSets,
  onLoadDecklists,
  successMessage,
  setSuccessMessage,
}) => {
  const { getPrice } = usePriceCache();
  const { get, post, put, del } = useApi();

  const [decklistName, setDecklistName] = useState('');
  const [decklistPaste, setDecklistPaste] = useState('');
  const [showDecklistForm, setShowDecklistForm] = useState(false);
  const [deckPreview, setDeckPreview] = useState(null);
  const [deckPreviewLoading, setDeckPreviewLoading] = useState(false);
  const [decklistPrices, setDecklistPrices] = useState({});
  const [expandedDecklists, setExpandedDecklists] = useState({});
  const [editingDecklistCard, setEditingDecklistCard] = useState(null);
  const [editCardSet, setEditCardSet] = useState('');
  const [editCardAvailableSets, setEditCardAvailableSets] = useState([]);
  const [expandedCardCopies, setExpandedCardCopies] = useState({});

  const calculateDecklistPrices = async (decklist) => {
    try {
      const lines = decklist.split('\n');
      let tcgTotal = 0, ckTotal = 0;

      for (const line of lines) {
        const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
        if (!match) continue;

        const quantity = parseInt(match[1]);
        const cardName = match[2].trim();
        const setFromDecklist = match[3];

        try {
          let tcgPrice = 0, ckPrice = 0;
          let setToUse = setFromDecklist;

          if (!setToUse) {
            const inventoryCard = inventory.find(
              (card) => card.name.toLowerCase() === cardName.toLowerCase()
            );
            if (inventoryCard) {
              setToUse = inventoryCard.set;
            }
          }

          if (setToUse) {
            const prices = await getPrice(cardName, setToUse);
            tcgPrice = prices?.tcg || 0;
            ckPrice = prices?.ck || 0;
          }

          tcgTotal += quantity * tcgPrice;
          ckTotal += quantity * ckPrice;
        } catch (err) {
          // Continue with next card
        }
      }

      return { tcg: tcgTotal, ck: ckTotal };
    } catch (error) {
      return { tcg: 0, ck: 0 };
    }
  };

  useEffect(() => {
    const fetchPrices = async () => {
      const prices = {};
      for (const deck of decklists) {
        if (deck.decklist) {
          prices[deck.id] = await calculateDecklistPrices(deck.decklist);
        }
      }
      setDecklistPrices(prices);
    };
    if (decklists.length > 0) {
      fetchPrices();
    }
  }, [decklists, inventory]);

  const parseAndPreviewDecklist = async () => {
    if (!decklistName || !decklistPaste) {
      alert('Please fill in all fields');
      return;
    }

    setDeckPreviewLoading(true);
    try {
      const lines = decklistPaste.split('\n').filter((line) => line.trim());
      const cardsToFind = [];

      lines.forEach((line) => {
        const match = line.match(/^(\d+)\s+(.+)$/);
        if (match) {
          const quantity = parseInt(match[1]);
          const cardName = match[2].trim();
          cardsToFind.push({ name: cardName, quantity });
        }
      });

      if (cardsToFind.length === 0) {
        alert('No cards found. Please use format: "3 Card Name"');
        setDeckPreviewLoading(false);
        return;
      }

      const previewCards = await Promise.all(
        cardsToFind.map(async (card) => {
          try {
            const query = `!"${card.name}"`;
            const scryfallRes = await fetch(
              `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=prints`
            );

            if (!scryfallRes.ok) {
              return {
                cardName: card.name,
                quantity: card.quantity,
                found: false,
                error: 'Card not found',
              };
            }

            const scryfallData = await scryfallRes.json();
            const cards = scryfallData.data || [];

            return {
              cardName: card.name,
              quantity: card.quantity,
              found: cards.length > 0,
              sets: cards.map((c) => ({
                set: c.set.toUpperCase(),
                setName: c.set_name,
                rarity: c.rarity,
                price: c.prices?.usd || 'N/A',
              })),
            };
          } catch (err) {
            return {
              cardName: card.name,
              quantity: card.quantity,
              found: false,
              error: err.message,
            };
          }
        })
      );

      setDeckPreview(previewCards);
    } catch (error) {
      alert('Error parsing decklist: ' + error.message);
    } finally {
      setDeckPreviewLoading(false);
    }
  };

  const validateDecklistCards = (preview) => {
    const missingCards = [];

    preview.forEach((card) => {
      if (!card.found) {
        missingCards.push(card.cardName);
      }
    });

    if (missingCards.length > 0) {
      alert(`These cards were not found in Scryfall:\n${missingCards.join('\n')}`);
      return false;
    }

    return true;
  };

  const confirmAndAddDecklist = async () => {
    if (!deckPreview || !validateDecklistCards(deckPreview)) {
      return;
    }

    try {
      await post(`${API_BASE}/decklists`, { name: decklistName, decklist: decklistPaste });
      setDecklistName('');
      setDecklistPaste('');
      setShowDecklistForm(false);
      setDeckPreview(null);
      await onLoadDecklists();
    } catch (error) {
      alert('Error adding decklist: ' + error.message);
    }
  };

  const deleteDecklist = async (id) => {
    try {
      await del(`${API_BASE}/decklists/${id}`);
      await onLoadDecklists();
    } catch (error) {}
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {!showDecklistForm ? (
        <button
          onClick={() => setShowDecklistForm(true)}
          className="btn-primary w-full sm:w-auto px-4 sm:px-6 py-3 font-semibold"
        >
          <Plus className="w-5 h-5 inline mr-2" />
          New Decklist
        </button>
      ) : (
        <div className="card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Create Decklist</h2>
          <input
            type="text"
            placeholder="Decklist Name"
            value={decklistName}
            onChange={(e) => setDecklistName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white mb-4"
          />
          <textarea
            placeholder="Paste decklist here (e.g., '2 Lightning Bolt')"
            value={decklistPaste}
            onChange={(e) => setDecklistPaste(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 px-4 py-2 text-white mb-4 h-48"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={parseAndPreviewDecklist}
              disabled={deckPreviewLoading}
              className="flex-1 btn-primary disabled:opacity-50 px-4 py-3 font-semibold"
            >
              {deckPreviewLoading ? 'Checking...' : 'Check Inventory'}
            </button>
            <button
              onClick={() => {
                setShowDecklistForm(false);
                setDeckPreview(null);
              }}
              className="flex-1 btn-secondary px-4 py-3 font-semibold"
            >
              Cancel
            </button>
          </div>

          {deckPreview && (
            <div className="mt-6 border-t border-slate-700 hover:border-teal-500 pt-4">
              <h3 className="font-semibold mb-3">Decklist Preview</h3>
              <div className="bg-slate-800 p-4 max-h-96 overflow-y-auto space-y-2">
                {deckPreview.map((card, idx) => (
                  <div
                    key={idx}
                    className={`p-2 border-l-4 flex justify-between items-center ${card.found ? 'border-green-500 bg-emerald-900 bg-opacity-20' : 'border-red-600 bg-red-950 bg-opacity-20'}`}
                  >
                    <span className="text-sm font-semibold">
                      {card.quantity}x {card.cardName}
                    </span>
                    <span className="text-xs">
                      {card.found ? '✓ Found' : card.error || '✗ Not found'}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={confirmAndAddDecklist}
                className="w-full mt-4 btn-primary px-4 py-2 font-semibold"
              >
                Confirm & Create Decklist
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
          Decklists ({decklists.length})
        </h2>
        <div className="grid gap-3 sm:gap-4">
          {decklists.map((deck) => {
            const prices = decklistPrices[deck.id] || { tcg: 0, ck: 0 };
            const isExpanded = expandedDecklists[deck.id];
            const decklistText = deck.decklist || '';
            const deckCards = decklistText
              .split('\n')
              .filter((line) => line.trim())
              .flatMap((line) => {
                const match = line.match(/^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/);
                if (!match) return [];
                const quantity = parseInt(match[1]);
                const name = match[2].trim();
                const setCode = match[3] || null;
                return Array.from({ length: quantity }, () => ({
                  name,
                  setCode,
                }));
              })
              .filter(Boolean);

            return (
              <div key={deck.id} className="bg-slate-800 border border-slate-600 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold">{deck.name}</div>
                    <div className="text-sm text-slate-300 mt-2">
                      {deckCards.length} cards
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 justify-end">
                    <button
                      onClick={() =>
                        setExpandedDecklists((prev) => ({
                          ...prev,
                          [deck.id]: !prev[deck.id],
                        }))
                      }
                      className="btn-primary px-4 py-2 font-semibold"
                    >
                      {isExpanded ? 'Hide' : 'View'} Cards
                    </button>
                    <button
                      onClick={() => deleteDecklist(deck.id)}
                      className="btn-danger px-3 py-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-700 hover:border-teal-500 pt-2 mt-2">
                  <div className="text-teal-300">TCG: ${prices.tcg.toFixed(2)}</div>
                  <div className="text-cyan-300">CK: ${prices.ck.toFixed(2)}</div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-700 hover:border-teal-500">
                    <h4 className="font-semibold mb-3">Cards in Decklist</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {(() => {
                        const groupedByName = {};
                        deckCards.forEach((card, idx) => {
                          let cardSet = card.setCode;
                          if (!cardSet) {
                            const inventoryCard = inventory.find(
                              (inv) =>
                                inv.name.toLowerCase() === card.name.toLowerCase()
                            );
                            cardSet = inventoryCard?.set || defaultSearchSet || 'UNK';
                          }
                          const cardKey = `${card.name}|${cardSet}`;
                          if (!groupedByName[cardKey]) {
                            groupedByName[cardKey] = {
                              name: card.name,
                              set: cardSet,
                              copies: [],
                            };
                          }
                          groupedByName[cardKey].copies.push({ idx, card });
                        });

                        return Object.entries(groupedByName).map(([cardKey, group]) => {
                          const isGroupExpanded =
                            expandedCardCopies[`${deck.id}-group-${cardKey}`];

                          return (
                            <div
                              key={cardKey}
                              className="bg-slate-800 border border-slate-600 rounded"
                            >
                              <button
                                onClick={() =>
                                  setExpandedCardCopies((prev) => ({
                                    ...prev,
                                    [`${deck.id}-group-${cardKey}`]: !isGroupExpanded,
                                  }))
                                }
                                className="w-full p-3 text-sm flex justify-between items-center hover:bg-slate-700 transition"
                              >
                                <div className="text-left flex-1">
                                  <div className="font-semibold">{group.name}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right text-xs">
                                    <div className="text-teal-300 font-semibold">
                                      {group.copies.length}x
                                    </div>
                                  </div>
                                  <div className="text-slate-400">
                                    {isGroupExpanded ? '▼' : '▶'}
                                  </div>
                                </div>
                              </button>

                              {isGroupExpanded && (
                                <div className="bg-slate-900 bg-opacity-50 border-t border-slate-600 p-3 space-y-2">
                                  {group.copies.map(({ idx, card }, copyIdx) => {
                                    const isEditingThisCard =
                                      editingDecklistCard?.idx === idx &&
                                      editingDecklistCard?.deckId === deck.id;

                                    return (
                                      <div
                                        key={copyIdx}
                                        className="bg-slate-800 p-3 rounded border border-slate-600 text-xs space-y-2"
                                      >
                                        <div className="font-semibold text-slate-200">
                                          {group.set}
                                        </div>
                                        {isEditingThisCard ? (
                                          <div className="space-y-2">
                                            <select
                                              value={editCardSet}
                                              onChange={(e) =>
                                                setEditCardSet(e.target.value)
                                              }
                                              className="w-full bg-slate-700 border border-slate-600 px-3 py-2 text-white text-xs"
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

                                                  const lines = (deck.decklist || '')
                                                    .split('\n')
                                                    .filter((line) => line.trim());

                                                  let found = false;
                                                  let cardInstanceCount = 0;
                                                  const newLines = lines.map((line) => {
                                                    const match = line.match(
                                                      /^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/
                                                    );
                                                    if (match) {
                                                      const qty = match[1];
                                                      const cardNamePart = match[2].trim();

                                                      if (
                                                        cardNamePart.toLowerCase() ===
                                                        card.name.toLowerCase()
                                                      ) {
                                                        if (
                                                          cardInstanceCount + parseInt(qty) >
                                                            idx &&
                                                          cardInstanceCount <= idx
                                                        ) {
                                                          found = true;
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
                                                      headers: {
                                                        'Content-Type': 'application/json',
                                                      },
                                                      body: JSON.stringify({
                                                        decklist: newDecklistText,
                                                      }),
                                                    })
                                                      .then(() => {
                                                        setLastUsedSets((prev) => ({
                                                          ...prev,
                                                          [card.name.toLowerCase()]: editCardSet,
                                                        }));
                                                        onLoadDecklists();
                                                        setEditingDecklistCard(null);
                                                      })
                                                      .catch(() => {
                                                        alert('Failed to update decklist');
                                                      });
                                                  } else {
                                                    alert('Could not find card in decklist');
                                                  }
                                                }}
                                                className="flex-1 btn-primary px-2 py-1 text-xs font-semibold"
                                              >
                                                Save
                                              </button>
                                              <button
                                                onClick={() => setEditingDecklistCard(null)}
                                                className="flex-1 btn-secondary px-2 py-1 text-xs font-semibold"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="grid grid-cols-4 gap-2">
                                              <div className="bg-slate-700 p-2 rounded">
                                                <div className="text-slate-400 text-xs mb-1">
                                                  TCG Player
                                                </div>
                                                <DecklistCardPrice
                                                  key={`price-${group.name}-${group.set}-tcg-${copyIdx}`}
                                                  name={group.name}
                                                  set={group.set}
                                                  priceType="tcg"
                                                />
                                              </div>
                                              <div className="bg-slate-700 p-2 rounded">
                                                <div className="text-slate-400 text-xs mb-1">
                                                  Card Kingdom
                                                </div>
                                                <DecklistCardPrice
                                                  key={`price-${group.name}-${group.set}-ck-${copyIdx}`}
                                                  name={group.name}
                                                  set={group.set}
                                                  priceType="ck"
                                                />
                                              </div>
                                              <button
                                                onClick={() => {
                                                  const lines = (deck.decklist || '')
                                                    .split('\n')
                                                    .filter((line) => line.trim());
                                                  let cardInstanceCount = 0;
                                                  const newLines = lines
                                                    .filter((line) => {
                                                      const match = line.match(
                                                        /^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/
                                                      );
                                                      if (!match) return true;
                                                      const qty = parseInt(match[1]);
                                                      const cardNamePart = match[2].trim();
                                                      if (
                                                        cardNamePart.toLowerCase() ===
                                                        card.name.toLowerCase()
                                                      ) {
                                                        if (
                                                          cardInstanceCount + qty > idx &&
                                                          cardInstanceCount <= idx
                                                        ) {
                                                          if (qty === 1) return false;
                                                          return true;
                                                        }
                                                        cardInstanceCount += qty;
                                                      }
                                                      return true;
                                                    })
                                                    .map((line) => {
                                                      const match = line.match(
                                                        /^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\))?$/
                                                      );
                                                      if (!match) return line;
                                                      const qty = parseInt(match[1]);
                                                      const cardNamePart = match[2].trim();
                                                      const set = match[3];
                                                      if (
                                                        cardNamePart.toLowerCase() ===
                                                        card.name.toLowerCase()
                                                      ) {
                                                        if (idx < cardInstanceCount) return line;
                                                        if (qty > 1) {
                                                          return `${qty - 1} ${cardNamePart}${set ? ` (${set})` : ''}`;
                                                        }
                                                        return null;
                                                      }
                                                      return line;
                                                    })
                                                    .filter(Boolean);
                                                  const newDecklistText = newLines.join('\n');
                                                  fetch(`${API_BASE}/decklists/${deck.id}`, {
                                                    method: 'PUT',
                                                    headers: {
                                                      'Content-Type': 'application/json',
                                                    },
                                                    body: JSON.stringify({
                                                      decklist: newDecklistText,
                                                    }),
                                                  })
                                                    .then(() => onLoadDecklists())
                                                    .catch(() => alert('Failed to remove card'));
                                                }}
                                                className="btn-danger px-2 py-1 text-xs font-semibold h-fit"
                                              >
                                                Remove
                                              </button>
                                              <button
                                                onClick={async () => {
                                                  const lastSet =
                                                    lastUsedSets[card.name.toLowerCase()];
                                                  setEditingDecklistCard({
                                                    idx,
                                                    deckId: deck.id,
                                                  });
                                                  setEditCardSet(lastSet || group.set);

                                                  try {
                                                    const response = await fetch(
                                                      `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(card.name)}"&unique=prints&order=released`
                                                    );
                                                    if (response.ok) {
                                                      const data = await response.json();
                                                      const sets =
                                                        data.data?.map((c) => ({
                                                          code: c.set.toUpperCase(),
                                                          name: c.set_name,
                                                        })) || [];
                                                      const uniqueSets = Array.from(
                                                        new Map(
                                                          sets.map((s) => [s.code, s])
                                                        ).values()
                                                      );
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
                                                className="btn-primary px-2 py-1 text-xs font-semibold h-fit"
                                              >
                                                Edit Set
                                              </button>
                                            </div>
                                          </>
                                        )}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {decklists.length === 0 && <p className="text-slate-400">No decklists yet.</p>}
      </div>
    </div>
  );
};

DecklistTab.propTypes = {
  decklists: PropTypes.array.isRequired,
  inventory: PropTypes.array.isRequired,
  defaultSearchSet: PropTypes.string,
  lastUsedSets: PropTypes.object.isRequired,
  setLastUsedSets: PropTypes.func.isRequired,
  onLoadDecklists: PropTypes.func.isRequired,
  successMessage: PropTypes.string,
  setSuccessMessage: PropTypes.func,
};

export default DecklistTab;
