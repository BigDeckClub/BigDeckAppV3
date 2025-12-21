
import { describe, it, expect } from 'vitest'
import { greedyAllocatePhase1 } from '../optimizer.js'
import type { Demand, Offer } from '../types.js'

describe('Arbitrage Logic (CR Ratio)', () => {
    // Logic: Sort by CR Ratio (Marginal Cost / Retail Price) ASC

    it('should prefer lower CR ratio offers (better deal)', () => {
        // Card Retail: $2.00
        // Offer A (TCG): $1.00 -> Ratio 0.50
        // Offer B (Manabox): $1.50 -> Ratio 0.75
        // Expected: Pick Offer A (TCG)

        const demands: Demand[] = [{ cardId: 'c1', quantity: 1 }]
        const offers: Offer[] = [
            { cardId: 'c1', sellerId: 'MB', marketplace: 'MANABOX', price: 1.50, quantityAvailable: 1, shipping: { base: 0 } },
            { cardId: 'c1', sellerId: 'TCG', marketplace: 'TCG', price: 1.00, quantityAvailable: 1, shipping: { base: 0 } }
        ]
        const ckPrices = new Map([['c1', 2.00]])

        const { baskets } = greedyAllocatePhase1(demands, offers, ckPrices)
        expect(baskets).toHaveLength(1)
        expect(baskets[0].sellerId).toBe('TCG')
    })

    it('should prefer higher absolute price if CR ratio is better (high value card)', () => {
        // Card Retail: $100.00
        // Offer A (TCG): $90.00 -> Ratio 0.90
        // Offer B (Manabox): $80.00 -> Ratio 0.80
        // Expected: Pick Offer B (Manabox) despite Marketplace preferences, because ratio is better.

        const demands: Demand[] = [{ cardId: 'c1', quantity: 1 }]
        const offers: Offer[] = [
            { cardId: 'c1', sellerId: 'TCG', marketplace: 'TCG', price: 90.00, quantityAvailable: 1, shipping: { base: 0 } },
            { cardId: 'c1', sellerId: 'MB', marketplace: 'MANABOX', price: 80.00, quantityAvailable: 1, shipping: { base: 0 } }
        ]
        const ckPrices = new Map([['c1', 100.00]])

        const { baskets } = greedyAllocatePhase1(demands, offers, ckPrices)
        expect(baskets).toHaveLength(1)
        expect(baskets[0].sellerId).toBe('MB')
    })

    it('should use Optimistic Shipping ($0) if potential volume > threshold', () => {
        // Card Retail: $10.00
        // Demand: 10 copies ($100 retail value approx)
        // Seller TCG Direct: Price $5.00, Shipping $5.00, Free@$50
        // Total Potential Revenue from this seller: 10 * $5.00 = $50.00 -> triggers free shipping
        // Marginal Cost for first unit should be $5.00 (Optimistic) not $10.00 ($5+$5)
        // Ratio: $5/$10 = 0.5 (Good) vs $10/$10 = 1.0 (Bad)

        // Competitor: Price $4.50, Shipping $2.00 (No free threshold) -> Cost $6.50 -> Ratio 0.65

        // If Logic fails: It sees TCG cost as $10 ($5+$5 ship), picks competitor.
        // If Logic works: It sees TCG cost as $5 (Optimistic), picks TCG.

        const demands: Demand[] = [{ cardId: 'c1', quantity: 10 }]
        const offers: Offer[] = [
            { cardId: 'c1', sellerId: 'TCG_Direct', marketplace: 'TCG', price: 5.00, quantityAvailable: 10, shipping: { base: 5.00, freeAt: 50.00 } },
            { cardId: 'c1', sellerId: 'Other', marketplace: 'TCG', price: 4.50, quantityAvailable: 10, shipping: { base: 2.00 } }
        ]
        const ckPrices = new Map([['c1', 10.00]])

        const { baskets } = greedyAllocatePhase1(demands, offers, ckPrices)

        // Should eventually pick TCG_Direct for all 10
        const tcgBasket = baskets.find(b => b.sellerId === 'TCG_Direct')
        expect(tcgBasket).toBeDefined()
        expect(tcgBasket?.items.get('c1')).toBe(10)
    })

    it('should fallback to absolute price sorting if retail price is missing', () => {
        // Card Retail: Unknown
        // Offer A: $5.00
        // Offer B: $10.00
        // Expected: Pick A (Lowest Price)

        const demands: Demand[] = [{ cardId: 'c1', quantity: 1 }]
        const offers: Offer[] = [
            { cardId: 'c1', sellerId: 'B', marketplace: 'TCG', price: 10.00, quantityAvailable: 1, shipping: { base: 0 } },
            { cardId: 'c1', sellerId: 'A', marketplace: 'TCG', price: 5.00, quantityAvailable: 1, shipping: { base: 0 } }
        ]
        const ckPrices = new Map() // Empty

        const { baskets } = greedyAllocatePhase1(demands, offers, ckPrices)
        expect(baskets).toHaveLength(1)
        expect(baskets[0].sellerId).toBe('A')
    })
})
