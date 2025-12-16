import { useState, useRef, useCallback, useMemo } from 'react';

// Quality options
export const QUALITY_OPTIONS = ['NM', 'LP', 'MP', 'HP', 'DMG'];

/**
 * Create a blank row template
 */
export const createEmptyRow = (stickyFolder = 'Uncategorized') => ({
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
  status: 'editing', // 'editing' | 'valid' | 'added' | 'error' | 'pending'
  imageUrl: '',
});

/**
 * Parse quantity from card name input (e.g., "4 Lightning Bolt" -> { qty: 4, name: "Lightning Bolt" })
 */
export const parseQuantityFromInput = (input) => {
  const match = input.match(/^(\d+)\s+(.+)$/);
  if (match) {
    return { quantity: parseInt(match[1], 10), cardName: match[2] };
  }
  return { quantity: 1, cardName: input };
};

/**
 * useRowState - Manages row state for rapid entry table
 * Extracted from useRapidEntry for better separation of concerns
 */
export function useRowState() {
  const [rows, setRows] = useState([createEmptyRow()]);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [stickyFolder, setStickyFolder] = useState('Uncategorized');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [highlightedResult, setHighlightedResult] = useState(0);
  const [shakeRowIndex, setShakeRowIndex] = useState(null);

  // Refs
  const inputRefs = useRef({});
  const dropdownRef = useRef(null);

  // Count pending valid cards
  const pendingCards = useMemo(() =>
    rows.filter(row => row.status === 'valid' || row.status === 'pending'),
    [rows]
  );

  const pendingCount = pendingCards.length;

  // Update a single row
  const updateRow = useCallback((rowIndex, updates) => {
    setRows(prev => prev.map((row, idx) =>
      idx === rowIndex ? { ...row, ...updates } : row
    ));
  }, []);

  // Update a single field in a row
  const updateRowField = useCallback((rowIndex, field, value) => {
    setRows(prev => prev.map((r, idx) =>
      idx === rowIndex ? { ...r, [field]: value } : r
    ));
  }, []);

  // Clear a row
  const clearRow = useCallback((rowIndex) => {
    setRows(prev => prev.map((r, idx) =>
      idx === rowIndex ? createEmptyRow(stickyFolder) : r
    ));
    setDuplicateWarning(null);
  }, [stickyFolder]);

  // Add a new empty row
  const addNewRow = useCallback(() => {
    const newRow = createEmptyRow(stickyFolder);
    setRows(prev => [...prev, newRow]);
    return rows.length; // Return the index of the new row
  }, [stickyFolder, rows.length]);

  // Mark a row as having a specific status
  const setRowStatus = useCallback((rowIndex, status) => {
    setRows(prev => prev.map((r, idx) =>
      idx === rowIndex ? { ...r, status } : r
    ));
  }, []);

  // Reset all rows
  const resetRows = useCallback(() => {
    setRows([createEmptyRow(stickyFolder)]);
    setActiveRowIndex(0);
    setDuplicateWarning(null);
  }, [stickyFolder]);

  // Remove successfully submitted rows
  const removeSubmittedRows = useCallback((successRowIds) => {
    setRows(prev => {
      const remainingRows = prev.filter(r => !successRowIds.has(r.id));
      return remainingRows.length > 0 ? remainingRows : [createEmptyRow(stickyFolder)];
    });
  }, [stickyFolder]);

  // Duplicate previous row data into current row
  const duplicatePrevious = useCallback((rowIndex) => {
    if (rowIndex === 0) return false;

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
    return true;
  }, []);

  // Focus on a specific input
  const focusInput = useCallback((inputId, delay = 50) => {
    setTimeout(() => {
      const input = inputRefs.current[inputId];
      if (input) input.focus();
    }, delay);
  }, []);

  // Get row by index
  const getRow = useCallback((index) => rows[index], [rows]);

  // Get valid rows for submission
  const getValidRows = useCallback(() =>
    rows.filter(row => (row.status === 'valid' || row.status === 'pending') && row.selectedCard),
    [rows]
  );

  return {
    // State
    rows,
    setRows,
    activeRowIndex,
    setActiveRowIndex,
    stickyFolder,
    setStickyFolder,
    duplicateWarning,
    setDuplicateWarning,
    highlightedResult,
    setHighlightedResult,
    shakeRowIndex,
    setShakeRowIndex,

    // Computed
    pendingCards,
    pendingCount,

    // Refs
    inputRefs,
    dropdownRef,

    // Actions
    updateRow,
    updateRowField,
    clearRow,
    addNewRow,
    setRowStatus,
    resetRows,
    removeSubmittedRows,
    duplicatePrevious,
    focusInput,
    getRow,
    getValidRows,
  };
}

export default useRowState;
