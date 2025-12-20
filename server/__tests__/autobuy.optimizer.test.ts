import { describe, it, expect } from 'vitest'
import optimizer from '../autobuy/optimizer'
import type { Demand, Offer } from '../autobuy/types'

const { preprocessDemands, greedyAllocatePhase1 } = optimizer

describe('autobuy optimizer basic', () => {
  it('preprocess applies FORCE directives and derives maxPrice from CK', () => {
    const demands: Demand[] = [{ cardId: 'C1', quantity: 1 }]
    const directives = [{ cardId: 'C2', quantity: 2, mode: 'FORCE' }]
    const ck = new Map([['C1', 5], ['C2', 10]])
    const currentInventory = new Map()
    const res = preprocessDemands(demands, directives as any, ck, currentInventory)
    expect(res.demands.find(d => d.cardId === 'C1')?.quantity).toBe(1)
    expect(res.demands.find(d => d.cardId === 'C2')?.quantity).toBe(2)
    expect(res.maxPriceByCard.get('C2')).toBe(10)
  })

  it('greedy allocator assigns cheapest marginal offers and reports unmet', () => {
    const demands: Demand[] = [{ cardId: 'X', quantity: 2 }]
    const offers: Offer[] = [
      { marketplace: 'TCG', sellerId: 'S1', cardId: 'X', price: 3, quantityAvailable: 1, shipping: { base: 4 } },
      { marketplace: 'TCG', sellerId: 'S2', cardId: 'X', price: 4, quantityAvailable: 2, shipping: { base: 0 } },
    ]
    const ck = new Map([['X', 10]])
    const { baskets, unmet } = greedyAllocatePhase1(demands, offers as any, ck)
    // total allocated should be 2 (1 from S1 and 1 from S2) given availability
    const totalAllocated = baskets.reduce((sum, b) => sum + Array.from(b.items.values()).reduce((s, q) => s + q, 0), 0)
    expect(totalAllocated).toBe(2)
    expect(unmet.length).toBe(0)
    // since S2 has lower marginal cost (price 4 + shipping 0 < price 3 + shipping 4), all
    // units should be allocated to S2
    const sellers = baskets.map(b => b.sellerId).sort()
    expect(sellers).toEqual(['S2'])
  })
})
