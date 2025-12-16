import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Proxy all requests under /api/external/scryfall/* to https://api.scryfall.com/*
// Preserves method, query string and basic headers. Streams response back to client.
router.all('/*', async (req, res) => {
  try {
    // When mounted at /api/external/scryfall, req.params[0] will be the rest of the
    // path (e.g. 'sets'). Build upstream path and preserve query string.
    const wildcard = req.params && req.params[0] ? `/${req.params[0]}` : '';
    const query = req.originalUrl && req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : '';
    const targetUrl = `https://api.scryfall.com${wildcard}${query ? `?${query}` : ''}`;

    console.log('[SCRYFALL PROXY] Forwarding', req.method, req.originalUrl, '->', targetUrl);

    const fetchOptions = {
      method: req.method,
      headers: {
        // Forward accept and user-agent where present
        accept: req.get('accept') || '*/*',
        'user-agent': req.get('user-agent') || 'bigdeck-proxy',
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : undefined;
      fetchOptions.headers['content-type'] = req.get('content-type') || 'application/json';
    }

    const upstream = await fetch(targetUrl, fetchOptions);

    // Forward status and headers (but avoid hop-by-hop headers)
    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      if (!['transfer-encoding', 'content-encoding', 'connection'].includes(name)) {
        res.setHeader(name, value);
      }
    });

    // Stream the body
    const body = await upstream.buffer();
    res.send(body);
  } catch (err) {
    console.error('[SCRYFALL PROXY] Error proxying request', err.message);
    res.status(502).json({ error: 'Bad gateway' });
  }
});

export default router;
