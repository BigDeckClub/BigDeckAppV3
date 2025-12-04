import { useState, useEffect, useCallback } from 'react';
import { parseDeckList } from '../utils/decklistParser';
import { useToast, TOAST_TYPES } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { fetchWithAuth } from '../utils/apiClient';

const API_BASE = '/api';

/**
 * Custom hook for deck CRUD operations
 * @param {Object} options
 * @param {Function} options.onDeckCreatedOrDeleted - Callback when deck is created or deleted
 * @param {Function} options.onInventoryUpdate - Callback to refresh inventory
 * @returns {Object} - Hook state and functions
 */
export function useDeckOperations({ onDeckCreatedOrDeleted, onInventoryUpdate }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [editingDeck, setEditingDeck] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Copy to deck state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyingDeck, setCopyingDeck] = useState(null);
  const [copyDeckName, setCopyDeckName] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  // Load decks from API
  const loadDecks = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`${API_BASE}/decks`);
      if (response.ok) {
        const data = await response.json();
        setDecks(Array.isArray(data) ? data : []);
      } else {
        setDecks([]);
      }
    } catch (error) {
      setDecks([]);
      showToast('Failed to load decks', TOAST_TYPES.ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load decks on mount
  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  const deleteDeck = useCallback(async (id) => {
    const deck = decks.find(d => d.id === id);
    const confirmed = await confirm({
      title: 'Delete Deck',
      message: `Are you sure you want to delete "${deck?.name || 'this deck'}"?`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    
    if (confirmed) {
      try {
        const response = await fetchWithAuth(`${API_BASE}/decks/${id}`, { method: 'DELETE' });
        if (response.ok) {
          await loadDecks();
          if (selectedDeck?.id === id) {
            setSelectedDeck(null);
          }
          showToast('Deck deleted!', TOAST_TYPES.SUCCESS);
          
          onDeckCreatedOrDeleted?.();
          onInventoryUpdate?.();
        }
      } catch (error) {
        showToast('Error deleting deck', TOAST_TYPES.ERROR);
      }
    }
  }, [decks, selectedDeck, confirm, showToast, loadDecks, onDeckCreatedOrDeleted, onInventoryUpdate]);

  const updateDeckName = useCallback(async (id, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setEditingDeck(null);
      return;
    }
    try {
      const response = await fetchWithAuth(`${API_BASE}/decks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      });

      if (response.ok) {
        setEditingDeck(null);
        await loadDecks();
        showToast('Deck updated!', TOAST_TYPES.SUCCESS);
      } else {
        setEditingDeck(null);
        showToast('Failed to update deck', TOAST_TYPES.ERROR);
      }
    } catch (error) {
      setEditingDeck(null);
      showToast('Error updating deck', TOAST_TYPES.ERROR);
    }
  }, [showToast, loadDecks]);

  const updateDeckDescription = useCallback(async (id, newDescription) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/decks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription })
      });

      if (response.ok) {
        setSelectedDeck(prev => prev?.id === id ? { ...prev, description: newDescription } : prev);
        await loadDecks();
        showToast('Deck updated!', TOAST_TYPES.SUCCESS);
      } else {
        showToast('Failed to update deck', TOAST_TYPES.ERROR);
      }
    } catch (error) {
      showToast('Error updating deck', TOAST_TYPES.ERROR);
    }
  }, [showToast, loadDecks]);

  const importFromTextDeck = useCallback(async (deckName, format, deckListText) => {
    if (!deckName.trim()) {
      showToast('Please enter a deck name', TOAST_TYPES.WARNING);
      return false;
    }

    if (!deckListText.trim()) {
      showToast('Please paste a deck list', TOAST_TYPES.WARNING);
      return false;
    }

    const cards = parseDeckList(deckListText);

    if (cards.length === 0) {
      showToast('No cards found in deck list. Format: "4 Card Name" or "4x Card Name"', TOAST_TYPES.ERROR);
      return false;
    }

    try {
      const response = await fetchWithAuth(`${API_BASE}/decks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deckName,
          format: format,
          description: ''
        })
      });

      if (!response.ok) throw new Error('Failed to create deck');

      const newDeck = await response.json();

      const updateResponse = await fetchWithAuth(`${API_BASE}/decks/${newDeck.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards })
      });

      if (!updateResponse.ok) throw new Error('Failed to add cards');

      await loadDecks();
      showToast(`Deck created with ${cards.length} cards!`, TOAST_TYPES.SUCCESS);
      
      onInventoryUpdate?.();
      
      return true;
    } catch (error) {
      showToast('Error creating deck', TOAST_TYPES.ERROR);
      return false;
    }
  }, [showToast, loadDecks, onInventoryUpdate]);

  const previewCopyToDeck = useCallback((deck) => {
    setCopyingDeck(deck);
    setCopyDeckName(deck.name);
    setShowCopyModal(true);
  }, []);

  const executeCopyToDeck = useCallback(async () => {
    if (!copyingDeck || !copyDeckName.trim()) return;
    
    setIsCopying(true);
    try {
      const response = await fetchWithAuth(`${API_BASE}/decks/${copyingDeck.id}/copy-to-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: copyDeckName })
      });
      
      if (!response.ok) throw new Error('Failed to copy deck');
      
      const result = await response.json();
      
      setShowCopyModal(false);
      setCopyingDeck(null);
      setCopyDeckName('');
      setSuccessMessage(`Deck created! ${result.reservedCount} cards reserved, ${result.missingCount} cards missing.`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
      onDeckCreatedOrDeleted?.();
      onInventoryUpdate?.();
      
    } catch (error) {
      showToast('Error copying deck to inventory', TOAST_TYPES.ERROR);
    } finally {
      setIsCopying(false);
    }
  }, [copyingDeck, copyDeckName, showToast, onDeckCreatedOrDeleted, onInventoryUpdate]);

  const cancelCopyToDeck = useCallback(() => {
    setShowCopyModal(false);
    setCopyingDeck(null);
    setCopyDeckName('');
  }, []);

  return {
    // State
    decks,
    isLoading,
    selectedDeck,
    setSelectedDeck,
    editingDeck,
    setEditingDeck,
    successMessage,
    
    // Copy modal state
    showCopyModal,
    copyingDeck,
    copyDeckName,
    setCopyDeckName,
    isCopying,

    // Operations
    loadDecks,
    deleteDeck,
    updateDeckName,
    updateDeckDescription,
    importFromTextDeck,
    previewCopyToDeck,
    executeCopyToDeck,
    cancelCopyToDeck
  };
}

export default useDeckOperations;
