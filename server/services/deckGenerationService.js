/**
 * Deck Generation Service
 * Orchestrates AI-powered deck building using multiple data sources
 */

import { scryfallService } from './externalApis/scryfallService.js';
import { edhrecService } from './externalApis/edhrecService.js';
import { mtggoldfishService } from './externalApis/mtggoldfishService.js';
import { logger } from '../utils/logger.js';

class DeckGenerationService {
  /**
   * Generate commander deck recommendations based on user prompt
   * @param {Object} options - Generation options
   * @param {string} options.commander - Commander name (optional)
   * @param {string} options.userPrompt - User's deck building prompt
   * @param {number} options.budget - Budget constraint (optional)
   * @param {Array<string>} options.colorIdentity - Color identity (optional)
   * @param {Array<string>} options.themes - Deck themes (optional)
   * @param {Array<Object>} options.userInventory - User's card inventory (optional)
   * @returns {Promise<Object>} Deck generation result
   */
  async generateDeck(options) {
    const {
      commander,
      userPrompt,
      budget,
      colorIdentity,
      themes = [],
      userInventory = []
    } = options;

    logger.info('Starting deck generation', {
      commander,
      budget,
      colorIdentity,
      themes: themes.length,
      hasInventory: userInventory.length > 0
    });

    try {
      // Step 1: Validate and fetch commander if provided
      let commanderCard = null;
      if (commander) {
        commanderCard = await this.validateCommander(commander);
        if (!commanderCard) {
          throw new Error(`Invalid commander: ${commander}`);
        }
      }

      // Step 2: Gather recommendations from multiple sources
      const recommendations = await this.gatherRecommendations({
        commander: commanderCard?.name,
        themes,
        colorIdentity: commanderCard?.color_identity || colorIdentity
      });

      // Step 3: Filter and rank cards based on criteria
      const rankedCards = await this.rankCards(recommendations, {
        budget,
        userInventory,
        colorIdentity: commanderCard?.color_identity || colorIdentity
      });

      // Step 4: Build deck structure (lands, creatures, spells, etc.)
      const deckList = this.buildDeckStructure(rankedCards, commanderCard);

      logger.info('Deck generation completed', {
        totalCards: deckList.cards.length,
        fromInventory: deckList.stats.fromInventory,
        estimatedPrice: deckList.stats.estimatedPrice
      });

      return {
        success: true,
        deck: deckList,
        recommendations,
        stats: deckList.stats
      };
    } catch (error) {
      logger.error('Deck generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate commander and check legality
   */
  async validateCommander(commanderName) {
    try {
      logger.debug(`Validating commander: ${commanderName}`);

      const isLegal = await scryfallService.isLegalCommander(commanderName);
      if (!isLegal) {
        logger.warn(`${commanderName} is not a legal commander`);
        return null;
      }

      const card = await scryfallService.searchByName(commanderName, { exact: true });
      if (!card) {
        logger.warn(`Commander not found: ${commanderName}`);
        return null;
      }

      logger.debug(`Commander validated: ${card.name}`);
      return card;
    } catch (error) {
      logger.error(`Failed to validate commander: ${commanderName}`, { error: error.message });
      return null;
    }
  }

  /**
   * Gather card recommendations from multiple sources
   */
  async gatherRecommendations({ commander, themes, colorIdentity }) {
    const recommendations = {
      edhrec: null,
      mtggoldfish: null,
      themeCards: [],
      staples: []
    };

    try {
      // Get EDHREC recommendations
      if (commander) {
        logger.debug(`Fetching EDHREC recommendations for ${commander}`);
        recommendations.edhrec = await edhrecService.getCommanderRecommendations(commander);
      }

      // Get theme-specific recommendations
      for (const theme of themes) {
        logger.debug(`Fetching theme recommendations for ${theme}`);
        const themeRecs = await edhrecService.getThemeRecommendations(theme);
        if (themeRecs) {
          recommendations.themeCards.push(...themeRecs.topCards || []);
        }
      }

      // Get MTGGoldfish data
      if (commander) {
        logger.debug(`Fetching MTGGoldfish data for ${commander}`);
        const deckUrls = await mtggoldfishService.searchCommanderDecks(commander);
        if (deckUrls.length > 0) {
          recommendations.mtggoldfish = await mtggoldfishService.parseDeckPage(deckUrls[0]);
        }
      }

      // Get format staples based on color identity
      recommendations.staples = await this.getFormatStaples(colorIdentity);

      logger.debug('Recommendations gathered', {
        hasEdhrec: !!recommendations.edhrec,
        hasMtggoldfish: !!recommendations.mtggoldfish,
        themeCards: recommendations.themeCards.length,
        staples: recommendations.staples.length
      });

      return recommendations;
    } catch (error) {
      logger.error('Failed to gather recommendations', { error: error.message });
      return recommendations;
    }
  }

  /**
   * Get format staples based on color identity
   */
  async getFormatStaples(colorIdentity) {
    const staples = [];

    try {
      // Common colorless staples
      const colorlessStaples = [
        'Sol Ring',
        'Arcane Signet',
        'Command Tower',
        'Lightning Greaves',
        'Swiftfoot Boots'
      ];

      staples.push(...colorlessStaples);

      // Color-specific staples
      if (colorIdentity?.includes('W')) {
        staples.push('Swords to Plowshares', 'Path to Exile', 'Smothering Tithe');
      }
      if (colorIdentity?.includes('U')) {
        staples.push('Counterspell', 'Cyclonic Rift', 'Rhystic Study');
      }
      if (colorIdentity?.includes('B')) {
        staples.push('Demonic Tutor', 'Toxic Deluge', 'Vampiric Tutor');
      }
      if (colorIdentity?.includes('R')) {
        staples.push('Chaos Warp', 'Blasphemous Act', 'Dockside Extortionist');
      }
      if (colorIdentity?.includes('G')) {
        staples.push('Cultivate', 'Kodama\'s Reach', 'Beast Within');
      }

      logger.debug(`Retrieved ${staples.length} format staples`);
      return staples;
    } catch (error) {
      logger.error('Failed to get format staples', { error: error.message });
      return staples;
    }
  }

  /**
   * Rank cards based on criteria (budget, inventory, synergy)
   */
  async rankCards(recommendations, { budget, userInventory, colorIdentity }) {
    const rankedCards = [];

    try {
      // Combine all card recommendations
      const allCards = new Set();

      // Add EDHREC recommendations
      if (recommendations.edhrec) {
        recommendations.edhrec.topCards?.forEach(card => allCards.add(card.name));
        recommendations.edhrec.creatures?.forEach(name => allCards.add(name));
        recommendations.edhrec.instants?.forEach(name => allCards.add(name));
        recommendations.edhrec.sorceries?.forEach(name => allCards.add(name));
        recommendations.edhrec.artifacts?.forEach(name => allCards.add(name));
        recommendations.edhrec.enchantments?.forEach(name => allCards.add(name));
        recommendations.edhrec.planeswalkers?.forEach(name => allCards.add(name));
      }

      // Add MTGGoldfish recommendations
      if (recommendations.mtggoldfish?.cards) {
        Object.values(recommendations.mtggoldfish.cards).flat().forEach(name => allCards.add(name));
      }

      // Add theme cards
      recommendations.themeCards?.forEach(card => allCards.add(card.name || card));

      // Add staples
      recommendations.staples?.forEach(name => allCards.add(name));

      logger.debug(`Ranking ${allCards.size} unique card recommendations`);

      // Fetch card details and rank
      for (const cardName of allCards) {
        try {
          const card = await scryfallService.searchByName(cardName);
          if (!card) continue;

          // Check color identity
          if (colorIdentity && colorIdentity.length > 0) {
            const cardColors = card.color_identity || [];
            const validColors = cardColors.every(c => colorIdentity.includes(c));
            if (!validColors) continue;
          }

          // Check budget
          const price = card.prices?.usd ? parseFloat(card.prices.usd) : 0;
          if (budget && price > budget * 0.1) continue; // Skip cards over 10% of budget

          // Check if in user inventory
          const inInventory = userInventory.some(item =>
            item.name?.toLowerCase() === card.name?.toLowerCase()
          );

          rankedCards.push({
            name: card.name,
            type_line: card.type_line,
            mana_cost: card.mana_cost,
            cmc: card.cmc,
            colors: card.colors,
            color_identity: card.color_identity,
            price,
            inInventory,
            score: this.calculateCardScore(card, { inInventory, budget })
          });
        } catch (error) {
          logger.warn(`Failed to rank card: ${cardName}`, { error: error.message });
        }
      }

      // Sort by score
      rankedCards.sort((a, b) => b.score - a.score);

      logger.debug(`Ranked ${rankedCards.length} cards`);
      return rankedCards;
    } catch (error) {
      logger.error('Failed to rank cards', { error: error.message });
      return rankedCards;
    }
  }

  /**
   * Calculate card score for ranking
   */
  calculateCardScore(card, { inInventory, budget }) {
    let score = 50; // Base score

    // Boost score if in inventory
    if (inInventory) score += 30;

    // Adjust for price (prefer cheaper cards if budget constraint)
    const price = card.prices?.usd ? parseFloat(card.prices.usd) : 0;
    if (budget) {
      if (price < budget * 0.05) score += 10; // Very affordable
      else if (price > budget * 0.2) score -= 20; // Too expensive
    }

    // Boost staples
    const stapleKeywords = ['tutor', 'removal', 'draw', 'ramp'];
    const hasStapleKeyword = stapleKeywords.some(keyword =>
      card.oracle_text?.toLowerCase().includes(keyword)
    );
    if (hasStapleKeyword) score += 15;

    return score;
  }

  /**
   * Build final deck structure with proper card distribution
   */
  buildDeckStructure(rankedCards, commander) {
    const deck = {
      commander: commander?.name || null,
      cards: [],
      stats: {
        totalCards: 0,
        fromInventory: 0,
        estimatedPrice: 0,
        creatures: 0,
        instants: 0,
        sorceries: 0,
        artifacts: 0,
        enchantments: 0,
        planeswalkers: 0,
        lands: 0
      }
    };

    try {
      // Target distribution for 99-card deck (excluding commander)
      const targets = {
        creatures: 30,
        instants: 8,
        sorceries: 8,
        artifacts: 12,
        enchantments: 8,
        planeswalkers: 3,
        lands: 37
      };

      const categorized = {
        creatures: [],
        instants: [],
        sorceries: [],
        artifacts: [],
        enchantments: [],
        planeswalkers: [],
        lands: []
      };

      // Categorize cards
      for (const card of rankedCards) {
        const type = card.type_line?.toLowerCase() || '';

        if (type.includes('creature')) categorized.creatures.push(card);
        else if (type.includes('instant')) categorized.instants.push(card);
        else if (type.includes('sorcery')) categorized.sorceries.push(card);
        else if (type.includes('artifact')) categorized.artifacts.push(card);
        else if (type.includes('enchantment')) categorized.enchantments.push(card);
        else if (type.includes('planeswalker')) categorized.planeswalkers.push(card);
        else if (type.includes('land')) categorized.lands.push(card);
      }

      // Fill deck according to targets
      for (const [category, target] of Object.entries(targets)) {
        const available = categorized[category] || [];
        const selected = available.slice(0, target);

        deck.cards.push(...selected.map(c => ({
          name: c.name,
          type_line: c.type_line,
          mana_cost: c.mana_cost,
          quantity: 1
        })));

        deck.stats[category] = selected.length;
        deck.stats.fromInventory += selected.filter(c => c.inInventory).length;
        deck.stats.estimatedPrice += selected.reduce((sum, c) => sum + (c.price || 0), 0);
      }

      deck.stats.totalCards = deck.cards.length;

      logger.info('Deck structure built', {
        totalCards: deck.stats.totalCards,
        creatures: deck.stats.creatures,
        lands: deck.stats.lands,
        estimatedPrice: deck.stats.estimatedPrice.toFixed(2)
      });

      return deck;
    } catch (error) {
      logger.error('Failed to build deck structure', { error: error.message });
      return deck;
    }
  }

  /**
   * Suggest commanders based on user prompt and preferences
   */
  async suggestCommanders({ userPrompt, colorIdentity, themes = [] }) {
    try {
      logger.info('Suggesting commanders', { colorIdentity, themes });

      // Search for commanders matching color identity
      const commanders = await scryfallService.searchCommanders('', {
        colors: colorIdentity,
        limit: 20
      });

      // Rank commanders based on prompt relevance
      const ranked = commanders.map(cmd => ({
        name: cmd.name,
        type_line: cmd.type_line,
        mana_cost: cmd.mana_cost,
        colors: cmd.colors,
        color_identity: cmd.color_identity,
        oracle_text: cmd.oracle_text,
        score: this.scoreCommanderRelevance(cmd, { userPrompt, themes })
      }));

      ranked.sort((a, b) => b.score - a.score);

      logger.debug(`Suggested ${ranked.length} commanders`);
      return ranked.slice(0, 10);
    } catch (error) {
      logger.error('Failed to suggest commanders', { error: error.message });
      return [];
    }
  }

  /**
   * Score commander relevance to user prompt and themes
   */
  scoreCommanderRelevance(commander, { userPrompt, themes }) {
    let score = 0;

    const text = `${commander.name} ${commander.oracle_text}`.toLowerCase();
    const prompt = userPrompt.toLowerCase();

    // Check for keyword matches in prompt
    const words = prompt.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && text.includes(word)) {
        score += 10;
      }
    }

    // Check for theme matches
    for (const theme of themes) {
      if (text.includes(theme.toLowerCase())) {
        score += 20;
      }
    }

    return score;
  }
}

export const deckGenerationService = new DeckGenerationService();
