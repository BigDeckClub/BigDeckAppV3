/**
 * Centralized Error Handling Middleware
 * 
 * This middleware provides consistent error responses across all API endpoints.
 * It handles different types of errors (validation, database, etc.) and returns
 * appropriate HTTP status codes and error messages.
 */

// Database error codes and their HTTP status mappings
const DB_ERROR_CODES = {
  '23505': { status: 400, message: 'Duplicate entry' },
  '23503': { status: 400, message: 'Foreign key violation' },
  '22P02': { status: 400, message: 'Invalid input syntax' },
  '23502': { status: 400, message: 'Missing required field' },
  'ENOTFOUND': { status: 500, message: 'Database connection failed' },
  'EAI_AGAIN': { status: 500, message: 'Database connection failed' },
  'ECONNREFUSED': { status: 500, message: 'Database connection refused' },
  'ETIMEDOUT': { status: 500, message: 'Database connection timed out' }
};

/**
 * Error handler middleware
 * Place this after all routes in the Express app
 */
export function errorHandler(err, req, res, next) {
  // Log the full error for debugging
  console.error('[ERROR HANDLER] Full error:', {
    message: err.message,
    code: err.code,
    detail: err.detail,
    constraint: err.constraint,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Check if response has already been sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle Joi validation errors
  if (err.isJoi || err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: err.details?.map(d => d.message) || [err.message]
    });
  }

  // Handle database errors
  if (err.code && DB_ERROR_CODES[err.code]) {
    const { status, message } = DB_ERROR_CODES[err.code];
    return res.status(status).json({
      error: message,
      details: err.detail || err.message
    });
  }

  // Handle specific error types
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request body too large'
    });
  }

  // Handle 404 for unknown routes (should be rare if catch-all is last)
  if (err.status === 404) {
    return res.status(404).json({
      error: 'Resource not found'
    });
  }

  // Default to 500 for unknown errors
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
}

/**
 * 404 handler for unknown API routes
 * Place this before the error handler, after all routes
 */
export function notFoundHandler(req, res, next) {
  if (req.path.startsWith('/api/')) {
    console.warn(`[404] API endpoint not found: ${req.method} ${req.path}`);
    return res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  }
  // Let non-API requests pass through (for SPA catch-all)
  next();
}

/**
 * Async wrapper to catch errors in async route handlers
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default { errorHandler, notFoundHandler, asyncHandler };
