import { describe, it, expect } from 'vitest'
import optimizer from '../autobuy/optimizer'
import type { SellerBasket as SB, Offer, Demand } from '../autobuy/types'

const { phase2OptimizeShipping, phase3LocalImprovement } = optimizer

describe('autobuy Phase2 shipping optimization', () => {
  it('adds candidate from unmet demand to trigger free shipping when beneficial', () => {
    // initial basket: subtotal 10, shipping base 5, freeAt 12
    const basketsIn: SB[] = [
      {
        sellerId: 'Sx',
        marketplace: 'TCG',
        items: new Map([['CARD1', 1]]),
        cardSubtotal: 10,
        shippingCost: 5,
        freeShippingTriggered: false,
        totalCost: 15,
        reasons: new Map([['CARD1', ['DECK_DEMAND']]]),
      } as any,
    ]

    const offers: Offer[] = [
      // seller Sx offers CARD2 at price 2, available 1, shipping rules base 5 freeAt 12
      {
        marketplace: 'TCG',
        sellerId: 'Sx',
        cardId: 'CARD2',
        price: 2,
        quantityAvailable: 1,
        shipping: { base: 5, freeAt: 12 },
      },
    ]

    const unmet: Demand[] = [{ cardId: 'CARD2', quantity: 1 }]
    const hotList: any[] = []
    const directives: any[] = []
    const maxPriceByCard = new Map([['CARD2', 100]])
    const currentInventory = new Map()

    const { baskets: out, offers: _ } = phase2OptimizeShipping(basketsIn, offers, unmet, hotList, directives, maxPriceByCard, currentInventory)
    // find basket Sx
    const bx = out.find(b => b.sellerId === 'Sx')!
    expect(bx).toBeDefined()
    // CARD2 should have been added and free shipping triggered
    expect(bx.items.get('CARD2')).toBeGreaterThanOrEqual(1)
    expect(bx.freeShippingTriggered).toBe(true)
    expect(bx.shippingCost).toBe(0)
  })
})

describe('autobuy Phase3 local improvement', () => {
  it('moves unit from higher-cost seller to lower-cost seller when it reduces total', () => {
    // Setup two baskets: S1 has CARDX (1 unit) at effective price 5 and no free ship
    // S2 has none but offers CARDX at price 4 with shipping base 0
    const basketsIn: SB[] = [
      {
        sellerId: 'S1',
        marketplace: 'TCG',
        items: new Map([['CARDX', 1]]),
        cardSubtotal: 5,
        shippingCost: 0,
        freeShippingTriggered: false,
        totalCost: 5,
        reasons: new Map([['CARDX', ['DECK_DEMAND']]]),
      } as any,
      {
        sellerId: 'S2',
        marketplace: 'TCG',
        items: new Map(),
        cardSubtotal: 0,
        shippingCost: 0,
        freeShippingTriggered: false,
        totalCost: 0,
        reasons: new Map(),
      } as any,
    ]

    const offers: Offer[] = [
      { marketplace: 'TCG', sellerId: 'S1', cardId: 'CARDX', price: 5, quantityAvailable: 0, shipping: { base: 0 } },
      { marketplace: 'TCG', sellerId: 'S2', cardId: 'CARDX', price: 4, quantityAvailable: 1, shipping: { base: 0 } },
    ]

    const ck = new Map<string, number>([['CARDX', 5]])
    const { baskets: out } = phase3LocalImprovement(basketsIn, offers, ck)
    // After local improvement, S2 should hold CARDX
    const s2 = out.find(b => b.sellerId === 'S2')!
    expect(s2).toBeDefined()
    expect(s2.items.get('CARDX')).toBeGreaterThanOrEqual(1)
    // S1 should no longer have CARDX
    const s1 = out.find(b => b.sellerId === 'S1')
    expect(s1).toBeUndefined()
  })
})
