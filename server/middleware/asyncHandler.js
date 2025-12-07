/**
 * Async error handler wrapper
 * Wraps async route handlers to automatically catch and forward errors to Express error handler
 * This prevents unhandled promise rejections
 * 
 * Usage:
 * router.get('/path', asyncHandler(async (req, res) => {
 *   // Your async code here
 *   // Any thrown error will be caught and passed to error handler
 * }));
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
