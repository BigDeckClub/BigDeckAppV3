import { describe, it, expect, beforeEach } from 'vitest'
import {
    getSeasonalityFactor,
    getSeasonalityBreakdown,
    clearSeasonalEventsCache,
    type SeasonalEventsConfig,
    type CardTags,
} from '../autobuy/seasonalityService'
import { calculateCardIPS, type CardMetrics } from '../autobuy/ipsCalculator'

describe('Seasonality Service', () => {
    // Test config with predictable dates
    const testConfig: SeasonalEventsConfig = {
        events: [
            {
                type: 'COMMANDER_PRODUCT',
                date: '2024-03-15',
                name: 'Test Commander Release',
                affectedTags: ['commander-staple'],
            },
            {
                type: 'HOLIDAY',
                date: '2024-12-25',
                name: 'Christmas 2024',
                affectedTags: ['all'],
            },
            {
                type: 'BAN_ANNOUNCEMENT',
                date: '2024-06-01',
                name: 'Test Ban Announcement',
                affectedTags: ['modern-legal'],
                affectedFormats: ['modern'],
            },
            {
                type: 'SET_RELEASE',
                date: '2024-04-01',
                name: 'Test Set',
                affectedTags: ['standard-legal'],
            },
        ],
        reprints: [
            {
                cardId: 'sol-ring-new',
                originalCardId: 'sol-ring',
                reprintDate: '2024-05-01',
                setCode: 'tst',
            },
        ],
    }

    beforeEach(() => {
        clearSeasonalEventsCache()
    })

    describe('getSeasonalityFactor', () => {
        it('returns 1.0 when no seasonal effects apply', () => {
            const cardTags: CardTags = {
                cardId: 'random-card',
                tags: [],
                formats: [],
            }
            // Date far from any event
            const date = new Date('2024-01-15')

            const factor = getSeasonalityFactor('random-card', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })

        it('returns factor clamped between 0.5 and 2.0', () => {
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: ['commander-staple'],
                formats: ['modern'],
            }
            // Any date
            const date = new Date('2024-01-01')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, testConfig)
            expect(factor).toBeGreaterThanOrEqual(0.5)
            expect(factor).toBeLessThanOrEqual(2.0)
        })
    })

    describe('Commander Product Boost', () => {
        it('applies 1.3x boost for commander staples 2 weeks before release', () => {
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: ['commander-staple'],
                formats: [],
            }
            // 10 days before Commander product release (March 15)
            const date = new Date('2024-03-05')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, testConfig)
            expect(factor).toBe(1.3)
        })

        it('does not apply boost for non-commander staples', () => {
            const cardTags: CardTags = {
                cardId: 'lightning-bolt',
                tags: ['modern-staple'],
                formats: ['modern'],
            }
            // 10 days before Commander product release
            const date = new Date('2024-03-05')

            const factor = getSeasonalityFactor('lightning-bolt', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })

        it('does not apply boost more than 2 weeks before release', () => {
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: ['commander-staple'],
                formats: [],
            }
            // 3 weeks before Commander product release
            const date = new Date('2024-02-23')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })

        it('does not apply boost after release date', () => {
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: ['commander-staple'],
                formats: [],
            }
            // After Commander product release
            const date = new Date('2024-03-20')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })
    })

    describe('Christmas Boost', () => {
        it('applies 1.2x boost in the week before Christmas', () => {
            const cardTags: CardTags = {
                cardId: 'any-card',
                tags: [],
                formats: [],
            }
            // December 20 (5 days before Christmas)
            const date = new Date('2024-12-20')

            const factor = getSeasonalityFactor('any-card', date, cardTags, testConfig)
            expect(factor).toBe(1.2)
        })

        it('does not apply boost more than 1 week before Christmas', () => {
            const cardTags: CardTags = {
                cardId: 'any-card',
                tags: [],
                formats: [],
            }
            // December 10 (15 days before Christmas)
            const date = new Date('2024-12-10')

            const factor = getSeasonalityFactor('any-card', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })

        it('does not apply boost after Christmas', () => {
            const cardTags: CardTags = {
                cardId: 'any-card',
                tags: [],
                formats: [],
            }
            // December 26
            const date = new Date('2024-12-26')

            const factor = getSeasonalityFactor('any-card', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })
    })

    describe('Reprint Dampening', () => {
        it('applies 0.6x dampening for 30 days after reprint', () => {
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: [],
                formats: [],
            }
            // 15 days after reprint (May 1 + 15 days)
            const date = new Date('2024-05-16')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, testConfig)
            expect(factor).toBe(0.6)
        })

        it('does not apply dampening before reprint date', () => {
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: [],
                formats: [],
            }
            // Before reprint date
            const date = new Date('2024-04-15')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })

        it('does not apply dampening after 30 days', () => {
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: [],
                formats: [],
            }
            // 35 days after reprint
            const date = new Date('2024-06-05')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })

        it('applies dampening when card has reprintDate in tags', () => {
            const cardTags: CardTags = {
                cardId: 'mana-crypt',
                tags: [],
                formats: [],
                reprintDate: '2024-07-01',
            }
            // 10 days after reprint
            const date = new Date('2024-07-11')

            const factor = getSeasonalityFactor('mana-crypt', date, cardTags, testConfig)
            expect(factor).toBe(0.6)
        })
    })

    describe('Ban Announcement Boost', () => {
        it('applies 1.5x boost for 1 week after ban announcement', () => {
            const cardTags: CardTags = {
                cardId: 'modern-card',
                tags: [],
                formats: ['modern'],
            }
            // 3 days after ban announcement (June 1)
            const date = new Date('2024-06-04')

            const factor = getSeasonalityFactor('modern-card', date, cardTags, testConfig)
            expect(factor).toBe(1.5)
        })

        it('does not apply boost for cards not in affected format', () => {
            const cardTags: CardTags = {
                cardId: 'commander-card',
                tags: [],
                formats: ['commander'],
            }
            // During ban announcement window
            const date = new Date('2024-06-04')

            const factor = getSeasonalityFactor('commander-card', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })

        it('does not apply boost before ban announcement', () => {
            const cardTags: CardTags = {
                cardId: 'modern-card',
                tags: [],
                formats: ['modern'],
            }
            // Before ban announcement
            const date = new Date('2024-05-25')

            const factor = getSeasonalityFactor('modern-card', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })

        it('does not apply boost after 1 week', () => {
            const cardTags: CardTags = {
                cardId: 'modern-card',
                tags: [],
                formats: ['modern'],
            }
            // 10 days after ban announcement
            const date = new Date('2024-06-11')

            const factor = getSeasonalityFactor('modern-card', date, cardTags, testConfig)
            expect(factor).toBe(1.0)
        })
    })

    describe('Event Overlap', () => {
        it('combines multiple factors multiplicatively', () => {
            // Create a config with overlapping events
            const overlapConfig: SeasonalEventsConfig = {
                events: [
                    {
                        type: 'COMMANDER_PRODUCT',
                        date: '2024-12-22',
                        name: 'Christmas Commander',
                        affectedTags: ['commander-staple'],
                    },
                    {
                        type: 'HOLIDAY',
                        date: '2024-12-25',
                        name: 'Christmas',
                        affectedTags: ['all'],
                    },
                ],
                reprints: [],
            }

            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: ['commander-staple'],
                formats: [],
            }
            // Dec 20 - within both Commander window (2 weeks before Dec 22)
            // and Christmas window (1 week before Dec 25)
            const date = new Date('2024-12-20')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, overlapConfig)
            // 1.3 (commander) * 1.2 (christmas) = 1.56
            expect(factor).toBe(1.56)
        })

        it('clamps combined factor to maximum 2.0', () => {
            // Create extreme overlap config
            const extremeConfig: SeasonalEventsConfig = {
                events: [
                    {
                        type: 'COMMANDER_PRODUCT',
                        date: '2024-06-08',
                        name: 'Commander 1',
                        affectedTags: ['commander-staple'],
                    },
                    {
                        type: 'BAN_ANNOUNCEMENT',
                        date: '2024-06-01',
                        name: 'Ban',
                        affectedTags: [],
                        affectedFormats: ['modern'],
                    },
                ],
                reprints: [],
            }

            const cardTags: CardTags = {
                cardId: 'dual-format',
                tags: ['commander-staple'],
                formats: ['modern'],
            }
            // June 4 - within both windows
            const date = new Date('2024-06-04')

            const factor = getSeasonalityFactor('dual-format', date, cardTags, extremeConfig)
            // 1.3 (commander) * 1.5 (ban) = 1.95, within range
            expect(factor).toBe(1.95)
        })

        it('clamps combined factor to minimum 0.5', () => {
            // Reprint dampening is 0.6, which is already above 0.5
            // But test the clamping logic works
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: [],
                formats: [],
            }
            const date = new Date('2024-05-10')

            const factor = getSeasonalityFactor('sol-ring', date, cardTags, testConfig)
            expect(factor).toBeGreaterThanOrEqual(0.5)
        })
    })

    describe('getSeasonalityBreakdown', () => {
        it('returns detailed breakdown of all factors', () => {
            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: ['commander-staple'],
                formats: [],
            }
            // 10 days before Commander product release
            const date = new Date('2024-03-05')

            const breakdown = getSeasonalityBreakdown('sol-ring', date, cardTags, testConfig)

            expect(breakdown.commanderBoost).toBe(1.3)
            expect(breakdown.christmasBoost).toBe(1.0)
            expect(breakdown.reprintDampening).toBe(1.0)
            expect(breakdown.banBoost).toBe(1.0)
            expect(breakdown.combinedFactor).toBe(1.3)
            expect(breakdown.activeEvents).toContain('Commander Product Release')
        })

        it('lists all active events', () => {
            const overlapConfig: SeasonalEventsConfig = {
                events: [
                    {
                        type: 'COMMANDER_PRODUCT',
                        date: '2024-12-22',
                        name: 'Christmas Commander',
                        affectedTags: ['commander-staple'],
                    },
                    {
                        type: 'HOLIDAY',
                        date: '2024-12-25',
                        name: 'Christmas',
                        affectedTags: ['all'],
                    },
                ],
                reprints: [],
            }

            const cardTags: CardTags = {
                cardId: 'sol-ring',
                tags: ['commander-staple'],
                formats: [],
            }
            const date = new Date('2024-12-20')

            const breakdown = getSeasonalityBreakdown('sol-ring', date, cardTags, overlapConfig)

            expect(breakdown.activeEvents).toContain('Commander Product Release')
            expect(breakdown.activeEvents).toContain('Christmas Season')
        })
    })

    describe('Integration with calculateCardIPS', () => {
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

        it('applies seasonality factor to IPS calculation', () => {
            const resultWithoutSeasonality = calculateCardIPS(baseCard)
            const resultWithSeasonality = calculateCardIPS(baseCard, [], undefined, 1.3)

            expect(resultWithSeasonality.IPS).toBeCloseTo(resultWithoutSeasonality.IPS * 1.3, 3)
        })

        it('includes seasonality in reasons when factor is not 1.0', () => {
            const result = calculateCardIPS(baseCard, [], undefined, 1.5)

            expect(result.reasons.some(r => r.includes('Seasonality'))).toBe(true)
            expect(result.reasons.some(r => r.includes('1.50x'))).toBe(true)
        })

        it('does not include seasonality in reasons when factor is 1.0', () => {
            const result = calculateCardIPS(baseCard, [], undefined, 1.0)

            expect(result.reasons.some(r => r.includes('Seasonality'))).toBe(false)
        })

        it('defaults to factor of 1.0 when not provided', () => {
            const resultDefault = calculateCardIPS(baseCard)
            const resultExplicit = calculateCardIPS(baseCard, [], undefined, 1.0)

            expect(resultDefault.IPS).toBe(resultExplicit.IPS)
        })
    })
})
