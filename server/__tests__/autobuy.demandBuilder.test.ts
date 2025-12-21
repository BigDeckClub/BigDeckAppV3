import { describe, it, expect } from 'vitest'
import {
    calculateDeckDemand,
    calculateAlertDemand,
    buildInventoryMap,
    buildDemand,
    normalizeInventory,
    normalizeDecks,
    type Deck,
    type InventoryItem,
    type DemandBuilderInput,
} from '../autobuy/demandBuilder'

describe('Demand Builder', () => {
    const sampleDecks: Deck[] = [
        {
            id: '1',
            name: 'Commander Deck 1',
            status: 'active',
            cards: [
                { cardId: 'sol-ring', quantity: 1 },
                { cardId: 'lightning-bolt', quantity: 3 },
            ],
        },
        {
            id: '2',
            name: 'Queued Deck',
            status: 'queued',
            cards: [
                { cardId: 'sol-ring', quantity: 1 },
                { cardId: 'counterspell', quantity: 2 },
            ],
        },
        {
            id: '3',
            name: 'Sold Deck',
            status: 'sold',
            cards: [
                { cardId: 'path-to-exile', quantity: 4 },
            ],
        },
    ]

    const sampleInventory: InventoryItem[] = [
        {
            cardId: 'sol-ring',
            quantity: 3,
            reserved: 1,
            available: 2,
            lowInventoryAlert: true,
            lowInventoryThreshold: 5,
            ckPrice: 4.00,
        },
        {
            cardId: 'lightning-bolt',
            quantity: 10,
            reserved: 2,
            available: 8,
            lowInventoryAlert: false,
            lowInventoryThreshold: 0,
            ckPrice: 2.00,
        },
        {
            cardId: 'counterspell',
            quantity: 1,
            reserved: 0,
            available: 1,
            lowInventoryAlert: true,
            lowInventoryThreshold: 4,
            ckPrice: 1.50,
        },
    ]

    describe('calculateDeckDemand', () => {
        it('aggregates demand from active decks', () => {
            const demand = calculateDeckDemand(sampleDecks, false)

            expect(demand.get('sol-ring')?.quantity).toBe(1)
            expect(demand.get('lightning-bolt')?.quantity).toBe(3)
            expect(demand.has('counterspell')).toBe(false) // Queued deck excluded
            expect(demand.has('path-to-exile')).toBe(false) // Sold deck excluded
        })

        it('includes queued decks when requested', () => {
            const demand = calculateDeckDemand(sampleDecks, true)

            expect(demand.get('sol-ring')?.quantity).toBe(2) // 1 from active + 1 from queued
            expect(demand.get('counterspell')?.quantity).toBe(2)
        })

        it('tracks which decks use each card', () => {
            const demand = calculateDeckDemand(sampleDecks, true)

            expect(demand.get('sol-ring')?.decks).toContain('Commander Deck 1')
            expect(demand.get('sol-ring')?.decks).toContain('Queued Deck')
        })
    })

    describe('calculateAlertDemand', () => {
        it('calculates deficit based on threshold', () => {
            const demand = calculateAlertDemand(sampleInventory)

            // sol-ring: threshold 5, available 2 = deficit 3
            expect(demand.get('sol-ring')?.quantity).toBe(3)

            // counterspell: threshold 4, available 1 = deficit 3
            expect(demand.get('counterspell')?.quantity).toBe(3)

            // lightning-bolt: no alert enabled
            expect(demand.has('lightning-bolt')).toBe(false)
        })

        it('skips cards with zero deficit', () => {
            const inventory: InventoryItem[] = [
                {
                    cardId: 'well-stocked',
                    quantity: 10,
                    reserved: 0,
                    available: 10,
                    lowInventoryAlert: true,
                    lowInventoryThreshold: 5,
                },
            ]

            const demand = calculateAlertDemand(inventory)
            expect(demand.size).toBe(0)
        })
    })

    describe('buildInventoryMap', () => {
        it('builds map of available inventory', () => {
            const map = buildInventoryMap(sampleInventory)

            expect(map.get('sol-ring')).toBe(2)
            expect(map.get('lightning-bolt')).toBe(8)
            expect(map.get('counterspell')).toBe(1)
        })
    })

    describe('buildDemand', () => {
        it('produces net demand after subtracting inventory', () => {
            const input: DemandBuilderInput = {
                decks: sampleDecks,
                inventory: sampleInventory,
                cardKingdomPrices: new Map([
                    ['sol-ring', 4.00],
                    ['lightning-bolt', 2.00],
                    ['counterspell', 1.50],
                ]),
                includeQueuedDecks: true,
                priceThresholdPercent: 100,
            }

            const result = buildDemand(input)

            // sol-ring: need 2 (decks) or 3 (alert deficit), have 2 available
            // max(2, 3) - 2 = 1 net demand
            const solRing = result.demands.find(d => d.cardId === 'sol-ring')
            expect(solRing?.quantity).toBe(1)

            // lightning-bolt: need 3, have 8 = 0 net demand
            const bolt = result.demands.find(d => d.cardId === 'lightning-bolt')
            expect(bolt).toBeUndefined()

            // counterspell: need 2 (decks) or 3 (alert), have 1 = 2 net demand
            const counter = result.demands.find(d => d.cardId === 'counterspell')
            expect(counter?.quantity).toBe(2)
        })

        it('calculates max prices from CK prices and threshold', () => {
            const input: DemandBuilderInput = {
                decks: sampleDecks,
                inventory: sampleInventory,
                cardKingdomPrices: new Map([['sol-ring', 4.00]]),
                includeQueuedDecks: true,
                priceThresholdPercent: 90,
            }

            const result = buildDemand(input)
            const solRing = result.demands.find(d => d.cardId === 'sol-ring')

            // maxPrice = 4.00 * 0.90 = 3.60
            expect(solRing?.maxPrice).toBe(3.60)
        })

        it('includes summary statistics', () => {
            const input: DemandBuilderInput = {
                decks: sampleDecks,
                inventory: sampleInventory,
                cardKingdomPrices: new Map(),
                includeQueuedDecks: true,
                priceThresholdPercent: 100,
            }

            const result = buildDemand(input)

            expect(result.summary.uniqueCardsNeeded).toBeGreaterThan(0)
            expect(result.summary.totalCardsNeeded).toBeGreaterThanOrEqual(0)
        })
    })

    describe('normalizeInventory', () => {
        it('converts raw API response to InventoryItem format', () => {
            const raw = [
                {
                    id: 1,
                    scryfall_id: 'abc123',
                    name: 'Sol Ring',
                    quantity: 5,
                    reserved: 2,
                    low_inventory_alert: true,
                    low_inventory_threshold: 4,
                    ck_price: 4.00,
                },
            ]

            const normalized = normalizeInventory(raw)

            expect(normalized[0].cardId).toBe('abc123')
            expect(normalized[0].cardName).toBe('Sol Ring')
            expect(normalized[0].quantity).toBe(5)
            expect(normalized[0].available).toBe(3)
            expect(normalized[0].lowInventoryAlert).toBe(true)
        })
    })

    describe('normalizeDecks', () => {
        it('converts raw API response to Deck format', () => {
            const raw = [
                {
                    id: 1,
                    name: 'Test Deck',
                    status: 'active',
                    deck_cards: [
                        { scryfall_id: 'abc', name: 'Card 1', quantity: 2 },
                    ],
                },
            ]

            const normalized = normalizeDecks(raw)

            expect(normalized[0].id).toBe('1')
            expect(normalized[0].name).toBe('Test Deck')
            expect(normalized[0].cards[0].cardId).toBe('abc')
            expect(normalized[0].cards[0].quantity).toBe(2)
        })
    })
})
