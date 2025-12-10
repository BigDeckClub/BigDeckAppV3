import rateLimit from 'express-rate-limit';

// ========== RATE LIMITING ==========
// Make rate limits more permissive in development to reduce 429s during local testing.
const isProd = process.env.NODE_ENV === 'production';

export const priceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 100 : 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for AI API endpoints - more restrictive to prevent abuse
export const aiApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: isProd ? 30 : 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter for most routes
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProd ? 120 : 1000,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
