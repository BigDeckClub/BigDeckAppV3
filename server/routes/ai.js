import express from 'express';
import { authenticate } from '../middleware/index.js';

const router = express.Router();

// Constants for input validation
const MAX_MESSAGE_LENGTH = 4000;
const MAX_CONVERSATION_HISTORY_LENGTH = 50;
const MAX_HISTORY_ITEM_CONTENT_LENGTH = 4000;

/**
 * Validate conversation history array
 * @param {Array} history - The conversation history to validate
 * @returns {boolean} - Whether the history is valid
 */
function isValidConversationHistory(history) {
  if (!Array.isArray(history)) {
    return false;
  }
  
  if (history.length > MAX_CONVERSATION_HISTORY_LENGTH) {
    return false;
  }
  
  for (const item of history) {
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    if (!item.role || typeof item.role !== 'string') {
      return false;
    }
    if (!['user', 'assistant'].includes(item.role)) {
      return false;
    }
    if (!item.content || typeof item.content !== 'string') {
      return false;
    }
    if (item.content.length > MAX_HISTORY_ITEM_CONTENT_LENGTH) {
      return false;
    }
  }
  
  return true;
}

/**
 * POST /api/ai/chat
 * Handle AI chat requests for deck building and card analysis
 * 
 * Request body:
 * - message: string - The user's message/prompt
 * - conversationHistory: array - Previous messages in the conversation (optional)
 * 
 * Response:
 * - response: string - The AI assistant's response
 * - suggestions: array - Optional card suggestions or actions
 */
router.post('/ai/chat', authenticate, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` });
    }
    
    if (!isValidConversationHistory(conversationHistory)) {
      return res.status(400).json({ error: 'Invalid conversation history format' });
    }

    // For now, return a placeholder response indicating the feature is being developed
    // This endpoint will be connected to the BigDeckAI module when it's exported
    const response = {
      response: `I'm BigDeckAI, your MTG deck building assistant. This feature is currently being integrated. You said: "${message.trim()}"`,
      suggestions: [],
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('[AI] Chat error:', error.message);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

/**
 * GET /api/ai/status
 * Check the status of the AI service
 */
router.get('/ai/status', async (_req, res) => {
  res.json({
    available: true,
    version: '1.0.0',
    features: ['deck-building', 'card-analysis', 'format-help']
  });
});

export default router;
