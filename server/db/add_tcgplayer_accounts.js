
import { pool } from './pool.js';

async function runMigration() {
    try {
        console.log('Running migration: create tcgplayer_accounts table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS tcgplayer_accounts (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                account_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                encrypted_password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Index on user_id for fast lookups
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_tcgplayer_accounts_user_id 
            ON tcgplayer_accounts(user_id);
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
