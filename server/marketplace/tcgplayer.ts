/**
 * TCGPlayer Marketplace Integration
 * 
 * Provides functions to:
 * - Search for card offers on TCGPlayer
 * - Normalize raw listings to standard Offer format
 * - Handle rate limiting (max 300 requests/minute)
 * - Filter out damaged condition cards
 * - Extract seller ratings
 * 
 * IMPORTANT: TCGPlayer uses product IDs, not Scryfall IDs.
 * Card mapping requires name + set code lookups.
 */

import type { Offer, Marketplace } from '../autobuy/types.js'
import type {
    TCGPlayerRawListing,
    TCGPlayerSearchResponse,
    TCGPlayerProductMapping,
    CardLookup,
} from './types.js'

// ============================================================================
// Rate Limiter Implementation
// ============================================================================

/**
 * Token bucket rate limiter for TCGPlayer API
 * Enforces max 300 requests per minute with automatic refill
 */
class RateLimiter {
    private tokens: number
    private lastRefill: number
    private readonly maxTokens: number
    private readonly refillRate: number // tokens per second

    constructor(maxRequestsPerMinute: number = 300) {
        this.maxTokens = maxRequestsPerMinute
        this.tokens = maxRequestsPerMinute
        this.refillRate = maxRequestsPerMinute / 60
        this.lastRefill = Date.now()
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now()
        const elapsed = (now - this.lastRefill) / 1000
        const tokensToAdd = elapsed * this.refillRate
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
        this.lastRefill = now
    }

    /**
     * Attempt to consume a token, returns true if allowed
     */
    tryConsume(): boolean {
        this.refill()
        if (this.tokens >= 1) {
            this.tokens -= 1
            return true
        }
        return false
    }

    /**
     * Wait until a token is available, then consume it
     */
    async waitForToken(): Promise<void> {
        this.refill()
        if (this.tokens >= 1) {
            this.tokens -= 1
            return
        }
        // Calculate wait time for next token
        const waitMs = Math.ceil((1 - this.tokens) / this.refillRate * 1000)
        await new Promise(resolve => setTimeout(resolve, waitMs))
        this.refill()
        this.tokens -= 1
    }

