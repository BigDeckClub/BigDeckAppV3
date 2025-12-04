import { z } from 'zod';

// Valid card qualities
export const VALID_QUALITIES = ['NM', 'LP', 'MP', 'HP', 'DMG'];

// Valid reorder types
export const VALID_REORDER_TYPES = ['normal', 'foil', 'none'];

// Valid sale item types
export const VALID_ITEM_TYPES = ['folder', 'deck', 'card'];

// Date validation pattern (YYYY-MM-DD format)
const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .optional()
  .nullable();

/**
 * Schema for creating a new inventory item
 */
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(255),
  set: z.string().max(10).optional().nullable(),
  set_name: z.string().max(255).optional().nullable(),
  quantity: z.number().int().positive('Quantity must be a positive integer').optional().default(1),
  purchase_price: z.number().nonnegative('Purchase price must be a non-negative number').optional().nullable(),
  purchase_date: dateSchema,
  reorder_type: z.enum(VALID_REORDER_TYPES).optional().default('normal'),
  image_url: z.string().url().max(500).optional().nullable(),
  folder: z.string().max(100).optional().default('Uncategorized'),
  foil: z.boolean().optional().default(false),
  quality: z.enum(VALID_QUALITIES).optional().default('NM'),
});

/**
 * Schema for updating an inventory item
 */
export const updateInventoryItemSchema = z.object({
  quantity: z.number().int().nonnegative('Quantity must be a non-negative integer').optional(),
  purchase_price: z.number().nonnegative('Purchase price must be a non-negative number').optional().nullable(),
  purchase_date: dateSchema,
  reorder_type: z.enum(VALID_REORDER_TYPES).optional(),
  folder: z.string().max(100).optional(),
  low_inventory_alert: z.boolean().optional(),
  low_inventory_threshold: z.number().int().nonnegative().optional(),
  foil: z.boolean().optional(),
  quality: z.enum(VALID_QUALITIES).optional(),
}).refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

/**
 * Schema for creating a sale record
 */
export const createSaleSchema = z.object({
  itemType: z.enum(VALID_ITEM_TYPES, {
    errorMap: () => ({ message: `Item type must be one of: ${VALID_ITEM_TYPES.join(', ')}` })
  }),
  itemId: z.union([z.string(), z.number()]).optional().nullable(),
  itemName: z.string().min(1, 'Item name is required').max(255),
  purchasePrice: z.number().nonnegative('Purchase price must be a non-negative number'),
  sellPrice: z.number().nonnegative('Sell price must be a non-negative number'),
  quantity: z.number().int().positive('Quantity must be a positive integer').optional().default(1),
});

/**
 * Middleware factory for validating request body with a Zod schema
 * @param {z.ZodSchema} schema - The Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    
    // Replace body with parsed/transformed data
    req.body = result.data;
    next();
  };
};
