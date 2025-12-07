import pkg from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const { Pool } = pkg;

// PostgreSQL connection - use DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('[DB] ✗ DATABASE_URL environment variable is not set');
  console.error('[DB] Please create a .env file with DATABASE_URL=postgresql://username:password@host:port/database');
  throw new Error('DATABASE_URL is required but not configured');
}

const pool = new Pool({
  connectionString: dbUrl,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  max: 20, // Maximum number of clients in the pool
  min: 2,  // Minimum number of clients in the pool
});

// ========== DATABASE CONNECTION MONITORING ==========
pool.on('error', (err, client) => {
  console.error('[DB] ✗ Unexpected pool error:', err.message);
  console.error('[DB] Error code:', err.code);
  console.error('[DB] Error stack:', err.stack);
  if (client) {
    console.error('[DB] Client details:', client);
  }
});

pool.on('connect', () => {
  // Silent success - no need to log every connection
});

export { pool };
