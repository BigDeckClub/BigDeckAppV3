import { describe, it, expect } from 'vitest'
import { runFullPipeline } from './optimizer.js'
import type { Demand, Offer } from './types.js'

describe('Optimizer Phase 2.5: Arbitrage & Smart Filler', () => {

    it('should use CHEAPEST substitute for Grace Amount (Grace Arbitrage)', () => {
        // Scenario: 
        // Demand: 4x CardA @ $10.00 = $40.00
        // Shipping: $5.00, Free at $42.00
        // Gap: $2.00
        // Options:
        // 1. Pay Shipping: $40 + $5 = $45.00
        // 2. Buy Grace CardA ($10): $50.00 (Too expensive)
        // 3. Buy Grace CardB (Sub, $0.50): Need 4 to reach $42.00? No.
        //    Wait, we need to reach $42. 
        //    Buying 4x CardB = $2.00. Total $42.00. Free Shipping! Total Cost $42.00.
        //    $42.00 < $45.00 -> Winner!

        const demands: Demand[] = [{ cardId: 'CardA', quantity: 4 }]
        const offers: Offer[] = [
            // Seller has Main Card and Cheap Sub
            {
                cardId: 'CardA', sellerId: 'Seller1', price: 10.00, quantityAvailable: 10,
                shipping: { base: 5.00, freeAt: 42.00 }, marketplace: 'TCG'
            },
            {
                cardId: 'CardB', sellerId: 'Seller1', price: 0.50, quantityAvailable: 10,
                shipping: { base: 5.00, freeAt: 42.00 }, marketplace: 'TCG'
            }
        ]

        const groups = [{ groupId: 'g1', cards: ['CardA', 'CardB'] }]
        const ckPrices = new Map([['CardA', 20.00], ['CardB', 1.00]]) // Retail > Price

        const result = runFullPipeline({
            demands,
            offers,
            substitutionGroups: groups,
            graceAmount: 4,
            cardKingdomPrices: ckPrices
        })

        const basket = result.baskets.find(b => b.sellerId === 'Seller1')
        expect(basket).toBeDefined()
        expect(basket?.cardSubtotal).toBe(42.00) // $40 + $2
        expect(basket?.shippingCost).toBe(0)

        // Items: 4x CardA (Demand), 4x CardB (Grace Arbitrage)
        const cardA = basket?.items.find((i: any) => i.cardId === 'CardA')
        const cardB = basket?.items.find((i: any) => i.cardId === 'CardB')

        expect(cardA?.quantity).toBe(4)
        expect(cardB?.quantity).toBe(4)
    })

    it('should prioritize Smart Filler (Substitutes) over Hot List', () => {
        // Scenario:
        // Basket needs filler to hit shipping.
        // Available: 
        // 1. Hot List Item (Random) - Priority 2
        // 2. Substitute for Demanded Card - Priority 2.1 (Smart Filler)

        // Setup: basket at $45, free at $50. Gap $5.
        // HotItem: $5
        // SubItem: $5
        // Bot should pick SubItem.

        const demands: Demand[] = [{ cardId: 'CardA', quantity: 10 }] // $4.50 * 10 = $45
        const offers: Offer[] = [
            {
                cardId: 'CardA', sellerId: 'Seller1', price: 4.50, quantityAvailable: 20,
                shipping: { base: 5.00, freeAt: 50.00 }, marketplace: 'TCG'
            },
            {
                cardId: 'HotItem', sellerId: 'Seller1', price: 5.00, quantityAvailable: 1,
                shipping: { base: 5.00, freeAt: 50.00 }, marketplace: 'TCG'
            },
            {
                cardId: 'SubItem', sellerId: 'Seller1', price: 5.00, quantityAvailable: 1,
                shipping: { base: 5.00, freeAt: 50.00 }, marketplace: 'TCG'
            }
        ]

        const hotList = [{ cardId: 'HotItem', IPS: 10, targetInventory: 5 }]
        const groups = [{ groupId: 'g1', cards: ['CardA', 'SubItem'] }]
        const ckPrices = new Map([['CardA', 10.00], ['HotItem', 10.00], ['SubItem', 20.00]])

        const result = runFullPipeline({
            demands,
            offers,
            hotList,
            substitutionGroups: groups,
            cardKingdomPrices: ckPrices,
            // Ensure we have enough budget/inv checks passed
            currentInventory: new Map([['HotItem', 0], ['SubItem', 0]])
        })

        const basket = result.baskets.find(b => b.sellerId === 'Seller1')
        expect(basket).toBeDefined()
        expect(basket?.cardSubtotal).toBe(50.00)

        // Should produce SubItem, NOT HotItem
        const subItem = basket?.items.find((i: any) => i.cardId === 'SubItem')
        const hotItem = basket?.items.find((i: any) => i.cardId === 'HotItem')

        expect(subItem).toBeDefined()
        expect(subItem?.quantity).toBe(1)
        expect(hotItem).toBeUndefined()
    })
})
