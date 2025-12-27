
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    const logFile = 'sniff_log_v2.txt';
    fs.writeFileSync(logFile, ''); // Clear file

    function log(msg) {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    }

    // Listen for relevant requests
    page.on('request', request => {
        const url = request.url();
        const method = request.method();

        // 1. Listings API (Fetching prices/sellers)
        if (url.includes('/listings') || url.includes('/product/')) {
            if (url.includes('json') || request.resourceType() === 'fetch') {
                log(`[API_HIT] ${method} ${url}`);
            }
        }

        // 2. Cart API (Adding items)
        if (method === 'POST' && (url.includes('/cart') || url.includes('/shoppingcart'))) {
            log(`[CART_ACTION] ${method} ${url}`);
            log(`PAYLOAD: ${request.postData()}`);
        }
    });

    try {
        log('Navigating to product...');
        await page.goto('https://www.tcgplayer.com/product/15162/magic-unlimited-edition-sol-ring?Language=English');

        // Wait for listings to load
        await page.waitForSelector('section.listing-item', { timeout: 15000 });

        // Find a button and click it to trigger Cart API
        const listing = page.locator('section.listing-item').first();
        const btn = listing.locator('button.add-to-cart, button[data-testid*="add-to-cart"]').first();

        if (await btn.count() > 0) {
            log('Clicking Add to Cart button...');
            await btn.click();
            await page.waitForTimeout(5000); // Wait for network
        } else {
            log('No Add to Cart button found.');
        }

    } catch (e) {
        log(`Error: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
