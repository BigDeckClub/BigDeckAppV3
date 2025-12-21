/**
 * Marketplace Aggregator
 * 
 * Unified interface for fetching and aggregating offers from multiple
 * marketplaces (TCGPlayer, Manabox, Card Kingdom).
 * 
 * Features:
 * - Parallel fetching from enabled marketplaces
 * - Offer deduplication by sellerId + cardId
 * - 15-minute caching
 * - Graceful error handling per marketplace
 */

import type { Offer, Marketplace } from '../autobuy/types.js'
import type {
    MarketplaceConfig,
    FetchOffersResult,
    OfferCacheEntry,
    CardLookup,
} from './types.js'
import tcgplayer from './tcgplayer.js'

// ============================================================================
// Cache Implementation
// ============================================================================

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes
const offerCache = new Map<string, OfferCacheEntry>()

/**
 * Generate cache key from card IDs
 */
function getCacheKey(cardIds: string[]): string {
    return [...cardIds].sort().join(',')
}

/**
 * Get cached offers if still valid
 */
function getFromCache(cardIds: string[]): Offer[] | null {
    const key = getCacheKey(cardIds)
    const entry = offerCache.get(key)

    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
        offerCache.delete(key)
        return null
    }

    return entry.offers
}

/**
 * Store offers in cache
 */
function setCache(cardIds: string[], offers: Offer[]): void {
    const key = getCacheKey(cardIds)
    const now = Date.now()

    offerCache.set(key, {
        offers,
        timestamp: now,
        expiresAt: now + CACHE_TTL_MS,
    })
}

/**
 * Clear expired cache entries
 */
function cleanCache(): void {
    const now = Date.now()
    for (const [key, entry] of offerCache.entries()) {
        if (now > entry.expiresAt) {
            offerCache.delete(key)
        }
    }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
    offerCache.clear()
}

// Periodic cache cleanup every 5 minutes
setInterval(cleanCache, 5 * 60 * 1000)

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Generate unique key for offer deduplication
 */
function getOfferKey(offer: Offer): string {
    return `${offer.marketplace}:${offer.sellerId}:${offer.cardId}`
}

/**
 * Merge and deduplicate offers from multiple sources
 * When duplicates are found, keeps the one with lower price
 */
function mergeAndDedupeOffers(offerArrays: Offer[][]): Offer[] {
    const offerMap = new Map<string, Offer>()

    for (const offers of offerArrays) {
        for (const offer of offers) {
            const key = getOfferKey(offer)
            const existing = offerMap.get(key)

            if (!existing || offer.price < existing.price) {
                offerMap.set(key, offer)
            } else if (offer.price === existing.price) {
                // Same price - prefer higher seller rating
                const existingRating = existing.sellerRating ?? 0
                const newRating = offer.sellerRating ?? 0
                if (newRating > existingRating) {
                    offerMap.set(key, offer)
                }
            }
        }
    }

    return Array.from(offerMap.values())
}

// ============================================================================
// Marketplace Fetchers
// ============================================================================

/**
 * Fetch offers from TCGPlayer
 */
async function fetchTCGPlayerOffers(
    cardIds: string[],
    config: MarketplaceConfig,
    cardLookups?: CardLookup[]
): Promise<{ offers: Offer[]; error?: string }> {
    if (!config.tcgplayer?.enabled || !config.tcgplayer?.apiKey) {
        return { offers: [] }
    }

    try {
        const offers = await tcgplayer.fetchAndNormalizeOffers(
            cardIds,
            config.tcgplayer.apiKey,
            cardLookups
        )
        return { offers }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('TCGPlayer fetch failed:', message)
        return { offers: [], error: message }
    }
}

/**
 * Fetch offers from Manabox (placeholder for future implementation)
 */
async function fetchManaboxOffers(
    cardIds: string[],
    config: MarketplaceConfig
): Promise<{ offers: Offer[]; error?: string }> {
    if (!config.manabox?.enabled || !config.manabox?.apiKey) {
        return { offers: [] }
    }

    // TODO: Implement Manabox integration
    console.warn('Manabox integration not yet implemented')
    return { offers: [] }
}

