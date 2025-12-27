/**
 * Deck Generation Hook
 * Handles AI deck generation API calls with loading states
 */

import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useToast, TOAST_TYPES } from '../context/ToastContext';

const LOADING_STEPS = [
  { step: 0, msg: 'Identifying Commander...', icon: '🔮' },
  { step: 1, msg: 'Fetching EDHREC data...', icon: '📊' },
  { step: 2, msg: 'Analyzing MTGGoldfish decks...', icon: '🐟' },
  { step: 3, msg: 'Pondering Orbs...', icon: '🔮' },
  { step: 4, msg: 'Building synergies...', icon: '⚡' },
  { step: 5, msg: 'Optimizing mana curve...', icon: '📈' },
  { step: 6, msg: 'Finalizing deck...', icon: '✨' }
];

/**
 * Hook for managing deck generation process
 * @param {Object} options - Configuration options
 * @returns {Object} Generation state and control functions
 */
export function useDeckGeneration(options = {}) {
  const { onSuccess, onError } = options;
  const { post, put } = useApi();
  const { showToast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Auto-progress loading steps during generation
   */
  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500); // 2.5 seconds per step

    return () => clearInterval(interval);
  }, [isGenerating]);

  /**
   * Generate a new deck
   * @param {Object} config - Deck configuration
   * @param {string} config.commanderMode - 'random' or 'specific'
   * @param {string} config.commander - Commander name (if specific mode)
   * @param {string} config.prompt - User's deck theme/description
   * @param {number} config.budget - Budget constraint (or null for unlimited)
   * @param {string} config.source - 'multiverse' or 'inventory'
   * @returns {Promise<Object>} Generated deck result
   */
  const generateDeck = useCallback(async (config) => {
    setIsGenerating(true);
    setResult(null);
    setError(null);

    try {
      const requestData = {
        commanderMode: config.commanderMode,
        commander: config.commanderMode === 'specific' ? config.commander?.name : null,
        theme: config.prompt,
        budget: config.budget === 'Unlimited' ? null : config.budget,
        bracket: 3,
        inventoryOnly: config.source === 'inventory'
      };

      const data = await post('/ai/generate', requestData);

      setResult(data);
      setIsGenerating(false);

      if (onSuccess) {
        onSuccess(data);
      }

      return data;
    } catch (err) {
      setIsGenerating(false);
      setError(err);

      // Handle specific error types
      if (err.data?.requiredCount && err.data?.availableCount) {
        // Inventory-only mode doesn't have enough cards
        const errorMsg = `Need at least ${err.data.requiredCount} available cards for inventory-only mode. You have ${err.data.availableCount}.`;
        showToast(errorMsg, TOAST_TYPES.ERROR);
      } else if (err.message) {
        showToast(err.message, TOAST_TYPES.ERROR);
      } else {
        showToast('Failed to generate deck. Please try again.', TOAST_TYPES.ERROR);
      }

      if (onError) {
        onError(err);
      }

      throw err;
    }
  }, [post, showToast, onSuccess, onError]);

  /**
   * Save generated deck to user's collection
   * @param {Object} deckResult - Generated deck result
   * @returns {Promise<Object>} Saved deck
   */
  const saveDeck = useCallback(async (deckResult) => {
    if (!deckResult) {
      throw new Error('No deck result to save');
    }

    try {
      // 1. Create empty deck
      const deckName = `${deckResult.commander.name} - Orb Deck`;
      const newDeck = await post('/decks', {
        name: deckName,
        commanderId: deckResult.commander.id, // Scryfall ID
        commanderName: deckResult.commander.name,
        format: 'commander'
      });

      // 2. Add cards to deck
      const cardList = deckResult.deck.cards.map(c => ({
        name: c.name,
        quantity: c.quantity || 1,
        isBooster: false,
        category: c.category
      }));

      const updatedDeck = await put(`/decks/${newDeck.id}`, {
        ...newDeck,
        cards: cardList
      });

      showToast(`Deck "${deckName}" saved successfully!`, TOAST_TYPES.SUCCESS);

      return updatedDeck;
    } catch (err) {
      console.error('Failed to save deck', err);
      showToast('Failed to save deck. Please try again.', TOAST_TYPES.ERROR);
      throw err;
    }
  }, [post, put, showToast]);

  /**
   * Reset generation state
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setLoadingStep(0);
    setResult(null);
    setError(null);
  }, []);

  /**
   * Get current loading step info
   */
  const getCurrentLoadingStep = useCallback(() => {
    return LOADING_STEPS[loadingStep] || LOADING_STEPS[0];
  }, [loadingStep]);

  return {
    // State
    isGenerating,
    loadingStep,
    result,
    error,

    // Actions
    generateDeck,
    saveDeck,
    reset,

    // Helpers
    getCurrentLoadingStep,
    loadingSteps: LOADING_STEPS
  };
}
