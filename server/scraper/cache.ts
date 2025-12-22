import { ScrapedOffer } from './types.js';

interface CacheEntry {
    offers: ScrapedOffer[];
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getCachedOffers(cardName: string): ScrapedOffer[] | null {
    const normalizedKey = cardName.toLowerCase();
    const entry = cache.get(normalizedKey);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > DEFAULT_TTL_MS) {
        cache.delete(normalizedKey);
        return null;
    }

    return entry.offers;
}

export function setCachedOffers(cardName: string, offers: ScrapedOffer[]): void {
    const normalizedKey = cardName.toLowerCase();
    cache.set(normalizedKey, {
        offers,
        timestamp: Date.now()
    });
}

export function clearCache(): void {
    cache.clear();
}
