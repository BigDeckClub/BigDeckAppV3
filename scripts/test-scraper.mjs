
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '../dist/server/scraper/tcgplayer.js');

async function testScraper() {
    try {
        console.log('Loading scraper from:', distPath);
        const scraper = await import("file://" + distPath);

        console.log('Scraping "Sol Ring"...');
        const result = await scraper.scrapeTCGPlayerOffers([
            { name: 'Sol Ring', scryfallId: 'test-id' }
        ], { skipCache: true });

        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.offers.length > 0) {
            console.log('SUCCESS: Found offers!');
        } else {
            console.error('FAILURE: No offers found.');
            process.exit(1);
        }
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

testScraper();
