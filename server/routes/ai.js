import express from 'express';
import { authenticate } from '../middleware/index.js';
import OpenAI from 'openai';
import { systemPrompt } from 'bigdeck-ai';
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
 * Tool definitions for OpenAI function calling
 */
const tools = [
  {
    type: 'function',
    function: {
      name: 'search_scryfall',
      description: 'Search for Magic: The Gathering cards using the Scryfall API. Use this to look up card information, find cards by name, or search for cards matching specific criteria.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query. Can be a card name or Scryfall search syntax (e.g., "c:green type:creature cmc<=3")'
          },
          exact: {
            type: 'boolean',
            description: 'If true, search for exact card name match. If false, do a fuzzy/full-text search.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_inventory',
      description: 'Get the current user\'s MTG card inventory from BigDeck.app. Returns cards they own with quantities, conditions, and folders.',
      parameters: {
        type: 'object',
        properties: {
          folder: {
            type: 'string',
            description: 'Optional folder name to filter inventory by'
          },
          search: {
            type: 'string', 
            description: 'Optional search term to filter cards by name'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_card_price',
      description: 'Get current market prices for a specific MTG card',
      parameters: {
        type: 'object',
        properties: {
          cardName: {
            type: 'string',
            description: 'The name of the card to get prices for'
          },
          setCode: {
            type: 'string',
            description: 'Optional 3-letter set code (e.g., "MH3", "ONE")'
          }
        },
        required: ['cardName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_decks',
      description: 'Get the user\'s deck lists and deck instances from BigDeck.app. Returns deck names, commanders, card counts, and completion status.',
      parameters: {
        type: 'object',
        properties: {
          deckId: {
            type: 'number',
            description: 'Optional specific deck ID to get details for'
          }
        },
        required: []
      }
    }
  },
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
  },
  // Tools from bigdeck-ai package
  {
    type: 'function',
    function: {
      name: 'validate_deck',
      description: 'Validate a Commander deck for legality and format rules. Checks deck size (must be 100 cards), color identity restrictions, singleton rule, ban list compliance, and provides structural recommendations.',
      parameters: {
        type: 'object',
        properties: {
          deck: {
            type: 'array',
            description: 'Array of card names in the deck (99 cards + commander)',
            items: { type: 'string' }
          },
          commander: {
            type: 'string',
            description: 'Commander card name'
          }
        },
        required: ['deck', 'commander']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_moxfield_profile',
      description: 'Analyze a Moxfield user profile to understand their deck building patterns, favorite commanders, color preferences, and brewing style.',
      parameters: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: 'Moxfield username to analyze'
          }
        },
        required: ['username']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_mtggoldfish_profile',
      description: 'Analyze a MTGGoldfish user profile to understand their deck building patterns and favorite commanders.',
      parameters: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            description: 'MTGGoldfish username to analyze'
          }
        },
        required: ['username']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'learn_from_youtube',
      description: 'Extract deck information and strategy from a Magic: The Gathering YouTube video (deck tech, gameplay, etc.). Use this when asked to learn from or analyze a YouTube video.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'YouTube video URL (supports youtube.com/watch?v= or youtu.be/ formats)'
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggest_deck_techs',
      description: 'Get suggestions for YouTube deck tech videos to learn from for a specific commander. Use this when users want to find educational content about a commander.',
      parameters: {
        type: 'object',
        properties: {
          commander: {
            type: 'string',
            description: 'Commander name to search deck techs for'
          }
        },
        required: ['commander']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_format_meta',
      description: 'Analyze the current metagame for a Magic format (Commander, Modern, etc.). Returns popular decks, meta share, and trends.',
      parameters: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            description: 'Format to analyze (e.g., commander, modern, standard). Defaults to commander.'
          }
        },
        required: []
      }
    }
  }
];

/**
 * Execute Scryfall search
 */
