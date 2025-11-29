/**
 * Authentication middleware for Express routes
 * Provides utilities to check if users are authenticated
 */

/**
 * Middleware that requires authentication
 * Returns 401 if user is not authenticated
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  
  console.log('[AUTH] Unauthorized access attempt to protected route:', req.path);
  return res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please log in to access this resource'
  });
}

/**
 * Middleware that optionally extracts user if authenticated
 * Does not block unauthenticated requests
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function optionalAuth(req, res, next) {
  // Just pass through - user will be available on req.user if authenticated
  return next();
}

/**
 * Get user ID from request
 * @param {import('express').Request} req
 * @returns {string|null} User ID or null if not authenticated
 */
export function getUserId(req) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  return null;
}

export default { requireAuth, optionalAuth, getUserId };
