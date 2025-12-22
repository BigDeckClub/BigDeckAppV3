import { chromium, firefox, webkit, Browser, Page } from 'playwright';

/**
 * Automation Service for TCGPlayer
 * Handles "Assisted Checkout" by driving a visible browser to the Mass Entry tool.
 * Supports optional auto-login with credentials.
 */

interface Credentials {
    email?: string;
    password?: string;
}

export async function launchTcgPlayerMassEntry(
    products: { name: string; quantity: number }[],
    credentials?: Credentials
) {
    console.log('[Automation] Launching TCGPlayer Mass Entry...');

    const listText = products.map(p => `${p.quantity} ${p.name.replace(/\|\|/g, ' ')}`).join('\n');

    try {
        // Launch headed browser
        const browser = await chromium.launch({
            headless: false,
            args: ['--start-maximized']
        });

        // Create context
        const context = await browser.newContext({
            viewport: null
        });

        const page = await context.newPage();

        // 1. Auto-Login Logic
        if (credentials?.email && credentials?.password) {
            console.log('[Automation] Attempting auto-login...');
            try {
                await page.goto('https://store.tcgplayer.com/login', { timeout: 15000 });

                // Check if already logged in (unlikely in new context unless we reuse state, which we don't here)
                // Look for Email input
                const emailInput = page.locator('input[name="Email"], input[type="email"]');
                const passInput = page.locator('input[name="Password"], input[type="password"]');
                const submitBtn = page.locator('button[type="submit"], input[type="submit"]');

                if (await emailInput.count() > 0) {
                    await emailInput.first().fill(credentials.email);
                    if (await passInput.count() > 0) {
                        await passInput.first().fill(credentials.password);

                        // Click login
                        await submitBtn.first().click();
                        console.log('[Automation] Credentials submitted. Waiting for navigation...');

                        // Wait for navigation or success
                        // We don't block too long in case of captcha
                        try {
                            await page.waitForNavigation({ timeout: 10000, waitUntil: 'domcontentloaded' });
                            console.log('[Automation] Navigation occurred (Optimistic login success).');
                        } catch (e) {
                            // Check if captcha is present
                            console.warn('[Automation] Login navigation timeout. Captcha might be present.');
                        }
                    }
                }
            } catch (e) {
                console.warn('[Automation] Auto-login failed or timed out:', e);
                // Continue to Mass Entry regardless
            }
        }

        // 2. Navigate to Mass Entry
        console.log('[Automation] Navigating to Mass Entry...');
        await page.goto('https://www.tcgplayer.com/massentry');

        // Naive selector strategy: Look for textarea inside the form
        const textarea = page.locator('textarea.mass-entry__textarea');

        // Wait for it
        try {
            await textarea.waitFor({ state: 'visible', timeout: 8000 });
        } catch (e) {
            console.log('[Automation] Textarea not found immediately.');
        }

        // Fill List
        if (await textarea.count() > 0) {
            await textarea.fill(listText);
            console.log('[Automation] List filled.');

            // Attempt to click "Add to Cart" / "Submit"
            // Usually the button is "mass-entry__button"
            const submitBtn = page.locator('.mass-entry__button, button:has-text("Add to Cart")');
            if (await submitBtn.count() > 0) {
                // We might want to let the user click it to review?
                // User request: "automatically add to cart".
                // So we click it.
                await submitBtn.first().click();
            }
        } else {
            console.warn('[Automation] Could not find Mass Entry textarea.');
        }

        // Return success logic
        return { success: true };

    } catch (error) {
        console.error('[Automation] Error:', error);
        throw error;
    }
}
