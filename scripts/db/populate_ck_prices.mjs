
import { pool } from '../server/db/pool.js';
import { mtgjsonService } from '../server/mtgjsonPriceService.js';

async function populatePrices() {
    try {
        console.log('Initializing MTGJSON service...');
        await mtgjsonService.initialize();

        console.log('Fetching inventory items...');
        const res = await pool.query('SELECT id, scryfall_id, name FROM inventory WHERE scryfall_id IS NOT NULL');
        const items = res.rows;
        console.log(`Found ${items.length} items to check.`);

        let updated = 0;
        for (const item of items) {
            const prices = mtgjsonService.getPricesByScryfallId(item.scryfall_id);

            let ck = prices.cardkingdom || 0;
            let tcg = prices.tcgplayer || 0;

            // Update if we have non-zero prices
            if (ck > 0 || tcg > 0) {
                await pool.query(
                    'UPDATE inventory SET ck_price = $1, market_price = $2 WHERE id = $3',
                    [ck, tcg, item.id]
                );
                updated++;
            }

            if (updated % 100 === 0 && updated > 0) process.stdout.write(`Updated ${updated}...\r`);
        }

        console.log(`\nDone! Updated ${updated} items with prices.`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

populatePrices();
