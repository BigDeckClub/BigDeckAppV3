// ========== BATCH INSERT HELPERS ==========
// PostgreSQL has a limit on prepared statement parameters (~65535)
// With 4 columns per row, we can safely insert ~16000 rows per batch
const BATCH_INSERT_CHUNK_SIZE = 1000;

// Insert multiple deck reservations in a single query
// Columns: deck_id, inventory_item_id, quantity_reserved, original_folder
export async function batchInsertReservations(reservations, client) {
  if (reservations.length === 0) return;
  
  const COLS_PER_ROW = 4;
  
  try {
    // Chunk large arrays to avoid PostgreSQL parameter limit
    for (let i = 0; i < reservations.length; i += BATCH_INSERT_CHUNK_SIZE) {
      const chunk = reservations.slice(i, i + BATCH_INSERT_CHUNK_SIZE);
      const values = chunk.map((r, idx) => 
        `($${idx*COLS_PER_ROW+1}, $${idx*COLS_PER_ROW+2}, $${idx*COLS_PER_ROW+3}, $${idx*COLS_PER_ROW+4})`
      ).join(', ');
      const params = chunk.flatMap(r => [
        r.deck_id, r.inventory_item_id, r.quantity_reserved, r.original_folder
      ]);
      await client.query(`
        INSERT INTO deck_reservations (deck_id, inventory_item_id, quantity_reserved, original_folder)
        VALUES ${values}
      `, params);
    }
  } catch (err) {
    console.error('[BATCH INSERT] Error inserting reservations:', err.message);
    throw err;
  }
}

// Insert multiple missing cards in a single query
// Columns: deck_id, card_name, set_code, quantity_needed
export async function batchInsertMissingCards(missingCards, client) {
  if (missingCards.length === 0) return;
  
  const COLS_PER_ROW = 4;
  
  try {
    // Chunk large arrays to avoid PostgreSQL parameter limit
    for (let i = 0; i < missingCards.length; i += BATCH_INSERT_CHUNK_SIZE) {
      const chunk = missingCards.slice(i, i + BATCH_INSERT_CHUNK_SIZE);
      const values = chunk.map((m, idx) => 
        `($${idx*COLS_PER_ROW+1}, $${idx*COLS_PER_ROW+2}, $${idx*COLS_PER_ROW+3}, $${idx*COLS_PER_ROW+4})`
      ).join(', ');
      const params = chunk.flatMap(m => [
        m.deck_id, m.card_name, m.set_code, m.quantity_needed
      ]);
      await client.query(`
        INSERT INTO deck_missing_cards (deck_id, card_name, set_code, quantity_needed)
        VALUES ${values}
      `, params);
    }
  } catch (err) {
    console.error('[BATCH INSERT] Error inserting missing cards:', err.message);
    throw err;
  }
}
