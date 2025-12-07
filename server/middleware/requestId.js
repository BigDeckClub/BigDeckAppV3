import crypto from 'crypto';

/**
 * Request ID middleware
 * Generates a unique ID for each request to enable better debugging and log correlation
 * Stores the ID in req.id and adds it to response headers
 */
export function requestId(req, res, next) {
  // Generate a unique request ID (shortened UUID format)
  req.id = crypto.randomBytes(8).toString('hex');
  
  // Add request ID to response headers for client-side tracking
  res.setHeader('X-Request-ID', req.id);
  
  next();
}
