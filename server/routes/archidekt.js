// Archidekt API proxy - avoids CORS and DNS issues for frontend
import express from 'express';

const router = express.Router();

// Proxy Archidekt deck data
router.get('/archidekt/deck/:deckId', async (req, res) => {
  const { deckId } = req.params;
  
  if (!deckId || !/^\d+$/.test(deckId)) {
    return res.status(400).json({ error: 'Invalid deck ID' });
  }
  
  try {
    const response = await fetch(`https://archidekt.com/api/decks/${deckId}/`, {
      headers: {
        'User-Agent': 'BigDeck-App/1.0 (MTG Inventory Manager)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Deck not found on Archidekt' });
      }
      return res.status(response.status).json({ 
        error: `Archidekt API error: ${response.statusText}` 
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[ARCHIDEKT] Error fetching deck:', error);
    res.status(500).json({ error: 'Failed to fetch deck from Archidekt' });
  }
});

export default router;
