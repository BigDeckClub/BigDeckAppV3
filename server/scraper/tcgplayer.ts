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
                // We stored them with cardId possibly different if name matches but ID differs?
                // We should update the cardId to match the current request
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
        browser = await chromium.launch({ headless: HEADLESS });
        const context = await browser.newContext({ userAgent: USER_AGENT });
        const page = await context.newPage();

        // TCGPlayer might have a "Verify you are human" check.
        // We'll try to handle basic navigation.

        for (const card of cardsToScrape) {
            try {
                const offers = await scrapeSingleCard(page, card.name);

                // Normalize and Attach Scryfall ID
                const normalizedOffers = offers.map(o => ({
                    ...o,
                    cardId: card.scryfallId,
                    marketplace: 'TCG' as const
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
    // We use the search query param
    const encodedName = encodeURIComponent(cardName);
    await page.goto(`https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodedName}&view=grid`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
    });

    // 2. Click the first product result (usually the most relevant)
    // Selector for the first result anchor
    const firstResultSelector = 'div.search-result a';
    try {
        await page.waitForSelector(firstResultSelector, { timeout: 5000 });
    } catch (e) {
        console.warn(`[Scraper] No results found for ${cardName}`);
        return [];
    }

    // Click and navigate
    await Promise.all([
        page.waitForLoadState('domcontentloaded'), // Wait for new page load
        page.click(firstResultSelector)
    ]);

    // 3. On Product Page, wait for listings
    // The listings interact with API, might take a moment.
    // There is a section "View Sellers" or scrolling down in new layout.
    // We look for the listings container.

    // Try to wait for an item price
    const listingSelector = 'section.listing-item'; // This class might vary, let's look for semantic structure or common classes
    // Actually TCGPlayer classes are like 'listing-item__header', 'listing-item__info' etc.

    try {
        // Wait a bit for Client Side Render
        await page.waitForSelector('.listing-item', { timeout: 5000 });
    } catch (e) {
        console.warn(`[Scraper] 0 listings loaded for ${cardName}`);
        return [];
    }

    // 4. Extract Data
    const listings = await page.$$('.listing-item');

    for (const listing of listings) {
        try {
            // Seller Name
            const sellerEl = await listing.$('.seller-info__name');
            const sellerName = sellerEl ? await sellerEl.innerText() : 'Unknown';

            // Price
            const priceEl = await listing.$('.listing-item__price');
            const priceText = priceEl ? await priceEl.innerText() : '$0.00';
            const price = parseFloat(priceText.replace('$', '').replace(',', ''));

            // Quantity
            // Sometimes "3 available" or just input?
            // Usually there is an "add to cart" section.
            // Often text like "3 available" is in .listing-item__quantity or similar.
            // Let's assume 1 if not found for MVP safety, or try to find it.
            // We often see "Add to Cart" button.
            const quantityTextEl = await listing.$('.add-to-cart__available');
            let quantity = 1;
            if (quantityTextEl) {
                const txt = await quantityTextEl.innerText();
                const match = txt.match(/(\d+)\s+available/i);
                if (match) quantity = parseInt(match[1]);
            }

            // Shipping
            const shippingEl = await listing.$('.shipping-messages__price');
            let shippingCost = 0;
            if (shippingEl) {
                const shipTxt = await shippingEl.innerText();
                if (shipTxt.toLowerCase().includes('free')) {
                    shippingCost = 0;
                } else {
                    // "+ $0.99 Shipping"
                    const match = shipTxt.match(/\$\s*(\d+\.?\d*)/);
                    if (match) shippingCost = parseFloat(match[1]);
                }
            }

            // Condition
            const conditionEl = await listing.$('.listing-item__condition');
            const condition = conditionEl ? await conditionEl.innerText() : 'Unknown';

            // Filtering criteria (optional)
            // e.g. skip Damaged?

            offers.push({
                sellerId: sellerName, // Use name as ID for now
                sellerName,
                price,
                quantity,
                shipping: {
                    base: shippingCost,
                    freeAt: shippingCost === 0 && (price >= 5.00) ? 5.00 : undefined // Heuristic
                },
                condition,
                sellerRating: 1.0 // Default robust
            });

        } catch (e) {
            // single listing fail
        }
    }

    // Limit to reasonable number per card to save bandwidth/memory? 
    // Maybe top 10 cheapest?
    // They are usually sorted by price+shipping asc by TCGPlayer default.

    return offers.slice(0, 15);
}
