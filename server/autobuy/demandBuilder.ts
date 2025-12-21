/**
 * Demand Builder Service
 * 
 * Aggregates card demand across:
 * - Current/active decks (for sale)
 * - Queued future decks
 * - Low-inventory alerts
 * 
 * Subtracts owned inventory to produce net demand
 */

import type { Demand } from './types.js'

export type DeckCard = {
    cardId: string
    cardName?: string
    quantity: number
}

export type Deck = {
    id: string
    name: string
    status: 'active' | 'queued' | 'sold' | 'archived'
    cards: DeckCard[]
}

export type InventoryItem = {
    cardId: string
    cardName?: string
    quantity: number
    reserved: number  // Already reserved for decks
    available: number // quantity - reserved
    lowInventoryAlert: boolean
    lowInventoryThreshold: number
    ckPrice?: number  // Card Kingdom price
}

export type DemandBuilderInput = {
    decks: Deck[]
    inventory: InventoryItem[]
    cardKingdomPrices: Map<string, number>

    // Options
    includeQueuedDecks: boolean
    priceThresholdPercent: number  // e.g., 100 = buy at CK price, 90 = buy at 90% of CK
}

export type DemandResult = {
    demands: Demand[]
    deckDemand: Map<string, { quantity: number; decks: string[] }>
    alertDemand: Map<string, { quantity: number; threshold: number }>
    inventoryAvailable: Map<string, number>
    summary: {
        totalCardsNeeded: number
        uniqueCardsNeeded: number
        deckDemandCards: number
        alertDemandCards: number
        coveredByInventory: number
    }
}

/**
 * Calculate demand from decks
 */
export function calculateDeckDemand(
    decks: Deck[],
    includeQueued: boolean
): Map<string, { quantity: number; decks: string[] }> {
    const demandMap = new Map<string, { quantity: number; decks: string[] }>()

    for (const deck of decks) {
        // Only include active and optionally queued decks
        if (deck.status !== 'active' && !(includeQueued && deck.status === 'queued')) {
            continue
        }

        for (const card of deck.cards) {
            const existing = demandMap.get(card.cardId) ?? { quantity: 0, decks: [] }
            existing.quantity += card.quantity
            existing.decks.push(deck.name)
            demandMap.set(card.cardId, existing)
        }
    }

    return demandMap
}

/**
 * Calculate demand from low-inventory alerts
 */
export function calculateAlertDemand(
    inventory: InventoryItem[]
): Map<string, { quantity: number; threshold: number }> {
    const demandMap = new Map<string, { quantity: number; threshold: number }>()

    for (const item of inventory) {
        if (!item.lowInventoryAlert || item.lowInventoryThreshold <= 0) {
            continue
        }

        // If current available is below threshold, we need to restock
        const deficit = Math.max(0, item.lowInventoryThreshold - item.available)

        if (deficit > 0) {
            demandMap.set(item.cardId, {
                quantity: deficit,
                threshold: item.lowInventoryThreshold,
            })
        }
    }

    return demandMap
}

/**
 * Build available inventory map
 */
export function buildInventoryMap(
    inventory: InventoryItem[]
): Map<string, number> {
    const availableMap = new Map<string, number>()

    for (const item of inventory) {
        // Use available (not reserved) inventory
        const available = Math.max(0, item.available)
        availableMap.set(item.cardId, (availableMap.get(item.cardId) ?? 0) + available)
    }

    return availableMap
}

/**
 * Calculate max acceptable price for each card
 * maxPrice = CKPrice * (priceThresholdPercent / 100)
 */
export function calculateMaxPrices(
    cardIds: string[],
    cardKingdomPrices: Map<string, number>,
    priceThresholdPercent: number
): Map<string, number> {
    const maxPrices = new Map<string, number>()

    for (const cardId of cardIds) {
        const ckPrice = cardKingdomPrices.get(cardId)
        if (ckPrice !== undefined && ckPrice > 0) {
            maxPrices.set(cardId, ckPrice * (priceThresholdPercent / 100))
        }
    }

    return maxPrices
}

