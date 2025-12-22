/**
 * IPS (Inventory Pressure Score) Calculator
 * 
 * Ranks cards by procurement priority using the formula:
 * IPS = (DemandRate × Liquidity × Substitutability) / (CurrentInventory + 1) × MarginSafety
 * 
 * Higher IPS = higher priority for restocking
 */

export type CardMetrics = {
    cardId: string
    cardName?: string

    // Demand metrics
    deckUsageCount: number        // How many decks use this card
    queuedDeckUsageCount: number  // Usage in queued/future decks
    salesVelocity: number         // Cards sold per time period
    lowInventoryAlertEnabled: boolean
    lowInventoryThreshold: number

    // Inventory
    currentInventory: number

    // Pricing
    ckPrice: number               // Card Kingdom price (anchor)
    marketMedianPrice: number     // Median price across marketplaces

    // Optional enrichment
    formatBreadth?: number        // How many formats the card is legal in (0-1 normalized)
    priceStability?: number       // Standard deviation of price over time (lower = more stable)
    substitutionGroupId?: string  // ID of substitution group this card belongs to
}

export type IPSResult = {
    cardId: string
    cardName?: string
    IPS: number
    tier: 'A' | 'B' | 'C'
    targetInventory: number
    deficit: number
    demandRate: number
    liquidity: number
    substitutability: number
    marginSafety: number
    reasons: string[]
}

export type SubstitutionGroup = {
    groupId: string
    name: string
    cards: string[]  // cardIds
}

/**
 * Extended substitution group with inventory data for more accurate substitutability calculations
 * Used when inventory levels are available to determine if substitutes can absorb demand
 */
export type SubstitutionGroupWithInventory = SubstitutionGroup & {
    cardInventory: Map<string, number>  // cardId -> current inventory count
}

export type IPSConfig = {
    // Time horizon for target inventory calculation (days)
    inventoryTimeHorizon: number

    // Weights for demand rate components
    deckUsageWeight: number
    queuedDeckWeight: number
    salesVelocityWeight: number
    lowInventoryAlertWeight: number

    // Thresholds for tier classification
    tierAThreshold: number  // IPS >= this = Tier A
    tierBThreshold: number  // IPS >= this = Tier B (below A)

    // Minimum values for Hot List eligibility
    minLiquidity: number
    minMarginSafety: number
}

export const DEFAULT_IPS_CONFIG: IPSConfig = {
    inventoryTimeHorizon: 30,  // 30 days

    deckUsageWeight: 0.4,
    queuedDeckWeight: 0.3,
    salesVelocityWeight: 0.2,
    lowInventoryAlertWeight: 0.1,

    tierAThreshold: 0.8,
    tierBThreshold: 0.4,

    minLiquidity: 0.5,
    minMarginSafety: 0.0,
}

/**
 * Calculate the Demand Rate for a card
 * Combines deck usage, queued deck usage, sales velocity, and alert status
 */
export function calculateDemandRate(
    card: CardMetrics,
    config: IPSConfig = DEFAULT_IPS_CONFIG
): number {
    const {
        deckUsageWeight,
        queuedDeckWeight,
        salesVelocityWeight,
        lowInventoryAlertWeight,
    } = config

    // Normalize each component to 0-10 scale for balanced weighting
    const normalizedDeckUsage = Math.min(card.deckUsageCount, 10)
    const normalizedQueuedUsage = Math.min(card.queuedDeckUsageCount, 10)
    const normalizedSalesVelocity = Math.min(card.salesVelocity * 10, 10)
    const alertBonus = card.lowInventoryAlertEnabled ? 10 : 0

    const demandRate =
        (normalizedDeckUsage * deckUsageWeight) +
        (normalizedQueuedUsage * queuedDeckWeight) +
        (normalizedSalesVelocity * salesVelocityWeight) +
        (alertBonus * lowInventoryAlertWeight)

    return demandRate
}

/**
 * Calculate the Liquidity score for a card (0-1)
 * Based on sales velocity stability, format breadth, and price stability
 */
export function calculateLiquidity(card: CardMetrics): number {
    // Base liquidity from sales velocity (cards that sell = liquid)
    const salesLiquidity = Math.min(card.salesVelocity / 2, 1)  // normalize: 2+ sales/period = 1.0

    // Format breadth bonus (if available)
    const formatBonus = card.formatBreadth ?? 0.5

    // Price stability bonus (if available, lower deviation = higher bonus)
    const priceStabilityBonus = card.priceStability !== undefined
        ? Math.max(0, 1 - card.priceStability)
        : 0.5

    // Weighted average
    const liquidity = (salesLiquidity * 0.5) + (formatBonus * 0.3) + (priceStabilityBonus * 0.2)

    return Math.max(0, Math.min(1, liquidity))
}

