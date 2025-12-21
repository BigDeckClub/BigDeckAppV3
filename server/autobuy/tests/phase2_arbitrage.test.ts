
import { describe, it, expect } from 'vitest'
import { phase2OptimizeShipping } from '../optimizer.js'
import type { Demand, Offer, SellerBasket as SellerBasketType, ManualDirective } from '../types.js'
import { SellerBasket } from '../optimizer.js'

describe('Phase 2 Optimization (Arbitrage Alignment)', () => {
    // Logic: Sort HotList fillers by CR Ratio ASC, then IPS DESC. Filter Ratio > 1.0.

    it.skip('should prefer fillers with better CR Ratio over those with just high IPS', () => {
        // Basket: Seller A ($45 total, needs $5 for free shipping)
        // Filler 1 (High IPS, Bad Ratio): Price $5, Retail $5.50 -> Ratio 0.9, IPS 100
        // Filler 2 (Low IPS, Great Ratio): Price $5, Retail $10.00 -> Ratio 0.5, IPS 50
        // Expected: Pick Filler 2 despite lower IPS, because better value.

        const baskets: SellerBasketType[] = [{
            sellerId: 'S1',
            marketplace: 'TCG',
            items: new Map([['coreItem', 1]]),
            cardSubtotal: 45.00,
            shippingCost: 5.00,
            freeShippingTriggered: false,
            totalCost: 50.00,
            reasons: new Map()
        }]

        const hotList = [
            { cardId: 'fillerBadRatio', IPS: 100, targetInventory: 0 },
            { cardId: 'fillerGoodRatio', IPS: 50, targetInventory: 0 }
        ]

        const offers: Offer[] = [
            { cardId: 'fillerBadRatio', sellerId: 'S1', marketplace: 'TCG', price: 5.00, quantityAvailable: 1, shipping: { base: 5.00, freeAt: 50.00 } },
            { cardId: 'fillerGoodRatio', sellerId: 'S1', marketplace: 'TCG', price: 5.00, quantityAvailable: 1, shipping: { base: 5.00, freeAt: 50.00 } }
        ]

        const ckPrices = new Map([
            ['fillerBadRatio', 5.50],
            ['fillerGoodRatio', 10.00]
        ])

        const directives: ManualDirective[] = []
        const currentInventory = new Map<string, number>()
        // IMPORTANT: Populate maxPriceByCard to allow these items (Price <= Max)
        const maxPriceByCard = new Map([
            ['fillerBadRatio', 100.00], // High enough to pass margin check
            ['fillerGoodRatio', 100.00]
        ])

        const { baskets: resultBaskets } = phase2OptimizeShipping(
            baskets,
            offers,
            [],
            hotList,
            directives,
            maxPriceByCard,
            currentInventory,
            undefined, 0,
            ckPrices
        )

        const b = resultBaskets[0]
        expect(b.items.has('fillerGoodRatio')).toBe(true)
        expect(b.items.has('fillerBadRatio')).toBe(false)
        expect(b.freeShippingTriggered).toBe(true)
    })

    it('should reject fillers with CR Ratio > 1.0 even if they trigger free shipping', () => {
        // Basket: $45. Need $5. Shipping $5.
        // Filler: Price $4. Retail $2. -> Ratio 2.0.
        // New Total: $45 + $4 = $49. Free shipping triggered ($0). Cost: $49.
        // Old Total: $50.
        // Logic should REJECT because Ratio > 1.0 (bad equity).

        const baskets: SellerBasketType[] = [{
            sellerId: 'S1',
            marketplace: 'TCG',
            items: new Map([['coreItem', 1]]),
            cardSubtotal: 45.00,
            shippingCost: 5.00, // Current shipping
            freeShippingTriggered: false,
            totalCost: 50.00,
            reasons: new Map()
        }]

        const hotList = [
            { cardId: 'fillerTrash', IPS: 100 }
        ]

        const offers: Offer[] = [
            { cardId: 'fillerTrash', sellerId: 'S1', marketplace: 'TCG', price: 4.00, quantityAvailable: 1, shipping: { base: 5.00, freeAt: 50.00 } }
        ]

        const ckPrices = new Map([
            ['fillerTrash', 2.00] // Retail 2.00
        ])

        const maxPriceByCard = new Map([
            ['fillerTrash', 10.00] // Passes margin check, but fails Ratio check
        ])

        const { baskets: resultBaskets } = phase2OptimizeShipping(
            baskets,
            offers,
            [],
            hotList,
            [],
            maxPriceByCard,
            new Map(),
            undefined, 0,
            ckPrices
        )

        const b = resultBaskets[0]
        expect(b.items.has('fillerTrash')).toBe(false)
        // Should rely on original shipping
        expect(b.totalCost).toBe(50.00)
    })
})
