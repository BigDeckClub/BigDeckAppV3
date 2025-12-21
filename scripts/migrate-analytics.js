
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        const migrationPath = path.join(__dirname, '../migrate/2025-12-21-create-autobuy-analytics.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
