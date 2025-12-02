import rateLimit from 'express-rate-limit';

// ========== RATE LIMITING ==========
export const priceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});
