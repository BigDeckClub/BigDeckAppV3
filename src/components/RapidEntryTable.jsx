import React, { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Plus, Check, X, Copy, AlertTriangle, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { api } from '../utils/apiClient';
import { API_ENDPOINTS } from '../config/api';

// Quality options
const QUALITY_OPTIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

// Create a blank row template
const createEmptyRow = (stickyFolder = 'Unsorted') => ({
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

export const RapidEntryTable = ({
  onAddCard,
  allSets = [],
  createdFolders = [],
  handleSearch,
  searchResults = [],
  showDropdown = false,
  setShowDropdown,
  searchIsLoading = false,
}) => {
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
  
  const inputRefs = useRef({});
  const dropdownRef = useRef(null);

  // Calculate running totals
  const runningTotal = addedCards.reduce((acc, card) => ({
    count: acc.count + (card.quantity || 1),
    price: acc.price + ((card.quantity || 1) * (parseFloat(card.price) || 0)),
  }), { count: 0, price: 0 });

  // Calculate lot totals
  const lotTotalCards = lotCards.reduce((sum, card) => sum + (card.quantity || 1), 0);
  const parsedLotCost = parseFloat(lotTotalCost);
  const lotPerCardCost = lotTotalCards > 0 && !isNaN(parsedLotCost) && parsedLotCost > 0
    ? parsedLotCost / lotTotalCards 
    : 0;

  // Parse quantity from card name input (e.g., "4 Lightning Bolt" -> { qty: 4, name: "Lightning Bolt" })
  const parseQuantityFromInput = (input) => {
    const match = input.match(/^(\d+)\s+(.+)$/);
    if (match) {
      return { quantity: parseInt(match[1], 10), cardName: match[2] };
    }
    return { quantity: 1, cardName: input };
  };

  // Handle card name input change
  const handleCardNameChange = (rowIndex, value) => {
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
  };

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
  }, [addedCards, searchResults, setShowDropdown]);

  // Handle set change
  const handleSetChange = (rowIndex, setCode) => {
    const row = rows[rowIndex];
    const selectedSet = row.availableSets.find(s => s.set === setCode);
    
    setRows(prev => prev.map((r, idx) => {
      if (idx !== rowIndex) return r;
      return {
        ...r,
        set: setCode,
        setName: selectedSet?.setName || '',
        imageUrl: selectedSet?.imageUrl || r.imageUrl,
      };
    }));
  };

  // Handle adding a card to lot (when lot mode is enabled)
  const handleAddCardToLot = (rowIndex) => {
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
  };

  // Handle submitting all cards in the lot
  const handleSubmitLot = async () => {
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
          price: lotPerCardCost.toFixed(2),
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
      setLotError('Failed to submit lot. Please try again.');
    } finally {
      setLotSubmitting(false);
    }
  };

  // Remove a card from the lot
  const handleRemoveCardFromLot = (index) => {
    setLotCards(prev => prev.filter((_, i) => i !== index));
  };

  // Handle adding a card to inventory
  const handleAddCardToInventory = async (rowIndex) => {
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
      const newRowIndex = rows.length; // Capture current length before state update
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
  };

  // Handle clearing a row
  const handleClearRow = (rowIndex) => {
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
  };

  // Handle duplicating previous row
  const handleDuplicatePrevious = (rowIndex) => {
    if (rowIndex === 0) return;
    
    const prevRow = rows[rowIndex - 1];
    if (!prevRow.selectedCard) return;
    
    setRows(prev => prev.map((r, idx) => {
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
    }));
  };

  // Keyboard navigation
  const handleKeyDown = (e, rowIndex, fieldType) => {
    const row = rows[rowIndex];
    
    // Arrow keys for dropdown navigation
    if (showDropdown && fieldType === 'name' && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedResult(prev => Math.min(prev + 1, searchResults.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedResult(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        // Get unique cards
        const uniqueCards = [];
        const seen = new Set();
        for (const card of searchResults) {
          if (!seen.has(card.name)) {
            seen.add(card.name);
            uniqueCards.push(card);
          }
        }
        if (uniqueCards[highlightedResult]) {
          handleSelectCard(rowIndex, uniqueCards[highlightedResult]);
        }
        return;
      }
    }
    
    // Escape to clear row
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleClearRow(rowIndex);
      return;
    }
    
    // Shift+Enter to add card and create new row
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (row.status === 'valid') {
        handleAddCardToInventory(rowIndex);
      } else {
        // Visual feedback when Shift+Enter fails (card not selected)
        setShakeRowIndex(rowIndex);
        setTimeout(() => setShakeRowIndex(null), 500);
      }
      return;
    }
    
    // Ctrl+D or Ctrl+Shift+D to duplicate previous row
    if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      handleDuplicatePrevious(rowIndex);
      return;
    }
  };

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

  // All available folders
  const allFolders = ['Unsorted', ...createdFolders];

  return (
    <div className="space-y-4">
      {/* Lot Mode Toggle Section */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span className="font-medium text-white">Lot/Pack Mode</span>
          </div>
          <button
            onClick={() => setLotModeEnabled(!lotModeEnabled)}
            className="flex items-center gap-2 text-sm"
            type="button"
          >
            {lotModeEnabled ? (
              <ToggleRight className="w-8 h-8 text-amber-400" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-slate-500" />
            )}
            <span className={lotModeEnabled ? 'text-amber-400' : 'text-slate-500'}>
              {lotModeEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
        
        {lotModeEnabled && (
          <div className="space-y-4">
            {/* Lot Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Lot Name</label>
                <input
                  type="text"
                  placeholder="e.g., Mystery Booster Box, Commander Masters Pack"
                  value={lotName}
                  onChange={(e) => setLotName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Total Lot Cost</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={lotTotalCost}
                    onChange={(e) => setLotTotalCost(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded pl-7 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </div>
              </div>
            </div>
            
            {/* Cards in Lot */}
            {lotCards.length > 0 && (
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Cards in this lot:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {lotCards.map((card, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-slate-900/30 rounded px-3 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">{card.quantity}x</span>
                        <span className="text-white">{card.name}</span>
                        <span className="text-slate-500">({card.set})</span>
                      </div>
                      <button
                        onClick={() => handleRemoveCardFromLot(index)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Lot Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-700 pt-4">
              <div className="flex gap-6">
                <div className="text-sm">
                  <span className="text-slate-400">Total Cards: </span>
                  <span className="font-semibold text-white">{lotTotalCards}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-400">Cost Per Card: </span>
                  <span className="font-semibold text-amber-400">
                    ${lotPerCardCost.toFixed(2)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSubmitLot}
                disabled={lotCards.length === 0 || lotSubmitting}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                  ${lotCards.length > 0 && !lotSubmitting
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }
                `}
                type="button"
              >
                {lotSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Submit All Cards
                  </>
                )}
              </button>
            </div>
            
            {/* Error Message */}
            {lotError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-900/20 rounded px-3 py-2 mt-2">
                <AlertTriangle className="w-4 h-4" />
                <span>{lotError}</span>
                <button 
                  onClick={() => setLotError(null)} 
                  className="ml-auto text-red-400 hover:text-red-300"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-700">
        <div className="col-span-3">Card Name</div>
        <div className="col-span-2">Set</div>
        <div className="col-span-1">Qty</div>
        <div className={`col-span-1 ${lotModeEnabled ? 'opacity-50' : ''}`}>Price</div>
        <div className="col-span-1">Foil</div>
        <div className="col-span-1">Quality</div>
        <div className="col-span-2">Folder</div>
        <div className="col-span-1">Status</div>
      </div>

      {/* Entry Rows */}
      <div className="space-y-2">
        {rows.map((row, rowIndex) => (
          <div
            key={row.id}
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, 'row')}
            className={`
              relative rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-teal-400/50
              ${row.status === 'added' ? 'bg-emerald-900/20 border-emerald-500/50' : ''}
              ${row.status === 'valid' ? 'bg-slate-800/50 border-teal-500/50' : ''}
              ${row.status === 'editing' ? 'bg-slate-800/30 border-slate-600' : ''}
              ${row.status === 'error' ? 'bg-red-900/20 border-red-500/50' : ''}
              ${activeRowIndex === rowIndex ? 'ring-1 ring-teal-400/30' : ''}
              ${shakeRowIndex === rowIndex ? 'animate-shake' : ''}
            `}
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 p-3">
              {/* Card Name with Autocomplete */}
              <div className="md:col-span-3 relative" ref={activeRowIndex === rowIndex ? dropdownRef : null}>
                <label className="md:hidden text-xs text-slate-400 mb-1 block">Card Name</label>
                <div className="flex gap-2">
                  {row.imageUrl && row.status !== 'editing' && (
                    <img 
                      src={row.imageUrl} 
                      alt="" 
                      className="w-8 h-11 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <input
                    ref={el => inputRefs.current[`name-${rowIndex}`] = el}
                    type="text"
                    placeholder="Search card..."
                    value={row.searchQuery}
                    onChange={(e) => handleCardNameChange(rowIndex, e.target.value)}
                    onFocus={() => {
                      setActiveRowIndex(rowIndex);
                      if (row.searchQuery.length >= 2) {
                        setShowDropdown(true);
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, 'name')}
                    disabled={row.status === 'added'}
                    className={`
                      flex-1 bg-slate-900/50 border rounded px-3 py-2 text-sm text-white 
                      placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-400
                      ${row.status === 'valid' ? 'border-teal-500' : 'border-slate-600'}
                      ${row.status === 'added' ? 'opacity-60' : ''}
                    `}
                  />
                </div>
                
                {/* Search Dropdown */}
                {showDropdown && activeRowIndex === rowIndex && searchResults.length > 0 && row.status !== 'added' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto z-30">
                    {searchIsLoading && (
                      <div className="px-4 py-3 text-sm text-slate-400">Searching...</div>
                    )}
                    {(() => {
                      const seen = new Set();
                      return searchResults
                        .filter(card => {
                          if (seen.has(card.name)) return false;
                          seen.add(card.name);
                          return true;
                        })
                        .slice(0, 10)
                        .map((card, idx) => (
                          <div
                            key={`${card.name}-${idx}`}
                            onClick={() => handleSelectCard(rowIndex, card)}
                            className={`
                              px-4 py-2 cursor-pointer border-b border-slate-700 last:border-b-0
                              flex items-center gap-3
                              ${idx === highlightedResult ? 'bg-teal-600/30' : 'hover:bg-teal-600/20'}
                            `}
                          >
                            {card.imageUrl && (
                              <img src={card.imageUrl} alt="" className="w-6 h-8 rounded object-cover" />
                            )}
                            <span className="text-sm font-medium">{card.name}</span>
                          </div>
                        ));
                    })()}
                  </div>
                )}
              </div>

              {/* Set Dropdown */}
              <div className="md:col-span-2">
                <label className="md:hidden text-xs text-slate-400 mb-1 block">Set</label>
                <select
                  value={row.set}
                  onChange={(e) => handleSetChange(rowIndex, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 'set')}
                  disabled={!row.selectedCard || row.status === 'added'}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
                >
                  {row.availableSets.length > 0 ? (
                    row.availableSets.map(s => (
                      <option key={s.set} value={s.set}>{s.set} - {s.setName}</option>
                    ))
                  ) : (
                    <option value="">Select set</option>
                  )}
                </select>
              </div>

              {/* Quantity */}
              <div className="md:col-span-1">
                <label className="md:hidden text-xs text-slate-400 mb-1 block">Qty</label>
                <input
                  ref={el => inputRefs.current[`qty-${rowIndex}`] = el}
                  type="number"
                  min="1"
                  value={row.quantity}
                  onChange={(e) => {
                    const qty = parseInt(e.target.value, 10) || 1;
                    setRows(prev => prev.map((r, idx) => 
                      idx === rowIndex ? { ...r, quantity: qty } : r
                    ));
                  }}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 'qty')}
                  disabled={row.status === 'added'}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
                />
              </div>

              {/* Price */}
              <div className="md:col-span-1">
                <label className="md:hidden text-xs text-slate-400 mb-1 block">Price</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={lotModeEnabled ? "Auto" : "0.00"}
                    value={lotModeEnabled ? '' : row.price}
                    onChange={(e) => {
                      setRows(prev => prev.map((r, idx) => 
                        idx === rowIndex ? { ...r, price: e.target.value } : r
                      ));
                    }}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, 'price')}
                    disabled={row.status === 'added' || lotModeEnabled}
                    className={`w-full bg-slate-900/50 border border-slate-600 rounded pl-5 pr-2 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50 ${lotModeEnabled ? 'cursor-not-allowed' : ''}`}
                    title={lotModeEnabled ? 'Price is calculated from lot total' : ''}
                  />
                </div>
              </div>

              {/* Foil Checkbox */}
              <div className="md:col-span-1 flex items-center">
                <label className="md:hidden text-xs text-slate-400 mr-2">Foil</label>
                <label className="flex items-center justify-center cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={row.foil}
                    onChange={(e) => {
                      setRows(prev => prev.map((r, idx) => 
                        idx === rowIndex ? { ...r, foil: e.target.checked } : r
                      ));
                    }}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, 'foil')}
                    disabled={row.status === 'added'}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-900/50 text-teal-500 focus:ring-teal-400 focus:ring-offset-0 disabled:opacity-50"
                  />
                </label>
              </div>

              {/* Quality Dropdown */}
              <div className="md:col-span-1">
                <label className="md:hidden text-xs text-slate-400 mb-1 block">Quality</label>
                <select
                  value={row.quality}
                  onChange={(e) => {
                    setRows(prev => prev.map((r, idx) => 
                      idx === rowIndex ? { ...r, quality: e.target.value } : r
                    ));
                  }}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 'quality')}
                  disabled={row.status === 'added'}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
                >
                  {QUALITY_OPTIONS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              {/* Folder Dropdown */}
              <div className="md:col-span-2">
                <label className="md:hidden text-xs text-slate-400 mb-1 block">Folder</label>
                <select
                  value={row.folder}
                  onChange={(e) => {
                    setRows(prev => prev.map((r, idx) => 
                      idx === rowIndex ? { ...r, folder: e.target.value } : r
                    ));
                  }}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 'folder')}
                  disabled={row.status === 'added'}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded px-2 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-50"
                >
                  {allFolders.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Status / Actions */}
              <div className="md:col-span-1 flex items-center justify-end gap-1">
                {row.status === 'added' && (
                  <span className={lotModeEnabled ? 'text-amber-400' : 'text-emerald-400'}>
                    <Check className="w-5 h-5" />
                  </span>
                )}
                {row.status === 'valid' && (
                  <button
                    onClick={() => handleAddCardToInventory(rowIndex)}
                    className={`p-1.5 rounded text-white transition-colors ${
                      lotModeEnabled 
                        ? 'bg-amber-600 hover:bg-amber-500' 
                        : 'bg-teal-600 hover:bg-teal-500'
                    }`}
                    title={lotModeEnabled ? "Add to lot (Shift+Enter)" : "Add to inventory (Shift+Enter)"}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
                {row.status !== 'added' && (
                  <>
                    {rowIndex > 0 && rows[rowIndex - 1].selectedCard && (
                      <button
                        onClick={() => handleDuplicatePrevious(rowIndex)}
                        className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        title="Duplicate previous row (Ctrl+D)"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleClearRow(rowIndex)}
                      className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                      title="Clear row (Escape)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Duplicate Warning */}
            {duplicateWarning?.rowIndex === rowIndex && (
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 rounded px-2 py-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>"{duplicateWarning.cardName}" was already added in this session</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Running Totals */}
      <div className="flex justify-end items-center gap-6 px-3 py-3 bg-slate-800/30 rounded-lg border border-slate-700">
        <div className="text-sm text-slate-400">
          Running total: <span className="font-semibold text-white">{runningTotal.count} cards</span>
        </div>
        <div className="text-sm text-slate-400">
          Total: <span className="font-semibold text-teal-400">${runningTotal.price.toFixed(2)}</span>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Enter</kbd> Select card</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Shift+Enter</kbd> Add &amp; new row</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Tab</kbd> Next field</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Esc</kbd> Clear row</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded">Ctrl+D</kbd> Duplicate previous</span>
      </div>
    </div>
  );
};

RapidEntryTable.propTypes = {
  onAddCard: PropTypes.func.isRequired,
  allSets: PropTypes.array,
  createdFolders: PropTypes.array,
  handleSearch: PropTypes.func.isRequired,
  searchResults: PropTypes.array,
  showDropdown: PropTypes.bool,
  setShowDropdown: PropTypes.func.isRequired,
  searchIsLoading: PropTypes.bool,
};

export default RapidEntryTable;
