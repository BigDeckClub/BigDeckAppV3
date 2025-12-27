
import { pool } from '../server/db/pool.js';

async function migrate() {
    try {
        console.log('Adding ck_price and market_price columns to inventory...');
        await pool.query(`
            ALTER TABLE inventory 
            ADD COLUMN IF NOT EXISTS ck_price NUMERIC(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS market_price NUMERIC(10, 2) DEFAULT 0;
        `);
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
