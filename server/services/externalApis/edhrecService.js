/**
 * EDHREC API Service
 * Handles all EDHREC API interactions for deck recommendations
 */

import { logger } from '../../utils/logger.js';

const EDHREC_API_BASE = 'https://json.edhrec.com/pages';
const RATE_LIMIT_DELAY = 100; // 100ms between requests

class EdhrecService {
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
   * Make a request to EDHREC API
   */
  async request(endpoint) {
    await this.enforceRateLimit();

    const url = `${EDHREC_API_BASE}${endpoint}`;

    try {
      logger.debug(`EDHREC API request: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BigDeckApp/3.0'
        }
      });

      if (!response.ok) {
        throw new Error(`EDHREC API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug(`EDHREC API response received`);

      return data;
    } catch (error) {
      logger.error(`EDHREC API request failed: ${url}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Get commander-specific recommendations from EDHREC
   * @param {string} commanderName - Name of the commander
   * @returns {Promise<Object>} EDHREC recommendations data
   */
  async getCommanderRecommendations(commanderName) {
    try {
      // Normalize commander name for EDHREC URL (lowercase, hyphens, remove special chars)
      const normalizedName = commanderName
        .toLowerCase()
        .replace(/[,.']/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-');

      logger.info(`Fetching EDHREC recommendations for commander: ${commanderName}`);

      const data = await this.request(`/commanders/${normalizedName}.json`);

      if (!data || !data.container) {
        logger.warn(`No EDHREC data found for commander: ${commanderName}`);
        return null;
      }

      return this.parseCommanderData(data);
    } catch (error) {
      logger.error(`Failed to get EDHREC recommendations for ${commanderName}`, { error: error.message });
      return null;
    }
  }

  /**
   * Parse EDHREC commander data into usable format
   */
  parseCommanderData(data) {
    const recommendations = {
      topCards: [],
      creatures: [],
      instants: [],
      sorceries: [],
      artifacts: [],
      enchantments: [],
      planeswalkers: [],
      lands: []
    };

    try {
      // Extract card recommendations from container
      const container = data.container?.json_dict?.cardlists || [];

      for (const cardlist of container) {
        const header = cardlist.header?.toLowerCase() || '';
        const cards = cardlist.cardviews || [];

        // Map EDHREC categories to our structure
        if (header.includes('top cards') || header.includes('signature cards')) {
          recommendations.topCards = cards.map(c => ({
            name: c.name,
            url: c.url,
            synergy: c.synergy || 0,
            inclusion: c.num_decks || 0
          }));
        } else if (header.includes('creature')) {
          recommendations.creatures = cards.map(c => c.name);
        } else if (header.includes('instant')) {
          recommendations.instants = cards.map(c => c.name);
        } else if (header.includes('sorcery')) {
          recommendations.sorceries = cards.map(c => c.name);
        } else if (header.includes('artifact')) {
          recommendations.artifacts = cards.map(c => c.name);
        } else if (header.includes('enchantment')) {
          recommendations.enchantments = cards.map(c => c.name);
        } else if (header.includes('planeswalker')) {
          recommendations.planeswalkers = cards.map(c => c.name);
        } else if (header.includes('land')) {
          recommendations.lands = cards.map(c => c.name);
        }
      }

      logger.debug(`Parsed EDHREC data`, {
        topCards: recommendations.topCards.length,
        creatures: recommendations.creatures.length,
        totalRecommendations: Object.values(recommendations).flat().length
      });

      return recommendations;
    } catch (error) {
      logger.error(`Failed to parse EDHREC data`, { error: error.message });
      return recommendations;
    }
  }

  /**
   * Get theme-specific recommendations
   * @param {string} theme - Theme name (e.g., 'voltron', 'aristocrats', 'tribal')
   * @returns {Promise<Object>} Theme recommendations
   */
  async getThemeRecommendations(theme) {
    try {
      const normalizedTheme = theme
        .toLowerCase()
        .replace(/\s+/g, '-');

      logger.info(`Fetching EDHREC theme recommendations: ${theme}`);

      const data = await this.request(`/themes/${normalizedTheme}.json`);

      if (!data || !data.container) {
        logger.warn(`No EDHREC data found for theme: ${theme}`);
        return null;
      }

      return this.parseCommanderData(data);
    } catch (error) {
      logger.error(`Failed to get EDHREC theme recommendations for ${theme}`, { error: error.message });
      return null;
    }
  }

  /**
   * Get tribe-specific recommendations (e.g., 'elves', 'dragons', 'zombies')
   * @param {string} tribe - Tribe name
   * @returns {Promise<Object>} Tribe recommendations
   */
  async getTribeRecommendations(tribe) {
    try {
      const normalizedTribe = tribe
        .toLowerCase()
        .replace(/\s+/g, '-');

      logger.info(`Fetching EDHREC tribe recommendations: ${tribe}`);

      const data = await this.request(`/tribes/${normalizedTribe}.json`);

      if (!data || !data.container) {
        logger.warn(`No EDHREC data found for tribe: ${tribe}`);
        return null;
      }

      return this.parseCommanderData(data);
    } catch (error) {
      logger.error(`Failed to get EDHREC tribe recommendations for ${tribe}`, { error: error.message });
      return null;
    }
  }
}

export const edhrecService = new EdhrecService();
