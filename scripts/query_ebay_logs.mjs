import { pool } from '../server/db/pool.js';

async function main() {
  try {
    const res = await pool.query(
      `SELECT id, user_id, action, request_payload, response_payload, error_message, created_at
       FROM ebay_sync_log
       ORDER BY created_at DESC
       LIMIT 20`
    );

    console.log('Recent ebay_sync_log entries:');
    for (const row of res.rows) {
      console.log('---');
      console.log('id:', row.id);
      console.log('user_id:', row.user_id);
      console.log('action:', row.action);
      console.log('created_at:', row.created_at);
      console.log('error_message:', row.error_message);
      console.log('request_payload:', row.request_payload);
      console.log('response_payload:', row.response_payload);
    }
  } catch (err) {
    console.error('Query failed:', err.message);
  } finally {
    await pool.end();
  }
}

main();
