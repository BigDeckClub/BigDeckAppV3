/**
 * Seasonality Service for IPS Calculator
 * 
 * Provides seasonal multipliers that adjust IPS scores based on temporal events
 * like set releases, ban announcements, Commander products, and holidays.
 * 
 * Seasonal factors range from 0.5 (dampening) to 2.0 (boost)
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Types
export type SeasonalEventType = 'SET_RELEASE' | 'BAN_ANNOUNCEMENT' | 'COMMANDER_PRODUCT' | 'HOLIDAY'

export interface SeasonalEvent {
    type: SeasonalEventType
    date: string              // ISO date string (YYYY-MM-DD)
    name: string
    affectedTags: string[]    // Tags that this event affects (e.g., 'commander-staple', 'all')
    affectedFormats?: string[] // For ban announcements, which formats are affected
}

export interface ReprintInfo {
    cardId: string            // The reprinted card's ID
    originalCardId: string    // The original card ID this is a reprint of
    reprintDate: string       // ISO date string
    setCode: string           // Set code for the reprint
}

export interface SeasonalEventsConfig {
    events: SeasonalEvent[]
    reprints: ReprintInfo[]
}

export interface CardTags {
    cardId: string
    tags: string[]            // e.g., ['commander-staple', 'modern-legal', 'staple']
    formats?: string[]        // e.g., ['commander', 'modern', 'legacy']
    reprintDate?: string      // If this card was recently reprinted
}

// Constants for seasonal multipliers
const COMMANDER_PRODUCT_BOOST = 1.3       // 2 weeks before Commander product
const CHRISTMAS_BOOST = 1.2               // Week before Christmas
const REPRINT_DAMPENING = 0.6             // 30 days after reprint
const BAN_ANNOUNCEMENT_BOOST = 1.5        // 1 week after ban announcement

// Time windows in milliseconds
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// Module-level cache for seasonal events
let cachedConfig: SeasonalEventsConfig | null = null

/**
 * Load seasonal events from JSON config file
 */
export function loadSeasonalEvents(configPath?: string): SeasonalEventsConfig {
    if (cachedConfig && !configPath) {
        return cachedConfig
    }

    const defaultPath = join(dirname(fileURLToPath(import.meta.url)), 'data', 'seasonal-events.json')
    const path = configPath || defaultPath

    if (!existsSync(path)) {
        console.warn(`Seasonal events config not found at ${path}, using empty config`)
        return { events: [], reprints: [] }
    }

    try {
        const content = readFileSync(path, 'utf-8')
        const config = JSON.parse(content) as SeasonalEventsConfig

        if (!configPath) {
            cachedConfig = config
        }

        return config
    } catch (error) {
        console.error('Failed to load seasonal events config:', error)
        return { events: [], reprints: [] }
    }
}

/**
 * Clear the cached config (useful for testing)
 */
export function clearSeasonalEventsCache(): void {
    cachedConfig = null
}

/**
 * Parse a date string to a Date object at midnight UTC
 */
function parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

/**
 * Get the difference in milliseconds between two dates
 */
function getDateDiffMs(date1: Date, date2: Date): number {
    return date1.getTime() - date2.getTime()
}

/**
 * Check if a card has any of the specified tags
 */
function hasMatchingTag(cardTags: CardTags, eventTags: string[]): boolean {
    if (eventTags.includes('all')) {
        return true
    }
    return cardTags.tags.some(tag => eventTags.includes(tag))
}

/**
 * Check if a card is in any of the affected formats
 */
function isInAffectedFormat(cardTags: CardTags, formats: string[]): boolean {
    if (!cardTags.formats || !formats) {
        return false
    }
    return cardTags.formats.some(format => formats.includes(format))
}

/**
 * Calculate the Commander product boost factor
 * 1.3x multiplier for commander staples 2 weeks before Commander product release
 */
function calculateCommanderProductBoost(
    cardTags: CardTags,
    currentDate: Date,
    events: SeasonalEvent[]
): number {
    const commanderEvents = events.filter(e => e.type === 'COMMANDER_PRODUCT')

    for (const event of commanderEvents) {
        const eventDate = parseDate(event.date)
        const diffMs = getDateDiffMs(eventDate, currentDate)

        // Only apply boost if event is in the future and within 2 weeks
        if (diffMs > 0 && diffMs <= TWO_WEEKS_MS) {
            if (hasMatchingTag(cardTags, event.affectedTags)) {
                return COMMANDER_PRODUCT_BOOST
            }
        }
    }

    return 1.0
}

/**
 * Calculate the Christmas boost factor
 * 1.2x multiplier for all cards the week before Christmas
 */
function calculateChristmasBoost(currentDate: Date, events: SeasonalEvent[]): number {
    const christmasEvents = events.filter(
        e => e.type === 'HOLIDAY' && e.name.toLowerCase().includes('christmas')
    )

    for (const event of christmasEvents) {
        const eventDate = parseDate(event.date)
        const diffMs = getDateDiffMs(eventDate, currentDate)

        // Apply boost if within 1 week before Christmas
        if (diffMs > 0 && diffMs <= ONE_WEEK_MS) {
            return CHRISTMAS_BOOST
        }
    }

    return 1.0
}

/**
 * Calculate the reprint dampening factor
 * 0.6x multiplier for 30 days after a card is reprinted
 */
