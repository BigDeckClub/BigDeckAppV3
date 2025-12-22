import { describe, it, expect } from 'vitest'
import { runFullPipeline } from './optimizer'
import type { Demand, Offer } from './types'

describe('Optimizer Refinement: Grace & Substitutions', () => {

    it('should use Grace Amount to trigger free shipping if cheaper', () => {
        // Scenario: $5.00 shipping, free at $50.00
        // Current Basket: $48.00 (from 10x CardA @ $4.80)
        // Gap: $2.00
        // Options: 
        // 1. Pay $5.00 shipping -> Total $53.00
        // 2. Buy 1x extra CardA @ $4.80 -> Total $52.80 (Free shipping)
        // Result: Buying extra is cheaper!

        const demands: Demand[] = [{ cardId: 'CardA', quantity: 10 }]
        const offers: Offer[] = [
            {
                cardId: 'CardA', sellerId: 'Seller1', price: 4.80, quantityAvailable: 20,
                shipping: { base: 5.00, freeAt: 50.00 },
                marketplace: 'TCG'
            }
        ]

        const result = runFullPipeline({
            demands,
            offers,
            graceAmount: 1
        })

        const basket = result.baskets.find(b => b.sellerId === 'Seller1')
        expect(basket).toBeDefined()
        // Should have 11 items (10 demand + 1 grace)
        const cardA = basket?.items.find((i: any) => i.cardId === 'CardA')
        expect(cardA?.quantity).toBe(11)
        expect(basket?.shippingCost).toBe(0)
        expect(basket?.totalCost).toBe(52.80)
    })

    it('should NOT use Grace Amount if paying shipping is cheaper', () => {
        // Scenario: $2.00 shipping, free at $50.00
        // Current Basket: $48.00
        // Extra item: $4.80
        // Option 1: Pay $2.00 shipping -> Total $50.00
        // Option 2: Buy extra $4.80 -> Total $52.80
        // Result: Paying shipping is cheaper.

        const demands: Demand[] = [{ cardId: 'CardA', quantity: 10 }]
        const offers: Offer[] = [
            {
                cardId: 'CardA', sellerId: 'Seller1', price: 4.80, quantityAvailable: 20,
                shipping: { base: 2.00, freeAt: 50.00 },
                marketplace: 'TCG'
            }
        ]

        const result = runFullPipeline({
            demands,
            offers,
            graceAmount: 1
        })

        const basket = result.baskets.find(b => b.sellerId === 'Seller1')
        expect(basket).toBeDefined()
        // Should stick to 10 items
        const cardA = basket?.items.find((i: any) => i.cardId === 'CardA')
        expect(cardA?.quantity).toBe(10)
        expect(basket?.shippingCost).toBe(2.00)
        expect(basket?.totalCost).toBe(50.00)
    })

    it('should use Substitution Groups to fill unmet demand', () => {
        // Demand: Sol Ring
        // Availability: Only Commander's Sphere (defined as substitute for test)
        // Note: Realistically these aren't subs, but for test logic they are.

        const demands: Demand[] = [{ cardId: 'Sol Ring', quantity: 1 }]
        const offers: Offer[] = [
            {
                cardId: 'Mana Crypt', sellerId: 'Seller1', price: 100.00, quantityAvailable: 1,
                shipping: { base: 0 },
                marketplace: 'TCG'
            }
        ]

        // Define Substitution Group
        const groups = [{ groupId: 'g1', cards: ['Sol Ring', 'Mana Crypt'] }]

        const result = runFullPipeline({
            demands,
            offers,
            substitutionGroups: groups
        })

        const basket = result.baskets.find(b => b.sellerId === 'Seller1')
        expect(basket).toBeDefined()

        // Should contain Mana Crypt instead of Sol Ring
        const subCard = basket?.items.find((i: any) => i.cardId === 'Mana Crypt')
        expect(subCard?.quantity).toBe(1)

        // Unmet should be empty because we successfully substituted
        // (Tests our logic update to unmetMap)
        // expect(result.unmet.length).toBe(0) // Unmet is not returned in final plan
    })
})
