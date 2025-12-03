// ========== INPUT VALIDATION MIDDLEWARE ==========
// Validate that ID parameter is a positive integer
export function validateId(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID parameter' });
  }
  // Store parsed ID separately to avoid mutating req.params (Express convention)
  req.validatedId = id;
  next();
}
