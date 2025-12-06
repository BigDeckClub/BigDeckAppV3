import express from 'express';
import { authenticate } from '../middleware/index.js';
import OpenAI from 'openai';
import { systemPrompt, scryfall, isCardBanned } from 'bigdeck-ai';
import { allToolSchemas } from 'bigdeck-ai/tools/schemas';
import { pool } from '../db/pool.js';

const router = express.Router();

// Constants
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONVERSATION_HISTORY_LENGTH = 50;
const MAX_HISTORY_ITEM_CONTENT_LENGTH = 4000;
const MAX_TOOL_ITERATIONS = 5;

// OpenAI client (lazy-loaded)
let openaiClient = null;
let clientError = null;

/**
 * Get or create OpenAI client
 */
function getOpenAIClient() {
  if (openaiClient) return openaiClient;
  if (clientError) throw clientError;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    clientError = new Error('OPENAI_API_KEY not configured');
    throw clientError;
  }
  
  try {
    openaiClient = new OpenAI({ apiKey });
    console.log('[AI] ✓ OpenAI client initialized');
    return openaiClient;
  } catch (error) {
    console.error('[AI] Failed to initialize OpenAI:', error.message);
    clientError = error;
    throw error;
  }
}

/**
 * Lazy load learning modules from bigdeck-ai
 */
function createLazyLoader(modulePath, exportName) {
  return async function() {
    if (!createLazyLoader.cache) {
      createLazyLoader.cache = new Map();
    }
    
    if (!createLazyLoader.cache.has(modulePath)) {
      const module = await import(modulePath);
      createLazyLoader.cache.set(modulePath, module[exportName]);
    }
    
    return createLazyLoader.cache.get(modulePath);
  };
}

const getProfileAnalyzer = createLazyLoader('bigdeck-ai/learning/profileAnalyzer', 'profileAnalyzer');
const getYoutubeLearner = createLazyLoader('bigdeck-ai/learning/youtubeLearner', 'youtubeLearner');
const getMetaAnalyzer = createLazyLoader('bigdeck-ai/learning/metaAnalyzer', 'metaAnalyzer');

/**
 * Tool definitions - imported from bigdeck-ai package
 * Plus app-specific tools that need database access
 */
