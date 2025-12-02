// ========== CENTRALIZED ERROR HANDLING ==========
// Placed after all API routes to catch unhandled errors from route handlers
export function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  console.error('[ERROR] Stack:', err.stack);
  
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }
  
  // Don't expose internal error details in production
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
