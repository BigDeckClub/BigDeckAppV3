/**
 * Run a SQL migration file against the database
 * Usage: node scripts/run-migration.js <path-to-migration.sql>
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigration(migrationPath) {
    if (!migrationPath) {
        console.error('Usage: node scripts/run-migration.js <path-to-migration.sql>');
        process.exit(1);
    }

    const fullPath = path.resolve(process.cwd(), migrationPath);

    if (!fs.existsSync(fullPath)) {
        console.error(`Migration file not found: ${fullPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log(`📄 Running migration: ${path.basename(fullPath)}`);
    console.log(`📍 Full path: ${fullPath}`);

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected to database');

        await client.query(sql);
        console.log('✅ Migration completed successfully');

        client.release();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) console.error('   Detail:', error.detail);
        if (error.hint) console.error('   Hint:', error.hint);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

const migrationPath = process.argv[2];
runMigration(migrationPath);
