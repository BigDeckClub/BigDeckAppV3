/**
 * Marketplace URL builders and export formatters
 * @module utils/marketplaceUrls
 */

/**
 * Marketplace configurations with URL builders and clipboard formatters
 */
export const MARKETPLACES = {
  tcgplayer: {
    name: 'TCGPlayer',
    icon: '🔵',
    color: 'blue',
    // TCGPlayer Mass Entry: https://www.tcgplayer.com/massentry
    // Format: "quantity cardname" per line, separated by ||
    buildCartUrl: (cards) => {
      const list = cards.map(c => `${c.quantity} ${c.name}`).join('||');
      return `https://www.tcgplayer.com/massentry?productline=magic&c=${encodeURIComponent(list)}`;
    },
    buildClipboardText: (cards) => cards.map(c => `${c.quantity} ${c.name}`).join('\n'),
  },
  manapool: {
    name: 'Manapool',
    icon: '🟢',
    color: 'green',
    // Manapool uses their own import format
    buildCartUrl: (cards) => {
      const list = cards.map(c => `${c.quantity} ${c.name}`).join('\n');
      return `https://manapool.com/cart/import?list=${encodeURIComponent(list)}`;
    },
    buildClipboardText: (cards) => cards.map(c => `${c.quantity} ${c.name}`).join('\n'),
  },
  cardkingdom: {
    name: 'Card Kingdom',
    icon: '🟣',
    color: 'purple',
    // Card Kingdom Builder: https://www.cardkingdom.com/builder
    buildCartUrl: (cards) => {
      const list = cards.map(c => `${c.quantity} ${c.name}`).join('\n');
      return `https://www.cardkingdom.com/builder?partner=bigdeck&c=${encodeURIComponent(list)}`;
    },
    buildClipboardText: (cards) => cards.map(c => `${c.quantity}x ${c.name}`).join('\n'),
  }
};

/**
 * Get user's preferred marketplace from localStorage
 * @returns {string} The marketplace key ('tcgplayer', 'manapool', or 'cardkingdom')
 */
export const getPreferredMarketplace = () => {
  return localStorage.getItem('preferredMarketplace') || 'tcgplayer';
};

/**
 * Set user's preferred marketplace in localStorage
 * @param {string} marketplace - The marketplace key to set as preferred
 */
export const setPreferredMarketplace = (marketplace) => {
  localStorage.setItem('preferredMarketplace', marketplace);
};

/**
 * Get all available marketplace keys
 * @returns {string[]} Array of marketplace keys
 */
export const getMarketplaceKeys = () => Object.keys(MARKETPLACES);

/**
 * Get marketplace configuration by key
 * @param {string} key - The marketplace key
 * @returns {Object|undefined} The marketplace configuration or undefined
 */
export const getMarketplace = (key) => MARKETPLACES[key];

/**
 * Build a cart URL for a marketplace with given cards
 * @param {string} marketplaceKey - The marketplace key
 * @param {Array<{name: string, quantity: number}>} cards - Cards to add to cart
 * @returns {string|null} The cart URL or null if marketplace not found
 */
export const buildCartUrl = (marketplaceKey, cards) => {
  const marketplace = MARKETPLACES[marketplaceKey];
  if (!marketplace || !cards || cards.length === 0) return null;
  return marketplace.buildCartUrl(cards);
};

/**
 * Build clipboard text for a marketplace with given cards
 * @param {string} marketplaceKey - The marketplace key
 * @param {Array<{name: string, quantity: number}>} cards - Cards to format
 * @returns {string|null} The formatted text or null if marketplace not found
 */
export const buildClipboardText = (marketplaceKey, cards) => {
  const marketplace = MARKETPLACES[marketplaceKey];
  if (!marketplace || !cards || cards.length === 0) return null;
  return marketplace.buildClipboardText(cards);
};