/**
 * Calculate the Substitutability score for a card (0-1)
 * Cards with substitutes are less critical to stock.
 * 
 * Design constraint: Cards in the same group share demand pressure.
 * If Sol Ring is scarce but Mana Crypt is available, Sol Ring's
 * substitutability score should be HIGHER (less urgent to restock)
 * because demand can be satisfied by Mana Crypt.
 * 
 * @param card - The card to calculate substitutability for
 * @param substitutionGroups - Groups can be plain SubstitutionGroup or SubstitutionGroupWithInventory
 * @param allCards - Optional map of all cards for inventory lookup when groups don't have inventory data
 */
export function calculateSubstitutability(
    card: CardMetrics,
    substitutionGroups: SubstitutionGroup[] = [],
    allCards?: Map<string, CardMetrics>
): number {
    // Find if card belongs to a substitution group
    const group = substitutionGroups.find(g => g.cards.includes(card.cardId))

    if (!group || group.cards.length <= 1) {
        // No substitutes available - high priority (return 1.0 for IPS formula)
        return 1.0
    }

    // Base substitutability from number of substitutes
    // More substitutes = lower base priority
    // Scale: 2 cards = 0.7, 3 cards = 0.5, 4+ cards = 0.3
    const substituteCount = group.cards.length
    const baseSubstitutability = Math.max(0.3, 1 - (substituteCount - 1) * 0.2)

    // Check if we have inventory data for more accurate calculation
    const groupWithInventory = group as SubstitutionGroupWithInventory
    let inventoryBonus = 0

    if (groupWithInventory.cardInventory && groupWithInventory.cardInventory instanceof Map) {
        // Calculate inventory bonus from substitutes
        const otherCards = group.cards.filter(id => id !== card.cardId)
        let totalSubstituteInventory = 0
        let substitutesDemandCapacity = 0

        for (const otherId of otherCards) {
            const inventory = groupWithInventory.cardInventory.get(otherId) || 0
            totalSubstituteInventory += inventory
            // Each substitute can absorb some demand
            substitutesDemandCapacity += Math.min(inventory, 4) // Cap contribution per card
        }

        // If substitutes have good inventory, this card is less urgent
        // Bonus scales from 0 (no substitute inventory) to 0.4 (well-stocked substitutes)
        if (totalSubstituteInventory > 0) {
            inventoryBonus = Math.min(0.4, substitutesDemandCapacity * 0.05)
        }
    } else if (allCards && allCards.size > 0) {
        // Fallback: use allCards map for inventory lookup
        const otherCards = group.cards.filter(id => id !== card.cardId)
        let totalSubstituteInventory = 0
        let substitutesDemandCapacity = 0

        for (const otherId of otherCards) {
            const otherCard = allCards.get(otherId)
            if (otherCard) {
                const inventory = otherCard.currentInventory || 0
                totalSubstituteInventory += inventory
                substitutesDemandCapacity += Math.min(inventory, 4)
            }
        }

        if (totalSubstituteInventory > 0) {
            inventoryBonus = Math.min(0.4, substitutesDemandCapacity * 0.05)
        }
    }

    // Higher score = less urgent (substitutes can absorb demand)
    // This effectively increases substitutability when substitutes are available
    return Math.min(1.0, baseSubstitutability + inventoryBonus)
}

/**
 * Calculate the Margin Safety score
 * (CKPrice - MarketMedianPrice) / CKPrice
 * Positive margin = safe to buy at market price and sell at CK anchor
 */
export function calculateMarginSafety(card: CardMetrics): number {
    if (card.ckPrice <= 0) return 0

    const margin = (card.ckPrice - card.marketMedianPrice) / card.ckPrice

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, margin))
}

/**
 * Calculate the target inventory level for a card
 * Based on demand rate and time horizon
 */
export function calculateTargetInventory(
    demandRate: number,
    config: IPSConfig = DEFAULT_IPS_CONFIG
): number {
    // Target = DemandRate units per period × time horizon periods
    // With a buffer multiplier for safety
    const buffer = 1.2
    const target = Math.ceil(demandRate * (config.inventoryTimeHorizon / 30) * buffer)

    return Math.max(1, target)  // At least 1
}

