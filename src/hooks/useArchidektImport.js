import { useState, useCallback } from 'react';
import { extractArchidektDeckId } from '../utils/decklistParser';
import { useToast, TOAST_TYPES } from '../context/ToastContext';
import { fetchWithAuth } from '../utils/apiClient';

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

      // Fetch deck data from Archidekt API (via backend proxy to avoid CORS)
      const response = await fetchWithAuth(`${API_BASE}/archidekt/deck/${deckId}`);
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
            // Card name is in oracleCard.name, not card.name directly
            const cardName = cardObj.oracleCard?.name || cardObj.name || 'Unknown Card';
            // Edition can be an object or string
            const setCode = typeof cardObj.edition === 'object' 
              ? cardObj.edition?.editioncode?.toUpperCase() 
              : cardObj.edition || 'Unknown';
            const card = {
              quantity: cardEntry.quantity || 1,
              name: cardName,
              set: setCode,
              scryfall_id: cardObj.uid || null,
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
      // Description might be Quill delta format (object with ops array) - extract plain text
      let deckDescription = '';
      if (deckData.description) {
        if (typeof deckData.description === 'string') {
          deckDescription = deckData.description;
        } else if (deckData.description.ops && Array.isArray(deckData.description.ops)) {
          // Extract text from Quill delta format
          deckDescription = deckData.description.ops
            .map(op => typeof op.insert === 'string' ? op.insert : '')
            .join('');
        }
      }

      // Create the deck with imported cards
      const createResponse = await fetchWithAuth(`${API_BASE}/decks`, {
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
      const updateResponse = await fetchWithAuth(`${API_BASE}/decks/${newDeck.id}`, {
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
