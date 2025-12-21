import { describe, it, expect } from 'vitest'
import {
    greedyAllocatePhase1,
    phase2OptimizeShipping,
    phase5FinalizePlan,
    runFullPipeline
} from '../autobuy/optimizer'
import type { Demand, Offer, BudgetConfig } from '../autobuy/types'

/**
 * Budget Enforcement Tests
 * 
 * Tests for Capital Exposure Limits & Budget Controls feature:
 * - Exact budget hit
 * - Can't fulfill any demand within budget
 * - Partial fulfillment scenarios
 * - Per-card limit enforcement
 * - Per-seller limit enforcement
 * - Speculative spending limit
 * - Reserve budget calculation
 * - Budget warning thresholds
 */

describe('Budget Enforcement - Phase 1', () => {
    const createOffer = (cardId: string, price: number, sellerId = 'S1', qty = 10): Offer => ({
        marketplace: 'TCG',
        sellerId,
        cardId,
        price,
        quantityAvailable: qty,
        shipping: { base: 0, freeAt: 50 },
    })

    it('respects maxTotalSpend hard limit', () => {
        const demands: Demand[] = [{ cardId: 'C1', quantity: 5 }]
        const offers = [createOffer('C1', 10)] // $10 each = $50 total
        const ck = new Map([['C1', 20]])

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 25, // Only allows ~2 cards
            maxPerSeller: 100,
            maxPerCard: 50,
            maxSpeculativeSpend: 10,
            reserveBudgetPercent: 0,
        }

        const { baskets, unmet, budgetTracker } = greedyAllocatePhase1(
            demands, offers, ck, new Map(), 0.1, budgetConfig
        )

        // Should only allocate 2 cards ($20) since $30 > $25 budget
        const allocated = baskets.reduce((sum, b) =>
            sum + Array.from(b.items.values()).reduce((s, q) => s + q, 0), 0)
        expect(allocated).toBe(2)
        expect(unmet.length).toBe(1)
        expect(unmet[0].quantity).toBe(3)
        expect(budgetTracker.demandSpend).toBe(20)
    })

    it('skips offers exceeding maxPerCard limit', () => {
        const demands: Demand[] = [
            { cardId: 'ExpensiveCard', quantity: 1 },
            { cardId: 'CheapCard', quantity: 1 },
        ]
        const offers = [
            createOffer('ExpensiveCard', 60), // Above maxPerCard
            createOffer('CheapCard', 10),      // Within limit
        ]
        const ck = new Map([['ExpensiveCard', 100], ['CheapCard', 20]])

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 100,
            maxPerSeller: 100,
            maxPerCard: 50, // $60 card exceeds this
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 0,
        }

        const { baskets, unmet } = greedyAllocatePhase1(
            demands, offers, ck, new Map(), 0.1, budgetConfig
        )

        // Only CheapCard should be allocated
        const items = baskets.flatMap(b => Array.from(b.items.entries()))
        expect(items).toHaveLength(1)
        expect(items[0][0]).toBe('CheapCard')

        // ExpensiveCard should be unmet
        expect(unmet.find(u => u.cardId === 'ExpensiveCard')).toBeDefined()
    })

    it('respects maxPerSeller limit', () => {
        const demands: Demand[] = [{ cardId: 'C1', quantity: 10 }]
        const offers = [
            createOffer('C1', 15, 'S1', 10), // S1 can supply all 10
        ]
        const ck = new Map([['C1', 30]])

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 500,
            maxPerSeller: 50, // Only ~3 cards per seller
            maxPerCard: 100,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 0,
        }

        const { baskets, budgetTracker } = greedyAllocatePhase1(
            demands, offers, ck, new Map(), 0.1, budgetConfig
        )

        // Should cap at ~$45 per seller (3 cards)
        const sellerS1Spend = budgetTracker.sellerSpend['S1'] ?? 0
        expect(sellerS1Spend).toBeLessThanOrEqual(50)
    })

    it('reserves budget for CK fallback', () => {
        const demands: Demand[] = [{ cardId: 'C1', quantity: 10 }]
        const offers = [createOffer('C1', 10, 'S1', 10)]
        const ck = new Map([['C1', 20]])

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 100,
            maxPerSeller: 200,
            maxPerCard: 50,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 20, // Reserve 20% = $20
        }

        const { budgetTracker } = greedyAllocatePhase1(
            demands, offers, ck, new Map(), 0.1, budgetConfig
        )

        // Effective budget = $80 (100 - 20%)
        // Should allocate up to $80
        expect(budgetTracker.demandSpend).toBeLessThanOrEqual(80)
    })

    it('handles exact budget hit scenario', () => {
        const demands: Demand[] = [{ cardId: 'C1', quantity: 5 }]
        const offers = [createOffer('C1', 10, 'S1', 5)]
        const ck = new Map([['C1', 20]])

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 50, // Exactly 5 cards at $10
            maxPerSeller: 100,
            maxPerCard: 50,
            maxSpeculativeSpend: 0,
            reserveBudgetPercent: 0,
        }

        const { baskets, unmet } = greedyAllocatePhase1(
            demands, offers, ck, new Map(), 0.1, budgetConfig
        )

        const allocated = baskets.reduce((sum, b) =>
            sum + Array.from(b.items.values()).reduce((s, q) => s + q, 0), 0)
        expect(allocated).toBe(5)
        expect(unmet.length).toBe(0)
    })

    it('handles zero fulfillment when all offers exceed budget', () => {
        const demands: Demand[] = [{ cardId: 'C1', quantity: 1 }]
        const offers = [createOffer('C1', 100)] // Way over budget
        const ck = new Map([['C1', 150]])

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 50, // Can't afford any
            maxPerSeller: 200,
            maxPerCard: 200,
            maxSpeculativeSpend: 0,
            reserveBudgetPercent: 0,
        }

        const { baskets, unmet } = greedyAllocatePhase1(
            demands, offers, ck, new Map(), 0.1, budgetConfig
        )

        expect(baskets.length).toBe(0)
        expect(unmet.length).toBe(1)
        expect(unmet[0].quantity).toBe(1)
    })
})

