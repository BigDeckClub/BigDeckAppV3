import { pool } from '../server/db/pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCleanup() {
    console.log('Running database cleanup...');
    const sqlPath = path.join(__dirname, '../migrate/cleanup_autobuy_marketplace.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        await pool.query(sql);
        console.log('Successfully dropped tables.');
    } catch (err) {
        console.error('Error executing cleanup:', err);
    } finally {
        await pool.end();
    }
}

runCleanup();
