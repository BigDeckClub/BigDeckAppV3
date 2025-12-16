/**
 * Card utility helper functions
 */

/**
 * Get a display-friendly set name from a card's set property.
 * Handles both string format (e.g., "MH3") and object format 
 * (e.g., { editioncode: "mh3", editionname: "Modern Horizons 3", ... })
 * 
 * @param {string|Object} set - The card's set property
 * @param {boolean} preferCode - If true, prefer set code over full name (default: false)
 * @returns {string} - Display-friendly set name
 */
export const getSetDisplayName = (set, preferCode = false) => {
  if (!set) return 'Unknown';
  if (typeof set === 'string') return set;
  if (typeof set === 'object') {
    if (preferCode) {
      return set.editioncode?.toUpperCase() || set.editionname || 'Unknown';
    }
    return set.editionname || set.editioncode?.toUpperCase() || 'Unknown';
  }
  return 'Unknown';
};

/**
 * Get the set code from a card's set property.
 *
 * @param {string|Object} set - The card's set property
 * @returns {string} - Set code (e.g., "MH3")
 */
export const getSetCode = (set) => {
  if (!set) return '';
  // Handle string codes and guard against literal 'unknown'
  if (typeof set === 'string') {
    const val = set.toString().trim();
    if (!val) return '';
    if (val.toLowerCase() === 'unknown') return '';
    return val.toUpperCase();
  }
  if (typeof set === 'object') {
    const candidate = (set.editioncode || set.mtgoCode || '').toString().trim();
    if (!candidate) return '';
    if (candidate.toLowerCase() === 'unknown') return '';
    return candidate.toUpperCase();
  }
  return '';
};

/**
 * Normalize card name for consistent lookups and comparisons.
 * Removes diacritics, special characters, and normalizes whitespace.
 *
 * @param {string} name - Card name to normalize
 * @returns {string} - Normalized card name (lowercase, no special chars)
 */
export const normalizeCardName = (name) => {
  return (name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Format a number as currency (USD)
 * Uses compact format for values >= $100
 *
 * @param {number} value - Value to format
 * @returns {string} - Formatted currency string (e.g., "$12.50" or "$100")
 */
export const formatCurrency = (value) => {
  const num = parseFloat(value) || 0;
  return num >= 100 ? `$${num.toFixed(0)}` : `$${num.toFixed(2)}`;
};

/**
 * Format a date string to a readable format
 *
 * @param {string|Date} dateString - ISO date string or Date object
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date (e.g., "Dec 15, 2024")
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  };
  return new Date(dateString).toLocaleDateString('en-US', defaultOptions);
};

/**
 * Calculate average price from an array of items with purchase_price
 *
 * @param {Array} items - Array of objects with purchase_price property
 * @returns {number} - Average price (0 if empty array)
 */
export const calculateAvgPrice = (items) => {
  if (!items || items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0);
  return total / items.length;
};

/**
 * Get Scryfall image URL for a card
 *
 * @param {string} cardName - Name of the card
 * @param {string|Object} setCode - Set code or set object (optional)
 * @param {string} version - Image version (default: 'normal')
 * @returns {string} - Scryfall image URL
 */
export const getCardImageUrl = (cardName, setCode = '', version = 'normal') => {
  if (!cardName) return '';
  const encodedName = encodeURIComponent(cardName.split('//')[0].trim());
  const safeSet = getSetCode(setCode);

  const baseUrl = 'https://api.scryfall.com/cards/named';
  const params = new URLSearchParams({
    exact: cardName.split('//')[0].trim(),
    format: 'image',
    version
  });

  if (safeSet) {
    params.set('set', safeSet.toLowerCase());
  }

  return `${baseUrl}?${params.toString()}`;
};
