
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function fetchSetCards(code) {
    let cards = [];
    let url = `https://api.scryfall.com/cards/search?q=set:${code}`;

    while (url) {
        console.log(`Fetching ${url}...`);
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Failed to fetch ${url}: ${res.statusText}`);
            break;
        }
        const data = await res.json();
        cards = cards.concat(data.data);
        url = data.has_more ? data.next_page : null;
        await new Promise(r => setTimeout(r, 100)); // Respect rate limits
    }
    return cards;
}

async function seed() {
    try {
        const email = 'dev@bigdeck.app';
        const res = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (res.rows.length === 0) {
            console.error(`User ${email} not found!`);
            // Optional: Create user if needed, but better to fail safely
            process.exit(1);
        }

        const userId = res.rows[0].id;
        console.log(`Found user ${email} (ID: ${userId})`);

        // Fetch sets
        const tla = await fetchSetCards('tla');
        const tle = await fetchSetCards('tle');
        const allCards = [...tla, ...tle];

        console.log(`Found ${allCards.length} cards in TLA/TLE sets.`);

        // Insert
        let addedCount = 0;
        for (const card of allCards) {
            // Basic info
            const name = card.name;
            const setCode = card.set;
            const setName = card.set_name;
            const scryfallId = card.id;
            const imageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal;

            // Check if exists to update or insert? User said "add 200". 
            // I'll check if user already has it with exact Scryfall ID to update quantity, else insert.

            const check = await pool.query(
                'SELECT id, quantity FROM inventory WHERE user_id = $1 AND scryfall_id = $2',
                [userId, scryfallId]
            );

            if (check.rows.length > 0) {
                // Update
                const currentQty = check.rows[0].quantity;
                await pool.query(
                    'UPDATE inventory SET quantity = quantity + 200 WHERE id = $1',
                    [check.rows[0].id]
                );
                // console.log(`Updated ${name} (+200)`);
            } else {
                // Insert
                await pool.query(
                    `INSERT INTO inventory 
           (user_id, name, set, set_name, quantity, scryfall_id, image_url, folder, purchase_price, purchase_date)
           VALUES ($1, $2, $3, $4, 200, $5, $6, 'Avatar Set', 0, NOW())`,
                    [userId, name, setCode, setName, scryfallId, imageUrl]
                );
                // console.log(`Inserted ${name} (200)`);
            }
            addedCount++;
            if (addedCount % 50 === 0) console.log(`Processed ${addedCount}/${allCards.length} cards...`);
        }

        console.log('Done!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

seed();
