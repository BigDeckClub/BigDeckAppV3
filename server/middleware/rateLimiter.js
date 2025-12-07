import rateLimit from 'express-rate-limit';

// ========== RATE LIMITING ==========
export const priceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

// Rate limiter for AI API endpoints - more restrictive to prevent abuse
export const aiApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // 30 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default keyGenerator which properly handles IPv6
  // Cloud Run sets x-forwarded-for which express-rate-limit reads via trust proxy
});

// General API rate limiter for authenticated endpoints
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 300, // 300 requests per minute (reasonable for normal use)
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health check endpoints
  skip: (req) => req.path.startsWith('/api/health'),
});