/**
 * Determine the tier for a card based on its IPS score
 */
export function determineTier(
    ips: number,
    liquidity: number,
    marginSafety: number,
    config: IPSConfig = DEFAULT_IPS_CONFIG
): 'A' | 'B' | 'C' {
    // Tier C: Low margin or low liquidity - demand only, never speculative
    if (marginSafety <= config.minMarginSafety || liquidity < config.minLiquidity) {
        return 'C'
    }

    // Tier A: High IPS - always acceptable filler
    if (ips >= config.tierAThreshold) {
        return 'A'
    }

    // Tier B: Medium IPS - shipping-only filler
    if (ips >= config.tierBThreshold) {
        return 'B'
    }

    // Below threshold - still Tier C
    return 'C'
}

/**
 * Calculate the full IPS result for a single card
 */
export function calculateCardIPS(
    card: CardMetrics,
    substitutionGroups: SubstitutionGroup[] = [],
    config: IPSConfig = DEFAULT_IPS_CONFIG
): IPSResult {
    const demandRate = calculateDemandRate(card, config)
    const liquidity = calculateLiquidity(card)
    const substitutability = calculateSubstitutability(card, substitutionGroups)
    const marginSafety = calculateMarginSafety(card)

    // Core IPS formula
    let ips = (demandRate * liquidity * substitutability) / (card.currentInventory + 1) * marginSafety

    const tier = determineTier(ips, liquidity, marginSafety, config)
    const targetInventory = calculateTargetInventory(demandRate, config)
    const deficit = Math.max(0, targetInventory - card.currentInventory)

    // Build reasons array for transparency
    const reasons: string[] = []
    if (card.deckUsageCount > 0) reasons.push(`Used in ${card.deckUsageCount} deck(s)`)
    if (card.queuedDeckUsageCount > 0) reasons.push(`Queued in ${card.queuedDeckUsageCount} deck(s)`)
    if (card.salesVelocity > 0) reasons.push(`Sales velocity: ${card.salesVelocity.toFixed(2)}`)
    if (card.lowInventoryAlertEnabled) reasons.push('Low inventory alert enabled')
    if (deficit > 0) reasons.push(`Deficit: ${deficit} units`)
    if (marginSafety > 0.2) reasons.push(`Good margin: ${(marginSafety * 100).toFixed(0)}%`)

    return {
        cardId: card.cardId,
        cardName: card.cardName,
        IPS: Number(ips.toFixed(4)),
        tier,
        targetInventory,
        deficit,
        demandRate: Number(demandRate.toFixed(4)),
        liquidity: Number(liquidity.toFixed(4)),
        substitutability: Number(substitutability.toFixed(4)),
        marginSafety: Number(marginSafety.toFixed(4)),
        reasons,
    }
}


/**
 * Calculate IPS for multiple cards and return sorted Hot List
 */
export function generateHotList(
    cards: CardMetrics[],
    substitutionGroups: SubstitutionGroup[] = [],
    config: IPSConfig = DEFAULT_IPS_CONFIG
): IPSResult[] {
    const results = cards.map(card => calculateCardIPS(card, substitutionGroups, config))

    // Sort by IPS descending (highest priority first)
    results.sort((a, b) => b.IPS - a.IPS)

    return results
}

/**
 * Filter Hot List to only eligible cards
 * Eligible if: IPS > 0, Liquidity > minLiquidity, MarginSafety > minMarginSafety
 */
export function filterEligibleHotList(
    hotList: IPSResult[],
    config: IPSConfig = DEFAULT_IPS_CONFIG
): IPSResult[] {
    return hotList.filter(card =>
        card.IPS > 0 &&
        card.liquidity >= config.minLiquidity &&
        card.marginSafety > config.minMarginSafety
    )
}

/**
 * Get Hot List cards suitable for shipping optimization (Tier A and B only)
 */
export function getShippingFillerCandidates(hotList: IPSResult[]): IPSResult[] {
    return hotList.filter(card => card.tier === 'A' || card.tier === 'B')
}

/**
 * Get Hot List cards suitable for demand fulfillment (all tiers)
 */
export function getDemandCandidates(hotList: IPSResult[]): IPSResult[] {
    return hotList.filter(card => card.deficit > 0)
}

export default {
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
    getDemandCandidates,
    DEFAULT_IPS_CONFIG,
}
