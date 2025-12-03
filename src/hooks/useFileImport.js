/**
 * Custom hook for file import functionality
 * Handles CSV parsing, format detection, and card validation
 * @module hooks/useFileImport
 */
import { useState, useCallback } from 'react';

/**
 * Generate a unique ID for rows
 * @param {number} index - Optional index to include in ID
 * @returns {string} Unique ID
 */
let idCounter = 0;
const generateId = (index = 0) => {
  idCounter += 1;
  return `row-${Date.now()}-${idCounter}-${index}`;
};

/**
 * Column mappings for different CSV formats
 */
const COLUMN_MAPPINGS = {
  moxfield: {
    quantity: ['count', 'quantity'],
    name: ['name'],
    set: ['edition', 'set'],
    condition: ['condition'],
    foil: ['foil'],
    price: ['purchase price', 'price'],
    collector_number: ['collector number'],
  },
  deckbox: {
    quantity: ['count'],
    name: ['name'],
    set: ['edition'],
    condition: ['condition'],
    foil: ['foil'],
    language: ['language'],
    price: ['price'],
  },
  tcgplayer: {
    quantity: ['quantity'],
    name: ['card name', 'name'],
    set_name: ['set name'],
    condition: ['condition'],
    foil: ['printing'],
    price: ['tcg marketplace price', 'price'],
  },
  archidekt: {
    quantity: ['count', 'quantity'],
    name: ['name'],
    set: ['edition', 'set'],
    condition: ['condition'],
    foil: ['foil'],
    price: ['purchase price', 'price'],
    collector_number: ['collector number'],
  },
};

/**
 * Condition mapping to normalize different formats
 */
const CONDITION_MAP = {
  'near mint': 'NM',
  'nm': 'NM',
  'lightly played': 'LP',
  'lp': 'LP',
  'moderately played': 'MP',
  'mp': 'MP',
  'heavily played': 'HP',
  'hp': 'HP',
  'damaged': 'DMG',
  'dmg': 'DMG',
};

/**
 * Normalize condition value
 * @param {string} condition - Raw condition value
 * @returns {string} Normalized condition (NM, LP, MP, HP, DMG)
 */
const normalizeCondition = (condition) => {
  if (!condition) return 'NM';
  const lower = condition.toLowerCase().trim();
  return CONDITION_MAP[lower] || 'NM';
};

/**
 * Parse foil value from different formats
 * @param {string} value - Raw foil value
 * @returns {boolean} Whether the card is foil
 */
const parseFoil = (value) => {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return ['yes', 'true', 'foil', '1'].includes(lower);
};

/**
 * Parse a CSV line handling quoted fields with commas
 * @param {string} line - CSV line to parse
 * @returns {string[]} Parsed fields
 */
export const parseCSVLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Check for escaped quote
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  fields.push(current.trim());
  
  return fields;
};

/**
 * Parse simple text format (line by line)
 * Supports: "4x Card Name", "4 Card Name", "Card Name", "4x Card Name (SET)"
 * @param {string} text - Text content to parse
 * @returns {Object[]} Parsed cards
 */
export const parseSimpleText = (text) => {
  const cards = [];
  const lines = text.split('\n');
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) return;
    
    // Match patterns: "4x Card Name", "4 Card Name", "Card Name"
    const match = trimmed.match(/^(\d+)\s*x?\s+(.+)$/i);
    
    let quantity = 1;
    let cardPart = trimmed;
    
    if (match) {
      quantity = parseInt(match[1], 10);
      cardPart = match[2].trim();
    }
    
    // Try to extract set code from parentheses: "Card Name (SET)"
    const setMatch = cardPart.match(/^(.+?)\s*\(\s*([A-Za-z0-9]{2,5})\s*\)(?:\s+\d+)?$/);
    
    let name = cardPart;
    let set = '';
    
    if (setMatch) {
      name = setMatch[1].trim();
      set = setMatch[2].toUpperCase();
    }
    
    cards.push({
      id: generateId(index),
      name,
      set,
      set_name: '',
      quantity,
      condition: 'NM',
      foil: false,
      price: '',
      collector_number: '',
      status: 'pending',
      error: null,
    });
  });
  
  return cards;
};

