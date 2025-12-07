// ========== CENTRALIZED ERROR HANDLING ==========
// Placed after all API routes to catch unhandled errors from route handlers
export function errorHandler(err, req, res, next) {
  const requestId = req.id || 'unknown';
  console.error(`[ERROR] Request ID: ${requestId}`, err.message);
  console.error('[ERROR] Stack:', err.stack);
  
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }
  
  // Don't expose internal error details in production
  const statusCode = err.statusCode || 500;
  
  // In production, sanitize error messages to avoid leaking sensitive information
  let message;
  if (process.env.NODE_ENV === 'production') {
    message = statusCode === 500 ? 'Internal server error' : err.message;
  } else {
    message = err.message || 'Internal server error';
  }
  
  res.status(statusCode).json({
    error: message,
    requestId,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}
