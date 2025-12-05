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
  keyGenerator: (req) => {
    // Use x-forwarded-for header in cloud environments, fallback to req.ip
    return req.headers['x-forwarded-for'] || req.ip;
  },
});
