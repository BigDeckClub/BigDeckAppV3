/**
 * MTGGoldfish Service
 * Handles web scraping of MTGGoldfish for deck data and metagame information
 */

import { JSDOM } from 'jsdom';
import { logger } from '../../utils/logger.js';

const MTGGOLDFISH_BASE = 'https://www.mtggoldfish.com';
const RATE_LIMIT_DELAY = 1000; // 1 second between requests (be respectful)

class MtgGoldfishService {
  constructor() {
    this.lastRequestTime = 0;
  }

  /**
   * Enforce rate limiting between requests
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
   * Fetch and parse HTML from MTGGoldfish
   */
  async fetchPage(url) {
    await this.enforceRateLimit();

    try {
      logger.debug(`MTGGoldfish request: ${url}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (!response.ok) {
        throw new Error(`MTGGoldfish error: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);

      logger.debug(`MTGGoldfish page fetched successfully`);

      return dom.window.document;
    } catch (error) {
      logger.error(`MTGGoldfish request failed: ${url}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Search for commander decks on MTGGoldfish
   * @param {string} commanderName - Name of the commander
   * @returns {Promise<Array>} Array of deck URLs
   */
  async searchCommanderDecks(commanderName) {
    try {
      const searchQuery = encodeURIComponent(commanderName);
      const url = `${MTGGOLDFISH_BASE}/deck/search?commander=${searchQuery}`;

      logger.info(`Searching MTGGoldfish for commander decks: ${commanderName}`);

      const doc = await this.fetchPage(url);

      // Extract deck links from search results
      const deckLinks = [];
      const linkElements = doc.querySelectorAll('a[href*="/archetype/"]');

      for (const link of linkElements) {
        const href = link.getAttribute('href');
        if (href && href.includes('/archetype/')) {
          const fullUrl = href.startsWith('http') ? href : `${MTGGOLDFISH_BASE}${href}`;
          deckLinks.push(fullUrl);
        }
      }

      logger.debug(`Found ${deckLinks.length} MTGGoldfish deck links for ${commanderName}`);

      return deckLinks.slice(0, 5); // Return top 5 results
    } catch (error) {
      logger.error(`Failed to search MTGGoldfish for ${commanderName}`, { error: error.message });
      return [];
    }
  }

  /**
   * Parse a deck page to extract card list
   * @param {string} deckUrl - URL to the deck page
   * @returns {Promise<Object>} Deck data with card list
   */
  async parseDeckPage(deckUrl) {
    try {
      logger.info(`Parsing MTGGoldfish deck: ${deckUrl}`);

      const doc = await this.fetchPage(deckUrl);

      const deckData = {
        name: '',
        commander: '',
        cards: {
          creatures: [],
          instants: [],
          sorceries: [],
          artifacts: [],
          enchantments: [],
          planeswalkers: [],
          lands: []
        },
        url: deckUrl
      };

      // Extract deck name
      const titleElement = doc.querySelector('h1.title');
      if (titleElement) {
        deckData.name = titleElement.textContent.trim();
      }

      // Extract card list
      const cardRows = doc.querySelectorAll('table.deck-view-deck-table tbody tr');

      for (const row of cardRows) {
        const quantityCell = row.querySelector('td.deck-col-qty');
        const nameCell = row.querySelector('td.deck-col-card a');
        const categoryRow = row.querySelector('td.deck-col-card');

        if (!nameCell || !quantityCell) continue;

        const cardName = nameCell.textContent.trim();
        const quantity = parseInt(quantityCell.textContent.trim()) || 1;

        // Determine card category based on table section
        const category = this.categorizeCard(row, doc);

        for (let i = 0; i < quantity; i++) {
          if (deckData.cards[category]) {
            deckData.cards[category].push(cardName);
          }
        }
      }

      logger.debug(`Parsed MTGGoldfish deck`, {
        name: deckData.name,
        totalCards: Object.values(deckData.cards).flat().length
      });

      return deckData;
    } catch (error) {
      logger.error(`Failed to parse MTGGoldfish deck: ${deckUrl}`, { error: error.message });
      return null;
    }
  }

  /**
   * Categorize a card based on its position in the deck table
   */
  categorizeCard(row, doc) {
    // Try to find the category header before this row
    let currentRow = row.previousElementSibling;

    while (currentRow) {
      const headerCell = currentRow.querySelector('td.deck-header');
      if (headerCell) {
        const headerText = headerCell.textContent.toLowerCase();

        if (headerText.includes('creature')) return 'creatures';
        if (headerText.includes('instant')) return 'instants';
        if (headerText.includes('sorcery')) return 'sorceries';
        if (headerText.includes('artifact')) return 'artifacts';
        if (headerText.includes('enchantment')) return 'enchantments';
        if (headerText.includes('planeswalker')) return 'planeswalkers';
        if (headerText.includes('land')) return 'lands';
      }

      currentRow = currentRow.previousElementSibling;
    }

    return 'creatures'; // Default category
  }

  /**
   * Get popular commanders from MTGGoldfish metagame
   * @param {string} format - Format name (e.g., 'commander')
   * @returns {Promise<Array>} Array of popular commander names
   */
  async getPopularCommanders(format = 'commander') {
    try {
      const url = `${MTGGOLDFISH_BASE}/metagame/${format}/full`;

      logger.info(`Fetching popular commanders from MTGGoldfish`);

      const doc = await this.fetchPage(url);

      const commanders = [];
      const commanderElements = doc.querySelectorAll('.archetype-tile a');

      for (const element of commanderElements) {
        const commanderName = element.textContent.trim();
        if (commanderName) {
          commanders.push(commanderName);
        }
      }

      logger.debug(`Found ${commanders.length} popular commanders`);

      return commanders.slice(0, 50); // Return top 50
    } catch (error) {
      logger.error(`Failed to get popular commanders from MTGGoldfish`, { error: error.message });
      return [];
    }
  }

  /**
   * Get deck archetype analysis
   * @param {string} archetypeUrl - URL to the archetype page
   * @returns {Promise<Object>} Archetype analysis data
   */
  async getArchetypeAnalysis(archetypeUrl) {
    try {
      logger.info(`Analyzing MTGGoldfish archetype: ${archetypeUrl}`);

      const doc = await this.fetchPage(archetypeUrl);

      const analysis = {
        name: '',
        description: '',
        popularCards: [],
        avgPrice: null
      };

      // Extract archetype name
      const nameElement = doc.querySelector('h1.title');
      if (nameElement) {
        analysis.name = nameElement.textContent.trim();
      }

      // Extract popular cards
      const cardElements = doc.querySelectorAll('.archetype-most-played a');
      for (const element of cardElements) {
        const cardName = element.textContent.trim();
        if (cardName) {
          analysis.popularCards.push(cardName);
        }
      }

      // Extract average price
      const priceElement = doc.querySelector('.price-box-price');
      if (priceElement) {
        const priceText = priceElement.textContent.trim();
        const priceMatch = priceText.match(/\$?(\d+\.?\d*)/);
        if (priceMatch) {
          analysis.avgPrice = parseFloat(priceMatch[1]);
        }
      }

      logger.debug(`Analyzed MTGGoldfish archetype`, {
        name: analysis.name,
        popularCards: analysis.popularCards.length
      });

      return analysis;
    } catch (error) {
      logger.error(`Failed to analyze MTGGoldfish archetype: ${archetypeUrl}`, { error: error.message });
      return null;
    }
  }
}

export const mtggoldfishService = new MtgGoldfishService();
