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
