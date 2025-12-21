import { pool } from '../server/db/pool.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing configuration and connections...');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment Variables:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'MISSING');
console.log('- SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing Supabase configuration!');
}

console.log('\nTesting DB connection...');
try {
    const result = await pool.query('SELECT NOW() as now');
    console.log('DB Connection successful!');
    console.log('Server time:', result.rows[0].now);

    if (!supabaseUrl || !supabaseKey) {
        console.log('Exiting with error due to missing config');
        process.exit(1);
    }
    process.exit(0);
} catch (error) {
    console.error('Connection failed:', error.message);
    process.exit(1);
}
