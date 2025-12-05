import express from 'express';
import { authenticate } from '../middleware/index.js';

const router = express.Router();

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
router.get('/ai/status', async (req, res) => {
  res.json({
    available: true,
    version: '1.0.0',
    features: ['deck-building', 'card-analysis', 'format-help']
  });
});

export default router;
