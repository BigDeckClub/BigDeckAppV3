
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function verify() {
    try {
        const email = 'dev@bigdeck.app';
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('User not found');
            return;
        }
        const userId = userRes.rows[0].id;

        const countRes = await pool.query(
            "SELECT count(*) FROM inventory WHERE user_id = $1 AND folder = 'Avatar Set'",
            [userId]
        );

        const sumRes = await pool.query(
            "SELECT SUM(quantity) FROM inventory WHERE user_id = $1 AND folder = 'Avatar Set'",
            [userId]
        );

        console.log(`Verification: Found ${countRes.rows[0].count} unique cards in 'Avatar Set' folder.`);
        console.log(`Total quantity: ${sumRes.rows[0].sum} (Expected ~${countRes.rows[0].count * 200})`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verify();