function calculateReprintDampening(
    cardTags: CardTags,
    currentDate: Date,
    reprints: ReprintInfo[]
): number {
    // Check if this card's ID matches any reprint's originalCardId
    const relevantReprints = reprints.filter(
        r => r.originalCardId === cardTags.cardId || r.cardId === cardTags.cardId
    )

    // Also check if the card has a reprintDate in its tags
    if (cardTags.reprintDate) {
        const reprintDate = parseDate(cardTags.reprintDate)
        const diffMs = getDateDiffMs(currentDate, reprintDate)

        if (diffMs >= 0 && diffMs <= THIRTY_DAYS_MS) {
            return REPRINT_DAMPENING
        }
    }

    for (const reprint of relevantReprints) {
        const reprintDate = parseDate(reprint.reprintDate)
        const diffMs = getDateDiffMs(currentDate, reprintDate)

        // Apply dampening if within 30 days after reprint
        if (diffMs >= 0 && diffMs <= THIRTY_DAYS_MS) {
            return REPRINT_DAMPENING
        }
    }

    return 1.0
}

/**
 * Calculate the ban announcement boost factor
 * 1.5x multiplier for 1 week after ban announcement for cards in affected formats
 */
function calculateBanAnnouncementBoost(
    cardTags: CardTags,
    currentDate: Date,
    events: SeasonalEvent[]
): number {
    const banEvents = events.filter(e => e.type === 'BAN_ANNOUNCEMENT')

    for (const event of banEvents) {
        const eventDate = parseDate(event.date)
        const diffMs = getDateDiffMs(currentDate, eventDate)

        // Apply boost if within 1 week after ban announcement
        if (diffMs >= 0 && diffMs <= ONE_WEEK_MS) {
            if (event.affectedFormats && isInAffectedFormat(cardTags, event.affectedFormats)) {
                return BAN_ANNOUNCEMENT_BOOST
            }
            // Fall back to tag matching if no formats specified
            if (!event.affectedFormats && hasMatchingTag(cardTags, event.affectedTags)) {
                return BAN_ANNOUNCEMENT_BOOST
            }
        }
    }

    return 1.0
}

/**
 * Get the combined seasonality factor for a card on a given date
 * 
 * @param cardId - The card ID to check
 * @param date - The date to calculate the factor for (defaults to now)
 * @param cardTags - Optional card tags (if not provided, uses minimal tags)
 * @param config - Optional config (if not provided, loads from default path)
 * @returns A multiplier between 0.5 and 2.0
 */
export function getSeasonalityFactor(
    cardId: string,
    date: Date = new Date(),
    cardTags?: CardTags,
    config?: SeasonalEventsConfig
): number {
    const seasonalConfig = config || loadSeasonalEvents()

    // Create minimal card tags if not provided
    const tags: CardTags = cardTags || {
        cardId,
        tags: [],
        formats: [],
    }

    // Calculate individual factors
    const commanderBoost = calculateCommanderProductBoost(tags, date, seasonalConfig.events)
    const christmasBoost = calculateChristmasBoost(date, seasonalConfig.events)
    const reprintDampening = calculateReprintDampening(tags, date, seasonalConfig.reprints)
    const banBoost = calculateBanAnnouncementBoost(tags, date, seasonalConfig.events)

    // Combine factors multiplicatively
    let combinedFactor = commanderBoost * christmasBoost * reprintDampening * banBoost

    // Clamp to valid range [0.5, 2.0]
    combinedFactor = Math.max(0.5, Math.min(2.0, combinedFactor))

    return Number(combinedFactor.toFixed(4))
}

/**
 * Get a breakdown of all seasonal factors affecting a card
 * Useful for debugging and displaying to users
 */
export function getSeasonalityBreakdown(
    cardId: string,
    date: Date = new Date(),
    cardTags?: CardTags,
    config?: SeasonalEventsConfig
): {
    commanderBoost: number
    christmasBoost: number
    reprintDampening: number
    banBoost: number
    combinedFactor: number
    activeEvents: string[]
} {
    const seasonalConfig = config || loadSeasonalEvents()

    const tags: CardTags = cardTags || {
        cardId,
        tags: [],
        formats: [],
    }

    const commanderBoost = calculateCommanderProductBoost(tags, date, seasonalConfig.events)
    const christmasBoost = calculateChristmasBoost(date, seasonalConfig.events)
    const reprintDampening = calculateReprintDampening(tags, date, seasonalConfig.reprints)
    const banBoost = calculateBanAnnouncementBoost(tags, date, seasonalConfig.events)

    const activeEvents: string[] = []
    if (commanderBoost !== 1.0) activeEvents.push('Commander Product Release')
    if (christmasBoost !== 1.0) activeEvents.push('Christmas Season')
    if (reprintDampening !== 1.0) activeEvents.push('Recent Reprint')
    if (banBoost !== 1.0) activeEvents.push('Ban Announcement')

    let combinedFactor = commanderBoost * christmasBoost * reprintDampening * banBoost
    combinedFactor = Math.max(0.5, Math.min(2.0, combinedFactor))

    return {
        commanderBoost,
        christmasBoost,
        reprintDampening,
        banBoost,
        combinedFactor: Number(combinedFactor.toFixed(4)),
        activeEvents,
    }
}

export default {
    loadSeasonalEvents,
    clearSeasonalEventsCache,
    getSeasonalityFactor,
    getSeasonalityBreakdown,
}
