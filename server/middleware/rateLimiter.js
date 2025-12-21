import rateLimit from 'express-rate-limit';

// ========== RATE LIMITING ==========
// Use relaxed limits in non-production to avoid 429s during development / previews
const isProduction = process.env.NODE_ENV === 'production';

export const priceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProduction ? 100 : 1000
});

// Rate limiter for AI API endpoints - more restrictive to prevent abuse
export const aiApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: isProduction ? 30 : 300,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default keyGenerator which properly handles IPv6
  // Cloud Run sets x-forwarded-for which express-rate-limit reads via trust proxy
});

// General API rate limiter for most routes
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProduction ? 300 : 1000, // higher limits in dev/preview
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
