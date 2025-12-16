/**
 * Card utility helper functions (Server-side)
 * Shared utilities for card name normalization and formatting
 */

/**
 * Normalize card name for consistent lookups and comparisons.
 * Removes diacritics, special characters, and normalizes whitespace.
 *
 * @param {string} name - Card name to normalize
 * @returns {string} - Normalized card name (lowercase, no special chars)
 */
export function normalizeCardName(name) {
  return (name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get the set code from a card's set property.
 *
 * @param {string|Object} set - The card's set property
 * @returns {string} - Set code (e.g., "MH3")
 */
export function getSetCode(set) {
  if (!set) return '';
  if (typeof set === 'string') {
    const val = set.toString().trim();
    if (!val || val.toLowerCase() === 'unknown') return '';
    return val.toUpperCase();
  }
  if (typeof set === 'object') {
    const candidate = (set.editioncode || set.mtgoCode || '').toString().trim();
    if (!candidate || candidate.toLowerCase() === 'unknown') return '';
    return candidate.toUpperCase();
  }
  return '';
}

/**
 * Get a display-friendly set name from a card's set property.
 *
 * @param {string|Object} set - The card's set property
 * @param {boolean} preferCode - If true, prefer set code over full name
 * @returns {string} - Display-friendly set name
 */
export function getSetDisplayName(set, preferCode = false) {
  if (!set) return 'Unknown';
  if (typeof set === 'string') return set;
  if (typeof set === 'object') {
    if (preferCode) {
      return set.editioncode?.toUpperCase() || set.editionname || 'Unknown';
    }
    return set.editionname || set.editioncode?.toUpperCase() || 'Unknown';
  }
  return 'Unknown';
}

/**
 * Format a number as currency (USD)
 *
 * @param {number} value - Value to format
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return num >= 100 ? `$${num.toFixed(0)}` : `$${num.toFixed(2)}`;
}

/**
 * Format a date to readable string
 *
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} - Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