const tools = [
  // Import all tool schemas from bigdeck-ai
  ...allToolSchemas,
  // App-specific tools that need local database access
  {
    type: 'function',
    function: {
      name: 'get_collection_analytics',
      description: 'Get analytics and statistics about the user\'s MTG collection including total value, card counts, recent activity, and market values.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
];

// ============================================================================
// READ TOOL EXECUTORS
// ============================================================================

/**
 * Execute Scryfall search
 */
async function searchScryfall(query, limit = 10) {
  try {
    const results = await scryfall.searchCards(query);
    
    if (!results || results.object === 'error') {
      return { error: results?.details || 'Search failed' };
    }
    
    const cards = (results.data || []).slice(0, limit).map(card => ({
      name: card.name,
      mana_cost: card.mana_cost,
      type_line: card.type_line,
      oracle_text: card.oracle_text,
      set_name: card.set_name,
      cmc: card.cmc,
      colors: card.colors,
      color_identity: card.color_identity,
      prices: card.prices
    }));
    
    return { 
      total_cards: results.total_cards,
      cards 
    };
  } catch (error) {
    console.error('[AI] Scryfall search error:', error.message);
    return { error: 'Failed to search Scryfall' };
  }
}

/**
 * Get card price
 */
async function getCardPrice(cardName) {
  try {
    const card = await scryfall.getCard(cardName);
    
    if (!card || card.object === 'error') {
      return { error: card?.details || 'Card not found' };
    }
    
    return {
      name: card.name,
      set: card.set_name,
      prices: {
        usd: card.prices?.usd,
        usd_foil: card.prices?.usd_foil,
        eur: card.prices?.eur,
        tix: card.prices?.tix
      },
      purchase_uris: card.purchase_uris
    };
  } catch (error) {
    console.error('[AI] Price lookup error:', error.message);
    return { error: 'Failed to get prices' };
  }
}

/**
 * Validate Commander deck
 */
async function validateDeck(commander, decklist) {
  try {
    const errors = [];
    const warnings = [];
    const info = [];
    
    // Fetch commander info
    const commanderData = await scryfall.getCard(commander);
    if (!commanderData || commanderData.object === 'error') {
      return { valid: false, errors: [`Could not find commander: ${commander}`], warnings: [], info: [] };
    }
    
    const commanderColorIdentity = commanderData.color_identity || [];
    
    // Check deck size
    const totalCards = decklist.length + 1;
    if (totalCards !== 100) {
      errors.push(`Deck must be exactly 100 cards. Current: ${totalCards}`);
    }
    
    // Check banned cards
    const bannedCards = decklist.filter(cardName => isCardBanned(cardName));
    if (bannedCards.length > 0) {
      errors.push(`Banned cards: ${bannedCards.join(', ')}`);
    }
    
    // Check singleton rule
    const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
    const cardCounts = {};
    decklist.forEach(cardName => {
      if (!basicLands.includes(cardName)) {
        cardCounts[cardName] = (cardCounts[cardName] || 0) + 1;
      }
    });
    
    const duplicates = Object.entries(cardCounts)
      .filter(([, count]) => count > 1)
      .map(([name, count]) => `${name} (${count}x)`);
    
    if (duplicates.length > 0) {
      errors.push(`Duplicate cards: ${duplicates.join(', ')}`);
    }
    
    info.push(`Commander: ${commander} (${commanderColorIdentity.join('') || 'Colorless'})`);
    info.push(`Total cards: ${totalCards}`);
    
    return { valid: errors.length === 0, errors, warnings, info };
  } catch (error) {
    console.error('[AI] Deck validation error:', error.message);
    return { valid: false, errors: [`Validation error: ${error.message}`], warnings: [], info: [] };
  }
}

/**
 * Analyze Moxfield profile
 */
async function analyzeMoxfieldProfile(username) {
  try {
    const profileAnalyzer = await getProfileAnalyzer();
    return await profileAnalyzer.analyzeMoxfieldProfile(username);
  } catch (error) {
    console.error('[AI] Moxfield analysis error:', error.message);
    return { error: `Failed to analyze profile: ${error.message}` };
  }
}

/**
 * Analyze MTGGoldfish profile
 */
async function analyzeMTGGoldfishProfile(username) {
  try {
    const profileAnalyzer = await getProfileAnalyzer();
    return await profileAnalyzer.analyzeMTGGoldfishProfile(username);
  } catch (error) {
    console.error('[AI] MTGGoldfish analysis error:', error.message);
    return { error: `Failed to analyze profile: ${error.message}` };
  }
}

/**
 * Learn from YouTube
 */
async function learnFromYouTube(url) {
  try {
    const youtubeLearner = await getYoutubeLearner();
    return await youtubeLearner.learnFromVideo(url);
  } catch (error) {
    console.error('[AI] YouTube learning error:', error.message);
    return { error: `Failed to learn from video: ${error.message}` };
  }
}

/**
 * Suggest deck techs
 */
async function suggestDeckTechs(commander) {
  try {
    const youtubeLearner = await getYoutubeLearner();
    return await youtubeLearner.suggestDeckTechs(commander);
  } catch (error) {
    console.error('[AI] Deck tech suggestion error:', error.message);
    return { error: `Failed to suggest deck techs: ${error.message}` };
  }
}

/**
 * Analyze format meta
 */
async function analyzeFormatMeta(format = 'commander') {
  try {
    const metaAnalyzer = await getMetaAnalyzer();
    return await metaAnalyzer.analyzeFormat(format);
  } catch (error) {
    console.error('[AI] Meta analysis error:', error.message);
    return { error: `Failed to analyze meta: ${error.message}` };
  }
}

/**
 * Search user inventory
 */
async function searchInventory(userId, query) {
  try {
    let sql = `
      SELECT id, name, set AS set_name, quantity, quality, foil, folder, purchase_price
      FROM inventory WHERE user_id = $1
    `;
    const params = [userId];
    
    if (query && query.toLowerCase() !== 'all') {
      sql += ` AND (name ILIKE $2 OR folder ILIKE $2)`;
      params.push(`%${query}%`);
    }
    
    sql += ' ORDER BY name LIMIT 50';
    
    const result = await pool.query(sql, params);
    
    return {
      total_cards: result.rows.length,
      total_quantity: result.rows.reduce((sum, r) => sum + (r.quantity || 1), 0),
      cards: result.rows.map(row => ({
        id: row.id,
        name: row.name,
        set: row.set_name,
        quantity: row.quantity || 1,
        quality: row.quality,
        foil: row.foil,
        folder: row.folder,
        purchase_price: row.purchase_price
      }))
    };
  } catch (error) {
    console.error('[AI] Inventory search error:', error.message);
    return { error: 'Failed to search inventory' };
  }
}

/**
 * Get user decks
 */
async function getDecks(userId, deckName) {
  try {
    if (deckName && deckName.toLowerCase() !== 'all') {
      // Get specific deck
      const result = await pool.query(
        `SELECT id, name, commander, cards FROM decks 
         WHERE user_id = $1 AND name ILIKE $2`,
        [userId, `%${deckName}%`]
      );
      
      if (result.rows.length === 0) {
        return { error: 'Deck not found' };
      }
      
      const deck = result.rows[0];
      const cards = deck.cards || [];
      return {
        id: deck.id,
        name: deck.name,
        commander: deck.commander,
        card_count: cards.length,
        cards: cards.slice(0, 30).map(c => typeof c === 'string' ? c : c.name || c)
      };
    }
    
    // Get all decks
    const result = await pool.query(`
      SELECT id, name, commander, 
        COALESCE(json_array_length(cards::json), 0) as card_count
      FROM decks WHERE user_id = $1 ORDER BY name
    `, [userId]);
    
    return {
      total_decks: result.rows.length,
      decks: result.rows.map(d => ({
        id: d.id,
        name: d.name,
        commander: d.commander,
        card_count: d.card_count
      }))
    };
  } catch (error) {
    console.error('[AI] Get decks error:', error.message);
    return { error: 'Failed to get decks' };
  }
}

/**
 * Get sales history
 */
async function getSales(userId) {
  try {
    const result = await pool.query(`
      SELECT id, card_name, quantity, sale_price, sale_date, platform
      FROM sales WHERE user_id = $1 
      ORDER BY sale_date DESC LIMIT 50
    `, [userId]);
    
    const totalValue = result.rows.reduce((sum, s) => sum + (s.sale_price * s.quantity), 0);
    
    return {
      total_sales: result.rows.length,
      total_value: totalValue,
      sales: result.rows.map(s => ({
        id: s.id,
        card: s.card_name,
        quantity: s.quantity,
        price: s.sale_price,
        date: s.sale_date,
        platform: s.platform
      }))
    };
  } catch (error) {
    console.error('[AI] Get sales error:', error.message);
    return { error: 'Failed to get sales' };
  }
}

/**
 * Get collection analytics
 */
async function getCollectionAnalytics(userId) {
  try {
    const countsResult = await pool.query(
      'SELECT COUNT(DISTINCT LOWER(TRIM(name))) as unique_cards, SUM(quantity) as total_cards FROM inventory WHERE user_id = $1',
      [userId]
    );
    
    const foldersResult = await pool.query(
      'SELECT folder, COUNT(*) as count, SUM(quantity) as total FROM inventory WHERE user_id = $1 GROUP BY folder ORDER BY total DESC',
      [userId]
    );
    
    const valueResult = await pool.query(
      `SELECT COALESCE(SUM(quantity * purchase_price), 0) as total_cost FROM inventory WHERE user_id = $1`,
      [userId]
    );
    
    const decksResult = await pool.query(
      'SELECT COUNT(*) as count FROM decks WHERE user_id = $1',
      [userId]
    );
    
    return {
      unique_cards: parseInt(countsResult.rows[0]?.unique_cards) || 0,
      total_cards: parseInt(countsResult.rows[0]?.total_cards) || 0,
      total_decks: parseInt(decksResult.rows[0]?.count) || 0,
      total_purchase_cost: parseFloat(valueResult.rows[0]?.total_cost) || 0,
      folders: foldersResult.rows.map(f => ({
        name: f.folder || 'Uncategorized',
        cards: parseInt(f.count),
        quantity: parseInt(f.total)
      }))
    };
  } catch (error) {
    console.error('[AI] Analytics error:', error.message);
    return { error: 'Failed to fetch analytics' };
  }
}

// ============================================================================
// WRITE TOOL EXECUTORS
// ============================================================================

/**
 * Add card to inventory
 */
async function addCardToInventory(userId, cardName, quantity = 1, folder = 'Unsorted') {
  try {
    // Look up card on Scryfall
    const card = await scryfall.getCard(cardName);
    if (!card || card.object === 'error') {
      return { error: `Card not found: ${cardName}` };
    }
    
    // Insert into inventory
    const result = await pool.query(`
      INSERT INTO inventory (user_id, name, set, quantity, folder, scryfall_id, added_date)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, name, quantity, folder
    `, [userId, card.name, card.set_name, quantity, folder, card.id]);
    
    // Log transaction
    await pool.query(`
      INSERT INTO inventory_transactions (user_id, card_name, quantity, transaction_type, transaction_date)
      VALUES ($1, $2, $3, 'add', NOW())
    `, [userId, card.name, quantity]);
    
    return {
      success: true,
      message: `Added ${quantity}x ${card.name} to ${folder}`,
      card: result.rows[0]
    };
  } catch (error) {
    console.error('[AI] Add card error:', error.message);
    return { error: `Failed to add card: ${error.message}` };
  }
}

/**
 * Remove card from inventory
 */
async function removeCardFromInventory(userId, cardName, quantity = 1) {
  try {
    // Find the card
    const findResult = await pool.query(
      'SELECT id, name, quantity FROM inventory WHERE user_id = $1 AND name ILIKE $2 LIMIT 1',
      [userId, `%${cardName}%`]
    );
    
    if (findResult.rows.length === 0) {
      return { error: `Card not found in inventory: ${cardName}` };
    }
    
    const card = findResult.rows[0];
    const currentQty = card.quantity || 1;
    
    if (quantity >= currentQty) {
      // Remove entirely
      await pool.query('DELETE FROM inventory WHERE id = $1', [card.id]);
    } else {
      // Reduce quantity
      await pool.query('UPDATE inventory SET quantity = quantity - $1 WHERE id = $2', [quantity, card.id]);
    }
    
    // Log transaction
    await pool.query(`
      INSERT INTO inventory_transactions (user_id, card_name, quantity, transaction_type, transaction_date)
      VALUES ($1, $2, $3, 'remove', NOW())
    `, [userId, card.name, quantity]);
    
    return {
      success: true,
      message: `Removed ${quantity}x ${card.name} from inventory`
    };
  } catch (error) {
    console.error('[AI] Remove card error:', error.message);
    return { error: `Failed to remove card: ${error.message}` };
  }
}

/**
 * Move card to folder
 */
async function moveCard(userId, cardName, targetFolder, quantity) {
  try {
    let sql = 'UPDATE inventory SET folder = $1 WHERE user_id = $2 AND name ILIKE $3';
    const params = [targetFolder, userId, `%${cardName}%`];
    
    const result = await pool.query(sql + ' RETURNING id, name, folder', params);
    
    if (result.rows.length === 0) {
      return { error: `No cards found matching: ${cardName}` };
    }
    
    return {
      success: true,
      message: `Moved ${result.rows.length} card(s) to ${targetFolder}`,
      moved: result.rows.map(r => r.name)
    };
  } catch (error) {
    console.error('[AI] Move card error:', error.message);
    return { error: `Failed to move card: ${error.message}` };
  }
}

/**
 * Create deck
 */
async function createDeck(userId, name, commander, format = 'commander') {
  try {
    // If commander specified, look it up
    let commanderName = commander;
    if (commander) {
      const card = await scryfall.getCard(commander);
      if (card && card.object !== 'error') {
        commanderName = card.name;
      }
    }
    
    const result = await pool.query(`
      INSERT INTO decks (user_id, name, commander, cards, created_at)
      VALUES ($1, $2, $3, '[]'::json, NOW())
      RETURNING id, name, commander
    `, [userId, name, commanderName]);
    
    return {
      success: true,
      message: `Created deck "${name}"${commanderName ? ` with commander ${commanderName}` : ''}`,
      deck: result.rows[0]
    };
  } catch (error) {
    console.error('[AI] Create deck error:', error.message);
    return { error: `Failed to create deck: ${error.message}` };
  }
}

/**
 * Add card to deck
 */
async function addCardToDeck(userId, deckName, cardName, quantity = 1) {
  try {
    // Find deck
    const deckResult = await pool.query(
      'SELECT id, name, cards FROM decks WHERE user_id = $1 AND name ILIKE $2 LIMIT 1',
      [userId, `%${deckName}%`]
    );
    
    if (deckResult.rows.length === 0) {
      return { error: `Deck not found: ${deckName}` };
    }
    
    const deck = deckResult.rows[0];
    const cards = deck.cards || [];
    
    // Look up card
    const card = await scryfall.getCard(cardName);
    if (!card || card.object === 'error') {
      return { error: `Card not found: ${cardName}` };
    }
    
    // Add card to deck
    for (let i = 0; i < quantity; i++) {
      cards.push(card.name);
    }
    
    await pool.query(
      'UPDATE decks SET cards = $1::json WHERE id = $2',
      [JSON.stringify(cards), deck.id]
    );
    
    return {
      success: true,
      message: `Added ${quantity}x ${card.name} to ${deck.name}`,
      deck_card_count: cards.length
    };
  } catch (error) {
    console.error('[AI] Add to deck error:', error.message);
    return { error: `Failed to add card to deck: ${error.message}` };
  }
}

/**
 * Remove card from deck
 */
async function removeCardFromDeck(userId, deckName, cardName, quantity = 1) {
  try {
    // Find deck
    const deckResult = await pool.query(
      'SELECT id, name, cards FROM decks WHERE user_id = $1 AND name ILIKE $2 LIMIT 1',
      [userId, `%${deckName}%`]
    );
    
    if (deckResult.rows.length === 0) {
      return { error: `Deck not found: ${deckName}` };
    }
    
    const deck = deckResult.rows[0];
    let cards = deck.cards || [];
    
    // Remove cards
    let removed = 0;
    for (let i = 0; i < quantity && cards.length > 0; i++) {
      const idx = cards.findIndex(c => 
        (typeof c === 'string' ? c : c.name || '').toLowerCase().includes(cardName.toLowerCase())
      );
      if (idx !== -1) {
        cards.splice(idx, 1);
        removed++;
      }
    }
    
    if (removed === 0) {
      return { error: `Card not found in deck: ${cardName}` };
    }
    
    await pool.query(
      'UPDATE decks SET cards = $1::json WHERE id = $2',
      [JSON.stringify(cards), deck.id]
    );
    
    return {
      success: true,
      message: `Removed ${removed}x ${cardName} from ${deck.name}`,
      deck_card_count: cards.length
    };
  } catch (error) {
    console.error('[AI] Remove from deck error:', error.message);
    return { error: `Failed to remove card from deck: ${error.message}` };
  }
}

/**
 * Delete deck
 */
async function deleteDeck(userId, deckName) {
  try {
    const result = await pool.query(
      'DELETE FROM decks WHERE user_id = $1 AND name ILIKE $2 RETURNING id, name',
      [userId, `%${deckName}%`]
    );
    
    if (result.rows.length === 0) {
      return { error: `Deck not found: ${deckName}` };
    }
    
    return {
      success: true,
      message: `Deleted deck "${result.rows[0].name}"`
    };
  } catch (error) {
    console.error('[AI] Delete deck error:', error.message);
    return { error: `Failed to delete deck: ${error.message}` };
  }
}

/**
 * Record sale
 */
async function recordSale(userId, cardName, price, quantity = 1) {
  try {
    // Find card in inventory
    const findResult = await pool.query(
      'SELECT id, name, quantity, purchase_price FROM inventory WHERE user_id = $1 AND name ILIKE $2 LIMIT 1',
      [userId, `%${cardName}%`]
    );
    
    if (findResult.rows.length === 0) {
      return { error: `Card not found in inventory: ${cardName}` };
    }
    
    const card = findResult.rows[0];
    
    // Record the sale
    await pool.query(`
      INSERT INTO sales (user_id, card_name, quantity, sale_price, cost_basis, sale_date)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [userId, card.name, quantity, price, card.purchase_price || 0]);
    
    // Remove from inventory
    const currentQty = card.quantity || 1;
    if (quantity >= currentQty) {
      await pool.query('DELETE FROM inventory WHERE id = $1', [card.id]);
    } else {
      await pool.query('UPDATE inventory SET quantity = quantity - $1 WHERE id = $2', [quantity, card.id]);
    }
    
    // Log transaction
    await pool.query(`
      INSERT INTO inventory_transactions (user_id, card_name, quantity, transaction_type, transaction_date)
      VALUES ($1, $2, $3, 'sell', NOW())
    `, [userId, card.name, quantity]);
    
    const profit = price - (card.purchase_price || 0) * quantity;
    
    return {
      success: true,
      message: `Sold ${quantity}x ${card.name} for $${price}`,
      profit: profit
    };
  } catch (error) {
    console.error('[AI] Record sale error:', error.message);
    return { error: `Failed to record sale: ${error.message}` };
  }
}

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

/**
 * Execute a tool call
 */
async function executeTool(toolName, args, userId) {
  console.log(`[AI] Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    // READ TOOLS
    case 'search_scryfall':
      return await searchScryfall(args.query, args.limit);
    case 'get_card_price':
      return await getCardPrice(args.cardName);
    case 'validate_deck':
      return await validateDeck(args.commander, args.decklist);
    case 'analyze_moxfield_profile':
      return await analyzeMoxfieldProfile(args.username);
    case 'analyze_mtggoldfish_profile':
      return await analyzeMTGGoldfishProfile(args.username);
    case 'learn_from_youtube':
      return await learnFromYouTube(args.url);
    case 'suggest_deck_techs':
      return await suggestDeckTechs(args.commander);
    case 'analyze_format_meta':
      return await analyzeFormatMeta(args.format);
    case 'search_inventory':
      return await searchInventory(userId, args.query);
    case 'get_decks':
      return await getDecks(userId, args.deckName);
    case 'get_sales':
      return await getSales(userId);
    case 'get_collection_analytics':
      return await getCollectionAnalytics(userId);
    
    // WRITE TOOLS
    case 'add_card_to_inventory':
      return await addCardToInventory(userId, args.cardName, args.quantity, args.folder);
    case 'remove_card_from_inventory':
      return await removeCardFromInventory(userId, args.cardName, args.quantity);
    case 'move_card':
      return await moveCard(userId, args.cardName, args.targetFolder, args.quantity);
    case 'create_deck':
      return await createDeck(userId, args.name, args.commander, args.format);
    case 'add_card_to_deck':
      return await addCardToDeck(userId, args.deckName, args.cardName, args.quantity);
    case 'remove_card_from_deck':
      return await removeCardFromDeck(userId, args.deckName, args.cardName, args.quantity);
    case 'delete_deck':
      return await deleteDeck(userId, args.deckName);
    case 'record_sale':
      return await recordSale(userId, args.cardName, args.price, args.quantity);
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Validate conversation history
 */
function isValidConversationHistory(history) {
  if (!Array.isArray(history)) return false;
  if (history.length > MAX_CONVERSATION_HISTORY_LENGTH) return false;
  
  for (const item of history) {
    if (typeof item !== 'object' || item === null) return false;
    if (!item.role || !['user', 'assistant'].includes(item.role)) return false;
    if (!item.content || typeof item.content !== 'string') return false;
    if (item.content.length > MAX_HISTORY_ITEM_CONTENT_LENGTH) return false;
  }
  return true;
}

/**
 * POST /api/ai/chat
 */
router.post('/ai/chat', authenticate, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.userId;
    
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
    }
    if (!isValidConversationHistory(conversationHistory)) {
      return res.status(400).json({ error: 'Invalid conversation history' });
    }

    const client = getOpenAIClient();
    
    const messages = [
      { 
        role: 'system', 
        content: `${systemPrompt}\n\nYou have access to tools to search cards, manage the user's inventory, decks, and sales. Use them to help the user manage their MTG collection.`
      },
      ...conversationHistory.map(item => ({
        role: item.role,
        content: item.content
      })),
      { role: 'user', content: message.trim() }
    ];

    console.log(`[AI] Processing: ${message.substring(0, 50)}...`);
    
    let completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
    });

    let assistantMessage = completion.choices[0].message;
    
    // Handle tool calls
    let iterations = 0;
    while (assistantMessage.tool_calls && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      console.log(`[AI] Tool iteration ${iterations}: ${assistantMessage.tool_calls.length} calls`);
      
      messages.push(assistantMessage);
      
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args, userId);
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      
      completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      assistantMessage = completion.choices[0].message;
    }

    const aiResponse = assistantMessage.content || 'I apologize, but I was unable to generate a response.';

    res.json({
      response: aiResponse,
      suggestions: [],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI] Chat error:', error.message);
    res.status(500).json({ 
      error: 'Failed to process chat request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ai/status
 */
router.get('/ai/status', async (_req, res) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const isInitialized = !!openaiClient;
  const hasError = !!clientError;
  
  res.json({
    available: hasApiKey && !hasError,
    initialized: isInitialized,
    version: '1.0.0',
    features: ['deck-building', 'card-analysis', 'scryfall-lookup', 'inventory-management', 'deck-management', 'sales-tracking'],
    provider: 'openai',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    tools: tools.map(t => t.function.name),
    error: hasError && process.env.NODE_ENV === 'development' ? clientError.message : undefined
  });
});

export default router;