    /**
     * Get current remaining tokens
     */
    getRemainingTokens(): number {
        this.refill()
        return Math.floor(this.tokens)
    }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(300)

// ============================================================================
// Condition Filtering
// ============================================================================

/**
 * Card conditions ordered from best to worst
 * We exclude 'Damaged' and 'Heavily Played' by default
 */
const CONDITION_ORDER = [
    'Near Mint',
    'Lightly Played',
    'Moderately Played',
    'Heavily Played',
    'Damaged',
] as const

type CardCondition = typeof CONDITION_ORDER[number]

/**
 * Conditions to exclude from offers
 */
const EXCLUDED_CONDITIONS: Set<string> = new Set([
    'Damaged',
    'heavily_played', // alternate format
    'damaged', // alternate format
    'HP', // abbreviation
    'D', // abbreviation
])

/**
 * Check if a condition should be excluded
 */
function isConditionExcluded(condition: string): boolean {
    const normalized = condition.toLowerCase().trim()
    return (
        EXCLUDED_CONDITIONS.has(condition) ||
        EXCLUDED_CONDITIONS.has(normalized) ||
        normalized.includes('damaged')
    )
}

// ============================================================================
// TCGPlayer API Client
// ============================================================================

const TCGPLAYER_API_BASE = 'https://api.tcgplayer.com'
const TCGPLAYER_MARKETPLACE = 'TCG' as Marketplace

/**
 * Make a rate-limited request to TCGPlayer API
 */
async function makeRequest<T>(
    endpoint: string,
    apiKey: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown
): Promise<T> {
    await rateLimiter.waitForToken()

    const headers: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

    const response = await fetch(`${TCGPLAYER_API_BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`TCGPlayer API error (${response.status}): ${errorText}`)
    }

    return response.json() as Promise<T>
}

/**
 * Search for TCGPlayer product IDs by card name and set
 * This maps Scryfall IDs to TCGPlayer product IDs
 */
export async function searchProductIds(
    cards: CardLookup[],
    apiKey: string
): Promise<Map<string, number>> {
    const mapping = new Map<string, number>()

    // TCGPlayer uses product search endpoint
    // We batch cards into groups for efficiency
    const batchSize = 50

    for (let i = 0; i < cards.length; i += batchSize) {
        const batch = cards.slice(i, i + batchSize)

        for (const card of batch) {
            if (!card.cardName) continue

            try {
                // Search by card name first
                const searchQuery = encodeURIComponent(card.cardName)
                const endpoint = `/catalog/products?productName=${searchQuery}&categoryId=1` // categoryId=1 is MTG

                const response = await makeRequest<{
                    success: boolean
                    results: Array<{
                        productId: number
                        name: string
                        groupId: number
                        categoryId: number
                    }>
                }>(endpoint, apiKey)

                if (response.success && response.results.length > 0) {
                    // Find best match considering set code if available
                    let bestMatch = response.results[0]

                    if (card.setCode) {
                        const setMatch = response.results.find(r =>
                            r.name.toLowerCase().includes(card.setCode!.toLowerCase())
                        )
                        if (setMatch) bestMatch = setMatch
                    }

                    mapping.set(card.scryfallId, bestMatch.productId)
                }
            } catch (error) {
                console.error(`Failed to map card ${card.cardName}:`, error)
                // Continue with other cards
            }
        }
    }

    return mapping
}

/**
 * Fetch listings for specific product IDs
 */
async function fetchListingsForProducts(
    productIds: number[],
    apiKey: string
): Promise<TCGPlayerRawListing[]> {
    const allListings: TCGPlayerRawListing[] = []

    // TCGPlayer limits to 100 products per request
    const batchSize = 100

    for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize)
        const productIdsParam = batch.join(',')

        try {
            const endpoint = `/pricing/marketprices/${productIdsParam}`
            const response = await makeRequest<{
                success: boolean
                results: TCGPlayerRawListing[]
            }>(endpoint, apiKey)

            if (response.success && response.results) {
                allListings.push(...response.results)
            }
        } catch (error) {
            console.error(`Failed to fetch listings for batch:`, error)
        }
    }

    return allListings
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Search for offers from TCGPlayer for the given card IDs
 * 
 * @param cardIds - Array of Scryfall card IDs to search for
 * @param apiKey - TCGPlayer API key
 * @param cardLookups - Optional array of CardLookup objects with name/set info
 * @returns Promise resolving to raw API response data
 */
export async function searchOffers(
    cardIds: string[],
    apiKey: string,
    cardLookups?: CardLookup[]
): Promise<TCGPlayerRawListing[]> {
    if (!cardIds.length) return []

    // Build lookup map if provided, otherwise we need card info from somewhere
    const lookups: CardLookup[] = cardLookups || cardIds.map(id => ({ scryfallId: id }))

    // First, map Scryfall IDs to TCGPlayer product IDs
    const productIdMap = await searchProductIds(lookups, apiKey)

    if (productIdMap.size === 0) {
        console.warn('No TCGPlayer product IDs could be mapped from card IDs')
        return []
    }

    // Fetch listings for all mapped products
    const productIds = Array.from(productIdMap.values())
    const listings = await fetchListingsForProducts(productIds, apiKey)

    // Add the Scryfall ID mapping back to listings for normalization
    // Create reverse map: productId -> scryfallId
    const reverseMap = new Map<number, string>()
    productIdMap.forEach((productId, scryfallId) => {
        reverseMap.set(productId, scryfallId)
    })

    // Attach Scryfall IDs to listings (extend type temporarily)
    return listings.map(listing => ({
        ...listing,
        _scryfallId: reverseMap.get(listing.productId),
    })) as TCGPlayerRawListing[]
}

/**
 * Normalize raw TCGPlayer listings to standard Offer format
 * 
 * Filters out:
 * - Damaged condition cards
 * - Heavily Played condition cards (optional)
 * - Listings with missing essential data
 * 
 * @param rawListings - Raw listings from TCGPlayer API
 * @param scryfallIdMap - Map of productId to scryfallId
 * @param excludeHeavilyPlayed - Whether to exclude HP condition (default: false)
 * @returns Array of normalized Offer objects
 */
export function normalizeOffers(
    rawListings: (TCGPlayerRawListing & { _scryfallId?: string })[],
    scryfallIdMap?: Map<number, string>,
    excludeHeavilyPlayed: boolean = false
): Offer[] {
    const offers: Offer[] = []

    for (const listing of rawListings) {
        // Filter out excluded conditions
        if (isConditionExcluded(listing.condition)) {
            continue
        }

        // Optionally exclude heavily played
        if (excludeHeavilyPlayed && listing.condition.toLowerCase().includes('heavily')) {
            continue
        }

        // Skip listings with missing essential data
        if (!listing.sellerKey || listing.price == null || listing.quantity < 1) {
            continue
        }

        // Get Scryfall ID from either the attached property or the map
        const scryfallId = listing._scryfallId || scryfallIdMap?.get(listing.productId)
        if (!scryfallId) {
            console.warn(`No Scryfall ID mapping for product ${listing.productId}`)
            continue
        }

        // Normalize to standard Offer format
        const offer: Offer = {
            marketplace: TCGPLAYER_MARKETPLACE,
            sellerId: listing.sellerKey,
            cardId: scryfallId,
            price: listing.price,
            quantityAvailable: listing.quantity,
            shipping: {
                base: listing.shippingPrice ?? 0,
                freeAt: listing.freeShippingMinimum,
            },
            sellerRating: normalizeSellerRating(listing.sellerRating, listing.sellerSales),
        }

        offers.push(offer)
    }

    return offers
}

/**
 * Normalize seller rating to 0-1 scale
 * TCGPlayer ratings are typically 0-100 percentage based
 * Also factors in number of sales for confidence weighting
 */
function normalizeSellerRating(
    rating: number | undefined,
    salesCount: number | undefined
): number | undefined {
    if (rating == null) return undefined

    // Convert percentage to 0-1 scale
    let normalizedRating = rating
    if (rating > 1) {
        normalizedRating = rating / 100
    }

    // Apply confidence adjustment for low sales count
    // New sellers with few sales get slight penalty
    if (salesCount != null && salesCount < 100) {
        const confidenceFactor = Math.min(salesCount / 100, 1)
        // Blend towards 0.9 (neutral) based on confidence
        normalizedRating = normalizedRating * confidenceFactor + 0.9 * (1 - confidenceFactor)
    }

    return Math.max(0, Math.min(1, normalizedRating))
}

/**
 * Combined function to search and normalize offers in one call
 * 
 * @param cardIds - Scryfall card IDs to search
 * @param apiKey - TCGPlayer API key
 * @param cardLookups - Optional card lookup info with names/sets
 * @returns Normalized offers array
 */
export async function fetchAndNormalizeOffers(
    cardIds: string[],
    apiKey: string,
    cardLookups?: CardLookup[]
): Promise<Offer[]> {
    const rawListings = await searchOffers(cardIds, apiKey, cardLookups)
    return normalizeOffers(rawListings)
}

// ============================================================================
// Utility Exports
// ============================================================================

export {
    rateLimiter,
    isConditionExcluded,
    CONDITION_ORDER,
    EXCLUDED_CONDITIONS,
}

export default {
    searchOffers,
    normalizeOffers,
    fetchAndNormalizeOffers,
    searchProductIds,
    rateLimiter,
}
