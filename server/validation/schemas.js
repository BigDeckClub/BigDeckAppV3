/**
 * Request validation schemas using Zod
 * Centralized validation for all API endpoints
 */

import { z } from 'zod';

/**
 * Common schemas
 */
export const IdSchema = z.union([
  z.string().uuid(),
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform(Number)
]);

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(50)
});

/**
 * Card schemas
 */
export const CardSetSchema = z.union([
  z.string().min(1).max(10),
  z.object({
    editionname: z.string().optional(),
    editioncode: z.string().optional(),
    mtgoCode: z.string().optional(),
    editiondate: z.string().optional(),
    editiontype: z.string().optional()
  })
]);

export const CardSchema = z.object({
  id: IdSchema.optional(),
  name: z.string().min(1).max(200),
  set: CardSetSchema.optional(),
  set_name: z.string().optional(),
  quantity: z.number().int().nonnegative().default(1),
  purchase_price: z.number().nonnegative().optional(),
  purchase_date: z.string().datetime().optional(),
  folder: z.string().max(100).default('Uncategorized'),
  foil: z.boolean().default(false),
  quality: z.enum(['NM', 'LP', 'MP', 'HP', 'DMG']).default('NM'),
  reserved_quantity: z.number().int().nonnegative().default(0),
  low_inventory_alert: z.boolean().default(false),
  low_inventory_threshold: z.number().int().nonnegative().optional(),
  scryfall_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional()
});

/**
 * Inventory schemas
 */
export const AddInventorySchema = z.object({
  name: z.string().min(1).max(200),
  set: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  purchase_price: z.number().nonnegative().optional(),
  folder: z.string().max(100).optional(),
  foil: z.boolean().default(false),
  quality: z.enum(['NM', 'LP', 'MP', 'HP', 'DMG']).default('NM')
});

export const UpdateInventorySchema = z.object({
  quantity: z.number().int().nonnegative().optional(),
  purchase_price: z.number().nonnegative().optional(),
  folder: z.string().max(100).optional(),
  foil: z.boolean().optional(),
  quality: z.enum(['NM', 'LP', 'MP', 'HP', 'DMG']).optional(),
  low_inventory_alert: z.boolean().optional(),
  low_inventory_threshold: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * Deck schemas
 */
export const DeckCardSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().positive().default(1),
  type_line: z.string().optional(),
  mana_cost: z.string().optional(),
  cmc: z.number().nonnegative().optional(),
  colors: z.array(z.string()).optional(),
  color_identity: z.array(z.string()).optional()
});

export const CreateDeckSchema = z.object({
  name: z.string().min(1).max(200),
  format: z.enum(['commander', 'standard', 'modern', 'legacy', 'vintage', 'pauper', 'other']).default('commander'),
  commander: z.string().optional(),
  cards: z.array(DeckCardSchema).default([]),
  description: z.string().max(1000).optional()
});

export const UpdateDeckSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  format: z.enum(['commander', 'standard', 'modern', 'legacy', 'vintage', 'pauper', 'other']).optional(),
  commander: z.string().optional(),
  cards: z.array(DeckCardSchema).optional(),
  description: z.string().max(1000).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * Import schemas
 */
export const CreateImportSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  card_list: z.string().min(1),
  source: z.enum(['wholesale', 'tcgplayer', 'cardkingdom', 'local', 'other']).default('wholesale'),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).default('pending')
});

export const UpdateImportSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  card_list: z.string().min(1).optional(),
  source: z.enum(['wholesale', 'tcgplayer', 'cardkingdom', 'local', 'other']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * AI Deck Generation schemas
 */
export const GenerateDeckSchema = z.object({
  commander: z.string().min(1).max(200).optional(),
  userPrompt: z.string().min(10).max(5000),
  budget: z.number().positive().optional(),
  includeUserInventory: z.boolean().default(false),
  colorIdentity: z.array(z.enum(['W', 'U', 'B', 'R', 'G'])).optional(),
  themes: z.array(z.string()).optional(),
  excludedCards: z.array(z.string()).optional()
});

/**
 * Folder schemas
 */
export const CreateFolderSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
});

export const UpdateFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

/**
 * Search/Query schemas
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  filters: z.object({
    set: z.string().optional(),
    folder: z.string().optional(),
    foil: z.boolean().optional(),
    quality: z.enum(['NM', 'LP', 'MP', 'HP', 'DMG']).optional()
  }).optional(),
  sort: z.object({
    field: z.enum(['name', 'price', 'quantity', 'set', 'dateAdded']).default('name'),
    direction: z.enum(['asc', 'desc']).default('asc')
  }).optional()
});

/**
 * Validation middleware factory
 * Creates Express middleware for schema validation
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body
                 : source === 'params' ? req.params
                 : source === 'query' ? req.query
                 : req[source];

      const validated = schema.parse(data);

      // Replace the source data with validated data
      if (source === 'body') req.body = validated;
      else if (source === 'params') req.params = validated;
      else if (source === 'query') req.query = validated;
      else req[source] = validated;

      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}