/**
 * Detect CSV format from headers
 * @param {string[]} headers - CSV header row
 * @returns {string} Detected format name
 */
export const detectFormat = (headers) => {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Check for TCGPlayer specific headers
  if (lowerHeaders.includes('tcg marketplace price') || 
      lowerHeaders.includes('set name')) {
    return 'tcgplayer';
  }
  
  // Check for Deckbox (has Language column)
  if (lowerHeaders.includes('language')) {
    return 'deckbox';
  }
  
  // Check for Moxfield/Archidekt (they're similar)
  if (lowerHeaders.includes('edition') || lowerHeaders.includes('purchase price')) {
    // Archidekt often has collector number
    if (lowerHeaders.includes('collector number')) {
      return 'archidekt';
    }
    return 'moxfield';
  }
  
  // Default to moxfield if we have count/quantity and name
  if ((lowerHeaders.includes('count') || lowerHeaders.includes('quantity')) && 
      lowerHeaders.includes('name')) {
    return 'moxfield';
  }
  
  return 'simple';
};

/**
 * Parse CSV content using detected or specified format
 * @param {string} content - CSV content
 * @param {string} format - Format to use (or 'auto' for detection)
 * @returns {Object} Parsed result with cards and detected format
 */
export const parseCSV = (content, format = 'auto') => {
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { cards: [], format: 'unknown', error: 'Empty file' };
  }
  
  const headers = parseCSVLine(lines[0]);
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Detect format if auto
  const detectedFormat = format === 'auto' ? detectFormat(headers) : format;
  
  // If simple text format, use the simple parser
  if (detectedFormat === 'simple') {
    return { cards: parseSimpleText(content), format: 'simple' };
  }
  
  const mapping = COLUMN_MAPPINGS[detectedFormat] || COLUMN_MAPPINGS.moxfield;
  
  // Build column index map
  const getColumnIndex = (possibleNames) => {
    for (const name of possibleNames) {
      const idx = lowerHeaders.indexOf(name);
      if (idx !== -1) return idx;
    }
    return -1;
  };
  
  const indices = {
    quantity: getColumnIndex(mapping.quantity),
    name: getColumnIndex(mapping.name),
    set: getColumnIndex(mapping.set || []),
    set_name: getColumnIndex(mapping.set_name || []),
    condition: getColumnIndex(mapping.condition || []),
    foil: getColumnIndex(mapping.foil || []),
    price: getColumnIndex(mapping.price || []),
    collector_number: getColumnIndex(mapping.collector_number || []),
    language: getColumnIndex(mapping.language || []),
  };
  
  // Name column is required
  if (indices.name === -1) {
    return { cards: [], format: detectedFormat, error: 'Could not find card name column' };
  }
  
  const cards = [];
  
  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length === 0 || !fields[0]) continue;
    
    const getValue = (index) => index >= 0 && index < fields.length ? fields[index] : '';
    
    const name = getValue(indices.name);
    if (!name) continue;
    
    const quantityStr = getValue(indices.quantity);
    const quantity = quantityStr ? parseInt(quantityStr, 10) || 1 : 1;
    
    const card = {
      id: generateId(i),
      name,
      set: getValue(indices.set).toUpperCase(),
      set_name: getValue(indices.set_name),
      quantity,
      condition: normalizeCondition(getValue(indices.condition)),
      foil: parseFoil(getValue(indices.foil)),
      price: getValue(indices.price),
      collector_number: getValue(indices.collector_number),
      status: 'pending',
      error: null,
    };
    
    cards.push(card);
  }
  
  return { cards, format: detectedFormat };
};

