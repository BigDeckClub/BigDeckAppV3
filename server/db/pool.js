import pkg from 'pg';

const { Pool } = pkg;

// PostgreSQL connection - separate dev and production databases
const dbUrl = process.env.REPLIT_DEPLOYMENT 
  ? (process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL)
  : process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('[DB] ✗ DATABASE_URL environment variable is not set');
  // Allow the application to start but log a warning - pool operations will fail
}

const pool = new Pool({
  connectionString: dbUrl,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
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
