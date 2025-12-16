import { useState, useMemo, useCallback } from 'react';

/**
 * Custom hook for deck analysis calculations
 * Extracts the core analysis logic from DeckAnalysisView
 */
export function useDeckAnalysis({ decks, selectedDeckIds, inventoryByName }) {
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
        missingCards: [],
        cardRequirements: [],
        totalCardsNeeded: 0,
        totalCardsOwned: 0,
        completionRate: 0,
        deckStats: [],
        estimatedCost: 0
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
            decks: [],
            estimatedPrice: card.price || 0.50 // Default estimate if no price
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

    // Estimate cost to complete
    const estimatedCost = missingCards.reduce((sum, card) =>
      sum + (card.missing * card.estimatedPrice), 0
    );

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
      missingCards,
      cardRequirements: Object.values(cardRequirements),
      totalCardsNeeded,
      totalCardsOwned,
      completionRate,
      deckStats,
      estimatedCost
    };
  }, [selectedDecks, deckQuantities, inventoryByName]);

  // Handle quantity slider change
  const handleQuantityChange = useCallback((deckId, quantity) => {
    setDeckQuantities(prev => ({
      ...prev,
      [deckId]: Math.max(1, Math.min(10, quantity))
    }));
  }, []);

  // Export missing cards to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['Card Name', 'Quantity Needed', 'Quantity Owned', 'Missing', 'Estimated Price', 'Decks'];
    const rows = analysis.missingCards.map(card => [
      card.name,
      card.totalRequired,
      card.available,
      card.missing,
      `$${card.estimatedPrice.toFixed(2)}`,
      card.decks.map(d => d.deckName).join('; ')
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck-analysis-missing-cards-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis.missingCards]);

  // Prepare missing cards payload for buy modal
  const missingCardsForBuy = useMemo(() => (
    analysis.missingCards.map(card => ({
      name: card.name,
      quantity: card.missing,
      set: card.set,
      price: card.estimatedPrice ?? card.price ?? 0
    }))
  ), [analysis.missingCards]);

  return {
    selectedDecks,
    deckQuantities,
    analysis,
    missingCardsForBuy,
    handleQuantityChange,
    exportToCSV
  };
}

export default useDeckAnalysis;
