import { describe, it, expect } from 'vitest'
import optimizer from '../autobuy/optimizer'

const { phase4CardKingdomFallback } = optimizer

describe('autobuy Phase4 Card Kingdom fallback', () => {
  it('fulfills unmet demand via CK and triggers free shipping when subtotal >= freeAt', () => {
    const basketsIn: any[] = []
    const unmet = [{ cardId: 'Z', quantity: 2 }, { cardId: 'Y', quantity: 1 }]
    const ckPrices = new Map([['Z', 5], ['Y', 3]])
    const ckShipping = { base: 8, freeAt: 12 }

    const { baskets, unmet: outUnmet } = phase4CardKingdomFallback(basketsIn, unmet, ckPrices, ckShipping)
    expect(outUnmet.length).toBe(0)
    const ck = baskets.find(b => b.marketplace === 'CK')
    expect(ck).toBeDefined()
    // Z: 2 * 5 = 10, Y: 1 * 3 = 3 => subtotal 13, exceeds freeAt 12
    expect(ck.cardSubtotal).toBe(13)
    expect(ck.freeShippingTriggered).toBe(true)
    expect(ck.shippingCost).toBe(0)
  })
})
