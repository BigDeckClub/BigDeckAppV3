import { describe, it, expect } from 'vitest'
import {
    calculateDemandRate,
    calculateLiquidity,
    calculateSubstitutability,
    calculateMarginSafety,
    calculateTargetInventory,
    determineTier,
    calculateCardIPS,
    generateHotList,
    filterEligibleHotList,
    getShippingFillerCandidates,
    DEFAULT_IPS_CONFIG,
    type CardMetrics,
    type SubstitutionGroup,
} from '../autobuy/ipsCalculator'

describe('IPS Calculator', () => {
    const baseCard: CardMetrics = {
        cardId: 'sol-ring',
        cardName: 'Sol Ring',
        deckUsageCount: 5,
        queuedDeckUsageCount: 2,
        salesVelocity: 0.5,
        lowInventoryAlertEnabled: true,
        lowInventoryThreshold: 4,
        currentInventory: 1,
        ckPrice: 4.00,
        marketMedianPrice: 3.00,
        formatBreadth: 0.8,
        priceStability: 0.1,
    }

    describe('calculateDemandRate', () => {
        it('calculates demand rate from all components', () => {
            const rate = calculateDemandRate(baseCard)
            expect(rate).toBeGreaterThan(0)
            // With default weights: 5*0.4 + 2*0.3 + 5*0.2 + 10*0.1 = 2 + 0.6 + 1 + 1 = 4.6
            expect(rate).toBeCloseTo(4.6, 1)
        })

        it('handles zero deck usage', () => {
            const card = { ...baseCard, deckUsageCount: 0, queuedDeckUsageCount: 0 }
            const rate = calculateDemandRate(card)
            expect(rate).toBeGreaterThan(0) // Still has sales velocity and alert
        })

        it('caps normalized values at 10', () => {
            const card = { ...baseCard, deckUsageCount: 50, salesVelocity: 100 }
            const rate = calculateDemandRate(card)
            // Should be capped, not using raw values
            expect(rate).toBeLessThanOrEqual(10)
        })
    })

    describe('calculateLiquidity', () => {
        it('returns value between 0 and 1', () => {
            const liquidity = calculateLiquidity(baseCard)
            expect(liquidity).toBeGreaterThanOrEqual(0)
            expect(liquidity).toBeLessThanOrEqual(1)
        })

        it('increases with higher sales velocity', () => {
            const lowSales = { ...baseCard, salesVelocity: 0.1 }
            const highSales = { ...baseCard, salesVelocity: 2.0 }
            expect(calculateLiquidity(highSales)).toBeGreaterThan(calculateLiquidity(lowSales))
        })
    })

    describe('calculateSubstitutability', () => {
        it('returns 1.0 when no substitution groups', () => {
            const sub = calculateSubstitutability(baseCard, [])
            expect(sub).toBe(1.0)
        })

        it('returns lower value when card has substitutes', () => {
            const groups: SubstitutionGroup[] = [
                { groupId: 'mana-rocks', name: 'Mana Rocks', cards: ['sol-ring', 'mana-crypt', 'arcane-signet'] }
            ]
            const sub = calculateSubstitutability(baseCard, groups)
            expect(sub).toBeLessThan(1.0)
            expect(sub).toBeGreaterThanOrEqual(0.3)
        })
    })

    describe('calculateMarginSafety', () => {
        it('calculates positive margin when CK price is higher', () => {
            const margin = calculateMarginSafety(baseCard)
            // (4 - 3) / 4 = 0.25
            expect(margin).toBe(0.25)
        })

        it('returns 0 when market price exceeds CK price', () => {
            const card = { ...baseCard, marketMedianPrice: 5.00 }
            expect(calculateMarginSafety(card)).toBe(0)
        })

        it('returns 0 when CK price is 0', () => {
            const card = { ...baseCard, ckPrice: 0 }
            expect(calculateMarginSafety(card)).toBe(0)
        })
    })

    describe('calculateTargetInventory', () => {
        it('calculates target based on demand rate', () => {
            const target = calculateTargetInventory(4.6)
            expect(target).toBeGreaterThanOrEqual(1)
            expect(Number.isInteger(target)).toBe(true)
        })

        it('returns at least 1', () => {
            expect(calculateTargetInventory(0)).toBe(1)
        })
    })

    describe('determineTier', () => {
        it('returns Tier A for high IPS with good metrics', () => {
            expect(determineTier(1.0, 0.8, 0.3)).toBe('A')
        })

        it('returns Tier B for medium IPS', () => {
            expect(determineTier(0.5, 0.6, 0.2)).toBe('B')
        })

        it('returns Tier C for low margin safety', () => {
            expect(determineTier(1.0, 0.8, 0)).toBe('C')
        })

        it('returns Tier C for low liquidity', () => {
            expect(determineTier(1.0, 0.3, 0.3)).toBe('C')
        })
    })

    describe('calculateCardIPS', () => {
        it('calculates full IPS result', () => {
            const result = calculateCardIPS(baseCard)

            expect(result.cardId).toBe('sol-ring')
            expect(result.IPS).toBeGreaterThan(0)
            expect(result.tier).toBeDefined()
            expect(result.targetInventory).toBeGreaterThanOrEqual(1)
            expect(result.deficit).toBeGreaterThanOrEqual(0)
            expect(result.reasons).toBeInstanceOf(Array)
        })

        it('includes reasons for high priority cards', () => {
            const result = calculateCardIPS(baseCard)
            expect(result.reasons.length).toBeGreaterThan(0)
            expect(result.reasons.some(r => r.includes('deck'))).toBe(true)
        })
    })

    describe('generateHotList', () => {
        it('sorts cards by IPS descending', () => {
            const cards: CardMetrics[] = [
                { ...baseCard, cardId: 'low', deckUsageCount: 1, currentInventory: 10 },
                { ...baseCard, cardId: 'high', deckUsageCount: 10, currentInventory: 0 },
            ]

            const hotList = generateHotList(cards)
            expect(hotList[0].cardId).toBe('high')
            expect(hotList[1].cardId).toBe('low')
        })
    })

    describe('filterEligibleHotList', () => {
        it('filters out cards with zero IPS', () => {
            const cards: CardMetrics[] = [
                baseCard,
                { ...baseCard, cardId: 'zero', ckPrice: 0 }, // Will have 0 margin safety
            ]

            const hotList = generateHotList(cards)
            const eligible = filterEligibleHotList(hotList)

            expect(eligible.every(c => c.IPS > 0)).toBe(true)
        })
    })

    describe('getShippingFillerCandidates', () => {
        it('returns only Tier A and B cards', () => {
            const hotList = [
                { cardId: 'a', IPS: 1.0, tier: 'A' as const, targetInventory: 4, deficit: 2, demandRate: 1, liquidity: 0.8, substitutability: 1, marginSafety: 0.3, reasons: [] },
                { cardId: 'b', IPS: 0.5, tier: 'B' as const, targetInventory: 2, deficit: 1, demandRate: 0.5, liquidity: 0.6, substitutability: 1, marginSafety: 0.2, reasons: [] },
                { cardId: 'c', IPS: 0.1, tier: 'C' as const, targetInventory: 1, deficit: 0, demandRate: 0.1, liquidity: 0.4, substitutability: 1, marginSafety: 0.1, reasons: [] },
            ]

            const fillers = getShippingFillerCandidates(hotList)
            expect(fillers.length).toBe(2)
            expect(fillers.every(c => c.tier === 'A' || c.tier === 'B')).toBe(true)
        })
    })
})