describe('Budget Enforcement - Phase 5 Warnings', () => {
    it('generates warning at 80% utilization', () => {
        const basket = {
            sellerId: 'S1',
            marketplace: 'TCG' as const,
            items: new Map([['C1', 1]]),
            cardSubtotal: 85,
            shippingCost: 0,
            freeShippingTriggered: true,
            totalCost: 85,
            reasons: new Map([['C1', ['DECK_DEMAND']]]),
        }

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 100, // 85% utilization
            maxPerSeller: 200,
            maxPerCard: 100,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 0,
        }

        const plan = phase5FinalizePlan([basket], {}, budgetConfig, {
            demandSpend: 85,
            speculativeSpend: 0,
        })

        expect(plan.budget).toBeDefined()
        expect(plan.budget!.budgetUtilization).toBe(85)
        expect(plan.budget!.warnings).toContain('Budget utilization exceeds 80%')
        expect(plan.budget!.hardBudgetExceeded).toBe(false)
    })

    it('generates critical warning at 95% utilization', () => {
        const basket = {
            sellerId: 'S1',
            marketplace: 'TCG' as const,
            items: new Map([['C1', 1]]),
            cardSubtotal: 96,
            shippingCost: 0,
            freeShippingTriggered: true,
            totalCost: 96,
            reasons: new Map([['C1', ['DECK_DEMAND']]]),
        }

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 100,
            maxPerSeller: 200,
            maxPerCard: 100,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 0,
        }

        const plan = phase5FinalizePlan([basket], {}, budgetConfig, {
            demandSpend: 96,
            speculativeSpend: 0,
        })

        expect(plan.budget!.budgetUtilization).toBe(96)
        expect(plan.budget!.warnings.some(w => w.includes('95%'))).toBe(true)
    })

    it('flags hard budget exceeded', () => {
        const basket = {
            sellerId: 'S1',
            marketplace: 'TCG' as const,
            items: new Map([['C1', 1]]),
            cardSubtotal: 120,
            shippingCost: 0,
            freeShippingTriggered: true,
            totalCost: 120,
            reasons: new Map([['C1', ['DECK_DEMAND']]]),
        }

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 100, // Exceeded
            maxPerSeller: 200,
            maxPerCard: 150,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 0,
        }

        const plan = phase5FinalizePlan([basket], {}, budgetConfig, {
            demandSpend: 120,
            speculativeSpend: 0,
        })

        expect(plan.budget!.hardBudgetExceeded).toBe(true)
        expect(plan.budget!.warnings.some(w => w.includes('HARD BUDGET EXCEEDED'))).toBe(true)
    })

    it('calculates reserved budget correctly', () => {
        const basket = {
            sellerId: 'S1',
            marketplace: 'TCG' as const,
            items: new Map([['C1', 1]]),
            cardSubtotal: 50,
            shippingCost: 0,
            freeShippingTriggered: true,
            totalCost: 50,
            reasons: new Map([['C1', ['DECK_DEMAND']]]),
        }

        const budgetConfig: BudgetConfig = {
            maxTotalSpend: 100,
            maxPerSeller: 200,
            maxPerCard: 100,
            maxSpeculativeSpend: 20,
            reserveBudgetPercent: 15,
        }

        const plan = phase5FinalizePlan([basket], {}, budgetConfig, {
            demandSpend: 50,
            speculativeSpend: 0,
        })

        expect(plan.budget!.reservedBudget).toBe(15) // 15% of $100
    })
})

describe('Budget Enforcement - Full Pipeline', () => {
    it('threads budget config through all phases', () => {
        const demands: Demand[] = [{ cardId: 'C1', quantity: 3 }]
        const offers: Offer[] = [{
            marketplace: 'TCG',
            sellerId: 'S1',
            cardId: 'C1',
            price: 20,
            quantityAvailable: 10,
            shipping: { base: 0 },
        }]

        const plan = runFullPipeline({
            demands,
            offers,
            cardKingdomPrices: new Map([['C1', 30]]),
            budget: {
                maxTotalSpend: 50,
                maxPerSeller: 100,
                maxPerCard: 25,
                maxSpeculativeSpend: 10,
                reserveBudgetPercent: 10,
            },
        })

        // With $50 budget and 10% reserve, effective budget = $45
        // At $20/card, can afford 2 cards
        expect(plan.budget).toBeDefined()
        expect(plan.budget!.totalSpend).toBeLessThanOrEqual(50)
    })
})
