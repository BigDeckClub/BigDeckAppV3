import crypto from 'crypto';

/**
 * API Key authentication middleware for external AI agent access
 * Validates X-API-Key header against configured API keys
 */
export async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required. Include X-API-Key header.' });
    }

    // Get configured API keys from environment variable
    // Format: comma-separated list of keys
    const validApiKeys = process.env.AI_API_KEYS?.split(',').map(k => k.trim()).filter(Boolean) || [];
    
    if (validApiKeys.length === 0) {
      console.error('[API-KEY-AUTH] No AI_API_KEYS configured in environment');
      return res.status(500).json({ error: 'API key authentication not configured' });
    }

    // Use timing-safe comparison to prevent timing attacks
    // Always perform comparison with a buffer of the correct length to avoid leaking length info
    let isValid = false;
    const apiKeyBuffer = Buffer.from(apiKey);
    
    for (const validKey of validApiKeys) {
      const validKeyBuffer = Buffer.from(validKey);
      
      // Always perform timing-safe comparison, using a dummy buffer if lengths don't match
      const lengthMatch = apiKeyBuffer.length === validKeyBuffer.length;
      const paddedApiKey = lengthMatch ? apiKeyBuffer : Buffer.alloc(validKeyBuffer.length);
      
      try {
        if (lengthMatch && crypto.timingSafeEqual(paddedApiKey, validKeyBuffer)) {
          isValid = true;
          break;
        }
      } catch (e) {
        // Length mismatch or comparison error
        continue;
      }
    }
    
    if (!isValid) {
      console.warn('[API-KEY-AUTH] Invalid API key attempt');
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // API key is valid - proceed
    next();
  } catch (error) {
    console.error('[API-KEY-AUTH] Authentication error:', error.message);
    res.status(500).json({ error: 'API key authentication failed' });
  }
}