async function searchScryfall(query, exact = false) {
  try {
    const endpoint = exact 
      ? `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query)}`
      : `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(endpoint);
    const data = await response.json();
    
    if (data.object === 'error') {
      return { error: data.details || 'Card not found' };
    }
    
    // For exact match, return single card
    if (exact || data.object === 'card') {
      const card = data.object === 'card' ? data : data;
      return {
        name: card.name,
        mana_cost: card.mana_cost,
        type_line: card.type_line,
        oracle_text: card.oracle_text,
        colors: card.colors,
        color_identity: card.color_identity,
        cmc: card.cmc,
        power: card.power,
        toughness: card.toughness,
        set_name: card.set_name,
        rarity: card.rarity,
        prices: card.prices,
        legalities: card.legalities?.commander === 'legal' ? 'Legal in Commander' : card.legalities?.commander
      };
    }
    
    // For search, return top 10 results
    const cards = (data.data || []).slice(0, 10).map(card => ({
      name: card.name,
      mana_cost: card.mana_cost,
      type_line: card.type_line,
      set_name: card.set_name,
      cmc: card.cmc
    }));
    
    return { 
      total_cards: data.total_cards,
      cards 
    };
  } catch (error) {
    console.error('[AI] Scryfall search error:', error.message);
    return { error: 'Failed to search Scryfall' };
  }
}

/**
 * Get user inventory from database
 */
async function getUserInventory(userId, folder, search) {
  try {
    let query = `
      SELECT 
        i.id, i.name, i.set AS set_name, i.quantity, i.quality, i.foil, i.folder,
        i.purchase_price, i.scryfall_id
      FROM inventory i
      WHERE i.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;
    
    if (folder) {
      query += ` AND i.folder = $${paramIndex}`;
      params.push(folder);
      paramIndex++;
    }
    
    if (search) {
      query += ` AND i.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY i.name LIMIT 50';
    
    const result = await pool.query(query, params);
    
    const summary = {
      total_cards: result.rows.length,
      total_quantity: result.rows.reduce((sum, r) => sum + (r.quantity || 1), 0),
      cards: result.rows.map(row => ({
        name: row.name,
        set: row.set_name,
        quantity: row.quantity || 1,
        quality: row.quality,
        foil: row.foil,
        folder: row.folder
      }))
    };
    
    return summary;
  } catch (error) {
    console.error('[AI] Inventory query error:', error.message);
    return { error: 'Failed to fetch inventory' };
  }
}

/**
 * Get card prices (from Scryfall)
 */
async function getCardPrice(cardName, setCode) {
  try {
    let url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`;
    if (setCode) {
      url += `&set=${setCode.toLowerCase()}`;
    }
    
    const response = await fetch(url);
    const card = await response.json();
    
    if (card.object === 'error') {
      return { error: card.details || 'Card not found' };
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
 * Get user's decks
 */
async function getUserDecks(userId, deckId) {
  try {
    if (deckId) {
      // Get specific deck with cards
      const deckResult = await pool.query(
        'SELECT id, name, commander, cards, is_deck_instance, decklist_id FROM decks WHERE id = $1 AND user_id = $2',
        [deckId, userId]
      );
      if (deckResult.rows.length === 0) {
        return { error: 'Deck not found' };
      }
      const deck = deckResult.rows[0];
      const cards = deck.cards || [];
      return {
        id: deck.id,
        name: deck.name,
        commander: deck.commander,
        is_instance: deck.is_deck_instance,
        card_count: cards.length,
        cards: cards.slice(0, 20).map(c => typeof c === 'string' ? c : c.name || c)
      };
    }
    
    // Get all decks summary
    const result = await pool.query(`
      SELECT 
        d.id, d.name, d.commander, d.is_deck_instance,
        COALESCE(json_array_length(d.cards::json), 0) as card_count,
        (SELECT COALESCE(SUM(dr.quantity_reserved), 0) FROM deck_reservations dr WHERE dr.deck_id = d.id) as reserved_count
      FROM decks d
      WHERE d.user_id = $1
      ORDER BY d.name
    `, [userId]);
    
    return {
      total_decks: result.rows.length,
      decks: result.rows.map(d => ({
        id: d.id,
        name: d.name,
        commander: d.commander,
        is_instance: d.is_deck_instance,
        card_count: d.card_count,
        reserved_cards: d.reserved_count
      }))
    };
  } catch (error) {
    console.error('[AI] Decks query error:', error.message);
    return { error: 'Failed to fetch decks' };
  }
}

/**
 * Get collection analytics
 */
async function getCollectionAnalytics(userId) {
  try {
    // Get card counts
    const countsResult = await pool.query(
      'SELECT COUNT(DISTINCT LOWER(TRIM(name))) as unique_cards, SUM(quantity) as total_cards FROM inventory WHERE user_id = $1',
      [userId]
    );
    
    // Get folder breakdown
    const foldersResult = await pool.query(
      'SELECT folder, COUNT(*) as count, SUM(quantity) as total FROM inventory WHERE user_id = $1 GROUP BY folder ORDER BY total DESC',
      [userId]
    );
    
    // Get recent additions (last 30 days)
    const recentResult = await pool.query(
      `SELECT SUM(quantity) as added FROM inventory_transactions 
       WHERE transaction_type = 'add' AND transaction_date >= CURRENT_DATE - INTERVAL '30 days' AND user_id = $1`,
      [userId]
    );
    
    // Get total purchase value
    const valueResult = await pool.query(
      `SELECT COALESCE(SUM(quantity * purchase_price), 0) as total_cost FROM inventory WHERE user_id = $1`,
      [userId]
    );
    
    // Get deck count
    const decksResult = await pool.query(
      'SELECT COUNT(*) as count FROM decks WHERE user_id = $1',
      [userId]
    );
    
    return {
      unique_cards: parseInt(countsResult.rows[0]?.unique_cards) || 0,
      total_cards: parseInt(countsResult.rows[0]?.total_cards) || 0,
      total_decks: parseInt(decksResult.rows[0]?.count) || 0,
      total_purchase_cost: parseFloat(valueResult.rows[0]?.total_cost) || 0,
      cards_added_last_30_days: parseInt(recentResult.rows[0]?.added) || 0,
      folders: foldersResult.rows.map(f => ({
        name: f.folder || 'Uncategorized',
        cards: parseInt(f.count),
        quantity: parseInt(f.total)
      }))
    };
  } catch (error) {
    console.error('[AI] Analytics query error:', error.message);
    return { error: 'Failed to fetch analytics' };
  }
}

// ============================================================================
// BigDeck-AI Tool Functions (imported tool schemas with local execution)
// ============================================================================

/**
 * Validate a Commander deck
 */
async function validateDeck(deck, commander) {
  try {
    // Import validation utilities from bigdeck-ai
    const { isCardBanned } = await import('bigdeck-ai/knowledge/commanderRules');
    const { validateDeckColorIdentity } = await import('bigdeck-ai/utils/colorIdentity');
    
    const errors = [];
    const warnings = [];
    const info = [];
    
    // Fetch commander info from Scryfall
    const commanderData = await searchScryfall(commander, true);
    if (commanderData.error) {
      return { valid: false, errors: [`Could not find commander: ${commander}`], warnings: [], info: [] };
    }
    
    const commanderColorIdentity = commanderData.color_identity || [];
    
    // Check deck size (99 + commander = 100)
    const totalCards = deck.length + 1;
    if (totalCards !== 100) {
      errors.push(`Deck must be exactly 100 cards (including commander). Current: ${totalCards}`);
    }
    
    // Check for banned cards
    const bannedCards = deck.filter(cardName => isCardBanned(cardName));
    if (bannedCards.length > 0) {
      errors.push(`Banned cards detected: ${bannedCards.join(', ')}`);
    }
    
    // Check singleton rule (except basic lands)
    const basicLands = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
    const cardCounts = {};
    deck.forEach(cardName => {
      if (!basicLands.includes(cardName)) {
        cardCounts[cardName] = (cardCounts[cardName] || 0) + 1;
      }
    });
    
    const duplicates = Object.entries(cardCounts)
      .filter(([, count]) => count > 1)
      .map(([name, count]) => `${name} (${count}x)`);
    
    if (duplicates.length > 0) {
      errors.push(`Singleton violation - duplicate cards: ${duplicates.join(', ')}`);
    }
    
    // Provide statistics
    info.push(`Total cards: ${totalCards}`);
    info.push(`Commander: ${commander}`);
    info.push(`Commander colors: ${commanderColorIdentity.length > 0 ? commanderColorIdentity.join('') : 'Colorless'}`);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    };
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
    const { profileAnalyzer } = await import('bigdeck-ai/learning/profileAnalyzer.js');
    const analysis = await profileAnalyzer.analyzeMoxfieldProfile(username);
    return analysis;
  } catch (error) {
    console.error('[AI] Moxfield analysis error:', error.message);
    return { error: `Failed to analyze Moxfield profile: ${error.message}` };
  }
}

/**
 * Analyze MTGGoldfish profile
 */
async function analyzeMTGGoldfishProfile(username) {
  try {
    const { profileAnalyzer } = await import('bigdeck-ai/learning/profileAnalyzer.js');
    const analysis = await profileAnalyzer.analyzeMTGGoldfishProfile(username);
    return analysis;
  } catch (error) {
    console.error('[AI] MTGGoldfish analysis error:', error.message);
    return { error: `Failed to analyze MTGGoldfish profile: ${error.message}` };
  }
}

/**
 * Learn from YouTube video
 */
async function learnFromYouTube(url) {
  try {
    const { youtubeLearner } = await import('bigdeck-ai/learning/youtubeLearner.js');
    const result = await youtubeLearner.learnFromVideo(url);
    return result;
  } catch (error) {
    console.error('[AI] YouTube learning error:', error.message);
    return { success: false, error: `Failed to learn from YouTube: ${error.message}` };
  }
}

/**
 * Suggest deck tech videos
 */
async function suggestDeckTechs(commander) {
  try {
    const { youtubeLearner } = await import('bigdeck-ai/learning/youtubeLearner.js');
    const suggestions = await youtubeLearner.suggestDeckTechs(commander);
    return suggestions;
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
    const { metaAnalyzer } = await import('bigdeck-ai/learning/metaAnalyzer.js');
    const analysis = await metaAnalyzer.analyzeFormat(format);
    return analysis;
  } catch (error) {
    console.error('[AI] Meta analysis error:', error.message);
    return { error: `Failed to analyze meta: ${error.message}` };
  }
}

/**
 * Execute a tool call
 */
async function executeTool(toolName, args, userId) {
  console.log(`[AI] Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    // Core BigDeck.app tools
    case 'search_scryfall':
      return await searchScryfall(args.query, args.exact);
    case 'get_user_inventory':
      return await getUserInventory(userId, args.folder, args.search);
    case 'get_card_price':
      return await getCardPrice(args.cardName, args.setCode);
    case 'get_user_decks':
      return await getUserDecks(userId, args.deckId);
    case 'get_collection_analytics':
      return await getCollectionAnalytics(userId);
    
    // BigDeck-AI tools
    case 'validate_deck':
      return await validateDeck(args.deck, args.commander);
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
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

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
 * AI chat with tool calling capabilities
 */
router.post('/ai/chat', authenticate, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.userId;
    
    // Validation
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
    
    // Build messages with system prompt
    const messages = [
      { 
        role: 'system', 
        content: `${systemPrompt}\n\nYou have access to tools to look up cards via Scryfall and access the user's inventory. Use them when helpful to provide accurate, specific information.`
      },
      ...conversationHistory.map(item => ({
        role: item.role,
        content: item.content
      })),
      { role: 'user', content: message.trim() }
    ];

    console.log(`[AI] Processing: ${message.substring(0, 50)}...`);
    
    // Initial completion with tools
    let completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2000,
    });

    let assistantMessage = completion.choices[0].message;
    
    // Handle tool calls (up to MAX_TOOL_ITERATIONS)
    let iterations = 0;
    while (assistantMessage.tool_calls && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      console.log(`[AI] Tool iteration ${iterations}: ${assistantMessage.tool_calls.length} calls`);
      
      // Add assistant's message with tool calls
      messages.push(assistantMessage);
      
      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args, userId);
        
        // Add tool result
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      
      // Get next completion
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
 * GET /api/ai/inventory/:userId
 * Get user inventory for AI context (internal endpoint)
 */
router.get('/ai/inventory/:userId', authenticate, async (req, res) => {
  try {
    // Only allow users to access their own inventory
    if (req.userId !== req.params.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const inventory = await getUserInventory(req.params.userId);
    res.json(inventory);
  } catch (error) {
    console.error('[AI] Inventory endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch inventory' });
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
    features: ['deck-building', 'card-analysis', 'scryfall-lookup', 'inventory-access'],
    provider: 'openai',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    tools: ['search_scryfall', 'get_user_inventory', 'get_card_price'],
    error: hasError && process.env.NODE_ENV === 'development' ? clientError.message : undefined
  });
});

export default router;
