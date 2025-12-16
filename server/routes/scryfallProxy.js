import express from 'express';

const router = express.Router();

// Proxy all requests under /api/external/scryfall/* to https://api.scryfall.com/*
// Preserves method, query string and basic headers. Streams response back to client.
// Express 5 uses path-to-regexp v8 which requires named params: use *path for wildcard
router.all('/*path', async (req, res) => {
  try {
    // When mounted at /api/external/scryfall, req.params.path will be the rest of the
    // path (e.g. ['sets']). Build upstream path and preserve query string.
    const pathParts = req.params.path || [];
    const wildcard = pathParts.length > 0 ? `/${pathParts.join('/')}` : '';
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

    // Stream the body using native fetch's arrayBuffer
    const arrayBuf = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuf));
  } catch (err) {
    console.error('[SCRYFALL PROXY] Error proxying request', err.message);
    res.status(502).json({ error: 'Bad gateway' });
  }
});

export default router;
