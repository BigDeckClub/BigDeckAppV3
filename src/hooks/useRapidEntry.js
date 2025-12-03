import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { api } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

// Quality options
export const QUALITY_OPTIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

// Create a blank row template
export const createEmptyRow = (stickyFolder = 'Unsorted') => ({
  id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  cardName: '',
  searchQuery: '',
  selectedCard: null,
  set: '',
  setName: '',
  availableSets: [],
  quantity: 1,
  price: '',
  foil: false,
  quality: 'NM',
  folder: stickyFolder,
  status: 'editing', // 'editing' | 'valid' | 'added' | 'error'
  imageUrl: '',
});

// Parse quantity from card name input (e.g., "4 Lightning Bolt" -> { qty: 4, name: "Lightning Bolt" })
// Moved outside hook since it's a pure function with no dependencies
const parseQuantityFromInput = (input) => {
  const match = input.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return { quantity: parseInt(match[1], 10), cardName: match[2] };
  }
  return { quantity: 1, cardName: input };
};

// Calculate per-card cost (shared logic for consistency)
// Moved outside hook since it's a pure function with no dependencies
const calculatePerCardCost = (totalCost, totalCards) => {
  const cost = parseFloat(totalCost);
  if (totalCards > 0 && !isNaN(cost) && cost > 0) {
    return cost / totalCards;
  }
  return 0;
};

/**
 * Custom hook for managing rapid entry table state and handlers
 */
