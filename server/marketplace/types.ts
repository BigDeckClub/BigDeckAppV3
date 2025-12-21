/**
 * Marketplace Integration Types
 * 
 * Common types shared across all marketplace integrations
 */

import type { Offer, Marketplace } from '../autobuy/types.js'

export { Offer, Marketplace }

/**
 * Marketplace configuration for API access
 */
export type MarketplaceConfig = {
    tcgplayer?: {
        apiKey: string
        enabled: boolean
    }
    manabox?: {
        apiKey: string
        enabled: boolean
    }
    cardKingdom?: {
        enabled: boolean
    }
}

/**
 * Raw TCGPlayer listing from their API
 */
export type TCGPlayerRawListing = {
    listingId: number
    productId: number
    productName: string
    setName: string
    condition: string
    printing: string
    language: string
    quantity: number
    price: number
    sellerKey: string
    sellerName: string
    sellerRating: number
    sellerSales: number
    channelId: number
    shippingPrice?: number
    freeShippingMinimum?: number
}

/**
 * TCGPlayer API response for product search
 */
export type TCGPlayerSearchResponse = {
    success: boolean
    errors?: string[]
    results: TCGPlayerRawListing[]
    totalItems: number
}

/**
 * TCGPlayer product mapping result
 */
export type TCGPlayerProductMapping = {
    scryfallId: string
    tcgProductId: number
    cardName: string
    setCode: string
}

/**
 * Cache entry for marketplace offers
 */
export type OfferCacheEntry = {
    offers: Offer[]
    timestamp: number
    expiresAt: number
}

/**
 * Fetch result from marketplace aggregator
 */
export type FetchOffersResult = {
    offers: Offer[]
    errors: Array<{
        marketplace: Marketplace
        error: string
    }>
    fromCache: boolean
    fetchedAt: string
}

/**
 * Card identification info for lookups
 */
export type CardLookup = {
    scryfallId: string
    cardName?: string
    setCode?: string
}
