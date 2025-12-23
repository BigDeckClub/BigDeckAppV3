
import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://www.tcgplayer.com/product/15162/magic-unlimited-edition-sol-ring?Language=English');

    // Wait for listings
    try {
        await page.waitForSelector('section.listing-item', { timeout: 10000 });
    } catch (e) {
        console.log('Timeout waiting for listings');
        await browser.close();
        return;
    }

    const listing = page.locator('section.listing-item').first();
    const btn = listing.locator('button.add-to-cart, button[data-testid*="add-to-cart"]').first();

    if (await btn.count() > 0) {
        const productSku = await btn.getAttribute('data-product-sku-id');
        const sellerKey = await btn.getAttribute('data-seller-key');
        const listingId = await btn.getAttribute('id');

        console.log({ productSku, sellerKey, listingId });

        // Also dump all attributes
        const attrs = await btn.evaluate(el => el.getAttributeNames().reduce((acc, name) => {
            acc[name] = el.getAttribute(name);
            return acc;
        }, {}));
        console.log('All Btn Attributes:', attrs);
    } else {
        console.log('Button not found via selector');
        // Dump all buttons in listing
        const btns = await listing.locator('button').all();
        console.log(`Found ${btns.length} buttons in listing`);
        for (const b of btns) {
            console.log('Btn:', await b.evaluate(el => el.outerHTML));
        }
    }

    await browser.close();
})();