export function useRapidEntry({
  onAddCard,
  handleSearch,
  searchResults,
  setShowDropdown,
}) {
  // Row state
  const [rows, setRows] = useState([createEmptyRow()]);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [stickyFolder, setStickyFolder] = useState('Unsorted');
  const [addedCards, setAddedCards] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [highlightedResult, setHighlightedResult] = useState(0);
  const [shakeRowIndex, setShakeRowIndex] = useState(null);
  
  // Lot Mode state
  const [lotModeEnabled, setLotModeEnabled] = useState(false);
  const [lotName, setLotName] = useState('');
  const [lotTotalCost, setLotTotalCost] = useState('');
  const [lotCards, setLotCards] = useState([]);
  const [lotSubmitting, setLotSubmitting] = useState(false);
  const [lotError, setLotError] = useState(null);
  
  // Refs
  const inputRefs = useRef({});
  const dropdownRef = useRef(null);

  // Calculate running totals (memoized)
  const runningTotal = useMemo(() => 
    addedCards.reduce((acc, card) => ({
      count: acc.count + (card.quantity || 1),
      price: acc.price + ((card.quantity || 1) * (parseFloat(card.price) || 0)),
    }), { count: 0, price: 0 }),
    [addedCards]
  );

  // Calculate lot totals (memoized)
  const lotTotalCards = useMemo(() => 
    lotCards.reduce((sum, card) => sum + (card.quantity || 1), 0),
    [lotCards]
  );
  
  const lotPerCardCost = useMemo(() => 
    calculatePerCardCost(lotTotalCost, lotTotalCards),
    [lotTotalCost, lotTotalCards]
  );

  // Handle card name input change
  const handleCardNameChange = useCallback((rowIndex, value) => {
    const { quantity, cardName } = parseQuantityFromInput(value);
    
    setRows(prev => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      return {
        ...row,
        searchQuery: value,
        cardName: cardName,
        quantity: quantity > 1 ? quantity : row.quantity,
        selectedCard: null,
        status: 'editing',
      };
    }));
    
    setActiveRowIndex(rowIndex);
    setHighlightedResult(0);
    
    // Trigger search
    if (cardName.length >= 2) {
      handleSearch(cardName);
    }
  }, [handleSearch, setRows, setActiveRowIndex, setHighlightedResult]);

  // Handle selecting a card from search results
  const handleSelectCard = useCallback((rowIndex, card) => {
    // Check for duplicates in current session
    const isDuplicate = addedCards.some(
      added => added.cardName.toLowerCase() === card.name.toLowerCase()
    );
    
    if (isDuplicate) {
      setDuplicateWarning({ rowIndex, cardName: card.name });
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

    setRows(prev => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      return {
        ...row,
        cardName: card.name,
        searchQuery: card.name,
        selectedCard: card,
        set: card.set,
        setName: card.setName,
        availableSets: cardSets,
        imageUrl: card.imageUrl,
        status: 'valid',
      };
    }));
    
    setShowDropdown(false);
    setHighlightedResult(0);
    
    // Focus on the set dropdown or quantity field
    setTimeout(() => {
      const qtyInput = inputRefs.current[`qty-${rowIndex}`];
      if (qtyInput) qtyInput.focus();
    }, 50);
  }, [addedCards, searchResults, setShowDropdown, setRows, setDuplicateWarning, setHighlightedResult]);

  // Handle set change
  const handleSetChange = useCallback((rowIndex, setCode) => {
    setRows(prev => {
      const row = prev[rowIndex];
      const selectedSet = row.availableSets.find(s => s.set === setCode);
      
      return prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        return {
          ...r,
          set: setCode,
          setName: selectedSet?.setName || '',
          imageUrl: selectedSet?.imageUrl || r.imageUrl,
        };
      });
    });
  }, [setRows]);

  // Handle adding a card to lot (when lot mode is enabled)
  const handleAddCardToLot = useCallback((rowIndex) => {
    const row = rows[rowIndex];
    
    if (!row.selectedCard) {
      return;
    }

    const cardData = {
      name: row.cardName,
      set: row.set,
      set_name: row.setName,
      quantity: row.quantity,
      foil: row.foil,
      quality: row.quality,
      folder: row.folder || 'Unsorted',
      image_url: row.imageUrl,
    };

    // Add to lot cards
    setLotCards(prev => [...prev, cardData]);
    
    // Mark row as added (to lot)
    setRows(prev => prev.map((r, idx) => {
      if (idx !== rowIndex) return r;
      return { ...r, status: 'added' };
    }));

    // Update sticky folder
    if (row.folder && row.folder !== 'Unsorted') {
      setStickyFolder(row.folder);
    }

    // Add new empty row and focus it
    const newRow = createEmptyRow(stickyFolder);
    const newRowIndex = rows.length;
    setRows(prev => [...prev, newRow]);
    setActiveRowIndex(newRowIndex);
    
    // Clear duplicate warning
    setDuplicateWarning(null);
    
    // Focus on new row's card name input
    setTimeout(() => {
      const newInput = inputRefs.current[`name-${newRowIndex}`];
      if (newInput) newInput.focus();
    }, 50);
  }, [rows, stickyFolder, setRows, setLotCards, setStickyFolder, setActiveRowIndex, setDuplicateWarning]);

  // Handle submitting all cards in the lot
  const handleSubmitLot = useCallback(async () => {
    if (lotCards.length === 0) {
      return;
    }

    setLotSubmitting(true);
    setLotError(null);

    try {
      // First, create the lot
      const parsedCost = lotTotalCost ? parseFloat(lotTotalCost) : null;
      const lotData = await api.post(API_ENDPOINTS.LOTS, {
        name: lotName || 'Unnamed Lot',
        total_cost: parsedCost,
        card_count: lotTotalCards,
      });

      // Then, add all cards to the lot (the lot already has the cost info)
      await api.post(`${API_ENDPOINTS.LOTS}/${lotData.id}/cards`, {
        cards: lotCards,
      });

      // Track added cards for running totals
      lotCards.forEach(card => {
        setAddedCards(prev => [...prev, {
          cardName: card.name,
          quantity: card.quantity,
          price: parseFloat(lotPerCardCost.toFixed(2)),
        }]);
      });

      // Reset lot state
      setLotCards([]);
      setLotName('');
      setLotTotalCost('');
      
      // Reset rows
      setRows([createEmptyRow(stickyFolder)]);
      setActiveRowIndex(0);
      
      // Focus on first row
      setTimeout(() => {
        const firstInput = inputRefs.current['name-0'];
        if (firstInput) firstInput.focus();
      }, 50);
    } catch (error) {
      console.error('Error submitting lot:', error);
      setLotError(error.message || error.data?.error || 'Failed to submit lot. Please try again.');
    } finally {
      setLotSubmitting(false);
    }
  }, [lotCards, lotTotalCost, lotName, lotTotalCards, lotPerCardCost, stickyFolder, setAddedCards, setLotCards, setLotName, setLotTotalCost, setRows, setActiveRowIndex, setLotSubmitting, setLotError]);

  // Remove a card from the lot
  const handleRemoveCardFromLot = useCallback((index) => {
    setLotCards(prev => prev.filter((_, i) => i !== index));
  }, [setLotCards]);

  // Handle adding a card to inventory
  const handleAddCardToInventory = useCallback(async (rowIndex) => {
    const row = rows[rowIndex];
    
    if (!row.selectedCard) {
      return;
    }

    // If lot mode is enabled, add to lot instead
    if (lotModeEnabled) {
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
      folder: row.folder || 'Unsorted',
      image_url: row.imageUrl,
    };

    try {
      await onAddCard(cardData);
      
      // Mark row as added
      setRows(prev => prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        return { ...r, status: 'added' };
      }));

      // Track added card for duplicate detection and totals
      setAddedCards(prev => [...prev, {
        cardName: row.cardName,
        quantity: row.quantity,
        price: row.price,
      }]);

      // Update sticky folder
      if (row.folder && row.folder !== 'Unsorted') {
        setStickyFolder(row.folder);
      }

      // Add new empty row and focus it
      const newRow = createEmptyRow(stickyFolder);
      const newRowIndex = rows.length;
      setRows(prev => [...prev, newRow]);
      setActiveRowIndex(newRowIndex);
      
      // Clear duplicate warning
      setDuplicateWarning(null);
      
      // Focus on new row's card name input
      setTimeout(() => {
        const newInput = inputRefs.current[`name-${newRowIndex}`];
        if (newInput) newInput.focus();
      }, 50);
    } catch (error) {
      setRows(prev => prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        return { ...r, status: 'error' };
      }));
    }
  }, [rows, lotModeEnabled, handleAddCardToLot, onAddCard, stickyFolder, setRows, setAddedCards, setStickyFolder, setActiveRowIndex, setDuplicateWarning]);

  // Handle clearing a row
  const handleClearRow = useCallback((rowIndex) => {
    setRows(prev => prev.map((r, idx) => {
      if (idx !== rowIndex) return r;
      return createEmptyRow(stickyFolder);
    }));
    setDuplicateWarning(null);
    
    // Focus on card name input
    setTimeout(() => {
      const input = inputRefs.current[`name-${rowIndex}`];
      if (input) input.focus();
    }, 50);
  }, [stickyFolder, setRows, setDuplicateWarning]);

  // Handle duplicating previous row
  const handleDuplicatePrevious = useCallback((rowIndex) => {
    if (rowIndex === 0) return;
    
    setRows(prev => {
      const prevRow = prev[rowIndex - 1];
      if (!prevRow.selectedCard) return prev;
      
      return prev.map((r, idx) => {
        if (idx !== rowIndex) return r;
        return {
          ...r,
          cardName: prevRow.cardName,
          searchQuery: prevRow.cardName,
          selectedCard: prevRow.selectedCard,
          set: prevRow.set,
          setName: prevRow.setName,
          availableSets: prevRow.availableSets,
          quantity: prevRow.quantity,
          price: prevRow.price,
          foil: prevRow.foil,
          quality: prevRow.quality,
          folder: prevRow.folder,
          imageUrl: prevRow.imageUrl,
          status: 'valid',
        };
      });
    });
  }, [setRows]);

  // Update row field
  const updateRowField = useCallback((rowIndex, field, value) => {
    setRows(prev => prev.map((r, idx) => 
      idx === rowIndex ? { ...r, [field]: value } : r
    ));
  }, [setRows]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowDropdown]);

  return {
    // Row state
    rows,
    setRows,
    activeRowIndex,
    setActiveRowIndex,
    duplicateWarning,
    highlightedResult,
    setHighlightedResult,
    shakeRowIndex,
    setShakeRowIndex,
    
    // Lot state
    lotModeEnabled,
    setLotModeEnabled,
    lotName,
    setLotName,
    lotTotalCost,
    setLotTotalCost,
    lotCards,
    lotSubmitting,
    lotError,
    setLotError,
    lotTotalCards,
    lotPerCardCost,
    
    // Computed values
    runningTotal,
    
    // Refs
    inputRefs,
    dropdownRef,
    
    // Handlers
    handleCardNameChange,
    handleSelectCard,
    handleSetChange,
    handleAddCardToLot,
    handleSubmitLot,
    handleRemoveCardFromLot,
    handleAddCardToInventory,
    handleClearRow,
    handleDuplicatePrevious,
    updateRowField,
  };
}

export default useRapidEntry;
