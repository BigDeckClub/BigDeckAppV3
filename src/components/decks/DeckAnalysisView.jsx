import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { BarChart3, CheckCircle2, AlertCircle, TrendingUp, Package } from 'lucide-react';

/**
 * DeckAnalysisView - Advanced multi-deck analysis and comparison
 * Shows shared cards, missing cards, bulk calculations with deck quantity sliders
 */
export function DeckAnalysisView({ decks, selectedDeckIds, inventoryByName }) {
  // State for deck quantities (how many copies of each deck)
  const [deckQuantities, setDeckQuantities] = useState(
    selectedDeckIds.reduce((acc, id) => ({ ...acc, [id]: 1 }), {})
  );

  // Get selected decks
  const selectedDecks = useMemo(() => {
    return decks.filter(d => selectedDeckIds.includes(d.id));
  }, [decks, selectedDeckIds]);

  // Calculate comprehensive analysis
  const analysis = useMemo(() => {
    if (selectedDecks.length === 0) {
      return {
        sharedCards: [],
        missingFromAll: [],
        cardRequirements: {},
        totalCardsNeeded: 0,
        totalCardsOwned: 0,
        completionRate: 0,
        deckStats: []
      };
    }

    // Build card requirements considering quantities
    const cardRequirements = {};
    const cardAppearances = {}; // Track which decks use each card
    
    selectedDecks.forEach(deck => {
      const deckQty = deckQuantities[deck.id] || 1;
      (deck.cards || []).forEach(card => {
        const cardKey = card.name.toLowerCase().trim();
        const requiredQty = (card.quantity || 1) * deckQty;
        
        if (!cardRequirements[cardKey]) {
          cardRequirements[cardKey] = {
            name: card.name,
            totalRequired: 0,
            available: inventoryByName?.[cardKey] || 0,
            set: card.set,
            decks: []
          };
          cardAppearances[cardKey] = new Set();
        }
        
        cardRequirements[cardKey].totalRequired += requiredQty;
        cardRequirements[cardKey].decks.push({
          deckName: deck.name,
          deckId: deck.id,
          quantity: card.quantity || 1,
          copies: deckQty
        });
        cardAppearances[cardKey].add(deck.id);
      });
    });

    // Calculate shared cards (appear in 2+ decks)
    const sharedCards = Object.values(cardRequirements)
      .filter(card => card.decks.length > 1)
      .sort((a, b) => b.decks.length - a.decks.length);

    // Calculate missing cards (needed but not available)
    const missingCards = Object.values(cardRequirements)
      .map(card => ({
        ...card,
        missing: Math.max(0, card.totalRequired - card.available)
      }))
      .filter(card => card.missing > 0)
      .sort((a, b) => b.missing - a.missing);

    // Cards missing from ALL selected decks
    const missingFromAll = missingCards.filter(card => 
      card.decks.length === selectedDecks.length
    );

    // Calculate totals
    const totalCardsNeeded = Object.values(cardRequirements)
      .reduce((sum, card) => sum + card.totalRequired, 0);
    
    const totalCardsOwned = Object.values(cardRequirements)
      .reduce((sum, card) => sum + Math.min(card.available, card.totalRequired), 0);

    const completionRate = totalCardsNeeded > 0 
      ? (totalCardsOwned / totalCardsNeeded) * 100 
      : 100;

    // Per-deck statistics
    const deckStats = selectedDecks.map(deck => {
      const deckQty = deckQuantities[deck.id] || 1;
      const cards = deck.cards || [];
      
      const required = cards.reduce((sum, card) => 
        sum + ((card.quantity || 1) * deckQty), 0
      );
      
      const owned = cards.reduce((sum, card) => {
        const cardKey = card.name.toLowerCase().trim();
        const available = inventoryByName?.[cardKey] || 0;
        const needed = (card.quantity || 1) * deckQty;
        return sum + Math.min(available, needed);
      }, 0);

      const missing = required - owned;
      const completion = required > 0 ? (owned / required) * 100 : 100;

      return {
        deckId: deck.id,
        deckName: deck.name,
        copies: deckQty,
        required,
        owned,
        missing,
        completion
      };
    });

    return {
      sharedCards,
      missingFromAll,
      cardRequirements: Object.values(cardRequirements),
      totalCardsNeeded,
      totalCardsOwned,
      completionRate,
      deckStats
    };
  }, [selectedDecks, deckQuantities, inventoryByName]);

  // Handle quantity slider change
  const handleQuantityChange = (deckId, quantity) => {
    setDeckQuantities(prev => ({
      ...prev,
      [deckId]: Math.max(1, Math.min(10, quantity))
    }));
  };

  if (selectedDeckIds.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Select at least one deck to see analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-600 p-6">
        <h2 className="text-2xl font-bold text-teal-300 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Multi-Deck Analysis
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Decks Selected</div>
            <div className="text-2xl font-bold text-teal-300">{selectedDecks.length}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Total Cards Needed</div>
            <div className="text-2xl font-bold text-blue-300">{analysis.totalCardsNeeded}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Cards Owned</div>
            <div className="text-2xl font-bold text-green-300">{analysis.totalCardsOwned}</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Completion</div>
            <div className="text-2xl font-bold text-amber-300">
              {analysis.completionRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div className="bg-slate-900 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-600 to-green-500 transition-all duration-500"
            style={{ width: `${Math.min(100, analysis.completionRate)}%` }}
          />
        </div>
      </div>

      {/* Deck Quantity Sliders */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
        <h3 className="text-lg font-semibold text-teal-300 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Deck Quantities
        </h3>
        <div className="space-y-4">
          {selectedDecks.map(deck => (
            <div key={deck.id} className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-200 font-medium">{deck.name}</span>
                <span className="text-teal-300 font-bold text-lg">
                  {deckQuantities[deck.id] || 1}x
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={deckQuantities[deck.id] || 1}
                onChange={(e) => handleQuantityChange(deck.id, parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 copy</span>
                <span>10 copies</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Deck Statistics */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
        <h3 className="text-lg font-semibold text-teal-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Individual Deck Stats
        </h3>
        <div className="space-y-3">
          {analysis.deckStats.map(stat => (
            <div key={stat.deckId} className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-slate-200 font-medium">{stat.deckName}</span>
                  {stat.copies > 1 && (
                    <span className="ml-2 text-xs bg-teal-600 text-white px-2 py-0.5 rounded">
                      {stat.copies}x
                    </span>
                  )}
                </div>
                <span className={`font-bold ${
                  stat.completion === 100 ? 'text-green-400' : 
                  stat.completion >= 75 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {stat.completion.toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-400">Required</div>
                  <div className="text-blue-300 font-semibold">{stat.required}</div>
                </div>
                <div>
                  <div className="text-slate-400">Owned</div>
                  <div className="text-green-300 font-semibold">{stat.owned}</div>
                </div>
                <div>
                  <div className="text-slate-400">Missing</div>
                  <div className="text-red-300 font-semibold">{stat.missing}</div>
                </div>
              </div>
              <div className="mt-2 bg-slate-900 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    stat.completion === 100 ? 'bg-green-500' : 
                    stat.completion >= 75 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, stat.completion)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Cards */}
      {analysis.sharedCards.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
          <h3 className="text-lg font-semibold text-teal-300 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Shared Cards ({analysis.sharedCards.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analysis.sharedCards.map((card, idx) => (
              <div key={idx} className="bg-slate-900 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-slate-200 font-medium">{card.name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Used in {card.decks.length} deck{card.decks.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="text-blue-300 font-semibold">{card.totalRequired}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="text-green-300 font-semibold">{card.available}</span>
                    </div>
                    {card.totalRequired > card.available && (
                      <div className="text-xs text-red-400 mt-1">
                        Need {card.totalRequired - card.available} more
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {card.decks.map((deckInfo, i) => (
                    <span
                      key={i}
                      className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded"
                    >
                      {deckInfo.deckName}: {deckInfo.quantity}×{deckInfo.copies}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing from All Decks */}
      {analysis.missingFromAll.length > 0 && (
        <div className="bg-gradient-to-br from-red-900/30 to-slate-800 rounded-lg border border-red-600/30 p-6">
          <h3 className="text-lg font-semibold text-red-300 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Missing from All Selected Decks ({analysis.missingFromAll.length})
          </h3>
          <p className="text-sm text-red-200/70 mb-4">
            These cards are needed by every selected deck but you don't have enough copies
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {analysis.missingFromAll.map((card, idx) => (
              <div key={idx} className="bg-red-900/20 rounded-lg p-3 border border-red-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-red-100 font-medium">{card.name}</div>
                    <div className="text-xs text-red-300 mt-1">
                      Need {card.totalRequired} total • Have {card.available} • Missing {card.missing}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    -{card.missing}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Card Requirements */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 p-6">
        <h3 className="text-lg font-semibold text-teal-300 mb-4">
          Complete Card Breakdown ({analysis.cardRequirements.length} unique cards)
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {analysis.cardRequirements
            .sort((a, b) => (b.totalRequired - b.available) - (a.totalRequired - a.available))
            .map((card, idx) => {
              const missing = Math.max(0, card.totalRequired - card.available);
              const isComplete = missing === 0;
              
              return (
                <div
                  key={idx}
                  className={`rounded-lg p-3 ${
                    isComplete ? 'bg-green-900/20 border border-green-700/30' : 'bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200">{card.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        <span className="text-blue-300">{card.totalRequired}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-green-300">{card.available}</span>
                      </span>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <span className="text-red-400 font-semibold">-{missing}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

DeckAnalysisView.propTypes = {
  decks: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    cards: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      quantity: PropTypes.number,
      set: PropTypes.string
    }))
  })).isRequired,
  selectedDeckIds: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  ).isRequired,
  inventoryByName: PropTypes.object
};

export default DeckAnalysisView;
