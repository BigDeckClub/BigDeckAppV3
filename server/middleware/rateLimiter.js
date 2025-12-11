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

// General API rate limiter for most routes
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
