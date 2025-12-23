
import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('Navigating to initialize session...');
        await page.goto('https://www.tcgplayer.com/product/15162/magic-unlimited-edition-sol-ring?Language=English', { waitUntil: 'domcontentloaded' });

        console.log('Checking for global data blobs...');

        // Wait for potential hydration
        await page.waitForTimeout(3000);

        const data = await page.evaluate(() => {
            if (window.__NUXT__) return { type: 'NUXT', data: window.__NUXT__ };
            if (window.__NEXT_DATA__) return { type: 'NEXT', data: window.__NEXT_DATA__ };
            if (window.__INITIAL_STATE__) return { type: 'REDUX', data: window.__INITIAL_STATE__ };
            if (window.mpfev) return { type: 'TCG', data: window.store || window.__store };
            return null;
        });

        if (data) {
            console.log(`FOUND DATA BLOB: ${data.type}`);
            const s = JSON.stringify(data.data);
            console.log(`Data (snippet): ${s.substring(0, 500)}`);

            if (s.includes('sellerKey') || s.includes('sellerName')) {
                console.log('VERIFIED: Data blob contains seller info.');
            }
        } else {
            console.log('No global data blob found.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
