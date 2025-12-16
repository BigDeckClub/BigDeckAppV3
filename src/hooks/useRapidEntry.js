import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRowState, createEmptyRow, parseQuantityFromInput, QUALITY_OPTIONS } from './useRowState';
import { useLotMode } from './useLotMode';

// Re-export for backwards compatibility
export { QUALITY_OPTIONS, createEmptyRow };

/**
 * Custom hook for managing rapid entry table state and handlers
 * Refactored to use sub-hooks for better separation of concerns
 */
export function useRapidEntry({
  onAddCard,
  handleSearch,
  searchResults,
  setShowDropdown,
}) {
  // Sub-hooks
  const rowState = useRowState();

  // Added cards tracking (for duplicate detection and totals)
  const [addedCards, setAddedCards] = useState([]);

  // Batch submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Lot mode with callbacks
  const lotMode = useLotMode({
    onCardsAdded: (cards) => {
      cards.forEach(card => setAddedCards(prev => [...prev, card]));
    },
    onReset: () => {
      rowState.resetRows();
      rowState.focusInput('name-0');
    }
  });

  // Calculate running totals (memoized)
  const runningTotal = useMemo(() =>
    addedCards.reduce((acc, card) => ({
      count: acc.count + (card.quantity || 1),
      price: acc.price + ((card.quantity || 1) * (parseFloat(card.price) || 0)),
    }), { count: 0, price: 0 }),
    [addedCards]
  );

  // Handle card name input change
  const handleCardNameChange = useCallback((rowIndex, value) => {
    const { quantity, cardName } = parseQuantityFromInput(value);

    rowState.updateRow(rowIndex, {
      searchQuery: value,
      cardName: cardName,
      quantity: quantity > 1 ? quantity : rowState.rows[rowIndex]?.quantity || 1,
      selectedCard: null,
      status: 'editing',
    });

    rowState.setActiveRowIndex(rowIndex);
    rowState.setHighlightedResult(0);

    // Trigger search
    if (cardName.length >= 2) {
      handleSearch(cardName);
    }
  }, [handleSearch, rowState]);

  // Handle selecting a card from search results
  const handleSelectCard = useCallback((rowIndex, card) => {
    // Check for duplicates in current session
    const isDuplicate = addedCards.some(
      added => added.cardName.toLowerCase() === card.name.toLowerCase()
    );

    if (isDuplicate) {
      rowState.setDuplicateWarning({ rowIndex, cardName: card.name });
    }

    // Filter available sets for this card
    const cardSets = searchResults
      .filter(r => r.name === card.name)
      .reduce((acc, r) => {
        if (!acc.find(s => s.set === r.set)) {
          acc.push({ set: r.set, setName: r.setName, imageUrl: r.imageUrl });
        }
        return acc;
      }, []);

    rowState.updateRow(rowIndex, {
      cardName: card.name,
      searchQuery: card.name,
      selectedCard: card,
      set: card.set,
      setName: card.setName,
      availableSets: cardSets,
      imageUrl: card.imageUrl,
      status: 'valid',
    });

    setShowDropdown(false);
    rowState.setHighlightedResult(0);

    // Focus on quantity field
    rowState.focusInput(`qty-${rowIndex}`);
  }, [addedCards, searchResults, setShowDropdown, rowState]);

  // Handle set change
  const handleSetChange = useCallback((rowIndex, setCode) => {
    const row = rowState.rows[rowIndex];
    const selectedSet = row?.availableSets?.find(s => s.set === setCode);

    rowState.updateRow(rowIndex, {
      set: setCode,
      setName: selectedSet?.setName || '',
      imageUrl: selectedSet?.imageUrl || row?.imageUrl,
    });
  }, [rowState]);

  // Handle adding a card to lot (when lot mode is enabled)
  const handleAddCardToLot = useCallback((rowIndex) => {
    const row = rowState.rows[rowIndex];

    if (!row?.selectedCard) {
      return;
    }

    const cardData = {
      name: row.cardName,
      set: row.set,
      set_name: row.setName,
      quantity: row.quantity,
      foil: row.foil,
      quality: row.quality,
      folder: row.folder || 'Uncategorized',
      image_url: row.imageUrl,
    };

    // Add to lot
    lotMode.addCardToLot(cardData);

    // Mark row as added
    rowState.setRowStatus(rowIndex, 'added');

    // Update sticky folder
    if (row.folder && row.folder !== 'Uncategorized') {
      rowState.setStickyFolder(row.folder);
    }

    // Add new empty row and focus it
    const newRowIndex = rowState.addNewRow();
    rowState.setActiveRowIndex(newRowIndex);
    rowState.setDuplicateWarning(null);
    rowState.focusInput(`name-${newRowIndex}`);
  }, [rowState, lotMode]);

  // Handle adding a card to inventory
  const handleAddCardToInventory = useCallback(async (rowIndex) => {
    const row = rowState.rows[rowIndex];

    if (!row?.selectedCard) {
      return;
    }

    // If lot mode is enabled, add to lot instead
    if (lotMode.lotModeEnabled) {
      handleAddCardToLot(rowIndex);
      return;
    }

    const cardData = {
      name: row.cardName,
      set: row.set,
      set_name: row.setName,
      quantity: row.quantity,
      purchase_price: row.price ? parseFloat(row.price) : null,
      foil: row.foil,
      quality: row.quality,
      folder: row.folder || 'Uncategorized',
      image_url: row.imageUrl,
    };

    try {
      await onAddCard(cardData);

      // Mark row as added
      rowState.setRowStatus(rowIndex, 'added');

      // Track added card
      setAddedCards(prev => [...prev, {
        cardName: row.cardName,
        quantity: row.quantity,
        price: row.price,
      }]);

      // Update sticky folder
      if (row.folder && row.folder !== 'Uncategorized') {
        rowState.setStickyFolder(row.folder);
      }

      // Add new empty row and focus it
      const newRowIndex = rowState.addNewRow();
      rowState.setActiveRowIndex(newRowIndex);
      rowState.setDuplicateWarning(null);
      rowState.focusInput(`name-${newRowIndex}`);
    } catch (error) {
      rowState.setRowStatus(rowIndex, 'error');
    }
  }, [rowState, lotMode, handleAddCardToLot, onAddCard]);

  // Handle clearing a row
  const handleClearRow = useCallback((rowIndex) => {
    rowState.clearRow(rowIndex);
    rowState.focusInput(`name-${rowIndex}`);
  }, [rowState]);

  // Handle duplicating previous row
  const handleDuplicatePrevious = useCallback((rowIndex) => {
    rowState.duplicatePrevious(rowIndex);
  }, [rowState]);

  // Add a new row without submitting (Shift+Enter)
  const handleAddNewRow = useCallback((rowIndex) => {
    const row = rowState.rows[rowIndex];

    if (!row?.selectedCard) {
      return false;
    }

    // Mark current row as pending
    rowState.setRowStatus(rowIndex, 'pending');

    // Update sticky folder
    if (row.folder && row.folder !== 'Uncategorized') {
      rowState.setStickyFolder(row.folder);
    }

    // Add new empty row and focus it
    const newRowIndex = rowState.addNewRow();
    rowState.setActiveRowIndex(newRowIndex);
    rowState.setDuplicateWarning(null);
    rowState.focusInput(`name-${newRowIndex}`);

    return true;
  }, [rowState]);

  // Submit all pending cards at once (Ctrl+Shift+Enter)
  const handleSubmitAll = useCallback(async () => {
    const cardsToSubmit = rowState.getValidRows();

    if (cardsToSubmit.length === 0) {
      return { success: false, count: 0 };
    }

    // If lot mode is enabled, add all to lot instead
    if (lotMode.lotModeEnabled) {
      const lotCards = cardsToSubmit.map(row => ({
        name: row.cardName,
        set: row.set,
        set_name: row.setName,
        quantity: row.quantity,
        foil: row.foil,
        quality: row.quality,
        folder: row.folder || 'Uncategorized',
        image_url: row.imageUrl,
      }));
      lotMode.addCardsToLot(lotCards);

      // Reset rows
      rowState.resetRows();
      rowState.focusInput('name-0');

      return { success: true, count: cardsToSubmit.length };
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Submit all cards in parallel for speed
      const results = await Promise.all(
        cardsToSubmit.map(row => {
          const cardData = {
            name: row.cardName,
            set: row.set,
            set_name: row.setName,
            quantity: row.quantity,
            purchase_price: row.price ? parseFloat(row.price) : null,
            foil: row.foil,
            quality: row.quality,
            folder: row.folder || 'Uncategorized',
            image_url: row.imageUrl,
          };
          return onAddCard(cardData)
            .then(() => ({ success: true, row }))
            .catch(err => ({ success: false, row, error: err }));
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      // Track added cards
      results.filter(r => r.success).forEach(({ row }) => {
        setAddedCards(prev => [...prev, {
          cardName: row.cardName,
          quantity: row.quantity,
          price: row.price,
        }]);
      });

      // Reset rows (keep failed ones if any)
      if (failedCount === 0) {
        rowState.resetRows();
      } else {
        const successRowIds = new Set(results.filter(r => r.success).map(r => r.row.id));
        rowState.removeSubmittedRows(successRowIds);
      }

      rowState.focusInput('name-0');

      return { success: true, count: successCount, failed: failedCount };
    } catch (error) {
      console.error('Error submitting cards:', error);
      setSubmitError(error.message || 'Failed to submit cards. Please try again.');
      return { success: false, count: 0, error };
    } finally {
      setIsSubmitting(false);
    }
  }, [rowState, lotMode, onAddCard]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rowState.dropdownRef.current && !rowState.dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowDropdown, rowState.dropdownRef]);

  return {
    // Row state
    rows: rowState.rows,
    setRows: rowState.setRows,
    activeRowIndex: rowState.activeRowIndex,
    setActiveRowIndex: rowState.setActiveRowIndex,
    duplicateWarning: rowState.duplicateWarning,
    highlightedResult: rowState.highlightedResult,
    setHighlightedResult: rowState.setHighlightedResult,
    shakeRowIndex: rowState.shakeRowIndex,
    setShakeRowIndex: rowState.setShakeRowIndex,

    // Lot state
    lotModeEnabled: lotMode.lotModeEnabled,
    setLotModeEnabled: lotMode.setLotModeEnabled,
    lotName: lotMode.lotName,
    setLotName: lotMode.setLotName,
    lotTotalCost: lotMode.lotTotalCost,
    setLotTotalCost: lotMode.setLotTotalCost,
    lotCards: lotMode.lotCards,
    lotSubmitting: lotMode.lotSubmitting,
    lotError: lotMode.lotError,
    setLotError: lotMode.setLotError,
    lotTotalCards: lotMode.lotTotalCards,
    lotPerCardCost: lotMode.lotPerCardCost,

    // Computed values
    runningTotal,

    // Refs
    inputRefs: rowState.inputRefs,
    dropdownRef: rowState.dropdownRef,

    // Handlers
    handleCardNameChange,
    handleSelectCard,
    handleSetChange,
    handleAddCardToLot,
    handleSubmitLot: lotMode.submitLot,
    handleRemoveCardFromLot: lotMode.removeCardFromLot,
    handleAddCardToInventory,
    handleAddNewRow,
    handleSubmitAll,
    handleClearRow,
    handleDuplicatePrevious,
    updateRowField: rowState.updateRowField,

    // Batch submission state
    pendingCount: rowState.pendingCount,
    isSubmitting,
    submitError,
    setSubmitError,
  };
}

export default useRapidEntry;
