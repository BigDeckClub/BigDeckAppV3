import { describe, it, expect } from 'vitest'
import {
    greedyAllocatePhase1,
    phase2OptimizeShipping,
    phase5FinalizePlan,
    runFullPipeline
} from '../autobuy/optimizer'
import type { Demand, Offer, BudgetConfig } from '../autobuy/types'

describe('Soft Budget Mode', () => {
    const demands: Demand[] = [
        { cardId: 'expensive-card', quantity: 1 },
        { cardId: 'cheap-card', quantity: 1 }
    ]

    const offers: Offer[] = [
        {
            cardId: 'expensive-card',
            price: 100,
            quantityAvailable: 1,
            sellerId: 'SellerA',
            marketplace: 'TCG',
            shipping: { base: 0 }
        },
        {
            cardId: 'cheap-card',
            price: 10,
            quantityAvailable: 1,
            sellerId: 'SellerA',
            marketplace: 'TCG',
            shipping: { base: 0 }
        },
        // Speculative offer
        {
            cardId: 'hot-card',
            price: 5,
            quantityAvailable: 10,
            sellerId: 'SellerA',
            marketplace: 'TCG',
            shipping: { base: 0 }
        }
    ]

    const hotList = [{ cardId: 'hot-card', IPS: 10, targetInventory: 5 }]

    it('ALLOWS overspending for demand in SOFT mode', () => {
        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 50, // Less than expensive-card
            maxPerSeller: 500,
            maxPerCard: 200,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 0,
            budgetMode: 'SOFT'
        }

        const plan = runFullPipeline({
            demands,
            offers,
            budget: budgetConfig
        })

        // Should purchase expensive card (100) + cheap card (10) = 110, which is > 50
        expect(plan.summary.overallTotal).toBeGreaterThan(50)
        expect(plan.budget?.hardBudgetExceeded).toBe(false)
        expect(plan.budget?.warnings.some(w => w.includes('Soft Budget Limit Exceeded'))).toBe(true)
        const expensiveItem = plan.baskets[0].items.find(i => i.cardId === 'expensive-card')
        expect(expensiveItem).toBeDefined()
    })

    it('STRICT mode BLOCKS overspending for demand', () => {
        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 50,
            maxPerSeller: 500,
            maxPerCard: 200,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 0,
            budgetMode: 'STRICT'
        }

        const plan = runFullPipeline({
            demands,
            offers,
            budget: budgetConfig
        })

        // Should NOT purchase expensive card (100)
        // Might purchase cheap card if ordered first, but usually cheapest fit
        // In this case, expensive card comes first? It depends. 
        // Usually Phase 1 sorts by difficulty. 
        // Either way total must be <= 50
        expect(plan.summary.overallTotal).toBeLessThanOrEqual(50)
    })

    it('SOFT mode still BLOCKS speculative overspending if total budget exceeded', () => {
        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 50, // Will be exceeded by demand
            maxPerSeller: 500,
            maxPerCard: 200,
            maxSpeculativeSpend: 20, // Speculative limit
            reserveBudgetPercent: 0,
            budgetMode: 'SOFT'
        }

        // Demand will take 110, so total > 50.
        // Speculative phase should check total budget and see we are over -> NO speculative adds
        const plan = runFullPipeline({
            demands,
            offers,
            hotList, // Hot list exists
            budget: budgetConfig
        })

        // Demand spend should be ~110
        expect(plan.budget?.demandSpend).toBeGreaterThan(50)

        // Speculative spend should be 0 because we are already over total budget
        expect(plan.budget?.speculativeSpend).toBe(0)

        // Check no hot-card in baskets
        const hotItem = plan.baskets[0].items.find(i => i.cardId === 'hot-card')
        expect(hotItem).toBeUndefined()
    })

    it('SOFT mode allows Card Kingdom fallback overspend', () => {
        // No TCG offers, only CK prices
        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 50,
            maxPerSeller: 500,
            maxPerCard: 200,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 0,
            budgetMode: 'SOFT'
        }

        const ckPrices = new Map([
            ['expensive-card', 100],
            ['cheap-card', 10]
        ])

        const plan = runFullPipeline({
            demands,
            offers: [], // No offers
            cardKingdomPrices: ckPrices,
            budget: budgetConfig
        })

        // Should fallback to CK for both, total 110
        expect(plan.summary.overallTotal).toBe(110)
        expect(plan.budget?.hardBudgetExceeded).toBe(false)
        expect(plan.budget?.warnings.some(w => w.includes('Soft Budget Limit Exceeded'))).toBe(true)
    })
})
