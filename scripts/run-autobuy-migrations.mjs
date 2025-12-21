
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
    });

    const migrations = [
        '../migrate/2025-12-20-create-substitution-groups.sql',
        '../migrate/2025-12-21-create-autobuy-analytics.sql',
    ];

    try {
        for (const migrationFile of migrations) {
            const migrationPath = path.join(__dirname, migrationFile);
            if (!fs.existsSync(migrationPath)) {
                console.log(`Migration not found: ${migrationFile}`);
                continue;
            }
            const sql = fs.readFileSync(migrationPath, 'utf8');

            console.log(`Running migration: ${migrationFile}`);
            await pool.query(sql);
            console.log(`  ✓ Migration completed`);
        }
        console.log('\nAll migrations completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
