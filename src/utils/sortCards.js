/**
 * Sorting utility functions for inventory cards
 * Cards are represented as [cardName, items[]] tuples
 */

/**
 * Get the total quantity from a card's items array
 * @param {Array} items - Array of card SKU items
 * @returns {number} Total quantity across all items
 */
export const getTotalQuantity = (items) => {
  return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
};

/**
 * Get the total/average price from a card's items array
 * @param {Array} items - Array of card SKU items
 * @returns {number} Average purchase price
 */
export const getAveragePrice = (items) => {
  if (items.length === 0) return 0;
  const totalPrice = items.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0);
  return totalPrice / items.length;
};

/**
 * Get the total value from a card's items array
 * @param {Array} items - Array of card SKU items
 * @returns {number} Total value (sum of price * quantity for each item)
 */
export const getTotalValue = (items) => {
  return items.reduce((sum, item) => {
    const price = parseFloat(item.purchase_price) || 0;
    const qty = item.quantity || 0;
    return sum + (price * qty);
  }, 0);
};

/**
 * Get the set code from a card's items array
 * Uses the set code from the first item
 * @param {Array} items - Array of card SKU items
 * @returns {string} Set code string
 */
export const getSetCode = (items) => {
  if (items.length === 0) return '';
  const firstItem = items[0];
  if (!firstItem.set) return '';
  // Handle both string and object set formats
  if (typeof firstItem.set === 'string') return firstItem.set.toLowerCase();
  return (firstItem.set.editioncode || firstItem.set.mtgoCode || '').toLowerCase();
};

/**
 * Get the earliest or latest created_at date from a card's items array
 * @param {Array} items - Array of card SKU items
 * @param {string} direction - 'asc' for earliest, 'desc' for latest
 * @returns {Date} The selected date
 */
export const getDateAdded = (items, direction = 'desc') => {
  if (items.length === 0) return new Date(0);
  
  const dates = items
    .map(item => item.created_at ? new Date(item.created_at) : null)
    .filter(Boolean);
  
  if (dates.length === 0) return new Date(0);
  
  // For 'desc' (newest first), we want the latest date first in sorting
  // For 'asc' (oldest first), we want the earliest date first
  return direction === 'desc' 
    ? new Date(Math.max(...dates.map(d => d.getTime())))
    : new Date(Math.min(...dates.map(d => d.getTime())));
};

/**
 * Sort cards array based on specified field and direction
 * @param {Array} cards - Array of [cardName, items[]] tuples
 * @param {string} sortField - Field to sort by ('name', 'price', 'quantity', 'set', 'dateAdded')
 * @param {string} sortDirection - Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted array of [cardName, items[]] tuples
 */
export const sortCards = (cards, sortField = 'name', sortDirection = 'asc') => {
  if (!cards || cards.length === 0) return cards;
  
  const sorted = [...cards].sort((a, b) => {
    const [nameA, itemsA] = a;
    const [nameB, itemsB] = b;
    
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = nameA.localeCompare(nameB);
        break;
        
      case 'price':
        comparison = getAveragePrice(itemsA) - getAveragePrice(itemsB);
        break;
        
      case 'quantity':
        comparison = getTotalQuantity(itemsA) - getTotalQuantity(itemsB);
        break;
        
      case 'set':
        comparison = getSetCode(itemsA).localeCompare(getSetCode(itemsB));
        break;
        
      case 'dateAdded': {
        // For date comparison, always get the relevant date for comparison
        const dateA = getDateAdded(itemsA, sortDirection);
        const dateB = getDateAdded(itemsB, sortDirection);
        comparison = dateA.getTime() - dateB.getTime();
        break;
      }
        
      default:
        comparison = nameA.localeCompare(nameB);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
};

/**
 * Sort deck reservation entries based on specified field and direction
 * Deck reservations are [cardName, reservations[]] tuples with different structure
 * @param {Array} entries - Array of [cardName, reservations[]] tuples
 * @param {string} sortField - Field to sort by
 * @param {string} sortDirection - Sort direction ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
export const sortDeckCards = (entries, sortField = 'name', sortDirection = 'asc') => {
  if (!entries || entries.length === 0) return entries;
  
  const sorted = [...entries].sort((a, b) => {
    const [nameA, itemsA] = a;
    const [nameB, itemsB] = b;
    
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = nameA.localeCompare(nameB);
        break;
        
      case 'price': {
        const avgA = itemsA.length > 0 
          ? itemsA.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / itemsA.length 
          : 0;
        const avgB = itemsB.length > 0 
          ? itemsB.reduce((sum, item) => sum + (parseFloat(item.purchase_price) || 0), 0) / itemsB.length 
          : 0;
        comparison = avgA - avgB;
        break;
      }
        
      case 'quantity': {
        const qtyA = itemsA.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
        const qtyB = itemsB.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
        comparison = qtyA - qtyB;
        break;
      }
        
      case 'set': {
        const setA = itemsA[0]?.set || '';
        const setB = itemsB[0]?.set || '';
        const codeA = typeof setA === 'string' ? setA : (setA?.editioncode || '');
        const codeB = typeof setB === 'string' ? setB : (setB?.editioncode || '');
        comparison = codeA.toLowerCase().localeCompare(codeB.toLowerCase());
        break;
      }
        
      case 'dateAdded': {
        // For deck reservations, use created_at or default to 0
        const getDate = (items) => {
          const dates = items
            .map(item => item.created_at ? new Date(item.created_at).getTime() : 0)
            .filter(d => d > 0);
          return dates.length > 0 ? Math.max(...dates) : 0;
        };
        comparison = getDate(itemsA) - getDate(itemsB);
        break;
      }
        
      default:
        comparison = nameA.localeCompare(nameB);
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
};
