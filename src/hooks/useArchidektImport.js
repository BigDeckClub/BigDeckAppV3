import { useState, useCallback } from 'react';
import { extractArchidektDeckId } from '../utils/decklistParser';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

const API_BASE = '/api';

/**
 * Custom hook for importing decks from Archidekt
 * @param {Object} options
 * @param {Function} options.onSuccess - Callback when import succeeds
 * @param {Function} options.onInventoryUpdate - Callback to refresh inventory
 * @returns {Object} - Hook state and functions
 */
export function useArchidektImport({ onSuccess, onInventoryUpdate }) {
  const { showToast } = useToast();
  const [archidektUrl, setArchidektUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const importFromArchidekt = useCallback(async () => {
    if (!archidektUrl.trim()) {
      showToast('Please enter an Archidekt deck URL', TOAST_TYPES.WARNING);
      return;
    }

    setIsImporting(true);
    try {
      // Extract deck ID from URL
      const deckId = extractArchidektDeckId(archidektUrl);
      if (!deckId) {
        showToast('Invalid Archidekt URL. Please use a URL like: archidekt.com/decks/123456', TOAST_TYPES.ERROR);
        setIsImporting(false);
        return;
      }

      // Fetch deck data from Archidekt API
      const response = await fetch(`https://api.archidekt.com/v1/decks/${deckId}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch deck from Archidekt');
      }

      const deckData = await response.json();
      
      // Extract cards from the deck
      const cards = [];
      if (deckData.cards && Array.isArray(deckData.cards)) {
        deckData.cards.forEach(cardEntry => {
          if (cardEntry.card) {
            const cardObj = cardEntry.card;
            const card = {
              quantity: cardEntry.quantity || 1,
              name: cardObj.name || 'Unknown Card',
              set: cardObj.edition?.abbreviation || cardObj.edition || 'Unknown',
              scryfall_id: cardObj.scryfall_id || null,
              image_url: cardObj.image_url || null
            };
            cards.push(card);
          }
        });
      }

      if (cards.length === 0) {
        showToast('No cards found in this deck', TOAST_TYPES.WARNING);
        setIsImporting(false);
        return;
      }

      // Get deck name and format
      const deckName = deckData.name || 'Imported Deck';
      const deckFormat = deckData.format || 'Casual';
      const deckDescription = deckData.description || '';

      // Create the deck with imported cards
      const createResponse = await fetch(`${API_BASE}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deckName,
          format: deckFormat,
          description: deckDescription
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create deck');
      }

      const newDeck = await createResponse.json();

      // Update deck with cards
      const updateResponse = await fetch(`${API_BASE}/decks/${newDeck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to add cards to deck');
      }

      setArchidektUrl('');
      showToast(`Deck imported successfully! ${cards.length} cards added.`, TOAST_TYPES.SUCCESS);
      
      if (onSuccess) {
        onSuccess();
      }
      
      if (onInventoryUpdate) {
        onInventoryUpdate();
      }
    } catch (error) {
      showToast(`Error importing deck: ${error.message}`, TOAST_TYPES.ERROR);
    } finally {
      setIsImporting(false);
    }
  }, [archidektUrl, showToast, onSuccess, onInventoryUpdate]);

  const resetImport = useCallback(() => {
    setArchidektUrl('');
  }, []);

  return {
    archidektUrl,
    setArchidektUrl,
    isImporting,
    importFromArchidekt,
    resetImport
  };
}

export default useArchidektImport;
