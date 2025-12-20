import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { inputSchema } from '../autobuy/validation.js'

// Helpers to build arbitraries aligned with schemas
const safeDoubleOpts = { noNaN: true, noDefaultInfinity: true }
const arbDemand = fc.record({ cardId: fc.string({ minLength: 1, maxLength: 12 }), quantity: fc.integer({ min: 0, max: 10 }), maxPrice: fc.option(fc.double({ min: 0, max: 1000, ...safeDoubleOpts }), { nil: undefined }) })
const arbDirective = fc.record({ cardId: fc.string({ minLength: 1, maxLength: 12 }), mode: fc.constantFrom('FORCE', 'PREFER', 'SHIP_ONLY'), quantity: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }) })
const arbShipping = fc.record({ base: fc.option(fc.double({ min: 0, max: 50, ...safeDoubleOpts }), { nil: undefined }), freeAt: fc.option(fc.double({ min: 0, max: 500, ...safeDoubleOpts }), { nil: undefined }) })
const arbOffer = fc.record({ cardId: fc.string({ minLength: 1, maxLength: 12 }), sellerId: fc.string({ minLength: 1, maxLength: 8 }), price: fc.double({ min: 0, max: 500, ...safeDoubleOpts }), quantityAvailable: fc.integer({ min: 0, max: 20 }), marketplace: fc.option(fc.string({ minLength: 1, maxLength: 8 }), { nil: undefined }), shipping: fc.option(arbShipping, { nil: undefined }) })
const arbHot = fc.record({ cardId: fc.string({ minLength: 1, maxLength: 12 }), IPS: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }), targetInventory: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }) })

describe('autobuy input schema — property tests', () => {
  it('accepts generated valid inputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDemand, { maxLength: 5 }),
        fc.array(arbDirective, { maxLength: 3 }),
        fc.array(arbOffer, { maxLength: 10 }),
        fc.array(arbHot, { maxLength: 5 }),
        async (demands, directives, offers, hotList) => {
          const input = { demands, directives, offers, hotList, cardKingdomPrices: { C1: 5 }, currentInventory: { C1: 1 } }
          const parsed = inputSchema.safeParse(input)
          if (!parsed.success) {
            // fail the property test — show diagnostics
            throw new Error('valid input rejected: ' + JSON.stringify(parsed.error.format()))
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('rejects inputs with unexpected top-level keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbOffer, { maxLength: 3 }),
        // avoid prototype-polluting keys like __proto__ or constructor
        fc.string({ minLength: 1, maxLength: 10 }).filter(k => k !== '__proto__' && k !== 'constructor'),
        async (offers, extraKey) => {
          const base = { offers }
          base[extraKey] = 'unexpected'
          const parsed = inputSchema.safeParse(base)
          expect(parsed.success).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })
})
