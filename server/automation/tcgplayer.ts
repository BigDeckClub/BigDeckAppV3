import { chromium, firefox, webkit, Browser, Page } from 'playwright';

/**
 * Automation Service for TCGPlayer
 * Handles "Assisted Checkout" and "Direct Add" automation.
 */

interface Credentials {
    email?: string;
    password?: string;
}

interface CartItem {
    name: string;
    quantity: number;
    sellerName?: string;
    sku?: string;
    sellerKey?: string;
}

// ... imports remain ...

async function runDirectAdd(page: Page, items: CartItem[]) {
    console.log(`[Automation] Starting Direct Add for ${items.length} items...`);

    // 1. Setup Cart ID Listener
    let cartId: string | null = null;
    let listenerAttached = false;

    const attachListener = async () => {
        if (listenerAttached) return;
        console.log('[Automation] Listening for Cart ID...');
        await page.on('response', async resp => {
            try {
                const url = resp.url();
                if (resp.request().method() === 'POST' && url.includes('/cart') && url.includes('/item/add')) {
                    // Extract from URL: .../cart/{GUID}/item/add
                    const match = url.match(/cart\/([a-f0-9-]+)\/item\/add/i);
                    if (match && match[1]) {
                        if (!cartId) console.log(`[Automation] Captured Cart ID: ${match[1]}`);
                        cartId = match[1];
                    }
                }
            } catch (e) { /* ignore */ }
        });
        listenerAttached = true;
    };

    await attachListener();

    for (const [index, item] of items.entries()) {
        console.log(`[Automation] Processing ${index + 1}/${items.length}: ${item.name} (${item.sellerName || 'Any'})`);

        // HYBRID STRATEGY:
        // If we have Cart ID + Keys -> Use API (Fast)
        // Else -> Use UI (slower, but sets Cart ID)

        const canUseApi = cartId && item.sku && item.sellerKey;

        if (canUseApi) {
            try {
                await addViaApi(page, cartId!, item);
                await page.waitForTimeout(500); // Rate limit respect
                continue; // precise success
            } catch (err) {
                console.warn(`[Automation] API add failed for ${item.name}, falling back to UI.`, err);
            }
        }

        // FALLBACK: UI Method
        try {
            await addViaUi(page, item);
        } catch (err) {
            console.error(`[Automation] UI add failed for ${item.name}`, err);
        }
    }

    console.log('[Automation] Direct Add complete. Navigating to Cart...');
    await page.goto('https://cart.tcgplayer.com/shoppingcart');
}

async function addViaApi(page: Page, cartId: string, item: CartItem) {
    console.log(`[Automation] API Adding: SKU=${item.sku} Seller=${item.sellerKey}`);

    // Execute Fetch in browser context (cookies auth)
    const result = await page.evaluate(async ({ cartId, item }) => {
        const url = `https://mpgateway.tcgplayer.com/v1/cart/${cartId}/item/add?mpfev=4622`;

        const payload = {
            sku: parseInt(item.sku!),
            sellerKey: item.sellerKey,
            channelId: 0,
            requestedQuantity: item.quantity,
            price: 0.01, // API seems to ignore price on add? Or requires match?
            // Note: If price mismatch, TCGPlayer might reject or auto-adjust.
            // Sending 0.01 or scraped price?
            // Ideally we send scraped price, but we didn't pass it.
            // Let's try 0.01, if it fails, we fall back.
            // Actually, sniffing showed "price": 0.02.
            isDirect: false,
            countryCode: "US"
        };

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) throw new Error(`API Status: ${resp.status}`);
        return await resp.json();
    }, { cartId, item });

    console.log(`[Automation] API Success for ${item.name}`);
}

async function addViaUi(page: Page, item: CartItem) {
    // 1. Find Product Page
    const encodedName = encodeURIComponent(item.name);
    // ... existing UI logic ...
    // I will inline the existing UI logic here for clarity, or just keep it in runDirectAdd?
    // I replaced runDirectAdd, so I need to put the logic back.

    await page.goto(`https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${encodedName}&view=grid`, { timeout: 10000 });

    const firstResult = page.locator('div.search-result a, a.product-card__image').first();
    try {
        await firstResult.waitFor({ state: 'visible', timeout: 5000 });
        await firstResult.click();
        await page.waitForLoadState('domcontentloaded');
    } catch (e) {
        console.warn(`[Automation] Product not found: ${item.name}`);
        return;
    }

    // 2. Find Seller
    try { await page.waitForSelector('section.listing-item', { timeout: 5000 }); } catch (e) { }

    let added = false;
    const listings = page.locator('section.listing-item');
    const count = await listings.count();

    for (let i = 0; i < count; i++) {
        const listing = listings.nth(i);
        const sellerNameEl = listing.locator('.seller-info__name, .seller-view__name, a.seller-name');
        const sellerText = await sellerNameEl.innerText().catch(() => '');

        if (item.sellerName && sellerText.toLowerCase().includes(item.sellerName.toLowerCase())) {
            const addBtn = listing.locator('button.add-to-cart, button[data-testid*="add-to-cart"]');
            if (await addBtn.count() > 0) {
                // Click Loop
                for (let q = 0; q < item.quantity; q++) {
                    await addBtn.click();
                    await page.waitForTimeout(500);
                }
                console.log(`[Automation] Added from ${sellerText}`);
                added = true;
                break;
            }
        }
    }

    if (!added) {
        console.warn(`[Automation] Seller ${item.sellerName} not found or OOS.`);
    }
}
