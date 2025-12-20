import { z } from 'zod'

export const demandSchema = z.object({
  cardId: z.string(),
  quantity: z.number().int().nonnegative(),
  maxPrice: z.number().nonnegative().optional(),
}).strict()

export const directiveSchema = z.object({
  cardId: z.string(),
  mode: z.enum(['FORCE', 'PREFER', 'SHIP_ONLY']),
  quantity: z.number().int().positive().optional(),
}).strict()

export const shippingSchema = z.object({
  base: z.number().nonnegative().optional(),
  freeAt: z.number().nonnegative().optional(),
}).strict()

export const offerSchema = z.object({
  cardId: z.string(),
  sellerId: z.string(),
  price: z.number().nonnegative(),
  quantityAvailable: z.number().int().nonnegative(),
  marketplace: z.string().optional(),
  shipping: shippingSchema.optional(),
}).strict()

export const hotSchema = z.object({
  cardId: z.string(),
  IPS: z.number().optional(),
  targetInventory: z.number().optional(),
}).strict()

export const inputSchema = z.object({
  demands: z.array(demandSchema).max(2000).optional(),
  directives: z.array(directiveSchema).max(500).optional(),
  offers: z.array(offerSchema).max(20000).optional(),
  hotList: z.array(hotSchema).max(2000).optional(),
  cardKingdomPrices: z.record(z.number()).optional(),
  currentInventory: z.record(z.number()).optional(),
}).strict()

export default inputSchema
