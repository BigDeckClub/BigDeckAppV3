
import { chromium } from 'playwright';

async function runTest() {
    const products = [
        { name: "Sol Ring", quantity: 1 }
    ];
    const credentials = {
        email: "Kevinnguyenmtg@gmail.com",
        password: "IloveME12.!"
    };

    console.log('[Test] Launching browser...');
    // Launch headed
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('[Test] Navigating to login...');
    await page.goto('https://store.tcgplayer.com/login');

    console.log('[Test] Filling credentials...');
    await page.fill('input[name="Email"], input[type="email"]', credentials.email);
    await page.fill('input[name="Password"], input[type="password"]', credentials.password);

    console.log('[Test] Clicking login...');
    await page.click('button[type="submit"], input[type="submit"]');

    console.log('[Test] Waiting for navigation...');
    try {
        await page.waitForNavigation({ timeout: 15000 });
        console.log('[Test] Navigation complete. URL:', page.url());
    } catch (e) {
        console.log('[Test] Navigation timeout (might be captcha). URL:', page.url());
    }

    console.log('[Test] Going to Mass Entry...');
    await page.goto('https://www.tcgplayer.com/massentry');

    // Fill list
    const listText = products.map(p => `${p.quantity} ${p.name}`).join('\n');
    await page.locator('textarea.mass-entry__textarea').fill(listText);

    console.log('[Test] Clicking Add to Cart...');
    // await page.locator('.mass-entry__button').click(); // Commented out to not buy

    console.log('[Test] Done. Keeping open for 10s...');
    await page.waitForTimeout(10000);
    await browser.close();
}

runTest().catch(console.error);
