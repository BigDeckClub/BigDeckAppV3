import { describe, it, expect } from 'vitest'
import optimizer from '../autobuy/optimizer'

const { phase5FinalizePlan } = optimizer

describe('autobuy Phase5 finalize plan', () => {
  it('produces deterministic plan and correct totals', () => {
    const basketsIn: any[] = [
      {
        sellerId: 'B2',
        marketplace: 'TCG',
        items: new Map([['A', 1]]),
        cardSubtotal: 3,
        shippingCost: 2,
        freeShippingTriggered: false,
        totalCost: 5,
        reasons: new Map([['A', ['DECK_DEMAND']]]),
      },
      {
        sellerId: 'A1',
        marketplace: 'MANABOX',
        items: new Map([['B', 2]]),
        cardSubtotal: 4,
        shippingCost: 0,
        freeShippingTriggered: true,
        totalCost: 4,
        reasons: new Map([['B', ['HOT_LIST']]]),
      },
    ]

    const plan = phase5FinalizePlan(basketsIn)
    expect(plan.summary.totalBaskets).toBe(2)
    // deterministic order: A1 then B2
    expect(plan.baskets[0].sellerId).toBe('A1')
    expect(plan.baskets[1].sellerId).toBe('B2')
    expect(plan.summary.overallTotal).toBe(9)
    // items converted to array objects
    expect(plan.baskets[0].items[0]).toEqual({ cardId: 'B', quantity: 2 })
  })
})