/**
 * Custom hook for file import
 * @param {Object} options
 * @param {Function} options.addInventoryItem - Function to add item to inventory
 * @param {Function} options.showToast - Function to show toast notifications
 * @returns {Object} Hook state and functions
 */
export function useFileImport({ addInventoryItem, showToast }) {
  const [parsedCards, setParsedCards] = useState([]);
  const [detectedFormat, setDetectedFormat] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  /**
   * Read and parse a file
   * @param {File} file - File to parse
   * @param {string} format - Format to use ('auto' for detection)
   */
  const parseFile = useCallback(async (file, format = 'auto') => {
    setIsLoading(true);
    setError(null);
    setParsedCards([]);
    
    try {
      const text = await file.text();
      
      // Check if it's simple text format (no headers)
      const firstLine = text.split('\n')[0].trim();
      const looksLikeSimple = !firstLine.includes(',') || 
                              /^\d+\s*x?\s+/i.test(firstLine);
      
      let result;
      if ((format === 'auto' && looksLikeSimple) || format === 'simple') {
        result = { cards: parseSimpleText(text), format: 'simple' };
      } else {
        result = parseCSV(text, format);
      }
      
      if (result.error) {
        setError(result.error);
      } else {
        setParsedCards(result.cards);
        setDetectedFormat(result.format);
      }
    } catch (err) {
      setError('Failed to read file: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update a single card in the parsed list
   * @param {string} id - Card row ID
   * @param {Object} updates - Fields to update
   */
  const updateCard = useCallback((id, updates) => {
    setParsedCards(prev => prev.map(card => 
      card.id === id ? { ...card, ...updates } : card
    ));
  }, []);

  /**
   * Remove a card from the parsed list
   * @param {string} id - Card row ID
   */
  const removeCard = useCallback((id) => {
    setParsedCards(prev => prev.filter(card => card.id !== id));
  }, []);

  /**
   * Import all valid cards to inventory
   * @param {string} folder - Destination folder
   */
  const importCards = useCallback(async (folder = 'Unsorted') => {
    const validCards = parsedCards.filter(card => card.status !== 'error');
    
    if (validCards.length === 0) {
      showToast?.('No valid cards to import', 'warning');
      return;
    }
    
    setIsImporting(true);
    setImportProgress({ current: 0, total: validCards.length });
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < validCards.length; i++) {
      const card = validCards[i];
      
      try {
        const item = {
          name: card.name,
          set: card.set || 'Unknown',
          set_name: card.set_name || '',
          quantity: card.quantity,
          purchase_price: card.price ? parseFloat(card.price) : null,
          folder,
          foil: card.foil,
          quality: card.condition,
        };
        
        await addInventoryItem(item);
        
        // Mark as imported
        setParsedCards(prev => prev.map(c => 
          c.id === card.id ? { ...c, status: 'imported' } : c
        ));
        
        successCount++;
      } catch (err) {
        // Mark as error
        setParsedCards(prev => prev.map(c => 
          c.id === card.id ? { ...c, status: 'error', error: err.message } : c
        ));
        errorCount++;
      }
      
      setImportProgress({ current: i + 1, total: validCards.length });
    }
    
    setIsImporting(false);
    
    if (successCount > 0) {
      showToast?.(`Successfully imported ${successCount} cards${errorCount > 0 ? ` (${errorCount} failed)` : ''}`, 'success');
    } else if (errorCount > 0) {
      showToast?.(`Failed to import ${errorCount} cards`, 'error');
    }
  }, [parsedCards, addInventoryItem, showToast]);

  /**
   * Clear all parsed cards
   */
  const clearCards = useCallback(() => {
    setParsedCards([]);
    setDetectedFormat('');
    setError(null);
  }, []);

  return {
    parsedCards,
    detectedFormat,
    isLoading,
    isImporting,
    importProgress,
    error,
    parseFile,
    updateCard,
    removeCard,
    importCards,
    clearCards,
  };
}

export default useFileImport;
