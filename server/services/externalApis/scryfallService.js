/**
 * Scryfall API Service
 * Consolidates all Scryfall API interactions
 */

import { logger } from '../../utils/logger.js';

const SCRYFALL_API_BASE = 'https://api.scryfall.com';
const RATE_LIMIT_DELAY = 100; // 100ms between requests to respect rate limits

class ScryfallService {
  constructor() {
    this.lastRequestTime = 0;
  }

  /**
   * Enforce rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      const delay = RATE_LIMIT_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Make a request to Scryfall API with rate limiting
   */
  async request(endpoint, options = {}) {
    await this.enforceRateLimit();

    const url = endpoint.startsWith('http') ? endpoint : `${SCRYFALL_API_BASE}${endpoint}`;

    try {
      logger.debug(`Scryfall API request: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`Scryfall API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug(`Scryfall API response received`, { cards: data.data?.length || 1 });
      return data;
    } catch (error) {
      logger.error(`Scryfall API request failed: ${url}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Search for cards by name
   */
  async searchByName(name, options = {}) {
    const { exact = false, unique = 'cards' } = options;

    if (exact) {
      return this.getCardByExactName(name);
    }

    const query = `"${name}"`;
    return this.search(query, { unique });
  }

  /**
   * Get a specific card by exact name
   */
  async getCardByExactName(name) {
    const endpoint = `/cards/named?exact=${encodeURIComponent(name)}`;
    return this.request(endpoint);
  }

  /**
   * Search cards with a query
   */
  async search(query, options = {}) {
    const { unique = 'cards', page = 1 } = options;
    const endpoint = `/cards/search?q=${encodeURIComponent(query)}&unique=${unique}&page=${page}`;
    return this.request(endpoint);
  }

  /**
   * Get card by Scryfall ID
   */
  async getCardById(scryfallId) {
    const endpoint = `/cards/${scryfallId}`;
    return this.request(endpoint);
  }

  /**
   * Get random card
   */
  async getRandomCard(query = null) {
    const endpoint = query
      ? `/cards/random?q=${encodeURIComponent(query)}`
      : '/cards/random';
    return this.request(endpoint);
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(query) {
    const endpoint = `/cards/autocomplete?q=${encodeURIComponent(query)}`;
    return this.request(endpoint);
  }

  /**
   * Get card collection (bulk fetch)
   */
  async getCollection(identifiers) {
    const endpoint = '/cards/collection';
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ identifiers })
    });
  }

  /**
   * Search for commanders specifically
   */
  async searchCommanders(query = '', options = {}) {
    const commanderQuery = query
      ? `is:commander ${query}`
      : 'is:commander';

    return this.search(commanderQuery, { unique: 'cards', ...options });
  }

  /**
   * Get card pricing information
   */
  async getCardPricing(name) {
    try {
      const card = await this.getCardByExactName(name);
      return {
        usd: card.prices?.usd,
        usd_foil: card.prices?.usd_foil,
        eur: card.prices?.eur,
        tix: card.prices?.tix
      };
    } catch (error) {
      logger.warn(`Failed to get pricing for ${name}`, { error: error.message });
      return null;
    }
  }

  /**
   * Validate if a card is a legal commander
   */
  async isLegalCommander(cardName) {
    try {
      const card = await this.getCardByExactName(cardName);

      // Check if card can be a commander
      const isCommander = card.type_line?.includes('Legendary') &&
                         card.type_line?.includes('Creature');

      const canBeCommander = isCommander ||
                            card.oracle_text?.includes('can be your commander');

      return {
        isLegal: canBeCommander,
        card: card,
        colorIdentity: card.color_identity || []
      };
    } catch (error) {
      logger.warn(`Failed to validate commander: ${cardName}`, { error: error.message });
      return { isLegal: false, card: null, colorIdentity: [] };
    }
  }
}

// Export singleton instance
export const scryfallService = new ScryfallService();

// Export class for testing
export { ScryfallService };
