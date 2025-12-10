import { pool } from '../db/pool.js';
import { scryfallServerClient } from '../utils/scryfallClient.server.js';

const DEFAULT_LIMIT = 200;
const CHUNK_SIZE = 75;

async function ensureColumns() {
  // Add columns if missing to store enrichment data
  await Promise.all([
    pool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_uri_small TEXT").catch(() => {}),
    pool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_uri_normal TEXT").catch(() => {}),
    pool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS mana_value REAL").catch(() => {}),
    pool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS color_identity JSONB").catch(() => {}),
  ]);
}

/**
 * Run a single backfill batch.
 * @param {{limit?:number,dryRun?:boolean}} options
 * @returns {Object} stats
 */
export async function runBackfill({ limit = DEFAULT_LIMIT, dryRun = false } = {}) {
  await ensureColumns();

  const stats = { total: 0, updated: 0, notFound: 0, errors: 0 };

  // Select inventory rows missing scryfall_id
  const { rows } = await pool.query(
    `SELECT id, user_id, name, set FROM inventory WHERE (scryfall_id IS NULL OR scryfall_id = '') LIMIT $1`,
    [limit]
  );

  const items = rows || [];
  stats.total = items.length;

  if (items.length === 0) return stats;

  // Build identifiers for batchResolve
  const identifiers = items.map(it => ({
    name: it.name,
    set: (typeof it.set === 'string' ? it.set.toLowerCase() : (it.set?.editioncode || it.set?.mtgoCode || ''))
  }));

  for (let i = 0; i < identifiers.length; i += CHUNK_SIZE) {
    const chunk = identifiers.slice(i, i + CHUNK_SIZE);
    let resolved = {};
    try {
      resolved = await scryfallServerClient.batchResolve(chunk);
    } catch (err) {
      console.error('[BACKFILL-JOB] batchResolve failed:', err?.message || err);
      // fallback: try individual resolves
      resolved = {};
      for (const id of chunk) {
        try {
          const card = await scryfallServerClient.getCardByName(id.name, { exact: true, set: id.set });
          const key = `${(id.name||'').toLowerCase().trim()}|${(id.set||'').toLowerCase().trim()}`;
          resolved[key] = card;
        } catch (e) {
          console.error('[BACKFILL-JOB] individual resolve failed for', id.name, e?.message || e);
        }
      }
    }

    // apply updates for this chunk
    const chunkItems = items.slice(i, i + CHUNK_SIZE);
    for (let j = 0; j < chunkItems.length; j++) {
      const item = chunkItems[j];
      const key = `${(item.name||'').toLowerCase().trim()}|${(item.set||'').toLowerCase().trim()}`;
      const card = resolved[key];
      if (!card || !card.scryfall_id) {
        stats.notFound++;
        continue;
      }

      const image_small = card.image_uris?.small || null;
      const image_normal = card.image_uris?.normal || null;
      const mana_value = card.mana_value ?? card.cmc ?? null;
      const color_identity = Array.isArray(card.color_identity) ? card.color_identity : (card.color_identity || []);

      if (!dryRun) {
        try {
          await pool.query(
            `UPDATE inventory SET scryfall_id = $1, image_uri_small = $2, image_uri_normal = $3, mana_value = $4, color_identity = $5 WHERE id = $6`,
            [card.scryfall_id, image_small, image_normal, mana_value, color_identity, item.id]
          );
          stats.updated++;
          console.log(`[BACKFILL-JOB] ✓ Updated inventory ${item.id} (${item.name})`);
        } catch (dbErr) {
          stats.errors++;
          console.error(`[BACKFILL-JOB] ✗ DB update failed for id=${item.id}:`, dbErr?.message || dbErr);
        }
      } else {
        stats.updated++;
        console.log(`[BACKFILL-JOB] DRYRUN would update inventory ${item.id} (${item.name}) with scryfall_id=${card.scryfall_id}`);
      }
    }
  }

  console.log('[BACKFILL-JOB] complete', stats);
  return stats;
}

export default { runBackfill };