/**
 * Fetch offers from Card Kingdom (placeholder for future implementation)
 * Note: CK is typically used as fallback in the optimizer, not as a primary source
 */
async function fetchCardKingdomOffers(
    cardIds: string[],
    config: MarketplaceConfig
): Promise<{ offers: Offer[]; error?: string }> {
    if (!config.cardKingdom?.enabled) {
        return { offers: [] }
    }

    // TODO: Implement Card Kingdom integration
    // CK may not have a public API - might need scraping or partner access
    console.warn('Card Kingdom integration not yet implemented')
    return { offers: [] }
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Fetch offers from all enabled marketplaces
 * 
 * @param cardIds - Scryfall card IDs to fetch offers for
 * @param config - Marketplace configuration with API keys and enabled flags
 * @param cardLookups - Optional card info for better matching
 * @param skipCache - Force fresh fetch, ignoring cache
 * @returns Combined and deduplicated offers from all marketplaces
 */
export async function fetchAllOffers(
    cardIds: string[],
    config: MarketplaceConfig,
    cardLookups?: CardLookup[],
    skipCache: boolean = false
): Promise<FetchOffersResult> {
    // Check cache first
    if (!skipCache) {
        const cachedOffers = getFromCache(cardIds)
        if (cachedOffers) {
            return {
                offers: cachedOffers,
                errors: [],
                fromCache: true,
                fetchedAt: new Date().toISOString(),
            }
        }
    }

    // Fetch from all enabled marketplaces in parallel
    const [tcgResult, manaboxResult, ckResult] = await Promise.all([
        fetchTCGPlayerOffers(cardIds, config, cardLookups),
        fetchManaboxOffers(cardIds, config),
        fetchCardKingdomOffers(cardIds, config),
    ])

    // Collect errors
    const errors: FetchOffersResult['errors'] = []
    if (tcgResult.error) {
        errors.push({ marketplace: 'TCG', error: tcgResult.error })
    }
    if (manaboxResult.error) {
        errors.push({ marketplace: 'MANABOX', error: manaboxResult.error })
    }
    if (ckResult.error) {
        errors.push({ marketplace: 'CK', error: ckResult.error })
    }

    // Merge and dedupe all offers
    const allOffers = mergeAndDedupeOffers([
        tcgResult.offers,
        manaboxResult.offers,
        ckResult.offers,
    ])

    // Cache the results
    if (allOffers.length > 0) {
        setCache(cardIds, allOffers)
    }

    return {
        offers: allOffers,
        errors,
        fromCache: false,
        fetchedAt: new Date().toISOString(),
    }
}

/**
 * Get configuration from environment variables
 */
export function getConfigFromEnv(): MarketplaceConfig {
    return {
        tcgplayer: {
            apiKey: process.env.TCGPLAYER_API_KEY || '',
            enabled: process.env.TCGPLAYER_ENABLED?.toLowerCase() === 'true',
        },
        manabox: {
            apiKey: process.env.MANABOX_API_KEY || '',
            enabled: process.env.MANABOX_ENABLED?.toLowerCase() === 'true',
        },
        cardKingdom: {
            enabled: process.env.CARDKINGDOM_ENABLED?.toLowerCase() === 'true',
        },
    }
}

/**
 * Check which marketplaces are enabled and configured
 */
export function getEnabledMarketplaces(config: MarketplaceConfig): Marketplace[] {
    const enabled: Marketplace[] = []

    if (config.tcgplayer?.enabled && config.tcgplayer?.apiKey) {
        enabled.push('TCG')
    }
    if (config.manabox?.enabled && config.manabox?.apiKey) {
        enabled.push('MANABOX')
    }
    if (config.cardKingdom?.enabled) {
        enabled.push('CK')
    }

    return enabled
}

// ============================================================================
// Exports
// ============================================================================

export {
    mergeAndDedupeOffers,
    getOfferKey,
    getCacheKey,
    CACHE_TTL_MS,
}

export default {
    fetchAllOffers,
    getConfigFromEnv,
    getEnabledMarketplaces,
    clearCache,
    mergeAndDedupeOffers,
}
