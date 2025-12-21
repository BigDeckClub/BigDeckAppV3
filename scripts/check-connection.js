import { pool } from '../server/db/pool.js';
import dotenv from 'dotenv';
import https from 'https';

dotenv.config();

console.log('Testing configuration and connections...');

const supabaseUrl = process.env.SUPABASE_URL;

function checkSupabaseReachability(url) {
    return new Promise((resolve, reject) => {
        if (!url) {
            console.log('Skipping Supabase HTTP check (no URL)');
            return resolve(false);
        }
        console.log(`Checking reachability of ${url}...`);
        const req = https.get(url, (res) => {
            console.log(`Supabase URL Status: ${res.statusCode}`);
            res.resume();
            resolve(true);
        }).on('error', (e) => {
            console.error(`Supabase Reachability Error: ${e.message}`);
            // Usually caused by DNS or Firewall
            resolve(false);
        });
    });
}

(async () => {
    await checkSupabaseReachability(supabaseUrl);

    console.log('\nTesting DB connection...');
    try {
        const result = await pool.query('SELECT NOW() as now');
        console.log('DB Connection successful!');
        console.log('Server time:', result.rows[0].now);
        process.exit(0);
    } catch (error) {
        console.error('Connection failed:', error.message);
        process.exit(1);
    }
})();
