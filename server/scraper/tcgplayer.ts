import { chromium, Browser, Page } from 'playwright';
import { ScrapedOffer } from './types.js';
import { getCachedOffers, setCachedOffers } from './cache.js';

// Configuration
const HEADLESS = true; // Set to false for debugging
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Scrape TCGPlayer for a list of card names
 * Returns a flattened list of all offers found
 */
export async function scrapeTCGPlayerOffers(
    cardRequests: { name: string; scryfallId: string }[],
    options: { skipCache?: boolean } = {}
): Promise<{ offers: ScrapedOffer[], errors: string[] }> {

    const results: ScrapedOffer[] = [];
    const errors: string[] = [];
    const cardsToScrape: typeof cardRequests = [];

    // 1. Check Cache
    if (!options.skipCache) {
        for (const req of cardRequests) {
            const cached = getCachedOffers(req.name);
            if (cached) {
                console.log(`[Scraper] Cache hit for ${req.name}`);
                results.push(...cached.map(o => ({ ...o, cardId: req.scryfallId })));
            } else {
                cardsToScrape.push(req);
            }
        }
    } else {
        cardsToScrape.push(...cardRequests);
    }

    if (cardsToScrape.length === 0) {
        return { offers: results, errors };
    }

    console.log(`[Scraper] Starting scrape for ${cardsToScrape.length} cards...`);

    let browser: Browser | null = null;
    try {
        console.log('[Scraper] Launching browser...');
        browser = await chromium.launch({ headless: HEADLESS });
        console.log('[Scraper] Browser launched. Creating context...');
        const context = await browser.newContext({ userAgent: USER_AGENT });
        const page = await context.newPage();

        for (const card of cardsToScrape) {
            try {
                const offers = await scrapeSingleCard(page, card.name);

                // Normalize and Attach Scryfall ID
                const normalizedOffers = offers.map(o => ({
                    ...o,
                    cardId: card.scryfallId,
                    marketplace: 'TCG' as const,
                    quantityAvailable: o.quantity // Optimizer expects quantityAvailable
                }));

                setCachedOffers(card.name, normalizedOffers);
                results.push(...normalizedOffers);

                // Rate limiting delay
                await new Promise(r => setTimeout(r, 2000));

            } catch (err: any) {
                console.error(`[Scraper] Failed to scrape ${card.name}:`, err);
                errors.push(`${card.name}: ${err.message}`);
            }
        }

    } catch (err: any) {
        console.error('[Scraper] Critical browser error:', err);
        errors.push(`Browser Error: ${err.message}`);
    } finally {
        if (browser) await browser.close();
    }

    return { offers: results, errors };
}

async function scrapeSingleCard(page: Page, cardName: string): Promise<Omit<ScrapedOffer, 'cardId' | 'marketplace'>[]> {
    const offers: Omit<ScrapedOffer, 'cardId' | 'marketplace'>[] = [];

    console.log(`[Scraper] Searching for: ${cardName}`);

    // 1. Search for price guide/product
    const encodedName = encodeURIComponent(cardName);
    await page.goto(`https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodedName}&view=grid`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
    });

    // 2. Click the first product result
    const firstResultSelector = 'div.search-result a, a.product-card__image';
    try {
        await page.waitForSelector(firstResultSelector, { timeout: 5000 });
    } catch (e) {
        console.warn(`[Scraper] No results found for ${cardName}`);
        return [];
    }

    // Click and navigate
    await Promise.all([
        page.waitForLoadState('domcontentloaded'),
        page.click(firstResultSelector)
    ]);

    // 3. On Product Page, wait for listings
    const listingSelector = 'section.listing-item';
    try {
        await page.waitForSelector(listingSelector, { timeout: 8000 });
    } catch (e) {
        console.warn(`[Scraper] 0 listings loaded for ${cardName} (timeout)`);
        return [];
    }

    // 4. Extract Data
    const listings = await page.$$(listingSelector);
    console.log(`[Scraper] Found ${listings.length} listings for ${cardName}`);

    // Regex Patterns
    const PRICE_REGEX = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    const SHIPPING_REGEX = /(?:\+(?:\s|\\n)*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)(?:\s|\\n)*Shipping)|(Free Shipping)/i;
    const QTY_REGEX = /(\d+)\s*(?:available|in stock)/i;
    const CONDITION_REGEX = /Near Mint|Lightly Played|Moderately Played|Heavily Played|Damaged/i;

    for (const listing of listings) {
        try {
            const rawText = await listing.innerText();
            // console.log(`[Scraper] Raw text: (len=${rawText.length})`); // Minimal debug

            const priceMatches = [...rawText.matchAll(PRICE_REGEX)];

            let price = 0;
            let shippingCost = 0;
            let quantity = 1;
            let condition = 'Unknown';
            let sellerName = 'Unknown';

            // Find Condition
            const condMatch = rawText.match(CONDITION_REGEX);
            if (condMatch) condition = condMatch[0];

            // Find Quantity
            const qtyMatch = rawText.match(QTY_REGEX);
            if (qtyMatch) quantity = parseInt(qtyMatch[1]);

            // Find Price & Shipping
            if (priceMatches.length > 0) {
                const p1 = parseFloat(priceMatches[0][1].replace(',', ''));
                price = p1;

                const shipMatch = rawText.match(SHIPPING_REGEX);
                if (shipMatch) {
                    if (shipMatch[2]) { // Free Shipping
                        shippingCost = 0;
                    } else if (shipMatch[1]) {
                        shippingCost = parseFloat(shipMatch[1].replace(',', ''));
                    }
                }
            }

            // Seller Name
            const sellerEl = await listing.$('.seller-info__name, .seller-view__name, a.seller-name');
            if (sellerEl) sellerName = await sellerEl.innerText();

            // If price is still 0, try to check if it's "Direct"
            if (price === 0 && rawText.includes('Direct by TCGplayer')) {
                // Price might be hidden or different
            }

            // Filtering
            if (price > 0) {
                offers.push({
                    sellerId: sellerName,
                    sellerName,
                    price,
                    quantity,
                    shipping: {
                        base: shippingCost,
                        // TCGPlayer standard heuristic: Sellers often offer free shipping >$5
                        // We inject this to allow the "Optimistic Shipping" planner logic to consider this seller
                        // even if the single card shipping cost is high.
                        freeAt: 5.00
                    },
                    condition,
                    sellerRating: 1.0
                });
            }

        } catch (e) {
            console.error('[Scraper] Error parsing listing:', e);
        }
    }

    return offers.slice(0, 15);
}
