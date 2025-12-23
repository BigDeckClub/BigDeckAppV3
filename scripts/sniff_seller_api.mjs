
import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    const logFile = 'sniff_log_seller.txt';
    fs.writeFileSync(logFile, '');

    function log(msg) {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    }

    page.on('request', request => {
        const url = request.url();
        // Look for search endpoints or listing endpoints
        if (url.includes('/search') || url.includes('/catalog/')) {
            if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
                log(`[SEARCH_API] ${request.method()} ${url}`);
                if (request.method() === 'POST') {
                    log(`PAYLOAD: ${request.postData()}`);
                }
            }
        }
    });

    // Response logger for search results
    page.on('response', async response => {
        const url = response.url();
        if ((url.includes('/search') || url.includes('/catalog')) && response.request().resourceType() === 'fetch') {
            try {
                const json = await response.json();
                if (json.results || json.products) {
                    log(`[SEARCH_RESPONSE] Found ${json.results?.length || json.products?.length} items`);
                    // Log first item
                    log(JSON.stringify(json.results?.[0] || json.products?.[0]));
                }
            } catch (e) { }
        }
    });

    try {
        log('Navigating to Seller Search...');
        // TCGPlayer search with seller filter. 
        // We use the seller key found previously: cc1699e7 (Wraithborn Tcg?)
        await page.goto('https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=&view=grid&seller=cc1699e7');

        await page.waitForTimeout(5000);

    } catch (e) {
        log(`Error: ${e.message}`);
    } finally {
        await browser.close();
    }
})();