/**
 * Build complete demand list from all sources
 */
export function buildDemand(input: DemandBuilderInput): DemandResult {
    const {
        decks,
        inventory,
        cardKingdomPrices,
        includeQueuedDecks,
        priceThresholdPercent,
    } = input

    // Step 1: Calculate demand from decks
    const deckDemand = calculateDeckDemand(decks, includeQueuedDecks)

    // Step 2: Calculate demand from low-inventory alerts
    const alertDemand = calculateAlertDemand(inventory)

    // Step 3: Build available inventory map
    const inventoryAvailable = buildInventoryMap(inventory)

    // Step 4: Merge demands and subtract inventory
    const allCardIds = new Set([...deckDemand.keys(), ...alertDemand.keys()])
    const demands: Demand[] = []

    let totalCardsNeeded = 0
    let deckDemandCards = 0
    let alertDemandCards = 0
    let coveredByInventory = 0

    for (const cardId of allCardIds) {
        const deck = deckDemand.get(cardId)
        const alert = alertDemand.get(cardId)
        const available = inventoryAvailable.get(cardId) ?? 0

        // Total gross demand from all sources
        const deckQty = deck?.quantity ?? 0
        const alertQty = alert?.quantity ?? 0
        const grossDemand = Math.max(deckQty, alertQty)  // Use max, not sum (alert is a floor)

        // Net demand after subtracting inventory
        const netDemand = Math.max(0, grossDemand - available)

        // Track stats
        if (deckQty > 0) deckDemandCards += deckQty
        if (alertQty > 0) alertDemandCards += alertQty
        coveredByInventory += Math.min(available, grossDemand)

        if (netDemand > 0) {
            const ckPrice = cardKingdomPrices.get(cardId)
            const maxPrice = ckPrice !== undefined
                ? ckPrice * (priceThresholdPercent / 100)
                : undefined

            demands.push({
                cardId,
                quantity: netDemand,
                maxPrice,
            })

            totalCardsNeeded += netDemand
        }
    }

    // Sort demands by quantity descending for consistency
    demands.sort((a, b) => b.quantity - a.quantity)

    return {
        demands,
        deckDemand,
        alertDemand,
        inventoryAvailable,
        summary: {
            totalCardsNeeded,
            uniqueCardsNeeded: demands.length,
            deckDemandCards,
            alertDemandCards,
            coveredByInventory,
        },
    }
}

/**
 * Convert inventory API response to InventoryItem format
 */
export function normalizeInventory(rawInventory: any[]): InventoryItem[] {
    return rawInventory.map(item => ({
        cardId: item.scryfall_id || item.card_id || item.cardId || item.id?.toString(),
        cardName: item.name || item.card_name || item.cardName,
        quantity: item.quantity ?? 1,
        reserved: item.reserved ?? 0,
        available: (item.quantity ?? 1) - (item.reserved ?? 0),
        lowInventoryAlert: item.low_inventory_alert ?? false,
        lowInventoryThreshold: item.low_inventory_threshold ?? 0,
        ckPrice: item.ck_price ?? item.ckPrice,
    }))
}

/**
 * Convert deck API response to Deck format
 */
export function normalizeDecks(rawDecks: any[]): Deck[] {
    return rawDecks.map(deck => ({
        id: deck.id?.toString(),
        name: deck.name || deck.deck_name || 'Unnamed Deck',
        status: deck.status || 'active',
        cards: (deck.cards || deck.deck_cards || []).map((card: any) => ({
            cardId: card.scryfall_id || card.card_id || card.cardId,
            cardName: card.name || card.card_name || card.cardName,
            quantity: card.quantity ?? 1,
        })),
    }))
}

export default {
    calculateDeckDemand,
    calculateAlertDemand,
    buildInventoryMap,
    calculateMaxPrices,
    buildDemand,
    normalizeInventory,
    normalizeDecks,
}
